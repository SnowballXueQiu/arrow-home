from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, func
import bcrypt
from database import (
    get_db, init_db,
    User, Category, Product, ProductAttribute, ProductVariant, ProductImage,
    Banner, Announcement, CompanyInfo, ProjectCase, ProjectCaseImage, ProjectCaseDesc,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="箭牌卫浴产品展示API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---

class LoginRequest(BaseModel):
    code: str = ""
    username: str = ""
    password: str = ""


class AttributeItem(BaseModel):
    key: str
    value: str
    sort_order: int = 0


class VariantItem(BaseModel):
    variant_type: str
    variant_value: str
    sort_order: int = 0


class ImageItem(BaseModel):
    url: str
    sort_order: int = 0


class ProductCreate(BaseModel):
    name: str = ""
    model: str
    description: str = ""
    category_id: int | None = None
    is_hot: bool = False
    sort_order: int = 0
    price: float | None = None
    discount_price: float | None = None
    show_price: bool = False
    attributes: list[AttributeItem] = []
    variants: list[VariantItem] = []
    images: list[ImageItem] = []


class ProductUpdate(BaseModel):
    name: str | None = None
    model: str | None = None
    description: str | None = None
    category_id: int | None = None
    is_hot: bool | None = None
    sort_order: int | None = None
    price: float | None = None
    discount_price: float | None = None
    show_price: bool | None = None
    attributes: list[AttributeItem] | None = None
    variants: list[VariantItem] | None = None
    images: list[ImageItem] | None = None


class CategoryCreate(BaseModel):
    name: str
    parent_id: int | None = None
    sort_order: int = 0


class BannerCreate(BaseModel):
    title: str
    subtitle: str = ""
    tag: str = ""
    link_product_id: int | None = None
    sort_order: int = 0


class AnnouncementCreate(BaseModel):
    content: str


# --- Serializers ---

def _ser_product_base(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name or "",
        "model": p.model or "",
        "description": p.description or "",
        "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "is_hot": bool(p.is_hot),
        "sort_order": p.sort_order,
        "price": p.price,
        "discount_price": p.discount_price,
        "show_price": bool(p.show_price),
        "created_at": str(p.created_at) if p.created_at else None,
    }


def _ser_product_full(p: Product) -> dict:
    d = _ser_product_base(p)
    d["attributes"] = [{"key": a.key, "value": a.value, "sort_order": a.sort_order} for a in p.attributes]
    d["variants"] = [{"variant_type": v.variant_type, "variant_value": v.variant_value, "sort_order": v.sort_order} for v in p.variants]
    d["images"] = [{"url": i.url, "sort_order": i.sort_order} for i in p.images]
    return d


def _ser_category(c: Category, children=None) -> dict:
    d = {
        "id": c.id,
        "name": c.name,
        "parent_id": c.parent_id,
        "sort_order": c.sort_order,
        "created_at": str(c.created_at) if c.created_at else None,
    }
    if children is not None:
        d["children"] = children
    return d


# --- Auth ---

@app.post("/auth/login")
def login(req: LoginRequest):
    db = get_db()
    try:
        if req.username and req.password:
            user = db.query(User).filter_by(username=req.username).first()
            if not user or not bcrypt.checkpw(req.password.encode(), user.password_hash.encode()):
                raise HTTPException(400, "用户名或密码错误")
            return {
                "token": f"token_{user.id}",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "nickname": user.nickname,
                    "phone": user.phone,
                    "role": user.role,
                },
            }
        return {"token": "token_wechat", "user": {"id": 0, "nickname": "微信用户", "role": "dealer"}}
    finally:
        db.close()


@app.get("/user/profile")
def get_profile():
    db = get_db()
    try:
        user = db.query(User).filter_by(id=1).first()
        if not user:
            raise HTTPException(404, "用户不存在")
        return {"id": user.id, "username": user.username, "nickname": user.nickname, "phone": user.phone, "role": user.role}
    finally:
        db.close()


# --- Categories ---

