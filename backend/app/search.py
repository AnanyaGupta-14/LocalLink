"""AI semantic product search.

Primary engine : Sentence-BERT (all-MiniLM-L6-v2) embeddings + cosine similarity.
Fallback engine: TF-IDF over character n-grams with a small domain synonym expansion
                 (used automatically if sentence-transformers is not installed).

Also understands budgets in natural language, e.g. "something to clean my bathroom under 300".
"""
import os
import re

import numpy as np
from sqlalchemy.orm import Session

from .models import Product, Vendor

SYNONYMS = {
    "clean": "cleaner detergent disinfectant wash scrub",
    "cleaning": "cleaner detergent disinfectant scrub",
    "bathroom": "toilet washroom bath cleaner brush",
    "toilet": "bathroom washroom cleaner disinfectant",
    "floor": "mop cleaner disinfectant lizol",
    "wash": "detergent soap liquid cleaner",
    "clothes": "detergent laundry washing powder",
    "laundry": "detergent washing powder",
    "dishes": "dishwash utensils scrub",
    "utensils": "dishwash scrub dish",
    "teeth": "toothpaste dental oral",
    "brush": "toothpaste scrub",
    "hair": "shampoo oil conditioner",
    "bath": "soap shower body",
    "skin": "lotion cream soap moisturiser",
    "write": "pen pencil notebook stationery",
    "writing": "pen pencil notebook",
    "study": "notebook pen pencil stationery geometry",
    "school": "notebook pen pencil geometry glue",
    "office": "paper pen sticky notes highlighter",
    "breakfast": "cereal corn flakes bread jam tea coffee poha oats",
    "snack": "chips biscuits namkeen bhujia",
    "snacks": "chips biscuits namkeen bhujia",
    "hungry": "noodles biscuits chips bread",
    "quick": "instant noodles maggi",
    "tea": "chai tea powder",
    "coffee": "nescafe instant beverage",
    "drink": "juice cola beverage",
    "cook": "oil atta rice dal masala salt sugar",
    "cooking": "oil atta rice dal masala salt",
    "kitchen": "oil atta rice dal salt sugar scrub",
    "mosquito": "repellent refill good knight",
    "insects": "repellent mosquito",
    "garbage": "bags trash dustbin",
    "hygiene": "handwash soap dettol sanitary",
    "hands": "handwash soap dettol",
    "shave": "razor gillette",
    "stick": "glue fevistick",
    "glue": "fevistick stick paper",
}


def parse_budget(q: str):
    """Pull a price ceiling out of the query. Returns (query_without_budget, max_price | None)."""
    patterns = [
        r"(?:under|below|less than|within|upto|up to|max(?:imum)?|<=?)\s*(?:₹|rs\.?|inr)?\s*(\d+)",
        r"(?:₹|rs\.?|inr)\s*(\d+)",
        r"(\d+)\s*(?:rupees|rs)\b",
    ]
    for pat in patterns:
        m = re.search(pat, q, re.I)
        if m:
            return (q[: m.start()] + " " + q[m.end():]).strip(), float(m.group(1))
    return q, None


_model = None
_model_failed = False
_cache: dict = {}  # product_id -> (text, vector)


def get_model():
    global _model, _model_failed
    if _model is None and not _model_failed and os.getenv("USE_TRANSFORMER", "1") == "1":
        try:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            _model_failed = True
    return _model


def _expand(query: str) -> str:
    words = re.findall(r"[a-z]+", query.lower())
    extra = []
    for w in words:
        for key in (w, w.rstrip("s")):
            if key in SYNONYMS:
                extra.append(SYNONYMS[key])
    return query + " " + " ".join(extra)


def _transformer_scores(model, prods, texts, query):
    missing = [(i, t) for i, (p, t) in enumerate(zip(prods, texts)) if p.id not in _cache or _cache[p.id][0] != t]
    if missing:
        vecs = model.encode([t for _, t in missing], normalize_embeddings=True)
        for (i, t), v in zip(missing, vecs):
            _cache[prods[i].id] = (t, v)
    mat = np.vstack([_cache[p.id][1] for p in prods])
    qv = model.encode([query], normalize_embeddings=True)[0]
    return list(mat @ qv)


def _tfidf_scores(texts, query):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
    mat = vec.fit_transform(texts + [_expand(query)])
    sims = cosine_similarity(mat[-1], mat[:-1])[0]
    return list(sims)


def semantic_search(db: Session, query: str, area_id: int, limit: int = 12):
    """Returns (list[(Product, score)], engine_name, budget)."""
    clean_q, budget = parse_budget(query)
    q = (
        db.query(Product)
        .join(Vendor)
        .filter(
            Vendor.status == "approved",
            Vendor.is_open == True,  # noqa: E712
            Vendor.area_id == area_id,
            Product.available == True,  # noqa: E712
            Product.stock > 0,
        )
    )
    if budget:
        q = q.filter(Product.price <= budget)
    prods = q.all()
    if not prods:
        return [], "none", budget
    if not clean_q.strip():
        # budget only, e.g. "under 100": show cheapest first
        prods.sort(key=lambda p: p.price)
        return [(p, 1.0) for p in prods[:limit]], "budget filter", budget

    texts = [f"{p.name}. {p.category}. {p.description}" for p in prods]
    model = get_model()
    if model is not None:
        scores = _transformer_scores(model, prods, texts, clean_q)
        engine, threshold = "Sentence-BERT (all-MiniLM-L6-v2)", 0.28
    else:
        scores = _tfidf_scores(texts, clean_q)
        engine, threshold = "TF-IDF semantic fallback", 0.10

    tokens = set(re.findall(r"[a-z]+", clean_q.lower()))
    for i, p in enumerate(prods):
        if tokens & set(re.findall(r"[a-z]+", p.name.lower())):
            scores[i] += 0.1  # small lexical boost for exact word hits

    ranked = sorted(zip(prods, scores), key=lambda x: -x[1])
    return [(p, float(s)) for p, s in ranked if s >= threshold][:limit], engine, budget
