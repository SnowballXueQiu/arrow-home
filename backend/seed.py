"""
占位种子数据 — 所有品类 + 空产品条目。
后续导入真实数据（CSV / Excel / JSON）后可覆盖或追加，
本脚本本身不带任何硬编码的产品属性。

运行：
    uv run python seed.py
"""

from database import get_db, init_db

# ---------------------------------------------------------------------------
# 品类树（id 固定，便于后续 FK 引用）
# ---------------------------------------------------------------------------
# 顶级品类
TOP = [
    (1,  "坐便器",    None),
    (2,  "台盆",      None),
    (3,  "便器",      None),   # 不含坐便器
    (4,  "五金龙头",  None),
    (5,  "淋浴花洒",  None),
    (6,  "浴缸系列",  None),
    (7,  "浴室柜",    None),
]

# 子品类 (id, name, parent_id)
SUB = [
    # 坐便器
    (11, "智能坐便器",    1),
    (12, "轻智能坐便器",  1),
    (13, "连体坐便器",    1),
    # 便器（不含坐便器）
    (31, "小便器",        3),
    (32, "蹲便器",        3),
    (33, "塑料水箱",      3),
    (34, "入墙式水箱",    3),
    (35, "延时阀",        3),
    (36, "感应龙头",      3),
    (37, "感应器",        3),
    # 淋浴花洒
    (51, "附属配件",      5),
    # 浴缸系列
    (61, "浴缸",          6),
    (62, "浴缸龙头",      6),
    (63, "浴缸去水器",    6),
]

# ---------------------------------------------------------------------------
# 占位产品 (name, model, category_id, placeholder_count)
# placeholder_count = 品类下的产品数量（来自需求文档）
# 每个占位产品的 model 用 "TBD_序号" 填充
# ---------------------------------------------------------------------------
PLACEHOLDER_PRODUCTS = [
    # (category_id, count, display_name)
    (11, 12, "智能坐便器"),
    (12, 10, "轻智能坐便器"),
    (13, 13, "连体坐便器"),
    (2,  33, "台盆"),        # 顶级品类；33种，颜色变体后续补
    (31, 16, "小便器"),
    (32,  7, "蹲便器"),
    (33,  7, "塑料水箱"),
    (34,  6, "入墙式水箱"),
    (35,  8, "延时阀"),
    (36, 15, "感应龙头"),
    (37, 23, "感应器"),
    (4,  20, "五金龙头"),
    (5,  29, "淋浴花洒"),
    (51,  2, "附属配件"),
    (61, 15, "浴缸"),
    (62,  5, "浴缸龙头"),
    (63,  3, "浴缸去水器"),
    (7,   6, "浴室柜"),
]


def seed():
    init_db()
    db = get_db()

    # 管理员账号
    db.execute(
        "INSERT OR IGNORE INTO user (id, username, password_hash, nickname, role) VALUES (1, 'admin', 'admin123', '管理员', 'admin')"
    )

    # 品类
    for (cid, name, parent) in TOP:
        db.execute(
            "INSERT OR IGNORE INTO category (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)",
            (cid, name, parent, cid),
        )
    for idx, (cid, name, parent) in enumerate(SUB):
        db.execute(
            "INSERT OR IGNORE INTO category (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)",
            (cid, name, parent, idx),
        )

    # 占位产品（仅当该品类下还没有产品时才插入）
    product_id = 1
    for (cat_id, count, display_name) in PLACEHOLDER_PRODUCTS:
        existing = db.execute(
            "SELECT COUNT(*) FROM product WHERE category_id = ?", (cat_id,)
        ).fetchone()[0]
        if existing >= count:
            product_id += count
            continue
        to_insert = count - existing
        for i in range(to_insert):
            seq = existing + i + 1
            db.execute(
                "INSERT OR IGNORE INTO product (id, name, model, category_id, sort_order) VALUES (?, ?, ?, ?, ?)",
                (product_id, f"{display_name} {seq:02d}", f"TBD_{product_id:04d}", cat_id, seq),
            )
            # model is the primary identifier; name is kept for legacy compat
            product_id += 1
        # 补足 product_id 计数
        # (已在循环内自增)

    db.commit()
    db.close()
    print("种子数据写入完成")


if __name__ == "__main__":
    seed()