@app.get("/categories")
def list_categories(parent_id: int | None = None, flat: bool = False):
    db = get_db()
    try:
        if parent_id is not None:
            cats = db.query(Category).filter_by(parent_id=parent_id).order_by(Category.sort_order).all()
            return [_ser_category(c) for c in cats]

        if flat:
            # Parent-aware ordering: group children under their root, sorted by root sort_order
            rows = db.execute(text("""
                SELECT c.id, c.name, c.parent_id, c.sort_order, c.created_at
                FROM category c
                LEFT JOIN category p ON c.parent_id = p.id
                ORDER BY
                  COALESCE(p.sort_order, c.sort_order),
                  c.parent_id IS NOT NULL,
                  c.sort_order
            """)).mappings().all()
            # product counts
            counts = dict(db.query(Product.category_id, func.count(Product.id))
                          .filter(Product.category_id.isnot(None))
                          .group_by(Product.category_id).all())
            result = []
            for r in rows:
                result.append({
                    "id": r["id"],
                    "name": r["name"],
                    "parent_id": r["parent_id"],
                    "sort_order": r["sort_order"],
                    "created_at": str(r["created_at"]) if r["created_at"] else None,
                    "product_count": counts.get(r["id"], 0),
                })
            return result

        # tree
        all_cats = db.query(Category).order_by(Category.sort_order).all()
        by_id: dict[int, dict] = {c.id: _ser_category(c, children=[]) for c in all_cats}
        roots = []
        for c in all_cats:
            node = by_id[c.id]
            if c.parent_id and c.parent_id in by_id:
                by_id[c.parent_id]["children"].append(node)
            else:
                roots.append(node)
        return roots
    finally:
        db.close()


@app.post("/categories")
def create_category(req: CategoryCreate):
    db = get_db()
    try:
        cat = Category(name=req.name, parent_id=req.parent_id, sort_order=req.sort_order)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        return {"id": cat.id, "name": cat.name}
    finally:
        db.close()


@app.delete("/categories/{cat_id}")
def delete_category(cat_id: int):
    db = get_db()
    try:
        cat = db.query(Category).filter_by(id=cat_id).first()
        if cat:
            db.delete(cat)
            db.commit()
        return {"ok": True}
    finally:
        db.close()


@app.get("/categories/{cat_id}/products")
def list_category_products(cat_id: int):
    db = get_db()
    try:
        products = (db.query(Product)
                    .filter_by(category_id=cat_id)
                    .order_by(Product.sort_order, Product.id).all())
        return [{"id": p.id, "model": p.model, "name": p.name, "is_hot": bool(p.is_hot)} for p in products]
    finally:
        db.close()


# --- Products ---

def _collect_category_ids(db: Session, root_id: int) -> list[int]:
    result = [root_id]
    queue = [root_id]
    while queue:
        current = queue.pop(0)
        children = db.query(Category.id).filter_by(parent_id=current).all()
        for (cid,) in children:
            result.append(cid)
            queue.append(cid)
    return result


@app.get("/products")
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    category_id: int | None = None,
    keyword: str | None = None,
    include_subcategories: bool = True,
    sort_by: str = Query("default", pattern="^(default|model|category|id)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
):
    db = get_db()
    try:
        q = db.query(Product)

        if category_id:
            if include_subcategories:
                ids = _collect_category_ids(db, category_id)
                q = q.filter(Product.category_id.in_(ids))
            else:
                q = q.filter(Product.category_id == category_id)

        if keyword:
            q = q.filter(or_(Product.name.ilike(f"%{keyword}%"), Product.model.ilike(f"%{keyword}%")))

        total = q.count()
        offset = (page - 1) * page_size

        # ordering
        from sqlalchemy import asc, desc
        dir_fn = desc if sort_dir == "desc" else asc
        if sort_by == "model":
            q = q.order_by(dir_fn(Product.model))
        elif sort_by == "category":
            q = q.join(Category, Product.category_id == Category.id, isouter=True).order_by(dir_fn(Category.name), asc(Product.model))
        elif sort_by == "id":
            q = q.order_by(dir_fn(Product.id))
        else:
            q = q.order_by(asc(Product.sort_order), asc(Product.id))

        products = q.offset(offset).limit(page_size).all()

        items = []
        for p in products:
            d = _ser_product_base(p)
            cover = p.images[0] if p.images else None
            d["images"] = [{"url": cover.url, "sort_order": 0}] if cover else []
            items.append(d)

        return {"items": items, "page": page, "page_size": page_size, "total": total}
    finally:
        db.close()


