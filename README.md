# BazaarGrid - Multi-Vendor Online Marketplace System

**Primary IS type:** E-Commerce / TPS
**Core MySQL tables (input):** Sellers, Products, Orders, Commissions
**Key analytical / DSS output:** Vendor Gross Merchandise Value (GMV) and Return Rates
**Architecture diagram tool:** Visual Paradigm (Architecture)

## Structure

```
index.html            landing page (home, dashboard preview, about, features, data model, architecture, tech, connect)
dashboard.html        interactive analytics dashboard (Chart.js)
css/style.css         shared + landing styles
css/dashboard.css     dashboard styles
js/main.js            landing page behaviour
js/dashboard.js       filters, KPIs, charts, vendor scorecard
js/data.js            dataset for the browser (generated, mirrors seed.sql)
database/schema.sql   MySQL tables, keys, indexes
database/seed.sql     12 sellers, 48 products, 1,356 orders, 1,310 commissions
database/queries.sql  the DSS queries (GMV, return rate, trend, commissions, scorecard view)
database/generate_data.py  regenerates seed.sql and js/data.js together
docs/architecture.svg layered architecture diagram
docs/visual-paradigm-guide.md  how to redraw it in Visual Paradigm
```

## Run locally
Open `index.html` in a browser (the dashboard needs internet for the Chart.js CDN and Google Fonts).

## Build the MySQL database
```sql
SOURCE database/schema.sql;
SOURCE database/seed.sql;
SOURCE database/queries.sql;
```

## Metric definitions
- **GMV** = value of all non-cancelled orders (returned orders still count: they were sold).
- **Net GMV** = GMV minus returned orders.
- **Return rate** = returned orders / (delivered + returned orders). In-flight orders are excluded.
- **Risk band** = High at 15% or more, Medium at 8% or more, otherwise Low.
- **Commission** = order value x the seller's rate; reversed when the order is returned.

## Publish on GitHub Pages
Push the folder to a GitHub repository, then Settings > Pages > deploy from the `main` branch root.

## Note
The data is synthetic, generated for demonstration.
## Author 
Kriti Boipai

Business Analytics | SQL | Power BI | Data Analysis
