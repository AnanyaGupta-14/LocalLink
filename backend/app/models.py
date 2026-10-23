from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Area(Base):
    """A predefined service zone. Vendors, customers and delivery partners belong to one."""
    __tablename__ = "areas"
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    city = Column(String(80), default="Nagpur")
    pincode = Column(String(10), default="")
    active = Column(Boolean, default=True)


class User(Base):
    """customer | vendor | delivery | admin"""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, nullable=False, index=True)
    phone = Column(String(20), default="")
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, index=True)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=True)
    available = Column(Boolean, default=False)  # delivery partner "on duty"
    vehicle = Column(String(60), default="")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    area = relationship("Area")


class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    shop_name = Column(String(140), nullable=False)
    address = Column(String(300), default="")
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    phone = Column(String(20), default="")
    category = Column(String(80), default="General Store")
    description = Column(Text, default="")
    status = Column(String(20), default="pending", index=True)  # pending | approved | rejected | suspended
    is_open = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")
    area = relationship("Area")
    products = relationship("Product", back_populates="vendor", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    name = Column(String(160), nullable=False)
    description = Column(Text, default="")
    category = Column(String(80), default="General")
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    available = Column(Boolean, default=True)
    vendor = relationship("Vendor", back_populates="products")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    delivery_partner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # placed | accepted | rejected | preparing | ready | assigned | picked_up | out_for_delivery | delivered
    status = Column(String(30), default="placed", index=True)
    delivery_fee = Column(Float, default=0)
    total = Column(Float, default=0)
    address = Column(Text, default="")
    note = Column(Text, default="")
    otp = Column(String(4), default="")
    reject_reason = Column(String(200), default="")
    history = Column(Text, default="[]")  # JSON list of {status, at, note}
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    vendor = relationship("Vendor")
    area = relationship("Area")
    customer = relationship("User", foreign_keys=[customer_id])
    partner = relationship("User", foreign_keys=[delivery_partner_id])


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    name = Column(String(160))
    price = Column(Float)
    qty = Column(Integer)
    order = relationship("Order", back_populates="items")