@app.get("/products/hot")
def list_hot_products():
    db = get_db()
    try:
        products = (db.query(Product)
                    .filter_by(is_hot=True)
                    .order_by(Product.sort_order)
                    .limit(8).all())
        return [_ser_product_base(p) for p in products]
    finally:
        db.close()


@app.get("/products/{product_id}")
def get_product(product_id: int):
    db = get_db()
    try:
        p = db.query(Product).filter_by(id=product_id).first()
        if not p:
            raise HTTPException(404, "产品不存在")
        return _ser_product_full(p)
    finally:
        db.close()


@app.post("/products")
def create_product(req: ProductCreate):
    if not req.model.strip():
        raise HTTPException(400, "型号不能为空")
    db = get_db()
    try:
        p = Product(
            name=req.name, model=req.model, description=req.description,
            category_id=req.category_id, is_hot=req.is_hot,
            sort_order=req.sort_order, price=req.price,
            discount_price=req.discount_price, show_price=req.show_price,
        )
        db.add(p)
        db.flush()
        for a in req.attributes:
            db.add(ProductAttribute(product_id=p.id, key=a.key, value=a.value, sort_order=a.sort_order))
        for v in req.variants:
            db.add(ProductVariant(product_id=p.id, variant_type=v.variant_type, variant_value=v.variant_value, sort_order=v.sort_order))
        for img in req.images:
            db.add(ProductImage(product_id=p.id, url=img.url, sort_order=img.sort_order))
        db.commit()
        return {"id": p.id}
    finally:
        db.close()


@app.put("/products/{product_id}")
def update_product(product_id: int, req: ProductUpdate):
    if req.model is not None and not req.model.strip():
        raise HTTPException(400, "型号不能为空")
    db = get_db()
    try:
        p = db.query(Product).filter_by(id=product_id).first()
        if not p:
            raise HTTPException(404, "产品不存在")

        for field in ("name", "model", "description", "category_id", "sort_order"):
            val = getattr(req, field)
            if val is not None:
                setattr(p, field, val)
        if req.is_hot is not None:
            p.is_hot = req.is_hot
        if req.show_price is not None:
            p.show_price = req.show_price
        for field in ("price", "discount_price"):
            if field in req.model_fields_set:
                setattr(p, field, getattr(req, field))

        if req.attributes is not None:
            for a in list(p.attributes):
                db.delete(a)
            for a in req.attributes:
                db.add(ProductAttribute(product_id=p.id, key=a.key, value=a.value, sort_order=a.sort_order))

        if req.variants is not None:
            for v in list(p.variants):
                db.delete(v)
            for v in req.variants:
                db.add(ProductVariant(product_id=p.id, variant_type=v.variant_type, variant_value=v.variant_value, sort_order=v.sort_order))

        if req.images is not None:
            for i in list(p.images):
                db.delete(i)
            for img in req.images:
                db.add(ProductImage(product_id=p.id, url=img.url, sort_order=img.sort_order))

        db.commit()
        return {"ok": True}
    finally:
        db.close()


@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    db = get_db()
    try:
        p = db.query(Product).filter_by(id=product_id).first()
        if not p:
            return {"ok": True}
        db.delete(p)
        db.flush()
        # Shift all higher IDs down by 1 to keep sequence contiguous
        db.execute(text("UPDATE product SET id = id - 1 WHERE id > :pid"), {"pid": product_id})
        db.execute(text("ALTER TABLE product AUTO_INCREMENT = :ai"), {
            "ai": max(1, (db.execute(text("SELECT MAX(id) FROM product")).scalar() or 0) + 1)
        })
        db.commit()
        return {"ok": True}
    finally:
        db.close()


