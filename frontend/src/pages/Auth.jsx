import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth, useCart, useToast } from "../context";
import { Awning } from "../ui";

const HOME = { customer: "/shop", vendor: "/vendor", delivery: "/delivery", admin: "/admin" };

const DEMOS = [
  ["Customer", "demo@locallink.in", "demo123"],
  ["Vendor", "vendor1@locallink.in", "vendor123"],
  ["Delivery", "d1@locallink.in", "delivery123"],
  ["Admin", "admin@locallink.in", "admin123"],
];

function Side({ title, text, colors }) {
  return (
    <aside className="auth-side">
      <Awning colors={colors} />
      <h2>{title}</h2>
      <p>{text}</p>
    </aside>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME[user.role]} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      nav(HOME[u.role]);
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <Side title="Good to see you again." text="Your shops, orders and deliveries are right where you left them." colors={["#ffc21a", "#e5266f"]} />
      <div className="auth-form">
        <div className="auth-card">
          <h1>Log in</h1>
          <p className="muted">Use the email you registered with.</p>
          <form onSubmit={submit} className="mt">
            <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <button className="btn accent block" disabled={busy}>{busy ? "Logging in" : "Log in"}</button>
          </form>
          <div className="demo-box mt">
            Trying it out? Fill in a demo account:
            <div className="row wrap" style={{ gap: ".9rem", marginTop: ".35rem" }}>
              {DEMOS.map(([n, e, p]) => (
                <button key={n} type="button" onClick={() => { setEmail(e); setPassword(p); }}>{n}</button>
              ))}
            </div>
          </div>
          <p className="small muted mt">No account yet? <Link to="/register" style={{ color: "var(--blue)", fontWeight: 700 }}>Create one</Link></p>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const { setArea } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const [areas, setAreas] = useState([]);
  const [role, setRole] = useState("customer");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", area_id: "", shop_name: "", address: "", category: "Kirana / General Store", description: "", vehicle: "Bike" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.get("/areas").then(setAreas).catch(() => {}); }, []);
  if (user) return <Navigate to={HOME[user.role]} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await register({ ...f, role, area_id: Number(f.area_id) });
      if (u.role === "customer") {
        const a = areas.find((x) => x.id === u.area_id);
        if (a) setArea(a);
      }
      toast(role === "vendor" ? "Registered. An admin will approve your shop soon." : "Welcome to LocalLink");
      nav(HOME[u.role]);
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    customer: ["Your lane's shops, one app.", "Pick your area and order from the stores around you."],
    vendor: ["Put your shop online.", "List your stock, set what's available and accept orders from your area."],
    delivery: ["Ride for your own area.", "Get orders from one zone and finish each with the customer's OTP."],
  }[role];

  return (
    <div className="auth-split">
      <Side title={copy[0]} text={copy[1]} colors={role === "vendor" ? ["#14b1d8", "#ffc21a"] : role === "delivery" ? ["#1f9d63", "#ffc21a"] : ["#ffc21a", "#e5266f"]} />
      <div className="auth-form">
        <div className="auth-card">
          <h1>Create your account</h1>
          <div className="role-tabs">
            {[["customer", "Customer"], ["vendor", "Vendor"], ["delivery", "Delivery"]].map(([r, l]) => (
              <button type="button" key={r} className={`role-tab ${role === r ? "on" : ""}`} onClick={() => setRole(r)}>{l}</button>
            ))}
          </div>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div><label>Full name</label><input value={f.name} onChange={set("name")} required minLength={2} /></div>
              <div><label>Phone</label><input value={f.phone} onChange={set("phone")} placeholder="98xxxxxxxx" /></div>
              <div className="full"><label>Email</label><input type="email" value={f.email} onChange={set("email")} required /></div>
              <div><label>Password</label><input type="password" value={f.password} onChange={set("password")} required minLength={6} /></div>
              <div>
                <label>{role === "vendor" ? "Area your shop serves" : role === "delivery" ? "Delivery area" : "Your area"}</label>
                <select value={f.area_id} onChange={set("area_id")} required>
                  <option value="">Choose an area</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {role === "vendor" && (
                <>
                  <div className="full"><label>Shop name</label><input value={f.shop_name} onChange={set("shop_name")} required /></div>
                  <div className="full"><label>Shop address</label><input value={f.address} onChange={set("address")} required /></div>
                  <div><label>Type of shop</label>
                    <select value={f.category} onChange={set("category")}>
                      {["Kirana / General Store", "Stationery & General", "Household & Personal Care", "Provision Store", "Mini Mart"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label>About the shop</label><input value={f.description} onChange={set("description")} /></div>
                </>
              )}
              {role === "delivery" && (
                <div className="full"><label>Vehicle</label>
                  <select value={f.vehicle} onChange={set("vehicle")}>{["Bike", "Scooter", "Bicycle"].map((c) => <option key={c}>{c}</option>)}</select>
                </div>
              )}
            </div>
            {role === "vendor" && <div className="banner mt">An administrator reviews every new shop before it goes live.</div>}
            <button className="btn accent block mt" disabled={busy}>{busy ? "Creating account" : "Create account"}</button>
          </form>
          <p className="small muted mt">Already registered? <Link to="/login" style={{ color: "var(--blue)", fontWeight: 700 }}>Log in</Link></p>
        </div>
      </div>
    </div>
  );
}
