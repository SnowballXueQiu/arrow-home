import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    schema_path = Path(__file__).parent / "schema.sql"
    with open(schema_path, "r") as f:
        conn.executescript(f.read())
    # migrate existing databases that predate price columns
    existing = {row[1] for row in conn.execute("PRAGMA table_info(product)")}
    for col, typedef in [
        ("price", "REAL DEFAULT NULL"),
        ("discount_price", "REAL DEFAULT NULL"),
        ("show_price", "INTEGER DEFAULT 0"),
    ]:
        if col not in existing:
            conn.execute(f"ALTER TABLE product ADD COLUMN {col} {typedef}")
    conn.commit()
    conn.close()
