import React from "react";
import { useCart } from "../../context";
import { money, packColors } from "../../ui";

/** Product shown as a packet: the face takes its colour from the category, like real packaging. */
export default function ProductCard({ p, showShop = false }) {
  const { add, setQty, qtyOf, cart, clear } = useCart();
  const qty = qtyOf(p.id);
  const vendor = p.vendor || { id: p.vendor_id };
  const [bg, fg] = packColors(p.category);
  const label = p.name.split(" ").slice(0, 2).join(" ");

  const onAdd = () => {
    if (!add(p, vendor)) {
      if (window.confirm(`Your cart has items from ${cart.vendor.shop_name}. An order can come from one shop only. Clear the cart and start again?`)) {
        clear();
        setTimeout(() => add(p, vendor), 0);
      }
    }
  };

  return (
    <div className="packet">
      <div className="face" style={{ background: bg, color: fg, fontSize: label.length > 14 ? "1.25rem" : "1.55rem" }}>{label}</div>
      <div className="body">
        <div className="name">{p.name}</div>
        <div className="muted small">{p.description}</div>
        {showShop && <div className="small">From {p.vendor?.shop_name}</div>}
        {p.score !== undefined && <div className="match">{Math.min(99, Math.round(p.score * 100))}% match</div>}
        <div className="foot">
          <div>
            <div className="price">{money(p.price)}</div>
            {p.stock <= 5 && <span className="tag warn">Only {p.stock} left</span>}
          </div>
          {qty === 0 ? (
            <button className="btn sm accent" onClick={onAdd}>Add</button>
          ) : (
            <div className="stepper">
              <button onClick={() => setQty(p.id, qty - 1)} aria-label="Remove one">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(p.id, qty + 1)} disabled={qty >= p.stock} aria-label="Add one">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
