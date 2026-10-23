import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { useCart, useToast } from "../../context";
import { Empty, Spinner, boardClass } from "../../ui";
import ProductCard from "./ProductCard";

export default function Shop() {
  const { id } = useParams();
  const toast = useToast();
  const { count, subtotal } = useCart();
  const [data, setData] = useState(null);
  const [cat, setCat] = useState("All");
  const [text, setText] = useState("");

  useEffect(() => { api.get(`/vendors/${id}`).then(setData).catch((e) => toast(e.message, "err")); }, [id]); // eslint-disable-line

  const cats = useMemo(() => ["All", ...new Set((data?.products || []).map((p) => p.category))], [data]);
  const shown = useMemo(
    () => (data?.products || []).filter((p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(text.toLowerCase())),
    [data, cat, text]
  );

  if (!data) return <Spinner />;
  const v = data.vendor;

  return (
    <div className="container page">
      <Link to="/shop" className="small" style={{ fontWeight: 700, textDecoration: "underline" }}>Back to all shops</Link>
      <div className={`board ${boardClass(v.id)} mt`} style={{ border: "2px solid var(--ink)", borderRadius: 8, padding: "1.6rem 1.6rem 1.9rem" }}>
        <div className="row between wrap">
          <div>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{v.shop_name}</h1>
            <div className="cat">{v.category}, {v.address}</div>
          </div>
          <span className={`tag ${v.is_open ? "" : "red"}`}>{v.is_open ? "Open now" : "Closed"}</span>
        </div>
        <p style={{ margin: ".6rem 0 0", maxWidth: "40rem" }}>{v.description}</p>
      </div>

      <div className="row wrap mt2" style={{ gap: ".8rem" }}>
        <div style={{ maxWidth: 320, flex: 1 }}><input aria-label="Search in this shop" placeholder="Search in this shop" value={text} onChange={(e) => setText(e.target.value)} /></div>
        <div className="chips">{cats.map((c) => <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      </div>

      <div className="grid c3 mt">
        {shown.map((p) => <ProductCard key={p.id} p={{ ...p, vendor: v }} />)}
      </div>
      {shown.length === 0 && <div className="card mt"><Empty title="Nothing found">Try another category or a different word.</Empty></div>}

      {count > 0 && (
        <Link to="/shop/cart" className="cart-bar">
          <span>{count} item{count > 1 ? "s" : ""}</span>
          <b>₹{subtotal}</b>
          <span>View cart</span>
        </Link>
      )}
    </div>
  );
}