class BulkImportItem(BaseModel):
    model: str
    name: str = ""
    description: str = ""
    category_id: int | None = None
    is_hot: bool = False
    sort_order: int = 0
    price: float | None = None
    discount_price: float | None = None
    show_price: bool = False
    attributes: list[AttributeItem] = []
    variants: list[VariantItem] = []
    images: list[ImageItem] = []


@app.post("/products/import")
def bulk_import_products(items: list[BulkImportItem]):
    db = get_db()
    try:
        imported = 0
        skipped = 0
        errors = []
        for item in items:
            if not item.model.strip():
                skipped += 1
                continue
            existing = db.query(Product).filter_by(model=item.model.strip()).first()
            if existing:
                skipped += 1
                continue
            try:
                p = Product(
                    name=item.name, model=item.model.strip(), description=item.description,
                    category_id=item.category_id, is_hot=item.is_hot,
                    sort_order=item.sort_order, price=item.price,
                    discount_price=item.discount_price, show_price=item.show_price,
                )
                db.add(p)
                db.flush()
                for a in item.attributes:
                    db.add(ProductAttribute(product_id=p.id, key=a.key, value=a.value, sort_order=a.sort_order))
                for v in item.variants:
                    db.add(ProductVariant(product_id=p.id, variant_type=v.variant_type, variant_value=v.variant_value, sort_order=v.sort_order))
                for img in item.images:
                    db.add(ProductImage(product_id=p.id, url=img.url, sort_order=img.sort_order))
                db.commit()
                imported += 1
            except Exception as e:
                db.rollback()
                errors.append(f"{item.model}: {str(e)}")
        return {"imported": imported, "skipped": skipped, "errors": errors}
    finally:
        db.close()


# --- Banners ---

@app.get("/banners")
def list_banners():
    db = get_db()
    try:
        banners = db.query(Banner).filter_by(is_active=True).order_by(Banner.sort_order).all()
        return [{"id": b.id, "title": b.title, "subtitle": b.subtitle, "tag": b.tag,
                 "image_url": b.image_url, "link_product_id": b.link_product_id,
                 "sort_order": b.sort_order, "is_active": b.is_active} for b in banners]
    finally:
        db.close()


@app.post("/banners")
def create_banner(req: BannerCreate):
    db = get_db()
    try:
        b = Banner(title=req.title, subtitle=req.subtitle, tag=req.tag,
                   link_product_id=req.link_product_id, sort_order=req.sort_order)
        db.add(b)
        db.commit()
        db.refresh(b)
        return {"id": b.id}
    finally:
        db.close()


@app.delete("/banners/{banner_id}")
def delete_banner(banner_id: int):
    db = get_db()
    try:
        b = db.query(Banner).filter_by(id=banner_id).first()
        if b:
            db.delete(b)
            db.commit()
        return {"ok": True}
    finally:
        db.close()


# --- Announcements ---

@app.get("/announcements")
def list_announcements():
    db = get_db()
    try:
        anns = db.query(Announcement).filter_by(is_active=True).order_by(Announcement.id.desc()).all()
        return [{"id": a.id, "content": a.content, "is_active": a.is_active,
                 "created_at": str(a.created_at) if a.created_at else None} for a in anns]
    finally:
        db.close()


@app.post("/announcements")
def create_announcement(req: AnnouncementCreate):
    db = get_db()
    try:
        a = Announcement(content=req.content)
        db.add(a)
        db.commit()
        db.refresh(a)
        return {"id": a.id}
    finally:
        db.close()


@app.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int):
    db = get_db()
    try:
        a = db.query(Announcement).filter_by(id=ann_id).first()
        if a:
            db.delete(a)
            db.commit()
        return {"ok": True}
    finally:
        db.close()


# --- Company Info ---

class CompanyInfoUpdate(BaseModel):
    company_name: str | None = None
    slogan: str | None = None
    description: str | None = None
    phone: str | None = None
    address: str | None = None
    email: str | None = None
    wechat: str | None = None

