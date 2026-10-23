import React, { useState } from "react";
import { api } from "../../api";
import { useAuth, useToast } from "../../context";
import { Bars, DashboardLayout, Modal, Spinner, StatCard, StatusBadge, Switch, money, usePoll } from "../../ui";

function AreaForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { name: "", city: "Nagpur", pincode: "", active: true });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={initial ? "Edit service area" : "Add service area"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
        <div className="field"><label>Area name</label><input value={f.name} onChange={set("name")} required /></div>
        <div className="form-grid">
          <div><label>City</label><input value={f.city} onChange={set("city")} /></div>
          <div><label>Pincode</label><input value={f.pincode} onChange={set("pincode")} /></div>
        </div>
        <div className="row mt"><label style={{ margin: 0 }}>Active</label><Switch on={f.active} onChange={(v) => setF({ ...f, active: v })} /></div>
        <button className="btn block mt">Save area</button>
      </form>
    </Modal>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [vf, setVf] = useState("all");
  const [of, setOf] = useState("all");
  const [areaEdit, setAreaEdit] = useState(null);

  const stats = usePoll(() => api.get("/admin/stats"), [], 8000);
  const vendors = usePoll(() => api.get("/admin/vendors"), [], 10000);
  const orders = usePoll(() => api.get("/admin/orders"), [], 6000);
  const partners = usePoll(() => api.get("/admin/partners"), [], 10000);
  const users = usePoll(() => api.get("/admin/users"), [], 15000);
  const areas = usePoll(() => api.get("/admin/areas"), [], 15000);

  if (!stats.data || !vendors.data || !orders.data || !partners.data || !users.data || !areas.data) return <Spinner />;
  const s = stats.data;

  const reloadAll = () => [stats, vendors, orders, partners, users, areas].forEach((x) => x.reload());
  const run = async (fn, msg) => { try { await fn(); toast(msg); reloadAll(); } catch (e) { toast(e.message, "err"); } };

  const vendorStatus = (v, status) => run(() => api.post(`/admin/vendors/${v.id}/status`, { status }), `${v.shop_name} is now ${status}`);
  const toggleUser = (u) => run(() => api.post(`/admin/users/${u.id}/toggle`), `${u.name} ${u.active ? "deactivated" : "activated"}`);
  const assign = (o, pid) => run(() => api.post(`/admin/orders/${o.id}/assign`, { partner_id: Number(pid) }), `Order #${o.id} assigned`);
  const saveArea = async (f) => {
    await run(() => (areaEdit === "new" ? api.post("/admin/areas", f) : api.put(`/admin/areas/${areaEdit.id}`, f)), "Area saved");
    setAreaEdit(null);
  };

  const tabs = [
    { id: "overview", icon: "", label: "Overview" },
    { id: "vendors", icon: "", label: "Vendors", count: s.pending_vendors },
    { id: "orders", icon: "", label: "Orders" },
    { id: "partners", icon: "", label: "Delivery partners" },
    { id: "users", icon: "", label: "Users" },
    { id: "areas", icon: "", label: "Service areas" },
  ];

  const Table = ({ head, children }) => (
    <div className="table-wrap"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
  );
  const Filter = ({ value, set, options }) => (
    <div className="chips mb">{options.map((o) => <button key={o} className={`chip ${value === o ? "on" : ""}`} onClick={() => set(o)}>{o}</button>)}</div>
  );

  return (
    <DashboardLayout who={user.name} role="Administrator" tabs={tabs} tab={tab} setTab={setTab}>
      <div className="dash-head">
        <h2>{tabs.find((t) => t.id === tab).label}</h2>
        {tab === "areas" && <button className="btn accent" onClick={() => setAreaEdit("new")}>+ Add area</button>}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid c4">
            <StatCard label="Total orders" value={s.orders} />
            <StatCard label="Delivered" value={s.delivered} />
            <StatCard label="Delivered revenue" value={money(s.revenue)} />
            <StatCard label="Customers" value={s.customers} />
            <StatCard label="Approved vendors" value={s.vendors} />
            <StatCard label="Vendors pending approval" value={s.pending_vendors} />
            <StatCard label="Partners on duty" value={`${s.partners_on_duty}/${s.partners}`} />
            <StatCard label="Active areas" value={s.areas} />
          </div>
          <div className="grid mt2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
            <div className="card"><h3 className="mb" style={{ fontSize: "1.3rem" }}>Orders by status</h3><Bars data={s.by_status} /></div>
            <div className="card"><h3 className="mb" style={{ fontSize: "1.3rem" }}>Orders by area</h3><Bars data={s.by_area} /></div>
          </div>
        </>
      )}

      {tab === "vendors" && (
        <>
          <Filter value={vf} set={setVf} options={["all", "pending", "approved", "rejected", "suspended"]} />
          <Table head={["Shop", "Owner", "Area", "Category", "Products", "Status", "Actions"]}>
            {vendors.data.filter((v) => vf === "all" || v.status === vf).map((v) => (
              <tr key={v.id}>
                <td><b>{v.shop_name}</b><div className="small muted">{v.address}</div></td>
                <td>{v.owner}<div className="small muted">{v.email}</div></td>
                <td>{v.area}</td><td>{v.category}</td><td>{v.product_count}</td>
                <td><StatusBadge status={v.status} /></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {v.status !== "approved" && <button className="btn sm" onClick={() => vendorStatus(v, "approved")}>Approve</button>}{" "}
                  {v.status === "pending" && <button className="btn sm danger" onClick={() => vendorStatus(v, "rejected")}>Reject</button>}
                  {v.status === "approved" && <button className="btn sm ghost" onClick={() => vendorStatus(v, "suspended")}>Suspend</button>}
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {tab === "orders" && (
        <>
          <Filter value={of} set={setOf} options={["all", "placed", "preparing", "ready", "assigned", "out_for_delivery", "delivered", "rejected"]} />
          <Table head={["Order", "Customer", "Shop", "Area", "Total", "Status", "Delivery partner"]}>
            {orders.data.filter((o) => of === "all" || o.status === of || (of === "preparing" && o.status === "accepted")).map((o) => {
              const zonePartners = partners.data.filter((p) => p.area_id === o.area_id && p.active);
              return (
                <tr key={o.id}>
                  <td>#{o.id}<div className="small muted">{new Date(o.created_at).toLocaleDateString("en-IN")}</div></td>
                  <td>{o.customer.name}</td><td>{o.vendor.shop_name}</td><td>{o.area}</td><td>{money(o.total)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    {["ready", "assigned"].includes(o.status) ? (
                      <select value={o.partner?.id || ""} onChange={(e) => e.target.value && assign(o, e.target.value)} style={{ minWidth: 150 }}>
                        <option value="">Assign partner…</option>
                        {zonePartners.map((p) => <option key={p.id} value={p.id}>{p.name}{p.available ? "" : " (off duty)"}</option>)}
                      </select>
                    ) : o.partner ? o.partner.name : <span className="muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </Table>
        </>
      )}

      {tab === "partners" && (
        <Table head={["Partner", "Zone", "Vehicle", "Duty", "Active", "Delivered", "Account"]}>
          {partners.data.map((p) => (
            <tr key={p.id}>
              <td><b>{p.name}</b><div className="small muted">{p.email} · {p.phone}</div></td>
              <td>{p.area}</td><td>{p.vehicle}</td>
              <td><span className={`tag ${p.available ? "" : "warn"}`}>{p.available ? "On duty" : "Off duty"}</span></td>
              <td>{p.active_orders}</td><td>{p.delivered}</td>
              <td><button className={`btn sm ${p.active ? "ghost" : ""}`} onClick={() => toggleUser(p)}>{p.active ? "Deactivate" : "Activate"}</button></td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "users" && (
        <Table head={["Name", "Email", "Role", "Area", "Status", ""]}>
          {users.data.map((u) => (
            <tr key={u.id}>
              <td><b>{u.name}</b></td><td>{u.email}</td>
              <td><span className="tag">{u.role}</span></td><td>{u.area || "—"}</td>
              <td><span className={`tag ${u.active ? "" : "red"}`}>{u.active ? "Active" : "Deactivated"}</span></td>
              <td>{u.id !== user.id && <button className={`btn sm ${u.active ? "ghost" : ""}`} onClick={() => toggleUser(u)}>{u.active ? "Deactivate" : "Activate"}</button>}</td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "areas" && (
        <Table head={["Area", "City", "Pincode", "Vendors", "Partners", "Status", ""]}>
          {areas.data.map((a) => (
            <tr key={a.id}>
              <td><b>{a.name}</b></td><td>{a.city}</td><td>{a.pincode}</td><td>{a.vendors}</td><td>{a.partners}</td>
              <td><span className={`tag ${a.active ? "" : "red"}`}>{a.active ? "Active" : "Inactive"}</span></td>
              <td><button className="btn sm ghost" onClick={() => setAreaEdit(a)}>Edit</button></td>
            </tr>
          ))}
        </Table>
      )}

      {areaEdit && <AreaForm initial={areaEdit === "new" ? null : areaEdit} onSave={saveArea} onClose={() => setAreaEdit(null)} />}
    </DashboardLayout>
  );
}
