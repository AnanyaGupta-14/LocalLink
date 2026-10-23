import React, { useState } from "react";
import { api } from "../../api";
import { useAuth, useToast } from "../../context";
import { DashboardLayout, Empty, Modal, Spinner, StatCard, StatusBadge, Swatch, Switch, money, usePoll } from "../../ui";

const CATS = ["Groceries", "Household", "Personal Care", "Stationery", "Packaged Foods", "Beverages", "General"];

function ProductForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { name: "", description: "", category: "Groceries", price: "", stock: "", available: true });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={initial ? "Edit product" : "Add product"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ ...f, price: Number(f.price), stock: Number(f.stock) }); }}>
        <div className="form-grid">
          <div className="full"><label>Product name</label><input value={f.name} onChange={set("name")} required /></div>
          <div className="full"><label>Description (helps AI search find it)</label><input value={f.description} onChange={set("description")} placeholder="e.g. disinfectant liquid for bathroom floors" /></div>
          <div><label>Category</label><select value={f.category} onChange={set("category")}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>Price (₹)</label><input type="number" min="1" step="0.5" value={f.price} onChange={set("price")} required /></div>
          <div><label>Stock</label><input type="number" min="0" value={f.stock} onChange={set("stock")} required /></div>
          <div className="row"><label style={{ margin: 0 }}>Available</label><Switch on={f.available} onChange={(v) => setF({ ...f, available: v })} /></div>
        </div>
        <button className="btn block mt">Save product</button>
      </form>
    </Modal>
  );
}

