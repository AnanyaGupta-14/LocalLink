import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useCart, useToast } from "../../context";
import { Empty, Swatch, money } from "../../ui";

export default function Checkout() {
  const { cart, setQty, clear, subtotal } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!cart.items.length)
    return (
      <div className="container page">
        <div className="card"><Empty title="Your cart is empty">
          <Link to="/shop" className="btn accent mt">Find a shop</Link>
        </Empty></div>
      </div>
    );

  const fee = subtotal >= 500 ? 0 : 20;

  const place = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const o = await api.post("/orders", {
        vendor_id: cart.vendor.id,
        items: cart.items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
        address,
        note,
      });
      clear();
      toast("Order placed. The shop will confirm shortly.");
      nav(`/shop/orders/${o.id}`);
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>Your cart</h1>
      <p className="muted">Ordering from <b>{cart.vendor.shop_name}</b>. One shop per order.</p>
      <div className="row mt" style={{ alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>
        <div className="card grow" style={{ minWidth: 300 }}>
          {cart.items.map(({ product: p, qty }) => (
            <div className="row between" key={p.id} style={{ padding: ".7rem 0", borderBottom: "2px dotted var(--line)" }}>
              <div className="row" style={{ gap: ".8rem" }}>
                <Swatch category={p.category} name={p.name} />
                <div><b>{p.name}</b><div className="muted small">{money(p.price)} each</div></div>
              </div>
              <div className="row">
                <div className="stepper">
                  <button onClick={() => setQty(p.id, qty - 1)} aria-label="Remove one">−</button><span>{qty}</span>
                  <button onClick={() => setQty(p.id, qty + 1)} disabled={qty >= p.stock} aria-label="Add one">+</button>
                </div>
                <b style={{ minWidth: 72, textAlign: "right" }}>{money(p.price * qty)}</b>
              </div>
            </div>
          ))}
          <button className="btn ghost sm mt" onClick={clear}>Empty the cart</button>
        </div>

        <form className="slip" style={{ width: 400, maxWidth: "100%" }} onSubmit={place}>
          <h3>Bill</h3>
          <div className="small muted">{cart.vendor.shop_name}</div>
          <hr />
          <div className="leader"><span>Items</span><span className="dots" /><span>{money(subtotal)}</span></div>
          <div className="leader"><span>Delivery</span><span className="dots" /><span>{fee ? money(fee) : "Free"}</span></div>
          <hr />
          <div className="leader total"><span>Pay on delivery</span><span className="dots" /><span>{money(subtotal + fee)}</span></div>
          {subtotal < 500 && <p className="muted small" style={{ margin: ".4rem 0 0" }}>Add {money(500 - subtotal)} more and delivery is free.</p>}
          <hr />
          <div className="field"><label htmlFor="addr">Delivery address</label><textarea id="addr" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat or house number, building, landmark" required minLength={5} /></div>
          <div className="field"><label htmlFor="note">Note for the shop (optional)</label><input id="note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <p className="small muted">You will get a 4-digit code to tell the rider when the order arrives.</p>
          <button className="btn accent block" disabled={busy}>{busy ? "Placing order" : "Place order"}</button>
        </form>
      </div>
    </div>
  );
}
