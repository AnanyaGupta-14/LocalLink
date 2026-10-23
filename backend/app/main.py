import json
import random
import re
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from .auth import create_token, hash_password, require, verify_password
from .database import Base, SessionLocal, engine, get_db
from .models import Area, Order, OrderItem, Product, User, Vendor
from .search import semantic_search
from .seed import seed

FREE_DELIVERY_ABOVE = 500
DELIVERY_FEE = 20
ACTIVE_DELIVERY = ["assigned", "picked_up", "out_for_delivery"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="LocalLink API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------- schemas
class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: str
    password: str = Field(min_length=6)
    phone: str = ""
    role: str = "customer"  # customer | vendor | delivery
    area_id: int
    # vendor
    shop_name: str = ""
    address: str = ""
    category: str = "General Store"
    description: str = ""
    # delivery
    vehicle: str = ""


class LoginIn(BaseModel):
    email: str
    password: str


class ProductIn(BaseModel):
    name: str = Field(min_length=2)
    description: str = ""
    category: str = "General"
    price: float = Field(gt=0)
    stock: int = Field(ge=0)
    available: bool = True


class OrderItemIn(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=50)


class OrderIn(BaseModel):
    vendor_id: int
    items: List[OrderItemIn]
    address: str = Field(min_length=5)
    note: str = ""


class StatusIn(BaseModel):
    status: str
    reason: str = ""


class OtpIn(BaseModel):
    otp: str


class AreaIn(BaseModel):
    name: str = Field(min_length=2)
    city: str = "Nagpur"
    pincode: str = ""
    active: bool = True


class AssignIn(BaseModel):
    partner_id: int


class StatusOnly(BaseModel):
    status: str


# ---------------------------------------------------------------- helpers
def user_out(u: User, db: Optional[Session] = None):
    d = {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "role": u.role,
         "area_id": u.area_id, "area": u.area.name if u.area else None, "available": u.available,
         "vehicle": u.vehicle, "active": u.active}
    if u.role == "vendor" and db is not None:
        v = db.query(Vendor).filter(Vendor.user_id == u.id).first()
        d["vendor"] = vendor_out(v) if v else None
    return d


def vendor_out(v: Vendor, with_counts: bool = False):
    d = {"id": v.id, "shop_name": v.shop_name, "address": v.address, "area_id": v.area_id,
         "area": v.area.name if v.area else None, "phone": v.phone, "category": v.category,
         "description": v.description, "status": v.status, "is_open": v.is_open,
         "owner": v.user.name if v.user else None, "email": v.user.email if v.user else None}
    if with_counts:
        d["product_count"] = len(v.products)
    return d


def product_out(p: Product, score: Optional[float] = None):
    d = {"id": p.id, "name": p.name, "description": p.description, "category": p.category,
         "price": p.price, "stock": p.stock, "available": p.available, "vendor_id": p.vendor_id,
         "vendor": {"id": p.vendor.id, "shop_name": p.vendor.shop_name}}
    if score is not None:
        d["score"] = round(score, 3)
    return d


def order_out(o: Order, include_otp: bool = False):
    d = {
        "id": o.id, "status": o.status, "total": o.total, "delivery_fee": o.delivery_fee,
        "subtotal": round(o.total - o.delivery_fee, 2), "address": o.address, "note": o.note,
        "reject_reason": o.reject_reason, "created_at": o.created_at.isoformat() + "Z",
        "history": json.loads(o.history or "[]"), "area": o.area.name if o.area else None,
        "area_id": o.area_id,
        "items": [{"name": i.name, "price": i.price, "qty": i.qty} for i in o.items],
        "vendor": {"id": o.vendor.id, "shop_name": o.vendor.shop_name, "address": o.vendor.address,
                   "phone": o.vendor.phone},
        "customer": {"id": o.customer.id, "name": o.customer.name, "phone": o.customer.phone},
        "partner": ({"id": o.partner.id, "name": o.partner.name, "phone": o.partner.phone,
                     "vehicle": o.partner.vehicle} if o.partner else None),
    }
    if include_otp:
        d["otp"] = o.otp
    return d


def push(order: Order, status: str, note: Optional[str] = None):
    h = json.loads(order.history or "[]")
    h.append({"status": status, "at": datetime.utcnow().isoformat() + "Z", "note": note})
    order.history = json.dumps(h)
    order.status = status


def try_assign(db: Session, order: Order):
    """Zone-based assignment: pick the on-duty partner in the order's area with the fewest active deliveries."""
    if order.status != "ready" or order.delivery_partner_id:
        return
    partners = db.query(User).filter(User.role == "delivery", User.area_id == order.area_id,
                                     User.available == True, User.active == True).all()  # noqa: E712
    if not partners:
        return

    def load(u):
        return db.query(Order).filter(Order.delivery_partner_id == u.id, Order.status.in_(ACTIVE_DELIVERY)).count()

    best = min(partners, key=load)
    order.delivery_partner_id = best.id
    push(order, "assigned", f"Assigned to {best.name}")


def assign_pending(db: Session, area_id: int):
    pending = db.query(Order).filter(Order.area_id == area_id, Order.status == "ready",
                                     Order.delivery_partner_id.is_(None)).order_by(Order.id).all()
    for o in pending:
        try_assign(db, o)


def get_vendor(user: User, db: Session) -> Vendor:
    v = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not v:
        raise HTTPException(404, "Vendor profile not found")
    return v


def approved_vendor(user: User, db: Session) -> Vendor:
    v = get_vendor(user, db)
    if v.status != "approved":
        raise HTTPException(403, f"Your shop is {v.status}. An administrator must approve it first.")
    return v


# ---------------------------------------------------------------- public / auth
@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/areas")
def areas(db: Session = Depends(get_db)):
    rows = db.query(Area).filter(Area.active == True).order_by(Area.name).all()  # noqa: E712
    return [{"id": a.id, "name": a.name, "city": a.city, "pincode": a.pincode} for a in rows]


@app.post("/api/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if data.role not in ("customer", "vendor", "delivery"):
        raise HTTPException(400, "Invalid role")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", data.email):
        raise HTTPException(400, "Enter a valid email address")
    if db.query(User).filter(func.lower(User.email) == data.email.lower()).first():
        raise HTTPException(409, "An account with this email already exists")
    area = db.get(Area, data.area_id)
    if not area or not area.active:
        raise HTTPException(400, "Please choose a valid service area")
    if data.role == "vendor" and (not data.shop_name.strip() or not data.address.strip()):
        raise HTTPException(400, "Shop name and address are required for vendors")
    user = User(name=data.name, email=data.email.lower(), phone=data.phone,
                password_hash=hash_password(data.password), role=data.role, area_id=area.id,
                vehicle=data.vehicle if data.role == "delivery" else "")
    db.add(user)
    db.flush()
    if data.role == "vendor":
        db.add(Vendor(user_id=user.id, shop_name=data.shop_name, address=data.address, area_id=area.id,
                      phone=data.phone, category=data.category, description=data.description, status="pending"))
    db.commit()
    db.refresh(user)
    return {"token": create_token(user), "user": user_out(user, db)}


@app.post("/api/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == data.email.lower().strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    if not user.active:
        raise HTTPException(403, "This account has been deactivated")
    return {"token": create_token(user), "user": user_out(user, db)}


@app.get("/api/auth/me")
def me(user: User = Depends(require("customer", "vendor", "delivery", "admin")), db: Session = Depends(get_db)):
    return user_out(user, db)


# ---------------------------------------------------------------- customer browsing
@app.get("/api/vendors")
def list_vendors(area_id: int, db: Session = Depends(get_db)):
    vs = db.query(Vendor).filter(Vendor.status == "approved", Vendor.area_id == area_id).order_by(Vendor.shop_name).all()
    return [vendor_out(v, with_counts=True) for v in vs]


@app.get("/api/vendors/{vendor_id}")
def vendor_detail(vendor_id: int, db: Session = Depends(get_db)):
    v = db.get(Vendor, vendor_id)
    if not v or v.status != "approved":
        raise HTTPException(404, "Shop not found")
    prods = [p for p in v.products if p.available and p.stock > 0]
    prods.sort(key=lambda p: (p.category, p.name))
    return {"vendor": vendor_out(v), "products": [product_out(p) for p in prods]}


@app.get("/api/search")
def search(q: str, area_id: int, db: Session = Depends(get_db)):
    results, engine_name, budget = semantic_search(db, q, area_id)
    return {"query": q, "engine": engine_name, "budget": budget,
            "results": [product_out(p, s) for p, s in results]}


# ---------------------------------------------------------------- customer orders
@app.post("/api/orders")
def create_order(data: OrderIn, user: User = Depends(require("customer")), db: Session = Depends(get_db)):
    vendor = db.get(Vendor, data.vendor_id)
    if not vendor or vendor.status != "approved":
        raise HTTPException(400, "This shop is not available")
    if not vendor.is_open:
        raise HTTPException(400, "This shop is currently closed")
    if not data.items:
        raise HTTPException(400, "Your cart is empty")
    subtotal = 0.0
    lines = []
    for it in data.items:
        p = db.get(Product, it.product_id)
        if not p or p.vendor_id != vendor.id:
            raise HTTPException(400, "An order can only contain products from a single shop")
        if not p.available or p.stock < it.qty:
            raise HTTPException(400, f"'{p.name}' is not available in that quantity (only {p.stock} left)")
        p.stock -= it.qty
        subtotal += p.price * it.qty
        lines.append((p, it.qty))
    fee = 0 if subtotal >= FREE_DELIVERY_ABOVE else DELIVERY_FEE
    order = Order(customer_id=user.id, vendor_id=vendor.id, area_id=vendor.area_id, delivery_fee=fee,
                  total=round(subtotal + fee, 2), address=data.address, note=data.note,
                  otp=f"{random.randint(0, 9999):04d}", status="placed",
                  history=json.dumps([{"status": "placed", "at": datetime.utcnow().isoformat() + "Z", "note": None}]))
    db.add(order)
    db.flush()
    for p, q in lines:
        db.add(OrderItem(order_id=order.id, product_id=p.id, name=p.name, price=p.price, qty=q))
    db.commit()
    db.refresh(order)
    return order_out(order, include_otp=True)


@app.get("/api/orders/my")
def my_orders(user: User = Depends(require("customer")), db: Session = Depends(get_db)):
    rows = db.query(Order).filter(Order.customer_id == user.id).order_by(Order.id.desc()).all()
    return [order_out(o, include_otp=True) for o in rows]


@app.get("/api/orders/{order_id}")
def order_detail(order_id: int, user: User = Depends(require("customer")), db: Session = Depends(get_db)):
    o = db.get(Order, order_id)
    if not o or o.customer_id != user.id:
        raise HTTPException(404, "Order not found")
    return order_out(o, include_otp=True)


# ---------------------------------------------------------------- vendor
@app.get("/api/vendor/me")
def vendor_me(user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    return vendor_out(get_vendor(user, db))


@app.patch("/api/vendor/shop")
def vendor_shop(data: dict, user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    v = get_vendor(user, db)
    for k in ("shop_name", "address", "phone", "category", "description"):
        if k in data and isinstance(data[k], str):
            setattr(v, k, data[k])
    if "is_open" in data:
        v.is_open = bool(data["is_open"])
    db.commit()
    return vendor_out(v)


@app.get("/api/vendor/products")
def vendor_products(user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    v = get_vendor(user, db)
    rows = db.query(Product).filter(Product.vendor_id == v.id).order_by(Product.category, Product.name).all()
    return [product_out(p) for p in rows]


@app.post("/api/vendor/products")
def vendor_add_product(data: ProductIn, user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    v = approved_vendor(user, db)
    p = Product(vendor_id=v.id, **data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return product_out(p)


@app.put("/api/vendor/products/{pid}")
def vendor_edit_product(pid: int, data: ProductIn, user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    v = get_vendor(user, db)
    p = db.get(Product, pid)
    if not p or p.vendor_id != v.id:
        raise HTTPException(404, "Product not found")
    for k, val in data.model_dump().items():
        setattr(p, k, val)
    db.commit()
    return product_out(p)


@app.delete("/api/vendor/products/{pid}")
def vendor_delete_product(pid: int, user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    v = get_vendor(user, db)
    p = db.get(Product, pid)
    if not p or p.vendor_id != v.id:
        raise HTTPException(404, "Product not found")
    db.query(OrderItem).filter(OrderItem.product_id == p.id).update({"product_id": None})
    db.delete(p)
    db.commit()
    return {"ok": True}


@app.get("/api/vendor/orders")
def vendor_orders(user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    v = get_vendor(user, db)
    rows = db.query(Order).filter(Order.vendor_id == v.id).order_by(Order.id.desc()).all()
    return [order_out(o) for o in rows]


VENDOR_FLOW = {"placed": ["accepted", "rejected"], "accepted": ["preparing", "ready", "rejected"], "preparing": ["ready"]}


@app.post("/api/vendor/orders/{oid}/status")
def vendor_order_status(oid: int, data: StatusIn, user: User = Depends(require("vendor")), db: Session = Depends(get_db)):
    v = get_vendor(user, db)
    o = db.get(Order, oid)
    if not o or o.vendor_id != v.id:
        raise HTTPException(404, "Order not found")
    if data.status not in VENDOR_FLOW.get(o.status, []):
        raise HTTPException(400, f"Cannot move an order from '{o.status}' to '{data.status}'")
    if data.status == "rejected":
        o.reject_reason = data.reason or "Rejected by shop"
        for it in o.items:  # return stock
            if it.product_id:
                p = db.get(Product, it.product_id)
                if p:
                    p.stock += it.qty
        push(o, "rejected", o.reject_reason)
    else:
        push(o, data.status)
        if data.status == "ready":
            try_assign(db, o)
    db.commit()
    return order_out(o)


# ---------------------------------------------------------------- delivery partner
@app.get("/api/delivery/orders")
def delivery_orders(user: User = Depends(require("delivery")), db: Session = Depends(get_db)):
    rows = db.query(Order).filter(Order.delivery_partner_id == user.id).order_by(Order.id.desc()).all()
    waiting = db.query(Order).filter(Order.area_id == user.area_id, Order.status == "ready",
                                     Order.delivery_partner_id.is_(None)).count()
    delivered = [o for o in rows if o.status == "delivered"]
    return {"orders": [order_out(o) for o in rows], "waiting_in_zone": waiting,
            "stats": {"delivered": len(delivered), "earnings": len(delivered) * 30,
                      "active": len([o for o in rows if o.status in ACTIVE_DELIVERY])}}


@app.patch("/api/delivery/availability")
def delivery_availability(data: dict, user: User = Depends(require("delivery")), db: Session = Depends(get_db)):
    user.available = bool(data.get("available"))
    if user.available:
        assign_pending(db, user.area_id)
    db.commit()
    return user_out(user)


def _partner_order(oid: int, user: User, db: Session) -> Order:
    o = db.get(Order, oid)
    if not o or o.delivery_partner_id != user.id:
        raise HTTPException(404, "Order not found")
    return o


@app.post("/api/delivery/orders/{oid}/pickup")
def delivery_pickup(oid: int, user: User = Depends(require("delivery")), db: Session = Depends(get_db)):
    o = _partner_order(oid, user, db)
    if o.status != "assigned":
        raise HTTPException(400, "Order is not waiting for pickup")
    push(o, "picked_up")
    db.commit()
    return order_out(o)


@app.post("/api/delivery/orders/{oid}/out-for-delivery")
def delivery_out(oid: int, user: User = Depends(require("delivery")), db: Session = Depends(get_db)):
    o = _partner_order(oid, user, db)
    if o.status != "picked_up":
        raise HTTPException(400, "Pick the order up first")
    push(o, "out_for_delivery")
    db.commit()
    return order_out(o)


@app.post("/api/delivery/orders/{oid}/deliver")
def delivery_deliver(oid: int, data: OtpIn, user: User = Depends(require("delivery")), db: Session = Depends(get_db)):
    o = _partner_order(oid, user, db)
    if o.status not in ("picked_up", "out_for_delivery"):
        raise HTTPException(400, "Order is not out for delivery")
    if data.otp.strip() != o.otp:
        raise HTTPException(400, "Incorrect OTP. Ask the customer for the 4-digit code.")
    push(o, "delivered", "Verified with customer OTP")
    assign_pending(db, o.area_id)
    db.commit()
    return order_out(o)


# ---------------------------------------------------------------- admin
@app.get("/api/admin/stats")
def admin_stats(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    orders = db.query(Order).all()
    delivered = [o for o in orders if o.status == "delivered"]
    by_status = Counter(o.status for o in orders)
    area_names = {a.id: a.name for a in db.query(Area).all()}
    by_area = Counter(area_names.get(o.area_id, "?") for o in orders)
    return {
        "customers": db.query(User).filter(User.role == "customer").count(),
        "vendors": db.query(Vendor).filter(Vendor.status == "approved").count(),
        "pending_vendors": db.query(Vendor).filter(Vendor.status == "pending").count(),
        "partners": db.query(User).filter(User.role == "delivery").count(),
        "partners_on_duty": db.query(User).filter(User.role == "delivery", User.available == True).count(),  # noqa: E712
        "areas": db.query(Area).filter(Area.active == True).count(),  # noqa: E712
        "orders": len(orders),
        "delivered": len(delivered),
        "revenue": round(sum(o.total for o in delivered), 2),
        "by_status": dict(by_status),
        "by_area": dict(by_area),
    }


@app.get("/api/admin/vendors")
def admin_vendors(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    return [vendor_out(v, with_counts=True) for v in db.query(Vendor).order_by(Vendor.id.desc()).all()]


@app.post("/api/admin/vendors/{vid}/status")
def admin_vendor_status(vid: int, data: StatusOnly, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    if data.status not in ("approved", "rejected", "suspended", "pending"):
        raise HTTPException(400, "Invalid status")
    v = db.get(Vendor, vid)
    if not v:
        raise HTTPException(404, "Vendor not found")
    v.status = data.status
    db.commit()
    return vendor_out(v, with_counts=True)


@app.get("/api/admin/users")
def admin_users(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    return [user_out(u) for u in db.query(User).order_by(User.id).all()]


@app.post("/api/admin/users/{uid}/toggle")
def admin_toggle_user(uid: int, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == user.id:
        raise HTTPException(400, "You cannot deactivate your own account")
    u.active = not u.active
    if not u.active:
        u.available = False
    db.commit()
    return user_out(u)


@app.get("/api/admin/partners")
def admin_partners(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    out = []
    for u in db.query(User).filter(User.role == "delivery").all():
        d = user_out(u)
        d["active_orders"] = db.query(Order).filter(Order.delivery_partner_id == u.id, Order.status.in_(ACTIVE_DELIVERY)).count()
        d["delivered"] = db.query(Order).filter(Order.delivery_partner_id == u.id, Order.status == "delivered").count()
        out.append(d)
    return out


@app.get("/api/admin/orders")
def admin_orders(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    return [order_out(o, include_otp=True) for o in db.query(Order).order_by(Order.id.desc()).all()]


@app.post("/api/admin/orders/{oid}/assign")
def admin_assign(oid: int, data: AssignIn, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    p = db.get(User, data.partner_id)
    if not o or not p or p.role != "delivery":
        raise HTTPException(404, "Order or delivery partner not found")
    if o.status not in ("ready", "assigned"):
        raise HTTPException(400, "Only ready orders can be (re)assigned")
    if p.area_id != o.area_id:
        raise HTTPException(400, "Delivery partner belongs to a different zone")
    o.delivery_partner_id = p.id
    push(o, "assigned", f"Assigned to {p.name} by admin")
    db.commit()
    return order_out(o, include_otp=True)


@app.get("/api/admin/areas")
def admin_areas(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    out = []
    for a in db.query(Area).order_by(Area.id).all():
        out.append({"id": a.id, "name": a.name, "city": a.city, "pincode": a.pincode, "active": a.active,
                    "vendors": db.query(Vendor).filter(Vendor.area_id == a.id).count(),
                    "partners": db.query(User).filter(User.role == "delivery", User.area_id == a.id).count()})
    return out


@app.post("/api/admin/areas")
def admin_add_area(data: AreaIn, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    if db.query(Area).filter(func.lower(Area.name) == data.name.lower()).first():
        raise HTTPException(409, "An area with this name already exists")
    a = Area(**data.model_dump())
    db.add(a)
    db.commit()
    return {"id": a.id}


@app.put("/api/admin/areas/{aid}")
def admin_edit_area(aid: int, data: AreaIn, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    a = db.get(Area, aid)
    if not a:
        raise HTTPException(404, "Area not found")
    for k, v in data.model_dump().items():
        setattr(a, k, v)
    db.commit()
    return {"id": a.id}
