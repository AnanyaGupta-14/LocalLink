"""Demo data: 3 service areas, 6 vendors, delivery partners, a controlled catalogue and sample orders."""
import json
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .auth import hash_password
from .models import Area, Order, OrderItem, Product, User, Vendor

# (name, category, description, base price)
CATALOG = [
    ("Aashirvaad Atta 5kg", "Groceries", "whole wheat flour for rotis and chapatis", 265),
    ("Basmati Rice 1kg", "Groceries", "long grain aromatic rice for biryani and pulao", 120),
    ("Toor Dal 1kg", "Groceries", "split pigeon peas lentils for daily dal", 165),
    ("Sugar 1kg", "Groceries", "refined white sugar for tea and sweets", 48),
    ("Tata Salt 1kg", "Groceries", "iodised table salt for cooking", 28),
    ("Fortune Sunflower Oil 1L", "Groceries", "refined cooking oil for frying and cooking", 145),
    ("Turmeric Powder 200g", "Groceries", "haldi spice powder for curries", 55),
    ("Poha 500g", "Groceries", "flattened rice for quick breakfast poha", 45),
    ("Surf Excel Detergent Powder 1kg", "Household", "washing powder for clothes laundry stain removal", 135),
    ("Vim Dishwash Liquid 500ml", "Household", "cleans utensils and dishes grease remover", 99),
    ("Harpic Toilet Cleaner 500ml", "Household", "disinfectant toilet bowl and bathroom cleaner kills germs", 105),
    ("Lizol Floor Cleaner 975ml", "Household", "disinfectant floor and surface cleaner liquid", 210),
    ("Colin Glass Cleaner 500ml", "Household", "cleans windows glass mirrors shine", 98),
    ("Good Knight Mosquito Repellent Refill", "Household", "liquid vaporiser refill keeps mosquitoes away", 78),
    ("Scotch-Brite Scrub Pad (3 pcs)", "Household", "scouring pad for kitchen utensils", 55),
    ("Garbage Bags Medium (30 pcs)", "Household", "trash bags dustbin liners", 120),
    ("Bathroom Cleaning Brush", "Household", "scrubbing brush for bathroom tiles and toilet", 85),
    ("Colgate Strong Teeth Toothpaste 200g", "Personal Care", "toothpaste for cavity protection and oral care", 110),
    ("Dove Soap (Pack of 3)", "Personal Care", "moisturising beauty bathing bar for soft skin", 165),
    ("Head & Shoulders Shampoo 340ml", "Personal Care", "anti dandruff hair shampoo", 295),
    ("Parachute Coconut Oil 500ml", "Personal Care", "pure coconut hair and skin oil", 190),
    ("Nivea Body Lotion 400ml", "Personal Care", "moisturising body lotion for dry skin", 330),
    ("Dettol Handwash 200ml", "Personal Care", "antibacterial liquid hand wash for hygiene", 99),
    ("Gillette Guard Razor", "Personal Care", "safety razor for shaving", 35),
    ("Classmate Notebook 172 pages", "Stationery", "ruled notebook for school and college notes", 62),
    ("Reynolds Ball Pen (Pack of 10)", "Stationery", "blue ball point pens for writing", 100),
    ("Apsara Pencil (Pack of 10)", "Stationery", "HB pencils for students drawing and writing", 55),
    ("Fevistick Glue Stick", "Stationery", "paper glue stick for craft and school projects", 25),
    ("Camlin Geometry Box", "Stationery", "compass divider ruler set for maths students", 120),
    ("A4 Paper Ream 500 sheets", "Stationery", "printer and photocopy paper", 320),
    ("Sticky Notes Pad", "Stationery", "colourful memo notes for office and study", 45),
    ("Highlighter Set (4 colours)", "Stationery", "fluorescent markers for studying", 90),
    ("Maggi 2-Minute Noodles (4 pack)", "Packaged Foods", "instant masala noodles quick snack meal", 56),
    ("Parle-G Biscuits Family Pack", "Packaged Foods", "glucose tea biscuits", 40),
    ("Kellogg's Corn Flakes 475g", "Packaged Foods", "ready to eat breakfast cereal with milk", 195),
    ("Kissan Mixed Fruit Jam 500g", "Packaged Foods", "fruit spread for bread breakfast", 160),
    ("Lay's Classic Salted Chips", "Packaged Foods", "crispy potato chips snack", 20),
    ("Haldiram's Aloo Bhujia 400g", "Packaged Foods", "spicy crunchy namkeen snack", 110),
    ("Britannia Brown Bread", "Packaged Foods", "sliced whole wheat bread for breakfast", 50),
    ("Tata Tea Gold 500g", "Beverages", "premium chai tea leaves powder", 290),
    ("Nescafe Classic Coffee 50g", "Beverages", "instant coffee granules", 175),
    ("Real Fruit Juice Mixed 1L", "Beverages", "packaged mixed fruit juice drink", 110),
    ("Bournvita 500g", "Beverages", "chocolate health drink malt for milk", 240),
    ("Coca-Cola 750ml", "Beverages", "cold drink fizzy cola soft drink", 40),
]

AREAS = [("Ramdaspeth", "440010"), ("Dharampeth", "440010"), ("Sadar", "440001")]

