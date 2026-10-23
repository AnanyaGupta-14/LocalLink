import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useCart, useToast } from "../../context";
import { Empty, Spinner, boardClass } from "../../ui";
import ProductCard from "./ProductCard";

const EXAMPLES = [
  "something to clean my bathroom under ₹300",
  "notebooks and pens for school",
  "quick breakfast",
  "keep mosquitoes away",
  "snacks under ₹60",
];

export default function CustomerHome() {
  const { area, setArea, count, subtotal } = useCart();
  const toast = useToast();
  const [areas, setAreas] = useState([]);
  const [vendors, setVendors] = useState(null);
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => { api.get("/areas").then(setAreas).catch((e) => toast(e.message, "err")); }, []); // eslint-disable-line
  useEffect(() => {
    setRes(null);
    if (!area) return setVendors(null);
    api.get(`/vendors?area_id=${area.id}`).then(setVendors).catch((e) => toast(e.message, "err"));
  }, [area]); // eslint-disable-line

  const search = async (text) => {
    const query = (text ?? q).trim();
    if (!query || !area) return;
    setQ(query);
    setSearching(true);
    try {
      setRes(await api.get(`/search?q=${encodeURIComponent(query)}&area_id=${area.id}`));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="container page">
      <div className="row between wrap mb">
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{area ? `Shops in ${area.name}` : "Which area are you in?"}</h1>
        <div style={{ minWidth: 240 }}>
          <label htmlFor="area">Your area</label>
          <select id="area" value={area?.id || ""} onChange={(e) => setArea(areas.find((a) => a.id === Number(e.target.value)) || null)}>
            <option value="">Choose an area</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.city}</option>)}
          </select>
        </div>
      </div>

      {!area ? (
        <div className="card"><Empty title="Choose your area">We will show the shops that deliver to you.</Empty></div>
      ) : (
        <>
          <div className="ask">
            <h2>What do you need today?</h2>
            <form className="ask-bar" onSubmit={(e) => { e.preventDefault(); search(); }}>
              <input aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Say it like you would at the counter" />
              <button className="btn" disabled={searching}>{searching ? "Looking" : "Search"}</button>
            </form>
            <div className="chips mt">
              {EXAMPLES.map((x) => <button key={x} className="chip" onClick={() => search(x)}>{x}</button>)}
            </div>
          </div>

          {res && (
            <section className="mt2">
              <div className="row between wrap mb">
                <h2 style={{ fontSize: "1.8rem" }}>Results for “{res.query}”</h2>
                <div className="row" style={{ gap: ".5rem" }}>
                  {res.budget && <span className="tag warn">Up to ₹{res.budget}</span>}
                  <span className="tag">{res.engine}</span>
                  <button className="btn ghost sm" onClick={() => setRes(null)}>Clear</button>
                </div>
              </div>
              {res.results.length === 0 ? (
                <div className="card"><Empty title="Nothing close enough nearby">Try other words, or raise your budget.</Empty></div>
              ) : (
                <div className="grid c3">{res.results.map((p) => <ProductCard key={p.id} p={p} showShop />)}</div>
              )}
            </section>
          )}

          <section className="mt2">
            <h2 style={{ fontSize: "1.8rem" }} className="mb">Shops that deliver to you</h2>
            {vendors === null ? (
              <Spinner />
            ) : vendors.length === 0 ? (
              <div className="card"><Empty title="No shops here yet">Vendors are still joining this area.</Empty></div>
            ) : (
              <div className="grid c2">
                {vendors.map((v) => (
                  <Link to={`/shop/vendor/${v.id}`} key={v.id} className="shopsign">
                    <div className={`board ${boardClass(v.id)}`}>
                      <h3>{v.shop_name}</h3>
                      <div className="cat">{v.category}</div>
                    </div>
                    <div className="info">
                      <p className="muted small" style={{ margin: 0 }}>{v.description}</p>
                      <div className="row between small" style={{ marginTop: "auto" }}>
                        <span>{v.address}</span>
                        <span className={`tag ${v.is_open ? "" : "red"}`}>{v.is_open ? "Open" : "Closed"}</span>
                      </div>
                      <b>{v.product_count} items in stock</b>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

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
