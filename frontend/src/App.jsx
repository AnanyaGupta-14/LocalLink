import React from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth, useCart } from "./context";
import { Mark, Spinner } from "./ui";
import Landing from "./pages/Landing";
import { Login, Register } from "./pages/Auth";
import CustomerHome from "./pages/customer/Home";
import Shop from "./pages/customer/Shop";
import Checkout from "./pages/customer/Checkout";
import Orders from "./pages/customer/Orders";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

const HOME = { customer: "/shop", vendor: "/vendor", delivery: "/delivery", admin: "/admin" };

function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to={user ? HOME[user.role] : "/"} className="logo">
          <span className="logo-mark"><Mark /></span>
          <span>Local<b>Link</b></span>
        </Link>
        <nav className="nav-links">
          {!user && (
            <>
              <Link to="/login" className="nav-link">Log in</Link>
              <Link to="/register" className="btn accent sm">Join LocalLink</Link>
            </>
          )}
          {user?.role === "customer" && (
            <>
              <NavLink to="/shop" end className="nav-link">Shops</NavLink>
              <NavLink to="/shop/orders" className="nav-link">My orders</NavLink>
              <NavLink to="/shop/cart" className="nav-link cart-pill">
                Cart {count > 0 && <span className="badge-dot">{count}</span>}
              </NavLink>
            </>
          )}
          {user && (
            <>
              <span className="muted small hide-sm" style={{ margin: "0 .5rem" }}>Hi, {user.name.split(" ")[0]}</span>
              <button className="btn ghost sm" onClick={() => { logout(); nav("/"); }}>Log out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/shop" element={<Protected role="customer"><CustomerHome /></Protected>} />
        <Route path="/shop/vendor/:id" element={<Protected role="customer"><Shop /></Protected>} />
        <Route path="/shop/cart" element={<Protected role="customer"><Checkout /></Protected>} />
        <Route path="/shop/orders" element={<Protected role="customer"><Orders /></Protected>} />
        <Route path="/shop/orders/:id" element={<Protected role="customer"><Orders /></Protected>} />
        <Route path="/vendor" element={<Protected role="vendor"><VendorDashboard /></Protected>} />
        <Route path="/delivery" element={<Protected role="delivery"><DeliveryDashboard /></Protected>} />
        <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