@app.get("/company")
def get_company():
    db = get_db()
    try:
        info = db.query(CompanyInfo).filter_by(id=1).first()
        if not info:
            return {"id": 1, "company_name": "", "slogan": "", "description": "", "phone": "", "address": "", "email": "", "wechat": ""}
        return {
            "id": info.id,
            "company_name": info.company_name or "",
            "slogan": info.slogan or "",
            "description": info.description or "",
            "phone": info.phone or "",
            "address": info.address or "",
            "email": info.email or "",
            "wechat": info.wechat or "",
            "updated_at": str(info.updated_at) if info.updated_at else None,
        }
    finally:
        db.close()

@app.put("/company")
def update_company(req: CompanyInfoUpdate):
    db = get_db()
    try:
        info = db.query(CompanyInfo).filter_by(id=1).first()
        if not info:
            info = CompanyInfo(id=1)
            db.add(info)
        for field in ("company_name", "slogan", "description", "phone", "address", "email", "wechat"):
            val = getattr(req, field)
            if val is not None:
                setattr(info, field, val)
        db.commit()
        return {"ok": True}
    finally:
        db.close()


# --- Project Cases ---

class ProjectCaseCreate(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True
    images: list[str] = []
    descriptions: list[str] = []

class ProjectCaseUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    images: list[str] | None = None
    descriptions: list[str] | None = None

def _ser_case(c) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "sort_order": c.sort_order,
        "is_active": bool(c.is_active),
        "created_at": str(c.created_at) if c.created_at else None,
        "images": [{"id": i.id, "url": i.url, "sort_order": i.sort_order} for i in c.images],
        "descriptions": [{"id": d.id, "content": d.content, "sort_order": d.sort_order} for d in c.descriptions],
    }

@app.get("/cases")
def list_cases(active_only: bool = False):
    db = get_db()
    try:
        q = db.query(ProjectCase)
        if active_only:
            q = q.filter_by(is_active=True)
        cases = q.order_by(ProjectCase.sort_order, ProjectCase.id).all()
        return [_ser_case(c) for c in cases]
    finally:
        db.close()

@app.get("/cases/{case_id}")
def get_case(case_id: int):
    db = get_db()
    try:
        c = db.query(ProjectCase).filter_by(id=case_id).first()
        if not c:
            raise HTTPException(404, "案例不存在")
        return _ser_case(c)
    finally:
        db.close()

@app.post("/cases")
def create_case(req: ProjectCaseCreate):
    db = get_db()
    try:
        c = ProjectCase(name=req.name, sort_order=req.sort_order, is_active=req.is_active)
        db.add(c)
        db.flush()
        for i, url in enumerate(req.images):
            db.add(ProjectCaseImage(case_id=c.id, url=url, sort_order=i))
        for i, content in enumerate(req.descriptions):
            db.add(ProjectCaseDesc(case_id=c.id, content=content, sort_order=i))
        db.commit()
        return {"id": c.id}
    finally:
        db.close()

@app.put("/cases/{case_id}")
def update_case(case_id: int, req: ProjectCaseUpdate):
    db = get_db()
    try:
        c = db.query(ProjectCase).filter_by(id=case_id).first()
        if not c:
            raise HTTPException(404, "案例不存在")
        if req.name is not None:
            c.name = req.name
        if req.sort_order is not None:
            c.sort_order = req.sort_order
        if req.is_active is not None:
            c.is_active = req.is_active
        if req.images is not None:
            for img in list(c.images):
                db.delete(img)
            for i, url in enumerate(req.images):
                db.add(ProjectCaseImage(case_id=c.id, url=url, sort_order=i))
        if req.descriptions is not None:
            for d in list(c.descriptions):
                db.delete(d)
            for i, content in enumerate(req.descriptions):
                db.add(ProjectCaseDesc(case_id=c.id, content=content, sort_order=i))
        db.commit()
        return {"ok": True}
    finally:
        db.close()

@app.delete("/cases/{case_id}")
def delete_case(case_id: int):
    db = get_db()
    try:
        c = db.query(ProjectCase).filter_by(id=case_id).first()
        if c:
            db.delete(c)
            db.commit()
        return {"ok": True}
    finally:
        db.close()


mcp = FastApiMCP(app)
mcp.mount_http()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
