import React, { useState } from "react";
import { api } from "../../api";
import { useAuth, useToast } from "../../context";
import { DashboardLayout, Empty, Spinner, StatCard, StatusBadge, Switch, money, usePoll } from "../../ui";

function DeliveryCard({ o, reload }) {
  const toast = useToast();
  const [otp, setOtp] = useState("");
  const call = async (path, body) => {
    try {
      await api.post(`/delivery/orders/${o.id}/${path}`, body);
      toast(path === "deliver" ? "Delivered! " : "Status updated");
      setOtp("");
      reload();
    } catch (e) { toast(e.message, "err"); }
  };
  return (
    <div className="card">
      <div className="row between"><h3 style={{ fontSize: "1.2rem" }}>Order #{o.id}</h3><StatusBadge status={o.status} /></div>
      <div className="grid c2 mt" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        <div>
          <div className="small muted">PICKUP FROM</div>
          <b>{o.vendor.shop_name}</b>
          <div className="small">{o.vendor.address}</div>
          <div className="small muted">{o.vendor.phone}</div>
        </div>
        <div>
          <div className="small muted">DELIVER TO</div>
          <b>{o.customer.name}</b>
          <div className="small">{o.address}</div>
          <div className="small muted">{o.customer.phone}</div>
        </div>
      </div>
      <div className="small mt">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</div>
      <div className="row between mt"><span className="muted small">Collect cash</span><b className="price">{money(o.total)}</b></div>

      <div className="row wrap mt">
        {o.status === "assigned" && <button className="btn accent" onClick={() => call("pickup")}>Picked up from shop</button>}
        {o.status === "picked_up" && <button className="btn" onClick={() => call("out-for-delivery")}>Start delivery</button>}
        {["picked_up", "out_for_delivery"].includes(o.status) && (
          <form className="row grow" style={{ gap: ".5rem", minWidth: 260 }} onSubmit={(e) => { e.preventDefault(); call("deliver", { otp }); }}>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Customer OTP" inputMode="numeric" maxLength={4} style={{ letterSpacing: ".4rem", textAlign: "center", fontWeight: 700 }} />
            <button className="btn" disabled={otp.length !== 4}>Confirm delivery</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DeliveryDashboard() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("active");
  const { data, reload } = usePoll(() => api.get("/delivery/orders"), [], 5000);
  if (!data) return <Spinner />;

  const active = data.orders.filter((o) => ["assigned", "picked_up", "out_for_delivery"].includes(o.status));
  const history = data.orders.filter((o) => o.status === "delivered");

  const toggle = async (available) => {
    try {
      await api.patch("/delivery/availability", { available });
      await refresh();
      reload();
      toast(available ? "You're on duty. Orders will be assigned." : "You're off duty");
    } catch (e) { toast(e.message, "err"); }
  };

  const tabs = [
    { id: "active", icon: "", label: "Active deliveries", count: active.length },
    { id: "history", icon: "", label: "Completed" },
  ];

  return (
    <DashboardLayout who={user.name} role={`Delivery · ${user.area}`} tabs={tabs} tab={tab} setTab={setTab}>
      <div className="dash-head">
        <div><h2>{tab === "active" ? "Active deliveries" : "Completed deliveries"}</h2><div className="muted small">Zone: {user.area} · {user.vehicle || "Vehicle not set"}</div></div>
        <div className="row card" style={{ padding: ".6rem 1rem" }}>
          <b>{user.available ? "On duty" : "Off duty"}</b>
          <Switch on={user.available} onChange={toggle} />
        </div>
      </div>

      <div className="grid c4 mb">
        <StatCard label="Active now" value={data.stats.active} />
        <StatCard label="Delivered" value={data.stats.delivered} />
        <StatCard label="Earnings (₹30/delivery)" value={money(data.stats.earnings)} />
        <StatCard label="Orders waiting in zone" value={data.waiting_in_zone} />
      </div>

      {!user.available && <div className="banner">You’re off duty. Switch on duty to receive zone-based order assignments.</div>}

      {tab === "active" && (
        active.length === 0 ? <div className="card"><Empty title="No active deliveries">New orders in {user.area} are assigned to you automatically while you’re on duty.</Empty></div>
          : <div className="grid" style={{ gap: "1.2rem" }}>{active.map((o) => <DeliveryCard key={o.id} o={o} reload={reload} />)}</div>
      )}
      {tab === "history" && (
        history.length === 0 ? <div className="card"><Empty title="Nothing here yet">Completed deliveries will appear here.</Empty></div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Order</th><th>Shop</th><th>Customer</th><th>Amount</th><th>Delivered</th></tr></thead>
            <tbody>{history.map((o) => (
              <tr key={o.id}><td>#{o.id}</td><td>{o.vendor.shop_name}</td><td>{o.customer.name}</td><td>{money(o.total)}</td>
                <td>{new Date(o.history[o.history.length - 1].at).toLocaleString("en-IN")}</td></tr>
            ))}</tbody>
          </table></div>
        )
      )}
    </DashboardLayout>
  );
}
