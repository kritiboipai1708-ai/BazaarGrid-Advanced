# Redrawing the architecture in Visual Paradigm

`architecture.svg` shows the finished design. To produce the same diagram in Visual Paradigm (as your project requires):

1. **New project** > **Diagram > New** > choose **Block Diagram** (or *ArchiMate* > *Technology Layer* if your course expects ArchiMate).
2. Create four horizontal **layer containers**, top to bottom, and name them:
   | Layer | Colour used on the site | Contents |
   |---|---|---|
   | Presentation Layer | `#E4572E` vermilion | Storefront (HTML/CSS/JS), Seller order screens, Analytics dashboard (Chart.js) |
   | Application Layer (TPS) | `#1B1B3A` ink | Catalogue service, Order service, Commission engine, Returns handler |
   | Data Layer (MySQL) | `#17A398` teal | `sellers`, `products`, `orders`, `commissions` |
   | Decision Support Layer | `#F2B134` saffron | Vendor GMV, Return rate analysis, Vendor scorecard |
3. Add three **actors** above the presentation layer: Customers, Sellers / Vendors, Marketplace Admin. Connect each to the presentation layer.
4. Connect the layers with downward arrows (Presentation > Application > Data > DSS).
5. Add a dashed return arrow from the DSS layer back up to the Analytics dashboard.
6. **File > Export > Export Diagram as Image** (PNG or SVG) and drop it in `docs/` if you want to replace `architecture.svg` on the website.

## Suggested ERD (optional second diagram)
Use **Entity Relationship Diagram** with the four tables from `database/schema.sql`:

- `sellers` 1 ── * `products`
- `sellers` 1 ── * `orders`
- `products` 1 ── * `orders`
- `orders` 1 ── 1 `commissions` (a commission row exists for every non-cancelled order)
- `sellers` 1 ── * `commissions`
