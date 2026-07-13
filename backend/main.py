from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP
from pydantic import BaseModel
from database import get_db, init_db


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


# --- Models ---


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


class ProductCreate(BaseModel):
    name: str
    model: str = ""
    description: str = ""
    category_id: int | None = None
    is_hot: bool = False
    sort_order: int = 0
    attributes: list[AttributeItem] = []
    variants: list[VariantItem] = []


class ProductUpdate(BaseModel):
    name: str | None = None
    model: str | None = None
    description: str | None = None
    category_id: int | None = None
    is_hot: bool | None = None
    sort_order: int | None = None
    attributes: list[AttributeItem] | None = None
    variants: list[VariantItem] | None = None


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


# --- Auth ---


@app.post("/auth/login")
def login(req: LoginRequest):
    db = get_db()
    if req.username and req.password:
        row = db.execute(
            "SELECT * FROM user WHERE username = ?", (req.username,)
        ).fetchone()
        db.close()
        if not row or row["password_hash"] != req.password:
            raise HTTPException(400, "用户名或密码错误")
        return {
            "token": f"token_{row['id']}",
            "user": {
                "id": row["id"],
                "username": row["username"],
                "nickname": row["nickname"],
                "phone": row["phone"],
                "role": row["role"],
            },
        }
    db.close()
    return {"token": "token_wechat", "user": {"id": 0, "nickname": "微信用户", "role": "dealer"}}


@app.get("/user/profile")
def get_profile():
    db = get_db()
    row = db.execute("SELECT * FROM user WHERE id = 1").fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "用户不存在")
    return {
        "id": row["id"],
        "username": row["username"],
        "nickname": row["nickname"],
        "phone": row["phone"],
        "role": row["role"],
    }


# --- Categories ---


@app.get("/categories")
def list_categories(parent_id: int | None = None, flat: bool = False):
    """
    默认返回完整树形结构。
    ?flat=true  返回扁平列表（含 parent_id 字段）。
    ?parent_id=N  返回指定父级的直接子品类（隐含 flat=true）。
    """
    db = get_db()

    if parent_id is not None:
        rows = db.execute(
            "SELECT * FROM category WHERE parent_id = ? ORDER BY sort_order",
            (parent_id,),
        ).fetchall()
        db.close()
        return [dict(r) for r in rows]

    rows = db.execute("SELECT * FROM category ORDER BY sort_order").fetchall()
    db.close()
    items = [dict(r) for r in rows]

    if flat:
        return items

    # 构建树
    by_id = {item["id"]: {**item, "children": []} for item in items}
    roots = []
    for item in by_id.values():
        pid = item["parent_id"]
        if pid and pid in by_id:
            by_id[pid]["children"].append(item)
        else:
            roots.append(item)
    return roots


@app.post("/categories")
def create_category(req: CategoryCreate):
    db = get_db()
    cursor = db.execute(
        "INSERT INTO category (name, parent_id, sort_order) VALUES (?, ?, ?)",
        (req.name, req.parent_id, req.sort_order),
    )
    db.commit()
    cat_id = cursor.lastrowid
    db.close()
    return {"id": cat_id, "name": req.name}


@app.delete("/categories/{cat_id}")
def delete_category(cat_id: int):
    db = get_db()
    db.execute("DELETE FROM category WHERE id = ?", (cat_id,))
    db.commit()
    db.close()
    return {"ok": True}


# --- Products ---


def _attach_product_details(db, product: dict) -> dict:
    pid = product["id"]
    attrs = db.execute(
        "SELECT key, value, sort_order FROM product_attribute WHERE product_id = ? ORDER BY sort_order",
        (pid,),
    ).fetchall()
    product["attributes"] = [dict(a) for a in attrs]

    variants = db.execute(
        "SELECT variant_type, variant_value, sort_order FROM product_variant WHERE product_id = ? ORDER BY sort_order",
        (pid,),
    ).fetchall()
    product["variants"] = [dict(v) for v in variants]

    images = db.execute(
        "SELECT url, sort_order FROM product_image WHERE product_id = ? ORDER BY sort_order",
        (pid,),
    ).fetchall()
    product["images"] = [dict(i) for i in images]

    return product


@app.get("/products")
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category_id: int | None = None,
    keyword: str | None = None,
    include_subcategories: bool = False,
):
    db = get_db()
    conditions = []
    params: list = []

    if category_id:
        if include_subcategories:
            # 收集该品类及所有后代 id
            all_ids = _collect_category_ids(db, category_id)
            placeholders = ",".join("?" * len(all_ids))
            conditions.append(f"p.category_id IN ({placeholders})")
            params.extend(all_ids)
        else:
            conditions.append("p.category_id = ?")
            params.append(category_id)

    if keyword:
        conditions.append("(p.name LIKE ? OR p.model LIKE ?)")
        params.extend([f"%{keyword}%", f"%{keyword}%"])

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    offset = (page - 1) * page_size

    total = db.execute(
        f"SELECT COUNT(*) FROM product p {where}", params
    ).fetchone()[0]

    rows = db.execute(
        f"""
        SELECT p.*, c.name as category_name
        FROM product p
        LEFT JOIN category c ON p.category_id = c.id
        {where}
        ORDER BY p.sort_order, p.id
        LIMIT ? OFFSET ?
        """,
        params + [page_size, offset],
    ).fetchall()

    items = []
    for r in rows:
        item = dict(r)
        item["is_hot"] = bool(item["is_hot"])
        items.append(item)

    db.close()
    return {"items": items, "page": page, "page_size": page_size, "total": total}


