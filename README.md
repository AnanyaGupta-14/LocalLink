# LocalLink: An AI-Powered HyperLocal Marketplace for Local Retailers

Full-stack prototype matching the project synopsis (Ramdeobaba University, Dept. of CSE, IDEA Lab 2026-27).

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router |
| Backend | Python FastAPI, SQLAlchemy, JWT auth |
| Database | PostgreSQL (SQLite used automatically if `DATABASE_URL` is not set) |
| AI search | Sentence-BERT (`all-MiniLM-L6-v2`) with an automatic TF-IDF fallback |

## Features implemented (from the synopsis)

**Customer**: register, pick a service area, see only nearby approved shops, browse a shop's catalogue, **AI semantic search** (natural language plus budget parsing such as "under ₹300"), single-vendor cart, checkout (cash on delivery, no payment gateway), live order tracking with timeline, delivery partner info and the **delivery OTP**.

**Vendor**: register (admin approval required), dashboard with stats, product CRUD, stock and availability controls, open/closed switch, order board (accept / reject with reason / preparing / ready), low-stock alerts. Stock is reserved on order and restored on rejection.

**Delivery partner**: register for a zone, on/off duty toggle, **automatic zone-based assignment** (least-loaded on-duty partner in the order's area), pickup, out for delivery, **OTP-verified delivery**, history and earnings.

**Admin**: stats and charts, vendor approval/rejection/suspension, all orders with manual partner assignment, delivery partner and user management, service area management.

**Out of scope (as in the synopsis)**: payment gateway, live GPS, multi-vendor carts, route optimisation, medicines/food delivery.

## Run it

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# optional, enables the real Sentence-BERT model (downloads ~90 MB on first search):
pip install -r requirements-ai.txt
uvicorn app.main:app --reload --port 8000
```
The first start creates the tables and loads demo data (3 areas, 6 vendors, 4 delivery partners, ~30 products per shop, sample orders). API docs: http://localhost:8000/docs

**Using PostgreSQL** (as in the synopsis):
```bash
docker compose up -d                      # from the project root
export DATABASE_URL=postgresql+psycopg2://locallink:locallink@localhost:5432/locallink
uvicorn app.main:app --reload --port 8000
```
(On Windows PowerShell: `$env:DATABASE_URL="..."`.)

### 2. Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to port 8000)
```

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Customer (Ramdaspeth) | demo@locallink.in | demo123 |
| Vendor | vendor1@locallink.in ... vendor6@locallink.in | vendor123 |
| Vendor (pending approval) | newshop@locallink.in | vendor123 |
| Delivery partner | d1@locallink.in ... d4@locallink.in | delivery123 |
| Admin | admin@locallink.in | admin123 |

`d1`, `d2` serve Ramdaspeth, `d3` Dharampeth, `d4` Sadar. Vendors 1-2 are in Ramdaspeth, 3-4 in Dharampeth, 5-6 in Sadar.

## Try the full flow (open 3 browser windows)
1. Customer `demo@locallink.in`: area Ramdaspeth, search *"something to clean my bathroom under ₹300"*, add items, place order.
2. Vendor `vendor1@locallink.in` (or the shop you ordered from): Accept, Start preparing, Mark ready. A partner is auto-assigned.
3. Delivery `d1@locallink.in` / `d2@locallink.in`: Picked up, Start delivery, enter the OTP shown in the customer's order page.
4. Admin: watch the stats, approve `Rao Super Bazaar`, reassign partners.

## Project structure
```
backend/app/
  main.py      all REST endpoints (auth, customer, vendor, delivery, admin)
  models.py    SQLAlchemy models: Area, User, Vendor, Product, Order, OrderItem
  search.py    AI semantic search module
  auth.py      password hashing + JWT + role guards
  seed.py      controlled demo dataset
frontend/src/
  App.jsx, context.jsx (auth/cart/toasts), ui.jsx (shared components), styles.css (theme)
  pages/Landing.jsx, Auth.jsx
  pages/customer/  Home, Shop, Checkout, Orders, ProductCard
  pages/vendor/VendorDashboard.jsx
  pages/delivery/DeliveryDashboard.jsx
  pages/admin/AdminDashboard.jsx
```

## Evaluating the AI search (for your report)
`GET /api/search?q=...&area_id=...` returns the engine used, the parsed budget and a similarity score per product. To evaluate relevance, write 20-30 test queries with expected products and compute precision@5 against both engines (set `USE_TRANSFORMER=0` to force TF-IDF).

## Notes
- Set a strong `SECRET_KEY` environment variable before any real deployment.
- OTP is stored on the order and shown only to the customer (and admin).