function OrderCard({ o, onAct }) {
  const act = (status, extra = {}) => onAct(o.id, status, extra);
  return (
    <div className="order-card">
      <div className="row between"><b>#{o.id} · {o.customer.name}</b><StatusBadge status={o.status} /></div>
      <ul>{o.items.map((i) => <li key={i.name}>{i.qty} × {i.name}</li>)}</ul>
      <div className="row between small"><span className="muted">{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span><b>{money(o.total)}</b></div>
      {o.note && <div className="small muted">{o.note}</div>}
      {o.partner && <div className="small">{o.partner.name}</div>}
      <div className="row wrap mt" style={{ gap: ".4rem" }}>
        {o.status === "placed" && (
          <>
            <button className="btn sm" onClick={() => act("accepted")}>Accept</button>
            <button className="btn sm danger" onClick={() => { const r = window.prompt("Reason for rejecting? (optional)"); if (r !== null) act("rejected", { reason: r }); }}>Reject</button>
          </>
        )}
        {o.status === "accepted" && <button className="btn sm accent" onClick={() => act("preparing")}>Start preparing</button>}
        {["accepted", "preparing"].includes(o.status) && <button className="btn sm" onClick={() => act("ready")}>Mark ready</button>}
        {o.status === "ready" && <span className="tag warn">Waiting for a delivery partner in zone</span>}
      </div>
    </div>
  );
}

export default function VendorDashboard() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [filter, setFilter] = useState("");

  const shop = usePoll(() => api.get("/vendor/me"), [], 15000);
  const orders = usePoll(() => api.get("/vendor/orders"), [], 6000);
  const products = usePoll(() => api.get("/vendor/products"), [], 20000);

  if (!shop.data || !orders.data || !products.data) return <Spinner />;
  const v = shop.data;
  const approved = v.status === "approved";
  const os = orders.data;
  const newCount = os.filter((o) => o.status === "placed").length;
  const today = new Date().toDateString();
  const todays = os.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== "rejected");
  const revenue = os.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total - o.delivery_fee, 0);
  const lowStock = products.data.filter((p) => p.stock <= 5);

  const act = async (id, status, extra) => {
    try {
      await api.post(`/vendor/orders/${id}/status`, { status, ...extra });
      toast(`Order #${id} is now ${status}`);
      orders.reload();
    } catch (e) { toast(e.message, "err"); }
  };
  const save = async (data) => {
    try {
      if (editing && editing !== "new") await api.put(`/vendor/products/${editing.id}`, data);
      else await api.post("/vendor/products", data);
      toast("Product saved");
      setEditing(null);
      products.reload();
    } catch (e) { toast(e.message, "err"); }
  };
  const quick = async (p, patch) => {
    try { await api.put(`/vendor/products/${p.id}`, { ...p, ...patch }); products.reload(); } catch (e) { toast(e.message, "err"); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try { await api.del(`/vendor/products/${p.id}`); toast("Product deleted"); products.reload(); } catch (e) { toast(e.message, "err"); }
  };
  const toggleOpen = async (is_open) => {
    try { await api.patch("/vendor/shop", { is_open }); shop.reload(); toast(is_open ? "Shop is now open" : "Shop closed for orders"); } catch (e) { toast(e.message, "err"); }
  };

  const tabs = [
    { id: "overview", icon: "", label: "Overview" },
    { id: "orders", icon: "", label: "Orders", count: newCount },
    { id: "products", icon: "", label: "Products" },
  ];
  const col = (statuses) => os.filter((o) => statuses.includes(o.status));

  return (
    <DashboardLayout who={v.shop_name} role="Vendor" tabs={tabs} tab={tab} setTab={setTab}>
      <div className="dash-head">
        <div>
          <h2>{tabs.find((t) => t.id === tab).label}</h2>
          <div className="muted small">{v.address} · {v.area} <StatusBadge status={v.status} /></div>
        </div>
        {approved && (
          <div className="row card" style={{ padding: ".6rem 1rem" }}>
            <b>{v.is_open ? "Shop open" : "Shop closed"}</b>
            <Switch on={v.is_open} onChange={toggleOpen} />
          </div>
        )}
      </div>

      {!approved && <div className="banner">{v.status === "pending" ? "Your shop is awaiting administrator approval. You can prepare your catalogue once approved." : `Your shop is ${v.status}. Please contact the administrator.`}</div>}

      {tab === "overview" && (
        <>
          <div className="grid c4">
            <StatCard label="Today's orders" value={todays.length} />
            <StatCard label="New orders to accept" value={newCount} />
            <StatCard label="Delivered sales" value={money(revenue)} />
            <StatCard label="Products listed" value={products.data.length} />
          </div>
          <div className="grid c2 mt2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px,1fr))" }}>
            <div className="card">
              <h3 className="mb" style={{ fontSize: "1.3rem" }}>Needs your attention</h3>
              {col(["placed"]).length === 0 ? <div className="muted">No new orders right now.</div> : col(["placed"]).map((o) => <OrderCard key={o.id} o={o} onAct={act} />)}
            </div>
            <div className="card">
              <h3 className="mb" style={{ fontSize: "1.3rem" }}>Low stock</h3>
              {lowStock.length === 0 ? <div className="muted">All products are well stocked.</div> : lowStock.map((p) => (
                <div key={p.id} className="row between" style={{ padding: ".4rem 0" }}><span>{p.name}</span><span className="tag red">{p.stock} left</span></div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="kanban">
          {[["🆕 New", ["placed"]], ["Preparing", ["accepted", "preparing"]], ["Ready / on the way", ["ready", "assigned", "picked_up", "out_for_delivery"]], ["Completed", ["delivered", "rejected"]]].map(([title, st]) => (
            <div className="kcol" key={title}>
              <h4>{title} <span>{col(st).length}</span></h4>
              {col(st).map((o) => <OrderCard key={o.id} o={o} onAct={act} />)}
            </div>
          ))}
        </div>
      )}

      {tab === "products" && (
        <>
          <div className="row between wrap mb">
            <div style={{ maxWidth: 320, flex: 1 }}><input placeholder="Filter products…" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
            <button className="btn accent" disabled={!approved} onClick={() => setEditing("new")}>+ Add product</button>
          </div>
          {products.data.length === 0 ? <div className="card"><Empty title="No products yet">Add your first product to start selling.</Empty></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Available</th><th></th></tr></thead>
                <tbody>
                  {products.data.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())).map((p) => (
                    <tr key={p.id}>
                      <td><span className="row" style={{ gap: ".6rem" }}><Swatch category={p.category} name={p.name} /><b>{p.name}</b></span></td>
                      <td>{p.category}</td>
                      <td>{money(p.price)}</td>
                      <td>
                        <div className="stepper">
                          <button onClick={() => quick(p, { stock: Math.max(0, p.stock - 1) })}>−</button>
                          <span style={{ color: p.stock <= 5 ? "var(--danger)" : undefined }}>{p.stock}</span>
                          <button onClick={() => quick(p, { stock: p.stock + 1 })}>+</button>
                        </div>
                      </td>
                      <td><Switch on={p.available} onChange={(v) => quick(p, { available: v })} /></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn ghost sm" onClick={() => setEditing(p)}>Edit</button>{" "}
                        <button className="btn danger sm" onClick={() => remove(p)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && <ProductForm initial={editing === "new" ? null : editing} onSave={save} onClose={() => setEditing(null)} />}
    </DashboardLayout>
  );
}
