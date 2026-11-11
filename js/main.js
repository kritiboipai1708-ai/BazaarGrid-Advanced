/* BazaarGrid - landing page behaviour */
(function () {
  "use strict";

  const F = Object.fromEntries(MARKET_DATA.orderFields.map((n, i) => [n, i]));
  const rows = MARKET_DATA.orders;
  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const compact = (n) =>
    n >= 1e7 ? "₹" + (n / 1e7).toFixed(2) + " Cr" :
    n >= 1e5 ? "₹" + (n / 1e5).toFixed(2) + " L" : inr(n);

  // Headline numbers
  let gmv = 0, returned = 0, completed = 0;
  const perSeller = {};
  rows.forEach((r) => {
    const st = r[F.status];
    if (st !== "Cancelled") {
      gmv += r[F.amount];
      perSeller[r[F.seller]] = (perSeller[r[F.seller]] || 0) + r[F.amount];
    }
    if (st === "Returned") returned++;
    if (st === "Returned" || st === "Delivered") completed++;
  });
  document.getElementById("stat-gmv").textContent = compact(gmv);
  document.getElementById("stat-vendors").textContent = MARKET_DATA.sellers.length;
  document.getElementById("stat-return").textContent = ((returned / completed) * 100).toFixed(1) + "%";

  // Hero card: top 5 vendors
  const top = Object.entries(perSeller).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top[0][1];
  const nameOf = Object.fromEntries(MARKET_DATA.sellers.map((s) => [s.id, s.store]));
  document.getElementById("hero-vendors").innerHTML = top.map(([id, v]) =>
    `<div class="vendor-row"><span>${nameOf[id]}</span><div class="bar"><b style="width:${(v / max) * 100}%"></b></div><span>${compact(v)}</span></div>`
  ).join("");

  // Mobile menu
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  // Reveal on scroll + active nav link
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...links.querySelectorAll("a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));
})();
