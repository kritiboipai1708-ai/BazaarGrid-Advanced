#!/usr/bin/env python3
"""Generates seed.sql (MySQL) and ../js/data.js (dashboard dataset) from one
deterministic random source, so the database and the website always agree.

Run:  python3 generate_data.py
"""
import json
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(2026)
HERE = Path(__file__).resolve().parent
JS_OUT = HERE.parent / "js" / "data.js"
SQL_OUT = HERE / "seed.sql"

# (id, store, owner, city, category, joined, commission %, base return rate, volume weight)
SELLERS = [
    (1, "UrbanLoom Textiles", "Meera Shah", "Surat", "Fashion", "2025-11-04", 12.0, 0.21, 1.2),
    (2, "GadgetNest", "Rahul Menon", "Bengaluru", "Electronics", "2025-10-12", 9.0, 0.09, 1.5),
    (3, "SpiceRoute Foods", "Anil Nair", "Kochi", "Grocery", "2025-12-01", 7.0, 0.03, 1.3),
    (4, "HomeHaven Decor", "Pooja Rathore", "Jaipur", "Home & Living", "2025-11-20", 11.0, 0.12, 0.9),
    (5, "PageTurner Books", "Karthik Iyer", "Chennai", "Books", "2025-12-15", 8.0, 0.025, 0.8),
    (6, "FitFuel Sports", "Sandeep Kulkarni", "Pune", "Sports", "2026-01-08", 10.0, 0.08, 0.7),
    (7, "GlowLab Beauty", "Ananya Rao", "Mumbai", "Beauty", "2026-01-19", 13.0, 0.11, 1.0),
    (8, "ToyTrail", "Farhan Sheikh", "Hyderabad", "Toys", "2026-02-02", 10.0, 0.07, 0.6),
    (9, "CraftKart Artisans", "Lakshmi Gowda", "Mysuru", "Home & Living", "2026-02-14", 14.0, 0.15, 0.55),
    (10, "VoltEdge Mobiles", "Imran Khan", "Delhi", "Electronics", "2025-10-30", 8.0, 0.16, 1.4),
    (11, "StyleStreet Footwear", "Rohit Agarwal", "Agra", "Fashion", "2026-03-03", 12.0, 0.25, 0.85),
    (12, "PureLeaf Organics", "Deepa Chengappa", "Coorg", "Grocery", "2026-03-21", 7.5, 0.045, 0.5),
]

# seller_id -> [(product name, price)]
PRODUCTS = {
    1: [("Handloom Cotton Kurta", 1299), ("Block-Print Saree", 2499), ("Linen Shirt", 1599), ("Silk Dupatta", 1899)],
    2: [("Wireless Earbuds Pro", 2999), ("20000mAh Power Bank", 1799), ("Smart Fitness Band", 2499), ("USB-C Fast Charger", 899)],
    3: [("Malabar Spice Box", 749), ("Cold-Pressed Coconut Oil 1L", 399), ("Cashew Premium 500g", 649), ("Filter Coffee 500g", 449)],
    4: [("Ceramic Vase Set", 1499), ("Wall Clock Walnut", 1999), ("Cotton Cushion Covers x4", 899), ("Macrame Wall Hanging", 1299)],
    5: [("Data Structures Handbook", 599), ("Indian Classics Box Set", 1799), ("Startup Playbook", 449), ("Illustrated Atlas", 999)],
    6: [("Yoga Mat 6mm", 999), ("Adjustable Dumbbell Pair", 3499), ("Resistance Band Kit", 699), ("Running Hydration Belt", 549)],
    7: [("Vitamin C Serum", 699), ("Herbal Hair Oil", 449), ("Matte Lip Kit", 899), ("Sunscreen SPF 50", 599)],
    8: [("Wooden Puzzle Set", 799), ("STEM Robotics Kit", 2499), ("Plush Panda", 599), ("Board Game Classic", 1199)],
    9: [("Channapatna Toy Set", 899), ("Brass Diya Lamp", 1299), ("Terracotta Planter", 549), ("Bidri Coaster Set", 1999)],
    10: [("5G Smartphone 128GB", 15999), ("Tempered Glass Pack", 299), ("Phone Case Armor", 499), ("Bluetooth Speaker", 1999)],
    11: [("Leather Loafers", 2299), ("Running Sneakers", 2799), ("Kolhapuri Sandals", 1199), ("Formal Oxford", 2999)],
    12: [("Single-Estate Tea 250g", 549), ("Wild Honey 500g", 499), ("Organic Turmeric 200g", 249), ("Millet Mix 1kg", 349)],
}

