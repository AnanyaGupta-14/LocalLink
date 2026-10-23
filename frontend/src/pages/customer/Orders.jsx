import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { Empty, Spinner, StatusBadge, Timeline, money, usePoll } from "../../ui";

function Detail({ o }) {
  const active = !["delivered", "rejected"].includes(o.status);
  return (
    <div className="slip">
      <div className="row between wrap" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: "1.8rem" }}>Order #{o.id}</h2>
          <div className="muted small">{o.vendor.shop_name}, {new Date(o.created_at).toLocaleString("en-IN")}</div>
        </div>
        <StatusBadge status={o.status} />
      </div>
      <hr />
      <div className="row" style={{ alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h3 style={{ fontSize: "1.3rem" }} className="mb">Where it is</h3>
          <Timeline history={o.history} status={o.status} />
          {o.status === "rejected" && <div className="banner">The shop could not take this order: {o.reject_reason}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 250 }}>
          {active && o.status !== "placed" && (
            <div className="otp-box mb">
              <div className="small" style={{ fontWeight: 600 }}>Tell your rider this code</div>
              <div className="otp-digits">{String(o.otp).split("").map((d, i) => <span key={i}>{d}</span>)}</div>
            </div>
          )}
          {o.partner && (
            <div className="banner" style={{ borderLeftColor: "var(--leaf)" }}>
              <b>{o.partner.name}</b> is delivering
              <div className="small muted">{o.partner.vehicle}, {o.partner.phone}</div>
            </div>
          )}
          <h3 style={{ fontSize: "1.3rem" }}>Items</h3>
          {o.items.map((i) => <div key={i.name} className="leader"><span>{i.qty} × {i.name}</span><span className="dots" /><span>{money(i.price * i.qty)}</span></div>)}
          <div className="leader"><span>Delivery</span><span className="dots" /><span>{o.delivery_fee ? money(o.delivery_fee) : "Free"}</span></div>
          <hr />
          <div className="leader total"><span>Cash on delivery</span><span className="dots" /><span>{money(o.total)}</span></div>
          <div className="small muted mt">Deliver to: {o.address}</div>
        </div>
      </div>
      {o.status === "delivered" && <span className="stamp stamp-pos">Delivered</span>}
    </div>
  );
}

export default function Orders() {
  const { id } = useParams();
  const { data: orders, error } = usePoll(() => api.get("/orders/my"), [], 6000);
  const [sel, setSel] = useState(id ? Number(id) : null);
  useEffect(() => { if (id) setSel(Number(id)); }, [id]);

  if (!orders) return error ? <div className="container page"><div className="banner">{error}</div></div> : <Spinner />;
  if (!orders.length)
    return <div className="container page"><div className="card"><Empty title="No orders yet"><Link to="/shop" className="btn accent mt">Find a shop</Link></Empty></div></div>;

  const current = orders.find((o) => o.id === sel) || orders[0];

  return (
    <div className="container page">
      <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }} className="mb">My orders</h1>
      <div className="row" style={{ alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>
        <div style={{ width: 300, maxWidth: "100%" }}>
          {orders.map((o) => (
            <button key={o.id} onClick={() => setSel(o.id)} className="card hover mb" style={{ cursor: "pointer", width: "100%", textAlign: "left", borderColor: current.id === o.id ? "var(--ink)" : undefined, boxShadow: current.id === o.id ? "4px 4px 0 var(--yellow)" : undefined }}>
              <b>#{o.id} {o.vendor.shop_name}</b>
              <div className="row between mt"><StatusBadge status={o.status} /><b>{money(o.total)}</b></div>
            </button>
          ))}
        </div>
        <div className="grow" style={{ minWidth: 300 }}><Detail o={current} /></div>
      </div>
    </div>
  );
}
