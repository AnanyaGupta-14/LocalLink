# 🏪 LocalLink — Hyperlocal Marketplace

**Bringing neighbourhood shops closer to their customers.**

🌐 **Live Website:** [https://local-link-livid.vercel.app/](https://local-link-livid.vercel.app/)

LocalLink is a hyperlocal marketplace platform that connects customers with nearby kirana and general stores. It enables local vendors to showcase their products, customers to discover and order items from shops in their area, and delivery partners to deliver orders within their assigned zones.

The platform combines a user-friendly shopping experience, role-based dashboards, order tracking, and AI-powered semantic product search to make local shopping more convenient.

## ✨ Key Features

### 🛍️ Customer
- Register and log in securely.
- Select a service area and explore nearby shops.
- Browse shops and filter products by category.
- Search for products using natural-language queries and AI-powered semantic search.
- Filter search results using budget constraints.
- Add products to the cart and manage quantities based on available stock.
- Place orders with delivery address and additional instructions.
- Choose Cash on Delivery (COD).
- Track order status through a step-by-step timeline.
- View delivery partner details and verify delivery using an OTP.

### 🏬 Vendor
- Register a shop and submit it for administrator approval.
- Manage shop details and open/closed status.
- Add, edit, and delete products.
- Update product prices, stock, descriptions, categories, and availability.
- View incoming orders and manage their status.
- Accept or reject orders with a reason.
- Update orders through preparation and ready-for-pickup stages.
- View sales statistics and low-stock products.

### 🛵 Delivery Partner
- Register with a delivery zone and vehicle details.
- Switch between on-duty and off-duty status.
- Receive eligible orders from the assigned service area.
- View customer addresses, shop details, and order information.
- Update pickup and delivery statuses.
- Complete deliveries using OTP verification.
- View delivery history and estimated earnings.

### 🛡️ Administrator
- Approve or reject vendor registrations.
- Manage service areas.
- Manage users and delivery partners.
- Monitor orders across the platform.
- View platform statistics.
- Manually assign or reassign deliveries when necessary.

## 🤖 AI-Powered Semantic Search

LocalLink includes an AI-powered product discovery system that understands the meaning behind a customer's search instead of relying only on exact keyword matches.

For example, a customer searching for *"something to clean my bathroom under ₹300"* can receive relevant products based on their descriptions, semantic similarity, location, availability, and budget.

**How it works:**
1. Extracts budget constraints from the search query.
2. Filters products based on area, shop status, availability, stock, and price.
3. Converts the query and product descriptions into comparable text representations.
4. Ranks relevant products using semantic similarity.
5. Returns matching products with similarity scores.

The primary search engine uses a pretrained Sentence-BERT model (`all-MiniLM-L6-v2`), with a TF-IDF fallback to keep search functional when the transformer model is unavailable or disabled.

## 🧰 Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React 18, JavaScript, HTML, CSS |
| Build Tool | Vite |
| Routing | React Router |
| Backend | Python, FastAPI, Uvicorn |
| Database ORM | SQLAlchemy 2 |
| Database | SQLite (local development), PostgreSQL (deployment) |
| Authentication | JWT, PyJWT |
| Password Security | PBKDF2-HMAC-SHA256 |
| AI / Semantic Search | Sentence-Transformers, NumPy |
| Search Fallback | Scikit-learn TF-IDF |
| API Communication | REST API, JSON |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Database Hosting | Supabase PostgreSQL |

## 🏗️ System Architecture

LocalLink follows a three-tier architecture.

```text
┌───────────────────────────────┐
│       React Frontend          │
│ Customer / Vendor / Delivery  │
│        / Admin UI             │
└──────────────┬────────────────┘
               │ REST API / JSON
               ▼
┌───────────────────────────────┐
│       FastAPI Backend         │
│ Authentication & Validation  │
│ Order and Inventory Rules     │
│ AI Semantic Search            │
└──────────────┬────────────────┘
               │ SQLAlchemy
               ▼
┌───────────────────────────────┐
│      PostgreSQL Database      │
│          Supabase             │
└───────────────────────────────┘
```

The frontend communicates with the backend through REST endpoints. The backend validates requests, applies business rules, checks user permissions, and reads or updates database records.

The database stores users, service areas, vendors, products, orders, and order items.

## 🗂️ Project Structure

```text
LocalLink/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   ├── auth.py
│   │   ├── search.py
│   │   └── seed.py
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── context.jsx
│   │   ├── ui.jsx
│   │   ├── styles.css
│   │   └── pages/
│   ├── package.json
│   └── ...
│
├── README.md
└── .gitignore
```

## 🚀 Run the Project Locally

### Prerequisites

Install the following tools before starting:

- Python 3.11 or a compatible version supported by the dependencies
- Node.js and npm
- Git
- A code editor such as Visual Studio Code

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/locallink.git
cd locallink
```

Replace `YOUR-USERNAME` with the GitHub username that owns the repository.

### 2. Set up the backend

Open a terminal in the project root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

The backend will be available at:

- API base: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

By default, the application uses SQLite for local development and initializes the database and demo data on startup when the database is empty.

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal, commonly `http://localhost:5173`.

Ensure the frontend's development API proxy is configured correctly to forward requests to the backend.

### 4. Configure the database

For local development, the application can use SQLite.

For a hosted PostgreSQL database, configure the `DATABASE_URL` environment variable with the connection URL provided by your PostgreSQL provider. Use the database driver expected by the project and ensure the required driver is installed.

For production, configure the database connection and authentication secrets through the hosting provider's environment-variable settings. Never commit real credentials to GitHub.

## 🌐 Deployment

LocalLink is deployed using the following services:

| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com/) | Hosts the React frontend |
| [Render](https://render.com/) | Hosts the FastAPI backend |
| [Supabase](https://supabase.com/) | Provides the PostgreSQL database |

**Access the deployed application:** [https://local-link-livid.vercel.app/](https://local-link-livid.vercel.app/)

The frontend communicates with the deployed backend through the `VITE_API_URL` environment variable. The backend connects to PostgreSQL using `DATABASE_URL`.

## 🔐 Security

- Authentication using JWT tokens.
- Role-based access control for customer, vendor, delivery partner, and administrator operations.
- Password hashing using PBKDF2-HMAC-SHA256.
- Request validation using FastAPI and Pydantic.
- Database operations handled through SQLAlchemy.
- Environment variables used for sensitive deployment configuration.

**Note:** LocalLink is an academic prototype. Additional hardening, including production-grade rate limiting, stronger session storage, and comprehensive automated security testing, is recommended before real-world commercial use.

## ⚙️ Business Rules

- Customers can order only from shops serving their selected area.
- Each order contains products from a single shop.
- Orders cannot exceed available product stock.
- Stock changes are handled as part of order processing.
- Vendors must be approved before their shops become available to customers.
- Delivery assignments are restricted to the relevant service area.
- Delivery partners confirm completed deliveries using an OTP.
- Order status changes are recorded to support order tracking.

## 🔮 Future Enhancements

- Online payments and refund processing.
- Live delivery tracking using GPS.
- Multilingual semantic search for English, Hindi, and Marathi.
- Product ratings, reviews, and image uploads.
- Push notifications and SMS updates.
- Improved delivery routing and distance-based assignment.
- Automated testing and database schema migrations.
- Vendor analytics and inventory forecasting.

## 🎯 Project Objective

LocalLink aims to strengthen neighbourhood commerce by helping small retailers establish an online presence while allowing customers to discover and purchase products from nearby stores.

It demonstrates the integration of full-stack web development, relational database management, authentication, REST APIs, order management, and AI-powered search in a single application.

## 👩‍💻 Contributors

Developed as an academic project by the LocalLink project team.

---

**If you find this project useful, feel free to explore the live application and the source code.**