RETURN_REASONS = {
    "Fashion": ["Size / fit issue"] * 5 + ["Not as described"] * 2 + ["Changed mind"] * 2 + ["Defective item"],
    "Electronics": ["Defective item"] * 5 + ["Not as described"] * 2 + ["Wrong item sent"] * 2 + ["Changed mind"],
    "Default": ["Defective item"] * 3 + ["Not as described"] * 3 + ["Wrong item sent"] * 2 + ["Changed mind"] * 2,
}

CITIES = ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad",
          "Jaipur", "Kochi", "Mysuru", "Lucknow", "Koppal", "Hubballi", "Nagpur"]
FIRST = ["Aarav", "Diya", "Vihaan", "Isha", "Kabir", "Saanvi", "Reyansh", "Anika", "Arjun", "Myra",
         "Ishaan", "Kiara", "Dev", "Navya", "Rohan", "Tara", "Aditya", "Riya", "Vivaan", "Zoya"]
LAST = ["Sharma", "Reddy", "Patel", "Nair", "Gowda", "Singh", "Iyer", "Das", "Khan", "Joshi", "Rao", "Mehta"]
PAYMENTS = ["UPI"] * 5 + ["Card"] * 3 + ["COD"] * 2 + ["Net Banking"]

START, END = date(2026, 1, 1), date(2026, 10, 31)
CUTOFF_OPEN = date(2026, 10, 26)      # orders on/after this are still in flight
CUTOFF_PAID = date(2026, 10, 1)       # delivered orders before this are already paid out

# Build products table
products = []
pid = 0
for sid, plist in PRODUCTS.items():
    cat = next(s[4] for s in SELLERS if s[0] == sid)
    for name, price in plist:
        pid += 1
        products.append({"id": pid, "seller": sid, "name": name, "category": cat, "price": price,
                         "stock": random.randint(40, 400)})
prod_by_seller = {}
for p in products:
    prod_by_seller.setdefault(p["seller"], []).append(p)

# Orders
orders, commissions = [], []
oid = 0
cid = 0
days = (END - START).days + 1
for s in SELLERS:
    sid, store, _, _, cat, joined, rate, ret_rate, weight = s
    joined_d = date.fromisoformat(joined)
    n = int(120 * weight)
    for _ in range(n):
        # more orders later in the year (marketplace growth), none before the seller joined
        for _try in range(50):
            offset = int(days * (random.random() ** 0.75))
            d = START + timedelta(days=offset)
            if d >= joined_d:
                break
        else:
            d = max(joined_d, START)
        prod = random.choice(prod_by_seller[sid])
        qty = random.choices([1, 2, 3], weights=[78, 17, 5])[0]
        unit = prod["price"]
        amount = unit * qty
        oid += 1

        status, reason, rdate = "Delivered", None, None
        if d >= CUTOFF_OPEN:
            status = random.choice(["Placed", "Shipped"])
        else:
            r = random.random()
            if r < 0.04:
                status = "Cancelled"
            elif r < 0.04 + ret_rate * 0.96:
                status = "Returned"
                pool = RETURN_REASONS.get(cat, RETURN_REASONS["Default"])
                reason = random.choice(pool)
                rdate = min(d + timedelta(days=random.randint(6, 14)), END)

        orders.append({
            "id": oid, "ref": f"ORD-2026-{oid:05d}", "product": prod["id"], "seller": sid,
            "customer": f"{random.choice(FIRST)} {random.choice(LAST)}", "city": random.choice(CITIES),
            "date": d.isoformat(), "qty": qty, "unit": unit, "amount": amount, "status": status,
            "reason": reason, "rdate": rdate.isoformat() if rdate else None,
            "pay": random.choice(PAYMENTS), "category": cat,
        })

        if status != "Cancelled":
            cid += 1
            comm = round(amount * rate / 100, 2)
            if status == "Returned":
                pstat, pdate = "Reversed", None
            elif status == "Delivered" and d < CUTOFF_PAID:
                pstat, pdate = "Paid", (d + timedelta(days=15)).isoformat()
            else:
                pstat, pdate = "Pending", None
            commissions.append({"id": cid, "order": oid, "seller": sid, "rate": rate,
                                "amount": comm, "status": pstat, "pdate": pdate})

