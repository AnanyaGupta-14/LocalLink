import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

/* ---------------- Auth ---------------- */
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    try {
      setUser(await api.get("/auth/me"));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getToken()) refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };
  const register = async (payload) => {
    const r = await api.post("/auth/register", payload);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthCtx.Provider>;
}

/* ---------------- Cart + selected area ---------------- */
const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};

export function CartProvider({ children }) {
  const [area, setAreaState] = useState(() => load("ll_area", null));
  const [cart, setCart] = useState(() => load("ll_cart", { vendor: null, items: [] }));

  useEffect(() => localStorage.setItem("ll_cart", JSON.stringify(cart)), [cart]);

  const setArea = (a) => {
    setAreaState(a);
    localStorage.setItem("ll_area", JSON.stringify(a));
    setCart({ vendor: null, items: [] }); // a cart never spans areas
  };

  /** returns false if the product belongs to a different shop than the current cart */
  const add = (product, vendor) => {
    if (cart.vendor && cart.vendor.id !== vendor.id && cart.items.length) return false;
    setCart((c) => {
      const items = [...c.items];
      const i = items.findIndex((x) => x.product.id === product.id);
      if (i >= 0) items[i] = { ...items[i], qty: Math.min(items[i].qty + 1, product.stock || 99) };
      else items.push({ product, qty: 1 });
      return { vendor: { id: vendor.id, shop_name: vendor.shop_name }, items };
    });
    return true;
  };
  const setQty = (productId, qty) =>
    setCart((c) => {
      const items = c.items
        .map((x) => (x.product.id === productId ? { ...x, qty: Math.min(qty, x.product.stock || 99) } : x))
        .filter((x) => x.qty > 0);
      return { vendor: items.length ? c.vendor : null, items };
    });
  const clear = () => setCart({ vendor: null, items: [] });

  const count = cart.items.reduce((s, x) => s + x.qty, 0);
  const subtotal = cart.items.reduce((s, x) => s + x.qty * x.product.price, 0);
  const qtyOf = (id) => cart.items.find((x) => x.product.id === id)?.qty || 0;

  return (
    <CartCtx.Provider value={{ area, setArea, cart, add, setQty, clear, count, subtotal, qtyOf }}>
      {children}
    </CartCtx.Provider>
  );
}

/* ---------------- Toasts ---------------- */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
