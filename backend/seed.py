"""
种子数据 — 品类 + 占位产品。
运行：uv run python seed.py
"""

from database import init_db, SessionLocal, User, Category, Product

TOP = [
    (1,  "坐便器",   None, 10),
    (2,  "台盆",     None, 20),
    (3,  "便器",     None, 30),
    (4,  "五金龙头", None, 40),
    (5,  "淋浴花洒", None, 50),
    (6,  "浴缸系列", None, 60),
    (7,  "浴室柜",   None, 70),
]

SUB = [
    (11, "智能坐便器",   1, 11),
    (12, "轻智能坐便器", 1, 12),
    (13, "连体坐便器",   1, 13),
    (31, "小便器",       3, 3),
    (32, "蹲便器",       3, 4),
    (33, "塑料水箱",     3, 5),
    (34, "入墙式水箱",   3, 6),
    (35, "延时阀",       3, 7),
    (37, "感应器",       3, 9),
    (51, "附属配件",     5, 10),
    (61, "浴缸",         6, 11),
    (62, "浴缸龙头",     6, 12),
]

PLACEHOLDER_PRODUCTS = [
    (11, 12, "智能坐便器"),
    (12, 10, "轻智能坐便器"),
    (13, 13, "连体坐便器"),
    (2,  33, "台盆"),
    (31, 16, "小便器"),
    (32,  7, "蹲便器"),
    (33,  7, "塑料水箱"),
    (34,  6, "入墙式水箱"),
    (35,  8, "延时阀"),
    (37, 23, "感应器"),
    (4,  20, "五金龙头"),
    (5,  29, "淋浴花洒"),
    (51,  2, "附属配件"),
    (61, 15, "浴缸"),
    (62,  5, "浴缸龙头"),
    (7,   6, "浴室柜"),
]


def seed():
    init_db()
    db = SessionLocal()
    try:
        for (cid, name, parent, sort) in TOP:
            if not db.query(Category).filter_by(id=cid).first():
                db.add(Category(id=cid, name=name, parent_id=parent, sort_order=sort))
        for (cid, name, parent, sort) in SUB:
            if not db.query(Category).filter_by(id=cid).first():
                db.add(Category(id=cid, name=name, parent_id=parent, sort_order=sort))
        db.commit()

        product_id = 1
        for (cat_id, count, display_name) in PLACEHOLDER_PRODUCTS:
            existing = db.query(Product).filter_by(category_id=cat_id).count()
            if existing >= count:
                product_id += count
                continue
            to_insert = count - existing
            for i in range(to_insert):
                seq = existing + i + 1
                if not db.query(Product).filter_by(id=product_id).first():
                    db.add(Product(
                        id=product_id,
                        name=f"{display_name} {seq:02d}",
                        model=f"TBD_{product_id:04d}",
                        category_id=cat_id,
                        sort_order=seq,
                    ))
                product_id += 1
        db.commit()
        print("种子数据写入完成")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
