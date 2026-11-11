/* BazaarGrid - dashboard logic.
   Metric definitions (identical to database/queries.sql):
   GMV         = sum of order_amount for non-cancelled orders
   Net GMV     = GMV - value of Returned orders
   Return rate = Returned / (Delivered + Returned)
   Commission  = sum of commission_amount, excluding Reversed rows */
(function () {
  "use strict";

  if (new URLSearchParams(location.search).has("embed")) document.body.classList.add("embed");

  const F = Object.fromEntries(MARKET_DATA.orderFields.map((n, i) => [n, i]));
  const ORDERS = MARKET_DATA.orders;
  const SELLERS = MARKET_DATA.sellers;
  const sellerById = Object.fromEntries(SELLERS.map((s) => [s.id, s]));
  const catOf = (r) => sellerById[r[F.seller]].category;

  const COLORS = {
    vermilion: "#e4572e", teal: "#17a398", saffron: "#f2b134", indigo: "#3b3f8f",
    ink: "#1b1b3a", grey: "#b9b3a4", red: "#c0392b", amber: "#e0a21a", green: "#17a398",
  };
  const PALETTE = ["#e4572e", "#17a398", "#f2b134", "#3b3f8f", "#8e6bbf", "#6d6d92", "#d97fa0", "#7aa5d2"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const short = (n) =>
    n >= 1e7 ? "₹" + (n / 1e7).toFixed(2) + " Cr" :
    n >= 1e5 ? "₹" + (n / 1e5).toFixed(2) + " L" : inr(n);
  const pct = (n) => (Number.isFinite(n) ? n.toFixed(1) + "%" : "-");
  const riskOf = (rate) => (rate >= 15 ? "High" : rate >= 8 ? "Medium" : "Low");

  /* ---------- Filters ---------- */
  const el = (id) => document.getElementById(id);
  const fFrom = el("f-from"), fTo = el("f-to"), fCat = el("f-category"), fVen = el("f-vendor");

  const monthsPresent = [...new Set(ORDERS.map((r) => r[F.date].slice(0, 7)))].sort();
  const monthLabel = (ym) => MONTHS[parseInt(ym.slice(5), 10) - 1] + " " + ym.slice(0, 4);
  const monthOptions = monthsPresent.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join("");
  fFrom.innerHTML = monthOptions;
  fTo.innerHTML = monthOptions;
  const categories = [...new Set(SELLERS.map((s) => s.category))].sort();
  fCat.innerHTML = '<option value="">All categories</option>' + categories.map((c) => `<option>${c}</option>`).join("");

  function fillVendors() {
    const cat = fCat.value;
    const list = SELLERS.filter((s) => !cat || s.category === cat);
    const keep = fVen.value;
    fVen.innerHTML = '<option value="">All vendors</option>' +
      list.map((s) => `<option value="${s.id}">${s.store}</option>`).join("");
    if (list.some((s) => String(s.id) === keep)) fVen.value = keep;
  }

  function resetFilters() {
    fFrom.value = monthsPresent[0];
    fTo.value = monthsPresent[monthsPresent.length - 1];
    fCat.value = "";
    fillVendors();
    fVen.value = "";
  }

  function filtered() {
    let lo = fFrom.value, hi = fTo.value;
    if (lo > hi) [lo, hi] = [hi, lo];
    return ORDERS.filter((r) => {
      const ym = r[F.date].slice(0, 7);
      if (ym < lo || ym > hi) return false;
      if (fCat.value && catOf(r) !== fCat.value) return false;
      if (fVen.value && String(r[F.seller]) !== fVen.value) return false;
      return true;
    });
  }

  /* ---------- Aggregation ---------- */
  function aggregate(rows) {
    const t = { gmv: 0, returnedValue: 0, placed: 0, completed: 0, returned: 0, commission: 0 };
    const bySeller = {}, byMonth = {}, byReason = {}, byCategory = {}, payout = { Paid: 0, Pending: 0, Reversed: 0 };

    rows.forEach((r) => {
      const st = r[F.status], amt = r[F.amount], sid = r[F.seller], ym = r[F.date].slice(0, 7);
      const s = (bySeller[sid] = bySeller[sid] ||
        { orders: 0, gmv: 0, returnedValue: 0, completed: 0, returned: 0, commission: 0 });

      if (st !== "Cancelled") {
        t.gmv += amt; t.placed++; s.gmv += amt; s.orders++;
        const m = (byMonth[ym] = byMonth[ym] || { gmv: 0, returnedValue: 0 });
        m.gmv += amt;
        byCategory[catOf(r)] = (byCategory[catOf(r)] || 0) + amt;
        if (r[F.payout]) payout[r[F.payout]] += r[F.commission];
        if (r[F.payout] && r[F.payout] !== "Reversed") { t.commission += r[F.commission]; s.commission += r[F.commission]; }
      }
      if (st === "Delivered" || st === "Returned") { t.completed++; s.completed++; }
      if (st === "Returned") {
        t.returned++; s.returned++; t.returnedValue += amt; s.returnedValue += amt;
        (byMonth[ym] = byMonth[ym] || { gmv: 0, returnedValue: 0 }).returnedValue += amt;
        byReason[r[F.reason]] = (byReason[r[F.reason]] || 0) + 1;
      }
    });
    return { t, bySeller, byMonth, byReason, byCategory, payout };
  }

  /* ---------- Charts ---------- */
  Chart.defaults.font.family = '"DM Sans", system-ui, sans-serif';
  Chart.defaults.color = "#4b4b6b";
  const charts = {};
  function draw(id, config) {
    if (charts[id]) { charts[id].data = config.data; charts[id].options = config.options; charts[id].update(); return; }
    charts[id] = new Chart(el(id), config);
  }
  const money = (ctx) => " " + inr(ctx.parsed.x ?? ctx.parsed.y ?? ctx.parsed);
  const baseOpts = { responsive: true, maintainAspectRatio: false, animation: { duration: 350 } };

  function render() {
    const rows = filtered();
    const A = aggregate(rows);
    const { t } = A;

    // KPIs
    const rate = t.completed ? (t.returned / t.completed) * 100 : NaN;
    el("k-gmv").textContent = short(t.gmv);
    el("k-gmv-sub").textContent = inr(t.gmv);
    el("k-net").textContent = short(t.gmv - t.returnedValue);
    el("k-net-sub").textContent = t.gmv ? pct(((t.gmv - t.returnedValue) / t.gmv) * 100) + " of GMV kept" : "-";
    el("k-orders").textContent = t.placed.toLocaleString("en-IN");
    el("k-orders-sub").textContent = (rows.length - t.placed) + " cancelled";
    el("k-rate").textContent = pct(rate);
    el("k-rate-sub").textContent = t.returned + " of " + t.completed + " completed orders";
    el("k-comm").textContent = short(t.commission);
    el("k-comm-sub").textContent = t.gmv ? pct((t.commission / t.gmv) * 100) + " take rate" : "-";
    el("k-aov").textContent = t.placed ? inr(t.gmv / t.placed) : "-";
    el("k-aov-sub").textContent = "per order";

    // Vendor rows
    const vendors = Object.entries(A.bySeller).map(([id, s]) => {
      const sl = sellerById[id];
      const r = s.completed ? (s.returned / s.completed) * 100 : 0;
      return { id, store: sl.store, category: sl.category, orders: s.orders, gmv: s.gmv,
               net: s.gmv - s.returnedValue, commission: s.commission, rate: r, risk: riskOf(r) };
    });

    // 1. Vendor GMV (horizontal bars)
    const byGmv = [...vendors].sort((a, b) => b.gmv - a.gmv);
    draw("c-vendor-gmv", {
      type: "bar",
      data: { labels: byGmv.map((v) => v.store),
        datasets: [
          { label: "Net GMV", data: byGmv.map((v) => v.net), backgroundColor: COLORS.teal, borderRadius: 4 },
          { label: "Returned value", data: byGmv.map((v) => v.gmv - v.net), backgroundColor: COLORS.vermilion, borderRadius: 4 },
        ] },
      options: { ...baseOpts, indexAxis: "y",
        scales: { x: { stacked: true, ticks: { callback: (v) => short(v) }, grid: { color: "#eee7da" } }, y: { stacked: true, grid: { display: false } } },
        plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label + ":" + money(c) } }, legend: { position: "bottom" } } },
    });

    // 2. Monthly GMV + returned value
    const months = Object.keys(A.byMonth).sort();
    draw("c-monthly", {
      data: { labels: months.map(monthLabel),
        datasets: [
          { type: "bar", label: "Returned value", data: months.map((m) => A.byMonth[m].returnedValue), backgroundColor: COLORS.vermilion, borderRadius: 4, order: 2 },
          { type: "line", label: "GMV", data: months.map((m) => A.byMonth[m].gmv), borderColor: COLORS.indigo, backgroundColor: COLORS.indigo, tension: .3, pointRadius: 4, order: 1 },
        ] },
      options: { ...baseOpts,
        scales: { y: { ticks: { callback: (v) => short(v) }, grid: { color: "#eee7da" } }, x: { grid: { display: false } } },
        plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label + ":" + money(c) } }, legend: { position: "bottom" } } },
    });

    // 3. Return rate by vendor
    const byRate = [...vendors].sort((a, b) => b.rate - a.rate);
    draw("c-return-rate", {
      type: "bar",
      data: { labels: byRate.map((v) => v.store),
        datasets: [{ label: "Return rate %", data: byRate.map((v) => +v.rate.toFixed(2)),
          backgroundColor: byRate.map((v) => v.rate >= 15 ? COLORS.red : v.rate >= 8 ? COLORS.amber : COLORS.green), borderRadius: 4 }] },
      options: { ...baseOpts,
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => v + "%" }, grid: { color: "#eee7da" } }, x: { grid: { display: false }, ticks: { maxRotation: 50, minRotation: 30 } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + c.parsed.y.toFixed(1) + "% returned" } } } },
    });

    // 4. Return reasons
    const reasons = Object.entries(A.byReason).sort((a, b) => b[1] - a[1]);
    draw("c-reasons", {
      type: "doughnut",
      data: { labels: reasons.map((r) => r[0]), datasets: [{ data: reasons.map((r) => r[1]), backgroundColor: PALETTE, borderWidth: 2, borderColor: "#fffdf8" }] },
      options: { ...baseOpts, cutout: "58%", plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } },
    });

    // 5. Category GMV
    const cats = Object.entries(A.byCategory).sort((a, b) => b[1] - a[1]);
    draw("c-category", {
      type: "doughnut",
      data: { labels: cats.map((c) => c[0]), datasets: [{ data: cats.map((c) => c[1]), backgroundColor: PALETTE, borderWidth: 2, borderColor: "#fffdf8" }] },
      options: { ...baseOpts, cutout: "58%",
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => " " + c.label + ": " + inr(c.parsed) } } } },
    });

    // 6. Commission status
    draw("c-commission", {
      type: "bar",
      data: { labels: ["Paid", "Pending", "Reversed"],
        datasets: [{ label: "Commission", data: [A.payout.Paid, A.payout.Pending, A.payout.Reversed],
          backgroundColor: [COLORS.teal, COLORS.saffron, COLORS.vermilion], borderRadius: 6 }] },
      options: { ...baseOpts,
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => short(v) }, grid: { color: "#eee7da" } }, x: { grid: { display: false } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + inr(c.parsed.y) } } } },
    });

    renderTable(vendors);
  }

  /* ---------- Scorecard ---------- */
  let sortKey = "gmv", sortAsc = false, lastVendors = [];
  function renderTable(vendors) {
    lastVendors = vendors;
    const dir = sortAsc ? 1 : -1;
    const sorted = [...vendors].sort((a, b) =>
      typeof a[sortKey] === "string" ? dir * a[sortKey].localeCompare(b[sortKey]) : dir * (a[sortKey] - b[sortKey]));
    const body = document.querySelector("#scorecard tbody");
    body.innerHTML = sorted.length ? sorted.map((v) =>
      `<tr><td><strong>${v.store}</strong></td><td>${v.category}</td><td class="num">${v.orders.toLocaleString("en-IN")}</td>` +
      `<td class="num">${inr(v.gmv)}</td><td class="num">${inr(v.net)}</td><td class="num">${inr(v.commission)}</td>` +
      `<td class="num">${v.rate.toFixed(1)}%</td><td><span class="badge ${v.risk}">${v.risk}</span></td></tr>`
    ).join("") : '<tr><td colspan="8" class="empty">No orders match these filters.</td></tr>';

    document.querySelectorAll("#scorecard th").forEach((th) => {
      th.classList.toggle("sorted", th.dataset.key === sortKey);
      th.classList.toggle("asc", th.dataset.key === sortKey && sortAsc);
    });
  }
  document.querySelectorAll("#scorecard th").forEach((th) => {
    th.tabIndex = 0;
    const go = () => {
      const k = th.dataset.key;
      if (sortKey === k) sortAsc = !sortAsc; else { sortKey = k; sortAsc = typeof lastVendors[0]?.[k] === "string"; }
      renderTable(lastVendors);
    };
    th.addEventListener("click", go);
    th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });

  /* ---------- Wire up ---------- */
  fCat.addEventListener("change", () => { fillVendors(); render(); });
  [fFrom, fTo, fVen].forEach((s) => s.addEventListener("change", render));
  el("f-reset").addEventListener("click", () => { resetFilters(); render(); });

  resetFilters();
  render();
})();
