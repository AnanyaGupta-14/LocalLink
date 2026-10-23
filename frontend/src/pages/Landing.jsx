import React from "react";
import { Link } from "react-router-dom";
import { Awning, Mark } from "../ui";

const ASKS = [
  {
    q: "“Something to clean the bathroom, under ₹300”",
    items: [["#14b1d8", "Harpic Toilet Cleaner", "₹105"], ["#14b1d8", "Bathroom Cleaning Brush", "₹85"], ["#14b1d8", "Lizol Floor Cleaner", "₹210"]],
  },
  {
    q: "“Quick breakfast for tomorrow morning”",
    items: [["#ff7a1a", "Kellogg's Corn Flakes", "₹195"], ["#ffc21a", "Poha 500g", "₹45"], ["#ff7a1a", "Kissan Fruit Jam", "₹160"]],
  },
  {
    q: "“Mosquitoes are back”",
    items: [["#14b1d8", "Good Knight Refill", "₹78"]],
  },
];

const ROUTE = [
  ["Pick your area", "You only see shops that deliver to your lane."],
  ["Order from one shop", "Search in plain words or walk the aisles."],
  ["The shop packs it", "Accepts, packs, and marks it ready."],
  ["A rider is assigned", "Someone on duty in your area, picked automatically."],
  ["Rider heads out", "You can follow each stage."],
  ["Say the code", "Give the 4-digit OTP at the door."],
];

const WAYS = [
  ["Shop nearby", "Order from the stores around you and pay cash when it arrives.", "/register", "Create account"],
  ["Run a shop", "Put your stock online, set what's available, and accept orders.", "/register", "List your shop"],
  ["Ride for your area", "Get orders from your own area and finish each one with an OTP.", "/register", "Sign up to ride"],
  ["Manage the platform", "Approve shops, manage areas and riders, and watch every order.", "/login", "Admin login"],
];

export default function Landing() {
  return (
    <>
      <section className="signboard">
        <Awning />
        <div className="container inner">
          <div>
            <h1>Your own lane's shops, at your door.</h1>
            <p className="lede">
              LocalLink brings the kirana stores and general shops in your area onto one app. Search the way you'd
              talk to the shopkeeper, order from one shop, and a rider from your area brings it over.
            </p>
            <div className="row wrap">
              <Link to="/register" className="btn accent">Start shopping</Link>
              <Link to="/login" className="btn ghost">Log in</Link>
            </div>
          </div>

          <div className="slip print" aria-label="Sample bill">
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div>
                <h3>Sharma General Store</h3>
                <div className="small muted">Wardha Road, Ramdaspeth</div>
              </div>
              <span className="hand muted" style={{ fontSize: "1.1rem" }}>Bill no. 2041</span>
            </div>
            <hr />
            {[["2 × Aashirvaad Atta 5kg", "₹530"], ["1 × Vim Dishwash 500ml", "₹99"], ["1 × Parle-G Family Pack", "₹40"], ["Delivery (free above ₹500)", "₹0"]].map(([a, b], i) => (
              <div className="leader ln" style={{ "--i": i }} key={a}><span>{a}</span><span className="dots" /><span>{b}</span></div>
            ))}
            <hr />
            <div className="leader total ln" style={{ "--i": 4 }}><span>Total, cash on delivery</span><span className="dots" /><span>₹669</span></div>
            <div className="ln hand" style={{ "--i": 5, marginTop: ".6rem", fontSize: "1.15rem" }}>Tell the rider your OTP: <b>4 7 1 9</b></div>
            <span className="stamp stamp-pos">Delivered</span>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <h2>Ask the way you'd ask at the counter.</h2>
          <p className="sub">Search understands what you mean, not only the words you type. It even reads your budget.</p>
          {ASKS.map((a) => (
            <div className="ask-row" key={a.q}>
              <div className="chit">{a.q}</div>
              <div className="minis">
                {a.items.map(([c, n, p]) => (
                  <div className="mini" key={n}>
                    <span className="sw" style={{ background: c }} />
                    <span className="tx"><b>{n}</b>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="section">
          <h2>From the shelf to your door.</h2>
          <ol className="route">
            {ROUTE.map(([t, d]) => (
              <li key={t}><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </section>

        <section className="section">
          <h2>Pick how you'll use it.</h2>
          <div className="mt2">
            {WAYS.map(([t, d, to, cta]) => (
              <Link to={to} className="way" key={t}>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="go">{cta}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container row between wrap">
          <div className="logo"><span className="logo-mark"><Mark /></span><span>Local<b>Link</b></span></div>
          <div className="small">An AI-powered hyperlocal marketplace for local retailers.<br />Ramdeobaba University, Dept. of CSE, IDEA Lab 2026-27.</div>
        </div>
      </footer>
    </>
  );
}