# Re-number orders chronologically so order ids look natural
orders.sort(key=lambda o: (o["date"], o["id"]))
remap = {}
for i, o in enumerate(orders, 1):
    remap[o["id"]] = i
    o["id"] = i
    o["ref"] = f"ORD-2026-{i:05d}"
for c in commissions:
    c["order"] = remap[c["order"]]
commissions.sort(key=lambda c: c["order"])
for i, c in enumerate(commissions, 1):
    c["id"] = i
comm_by_order = {c["order"]: c for c in commissions}


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, cols, rows, chunk=100):
    out = []
    for i in range(0, len(rows), chunk):
        part = rows[i:i + chunk]
        vals = ",\n  ".join("(" + ", ".join(q(v) for v in r) + ")" for r in part)
        out.append(f"INSERT INTO {table} ({', '.join(cols)}) VALUES\n  {vals};\n")
    return "\n".join(out)


sql = ["-- Seed data for BazaarGrid (generated by generate_data.py - do not edit by hand)",
       "USE bazaargrid;", "SET FOREIGN_KEY_CHECKS = 0;",
       "TRUNCATE TABLE commissions;", "TRUNCATE TABLE orders;", "TRUNCATE TABLE products;", "TRUNCATE TABLE sellers;",
       "SET FOREIGN_KEY_CHECKS = 1;\n",
       insert("sellers", ["seller_id", "store_name", "owner_name", "city", "category", "joined_on", "commission_rate", "status"],
              [[s[0], s[1], s[2], s[3], s[4], s[5], s[6], "Active"] for s in SELLERS]), "",
       insert("products", ["product_id", "seller_id", "product_name", "category", "unit_price", "stock_qty"],
              [[p["id"], p["seller"], p["name"], p["category"], p["price"], p["stock"]] for p in products]), "",
       insert("orders", ["order_id", "order_ref", "seller_id", "product_id", "customer_name", "customer_city", "order_date",
                         "quantity", "unit_price", "order_amount", "payment_method", "order_status", "return_reason", "return_date"],
              [[o["id"], o["ref"], o["seller"], o["product"], o["customer"], o["city"], o["date"], o["qty"], o["unit"],
                o["amount"], o["pay"], o["status"], o["reason"], o["rdate"]] for o in orders]), "",
       insert("commissions", ["commission_id", "order_id", "seller_id", "commission_rate", "commission_amount", "payout_status", "payout_date"],
              [[c["id"], c["order"], c["seller"], c["rate"], c["amount"], c["status"], c["pdate"]] for c in commissions]), ""]
SQL_OUT.write_text("\n".join(sql), encoding="utf-8")

# Compact dataset for the browser: [id, seller, product, date, qty, amount, status, reason, commission, payout]
compact = []
for o in orders:
    c = comm_by_order.get(o["id"])
    compact.append([o["id"], o["seller"], o["product"], o["date"], o["qty"], o["amount"], o["status"],
                    o["reason"], c["amount"] if c else 0, c["status"] if c else None, o["pay"]])
data = {
    "generatedFor": "BazaarGrid multi-vendor marketplace",
    "sellers": [{"id": s[0], "store": s[1], "owner": s[2], "city": s[3], "category": s[4], "rate": s[6]} for s in SELLERS],
    "products": [{"id": p["id"], "seller": p["seller"], "name": p["name"], "category": p["category"], "price": p["price"]} for p in products],
    "orderFields": ["id", "seller", "product", "date", "qty", "amount", "status", "reason", "commission", "payout", "pay"],
    "orders": compact,
}
JS_OUT.write_text("/* Generated by database/generate_data.py - mirrors seed.sql */\nconst MARKET_DATA = "
                  + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")

# Summary used to sanity check
shipped = [o for o in orders if o["status"] in ("Delivered", "Returned")]
gmv = sum(o["amount"] for o in orders if o["status"] != "Cancelled")
ret = [o for o in shipped if o["status"] == "Returned"]
print(f"sellers={len(SELLERS)} products={len(products)} orders={len(orders)} commissions={len(commissions)}")
print(f"GMV (non-cancelled)={gmv:,}  return rate={len(ret) / len(shipped):.2%}")
