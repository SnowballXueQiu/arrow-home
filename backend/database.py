import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean,
    ForeignKey, DateTime, Text, func
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://arrow:arrowpass@db:33061/arrow_home"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


# ---------- ORM Models ----------

class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(100), default="")
    phone = Column(String(50), default="")
    role = Column(String(50), default="dealer")
    openid = Column(String(100), default="")
    created_at = Column(DateTime, server_default=func.now())


class Category(Base):
    __tablename__ = "category"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("category.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    parent = relationship("Category", remote_side="Category.id", foreign_keys=[parent_id])
    children = relationship("Category", foreign_keys=[parent_id], back_populates="parent")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "product"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), default="")
    model = Column(String(255), nullable=False, default="")
    description = Column(Text, default="")
    category_id = Column(Integer, ForeignKey("category.id", ondelete="SET NULL"), nullable=True)
    is_hot = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    price = Column(Float, nullable=True)
    discount_price = Column(Float, nullable=True)
    show_price = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("Category", back_populates="products")
    attributes = relationship("ProductAttribute", back_populates="product", cascade="all, delete-orphan", order_by="ProductAttribute.sort_order")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", order_by="ProductVariant.sort_order")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")


class ProductAttribute(Base):
    __tablename__ = "product_attribute"
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("product.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="attributes")


class ProductVariant(Base):
    __tablename__ = "product_variant"
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("product.id", ondelete="CASCADE"), nullable=False)
    variant_type = Column(String(255), nullable=False)
    variant_value = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="variants")


class ProductImage(Base):
    __tablename__ = "product_image"
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("product.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="images")


class Banner(Base):
    __tablename__ = "banner"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), default="")
    tag = Column(String(100), default="")
    image_url = Column(Text, default="")
    link_product_id = Column(Integer, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Announcement(Base):
    __tablename__ = "announcement"
    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ---------- Helpers ----------

def get_db() -> Session:
    return SessionLocal()


def init_db():
    Base.metadata.create_all(bind=engine)
    import bcrypt
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_hash = os.getenv(
        "ADMIN_PASSWORD_HASH",
        bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(),
    )
    db = SessionLocal()
    try:
        existing = db.query(User).filter_by(username=admin_username).first()
        if not existing:
            db.add(User(id=1, username=admin_username, password_hash=admin_hash, nickname="管理员", role="admin"))
            db.commit()
        elif existing.password_hash != admin_hash:
            # Update hash if env changed
            existing.password_hash = admin_hash
            existing.username = admin_username
            db.commit()
    finally:
        db.close()