# (shop, owner, email, area idx, category, address, description)
VENDORS = [
    ("Sharma General Store", "Rakesh Sharma", "vendor1@locallink.in", 0, "Kirana / General Store", "12, Wardha Road, Ramdaspeth", "Family-run kirana serving Ramdaspeth for 30 years."),
    ("Shree Ganesh Kirana", "Mahesh Joshi", "vendor2@locallink.in", 0, "Kirana / General Store", "5, Bajaj Nagar Chowk, Ramdaspeth", "Fresh groceries and household needs."),
    ("Patil Stationers & General", "Sunil Patil", "vendor3@locallink.in", 1, "Stationery & General", "21, Dharampeth Main Road", "Stationery, school supplies and daily-use goods."),
    ("Mehta Daily Needs", "Kiran Mehta", "vendor4@locallink.in", 1, "Household & Personal Care", "8, Shankar Nagar, Dharampeth", "Household cleaning and personal care."),
    ("Agrawal Provision Store", "Anil Agrawal", "vendor5@locallink.in", 2, "Provision Store", "33, Sadar Bazaar", "Wide range of packaged foods and groceries."),
    ("Fresh Basket Mart", "Neha Khan", "vendor6@locallink.in", 2, "Mini Mart", "14, Mount Road, Sadar", "Neighbourhood mini mart with daily essentials."),
]

PARTNERS = [
    ("Ravi Kumar", "d1@locallink.in", 0, "Bike"),
    ("Imran Shaikh", "d2@locallink.in", 0, "Scooter"),
    ("Suresh Yadav", "d3@locallink.in", 1, "Bike"),
    ("Pooja Verma", "d4@locallink.in", 2, "Scooter"),
]


def _hist(*pairs):
    base = datetime.utcnow() - timedelta(hours=3)
    out = []
    for i, s in enumerate(pairs):
        out.append({"status": s, "at": (base + timedelta(minutes=i * 12)).isoformat() + "Z", "note": None})
    return json.dumps(out)


def seed(db: Session):
    if db.query(Area).count():
        return
    rnd = random.Random(42)
    areas = []
    for name, pin in AREAS:
        a = Area(name=name, city="Nagpur", pincode=pin, active=True)
        db.add(a)
        areas.append(a)
    db.flush()

    db.add(User(name="LocalLink Admin", email="admin@locallink.in", phone="9000000000",
                password_hash=hash_password("admin123"), role="admin"))
    cust = User(name="Demo Customer", email="demo@locallink.in", phone="9876543210",
                password_hash=hash_password("demo123"), role="customer", area_id=areas[0].id)
    db.add(cust)

    for name, email, ai, veh in PARTNERS:
        db.add(User(name=name, email=email, phone="98" + str(rnd.randint(10000000, 99999999)),
                    password_hash=hash_password("delivery123"), role="delivery",
                    area_id=areas[ai].id, available=True, vehicle=veh))

    vendors = []
    for i, (shop, owner, email, ai, cat, addr, desc) in enumerate(VENDORS):
        u = User(name=owner, email=email, phone="97" + str(rnd.randint(10000000, 99999999)),
                 password_hash=hash_password("vendor123"), role="vendor", area_id=areas[ai].id)
        db.add(u)
        db.flush()
        v = Vendor(user_id=u.id, shop_name=shop, address=addr, area_id=areas[ai].id, phone=u.phone,
                   category=cat, description=desc, status="approved", is_open=True)
        db.add(v)
        db.flush()
        vendors.append(v)
        for item in rnd.sample(CATALOG, int(len(CATALOG) * 0.75)):
            n, c, d, base = item
            price = max(10, round(base * rnd.uniform(0.94, 1.08)))
            db.add(Product(vendor_id=v.id, name=n, category=c, description=d, price=price,
                           stock=rnd.randint(4, 50), available=True))

    # one pending vendor so the admin approval flow can be demoed
    pu = User(name="Deepak Rao", email="newshop@locallink.in", phone="9811122233",
              password_hash=hash_password("vendor123"), role="vendor", area_id=areas[2].id)
    db.add(pu)
    db.flush()
    db.add(Vendor(user_id=pu.id, shop_name="Rao Super Bazaar", address="2, Civil Lines, Sadar", area_id=areas[2].id,
                  phone="9811122233", category="Mini Mart", description="Awaiting approval.", status="pending"))
    db.flush()

    # sample orders for the demo customer (area 0 vendors)
    d1 = db.query(User).filter(User.email == "d1@locallink.in").first()
    d2 = db.query(User).filter(User.email == "d2@locallink.in").first()
    plans = [
        (vendors[0], d1, "delivered", ["placed", "accepted", "preparing", "ready", "assigned", "picked_up", "out_for_delivery", "delivered"]),
        (vendors[1], d2, "delivered", ["placed", "accepted", "preparing", "ready", "assigned", "picked_up", "out_for_delivery", "delivered"]),
        (vendors[0], d1, "out_for_delivery", ["placed", "accepted", "preparing", "ready", "assigned", "picked_up", "out_for_delivery"]),
        (vendors[1], None, "placed", ["placed"]),
    ]
    for v, partner, status, hist in plans:
        prods = db.query(Product).filter(Product.vendor_id == v.id).limit(8).all()
        picks = rnd.sample(prods, 3)
        subtotal = 0
        order = Order(customer_id=cust.id, vendor_id=v.id, area_id=v.area_id, status=status,
                      address="Flat 301, Sunrise Apartments, " + v.area.name if v.area else "Demo address",
                      otp=str(rnd.randint(1000, 9999)), history=_hist(*hist),
                      delivery_partner_id=partner.id if partner else None)
        db.add(order)
        db.flush()
        for p in picks:
            q = rnd.randint(1, 3)
            subtotal += p.price * q
            db.add(OrderItem(order_id=order.id, product_id=p.id, name=p.name, price=p.price, qty=q))
        order.delivery_fee = 0 if subtotal >= 500 else 20
        order.total = subtotal + order.delivery_fee
    db.commit()
