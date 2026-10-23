import React from "react";

export const money = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const STATUS_LABEL = {
  placed: "Order placed",
  accepted: "Accepted by shop",
  preparing: "Being packed",
  ready: "Packed, waiting for a rider",
  assigned: "Rider assigned",
  picked_up: "Picked up from shop",
  out_for_delivery: "On the way to you",
  delivered: "Delivered",
  rejected: "Rejected",
};

export const FLOW = ["placed", "accepted", "preparing", "ready", "assigned", "picked_up", "out_for_delivery", "delivered"];

/* Each category gets its own packaging colour, like the packets on a real shelf. */
const PACK = {
  Groceries: ["#ffc21a", "#101a45"],
  Household: ["#14b1d8", "#101a45"],
  "Personal Care": ["#e5266f", "#ffffff"],
  Stationery: ["#1736a8", "#ffc21a"],
  "Packaged Foods": ["#ff7a1a", "#101a45"],
  Beverages: ["#1f9d63", "#ffffff"],
};
export const packColors = (category) => PACK[category] || ["#c9d0ea", "#101a45"];
const BOARDS = ["b0", "b1", "b2", "b3", "b4"];
export const boardClass = (id) => BOARDS[(id || 0) % BOARDS.length];

export const initials = (name = "") => name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function Swatch({ category, name }) {
  const [bg, fg] = packColors(category);
  return <span className="swatch" style={{ background: bg, color: fg }}>{initials(name).slice(0, 1)}</span>;
}

/** Striped shop awning, drawn as SVG. */
export function Awning({ colors = ["#ffc21a", "#e5266f"], className = "awning" }) {
  const n = 24;
  return (
    <svg className={className} viewBox={`0 0 ${n * 50} 52`} preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <g key={i}>
          <rect x={i * 50} y="0" width="50" height="40" fill={colors[i % 2]} />
          <path d={`M${i * 50} 40 a25 12 0 0 0 50 0 z`} fill={colors[i % 2]} stroke="#101a45" strokeWidth="2.5" />
        </g>
      ))}
      <rect x="0" y="0" width={n * 50} height="3" fill="#101a45" />
    </svg>
  );
}

export const Mark = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M2 8l1.5-5h13L18 8z" fill="#e5266f" stroke="#101a45" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M3.5 8v9h13V8" stroke="#101a45" strokeWidth="1.6" />
    <rect x="8" y="11" width="4" height="6" fill="#101a45" />
  </svg>
);

export function EmptyIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M8 24l4-14h40l4 14z" fill="#ffc21a" stroke="#101a45" strokeWidth="3" strokeLinejoin="round" />
      <path d="M12 24v30h40V24" stroke="#101a45" strokeWidth="3" />
      <path d="M26 40h12M32 34v12" stroke="#101a45" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StatusBadge({ status }) {
  return <span className={`status s-${status}`}>{(status || "").replace(/_/g, " ")}</span>;
}

export function StatCard({ label, value }) {
  return (
    <div className="stat">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <EmptyIcon />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export const Spinner = () => <div className="spinner" role="status" aria-label="Loading" />;

export function Modal({ title, onClose, children }) {
  React.useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between mb">
          <h3>{title}</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Switch({ on, onChange, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)} />;
}

export function Bars({ data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <div className="muted small">Nothing to show yet.</div>;
  return (
    <div>
      {entries.map(([k, v]) => (
        <div className="bar-row" key={k}>
          <div className="lab">{k.replace(/_/g, " ")}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(v / max) * 100}%` }} /></div>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

export function Timeline({ history, status }) {
  const done = new Set(history.map((h) => h.status));
  const rejected = status === "rejected";
  const steps = rejected ? ["placed", "rejected"] : FLOW.filter((s) => done.has(s) || FLOW.indexOf(s) > FLOW.indexOf(status));
  return (
    <ul className="timeline">
      {steps.map((s) => {
        const h = history.find((x) => x.status === s);
        return (
          <li key={s} className={h ? "" : "pending"}>
            <span className="dot" />
            <b>{STATUS_LABEL[s]}</b>
            {h && <div className="muted small">{new Date(h.at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}{h.note ? `, ${h.note}` : ""}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Left-sidebar dashboard shell shared by vendor / delivery / admin. */
export function DashboardLayout({ who, role, tabs, tab, setTab, children }) {
  return (
    <div className="dash">
      <aside className="side">
        <div className="who">
          <b>{who}</b>
          <span className="role">{role}</span>
        </div>
        {tabs.map((t) => (
          <button key={t.id} className={`side-btn ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label} {t.count > 0 && <span className="n">{t.count}</span>}
          </button>
        ))}
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}

/** poll an async loader every `ms` */
export function usePoll(fn, deps = [], ms = 8000) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const run = React.useCallback(async () => {
    try {
      setData(await fn());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, deps); // eslint-disable-line
  React.useEffect(() => {
    run();
    const t = setInterval(run, ms);
    return () => clearInterval(t);
  }, [run, ms]);
  return { data, error, reload: run, setData };
}