def _collect_category_ids(db, root_id: int) -> list[int]:
    """BFS 收集 root_id 及其所有后代品类 id。"""
    result = [root_id]
    queue = [root_id]
    while queue:
        current = queue.pop(0)
        children = db.execute(
            "SELECT id FROM category WHERE parent_id = ?", (current,)
        ).fetchall()
        for c in children:
            result.append(c["id"])
            queue.append(c["id"])
    return result


@app.get("/products/hot")
def list_hot_products():
    db = get_db()
    rows = db.execute(
        """
        SELECT p.*, c.name as category_name
        FROM product p
        LEFT JOIN category c ON p.category_id = c.id
        WHERE p.is_hot = 1
        ORDER BY p.sort_order
        LIMIT 8
        """
    ).fetchall()
    db.close()
    items = []
    for r in rows:
        item = dict(r)
        item["is_hot"] = True
        items.append(item)
    return items


@app.get("/products/{product_id}")
def get_product(product_id: int):
    db = get_db()
    row = db.execute(
        """
        SELECT p.*, c.name as category_name
        FROM product p
        LEFT JOIN category c ON p.category_id = c.id
        WHERE p.id = ?
        """,
        (product_id,),
    ).fetchone()

    if not row:
        db.close()
        raise HTTPException(404, "产品不存在")

    product = dict(row)
    product["is_hot"] = bool(product["is_hot"])
    product = _attach_product_details(db, product)
    db.close()
    return product


@app.post("/products")
def create_product(req: ProductCreate):
    db = get_db()
    cursor = db.execute(
        "INSERT INTO product (name, model, description, category_id, is_hot, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        (req.name, req.model, req.description, req.category_id, int(req.is_hot), req.sort_order),
    )
    product_id = cursor.lastrowid

    for attr in req.attributes:
        db.execute(
            "INSERT INTO product_attribute (product_id, key, value, sort_order) VALUES (?, ?, ?, ?)",
            (product_id, attr.key, attr.value, attr.sort_order),
        )

    for v in req.variants:
        db.execute(
            "INSERT INTO product_variant (product_id, variant_type, variant_value, sort_order) VALUES (?, ?, ?, ?)",
            (product_id, v.variant_type, v.variant_value, v.sort_order),
        )

    db.commit()
    db.close()
    return {"id": product_id}


@app.put("/products/{product_id}")
def update_product(product_id: int, req: ProductUpdate):
    db = get_db()
    row = db.execute("SELECT id FROM product WHERE id = ?", (product_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "产品不存在")

    updates = []
    params: list = []
    for field in ("name", "model", "description", "category_id", "sort_order"):
        val = getattr(req, field)
        if val is not None:
            updates.append(f"{field} = ?")
            params.append(val)
    if req.is_hot is not None:
        updates.append("is_hot = ?")
        params.append(int(req.is_hot))

    if updates:
        params.append(product_id)
        db.execute(f"UPDATE product SET {', '.join(updates)} WHERE id = ?", params)

    if req.attributes is not None:
        db.execute("DELETE FROM product_attribute WHERE product_id = ?", (product_id,))
        for attr in req.attributes:
            db.execute(
                "INSERT INTO product_attribute (product_id, key, value, sort_order) VALUES (?, ?, ?, ?)",
                (product_id, attr.key, attr.value, attr.sort_order),
            )

    if req.variants is not None:
        db.execute("DELETE FROM product_variant WHERE product_id = ?", (product_id,))
        for v in req.variants:
            db.execute(
                "INSERT INTO product_variant (product_id, variant_type, variant_value, sort_order) VALUES (?, ?, ?, ?)",
                (product_id, v.variant_type, v.variant_value, v.sort_order),
            )

    db.commit()
    db.close()
    return {"ok": True}


@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    db = get_db()
    db.execute("DELETE FROM product WHERE id = ?", (product_id,))
    db.commit()
    db.close()
    return {"ok": True}


# --- Banners ---


@app.get("/banners")
def list_banners():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM banner WHERE is_active = 1 ORDER BY sort_order"
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/banners")
def create_banner(req: BannerCreate):
    db = get_db()
    cursor = db.execute(
        "INSERT INTO banner (title, subtitle, tag, link_product_id, sort_order) VALUES (?, ?, ?, ?, ?)",
        (req.title, req.subtitle, req.tag, req.link_product_id, req.sort_order),
    )
    db.commit()
    banner_id = cursor.lastrowid
    db.close()
    return {"id": banner_id}


@app.delete("/banners/{banner_id}")
def delete_banner(banner_id: int):
    db = get_db()
    db.execute("DELETE FROM banner WHERE id = ?", (banner_id,))
    db.commit()
    db.close()
    return {"ok": True}


# --- Announcements ---


@app.get("/announcements")
def list_announcements():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM announcement WHERE is_active = 1 ORDER BY id DESC"
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/announcements")
def create_announcement(req: AnnouncementCreate):
    db = get_db()
    cursor = db.execute("INSERT INTO announcement (content) VALUES (?)", (req.content,))
    db.commit()
    ann_id = cursor.lastrowid
    db.close()
    return {"id": ann_id}


@app.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int):
    db = get_db()
    db.execute("DELETE FROM announcement WHERE id = ?", (ann_id,))
    db.commit()
    db.close()
    return {"ok": True}


mcp = FastApiMCP(app)
mcp.mount()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
