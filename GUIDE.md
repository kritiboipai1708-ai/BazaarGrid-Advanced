# BazaarGrid User Guide

How to set up, run, use and publish the Multi-Vendor Online Marketplace System.

## 1. What you need
- A web browser (Chrome, Edge, Firefox or Safari).
- An internet connection when you open the site (the charts and fonts load from a CDN).
- MySQL 8.x, only if you want to build the database (optional for viewing the website).
- Python 3, only if you want to regenerate the data (optional).

## 2. Project layout
```
index.html             landing page
dashboard.html         analytics dashboard
css/                   styles
js/                    page scripts + data.js (dataset used by the browser)
database/              schema.sql, seed.sql, queries.sql, generate_data.py
docs/                  architecture.svg, visual-paradigm-guide.md
README.md              project summary
GUIDE.md               this guide
```
Keep this folder structure. `index.html` will look unstyled and show no numbers if the `css` and `js` folders are missing.

## 3. Open the website
1. Unzip the project.
2. Double-click `index.html`.
3. Use the top menu to jump between Home, Dashboard, About, Features, Data Model, Architecture and Technology.
4. Click **Open full dashboard** to see the dashboard on its own page.

## 4. Use the dashboard
**Filters (top bar)**
- **From / To**: choose the month range. If From is later than To, the two are swapped for you.
- **Category**: show one product category. The Vendor list narrows to that category.
- **Vendor**: show a single seller.
- **Reset**: clears all filters.

**Headline figures**
| Figure | Meaning |
|---|---|
| Total GMV | Value of all non-cancelled orders (returned orders still count, they were sold) |
| Net GMV | GMV minus the value of returned orders |
| Orders placed | Non-cancelled orders; the line below shows how many were cancelled |
| Return rate | Returned / (Delivered + Returned). Orders still in transit are excluded |
| Platform commission | Commission earned, excluding reversed (returned) orders |
| Avg. order value | GMV / orders placed |

**Charts**
- **Vendor GMV**: bars per vendor, split into net GMV and returned value.
- **Monthly GMV and returned value**: line for GMV, bars for returns.
- **Return rate by vendor**: red = 15% or more, amber = 8% or more, teal = below 8%.
- **Return reasons**: why items came back (defect, size/fit, wrong item and so on).
- **GMV by category**: each category's share of GMV.
- **Commission status**: Paid, Pending and Reversed amounts.

Hover over any bar or slice to see exact values.

**Vendor scorecard (table)**
- Click a column heading to sort. Click again to reverse the order.
- The **Risk** column shows High, Medium or Low from the vendor's return rate.

**Reading the results**
- High GMV and High risk: a big seller sending many returns; review product quality or descriptions.
- High return rate with "Size / fit issue": ask the seller for better size guides.
- Many Reversed commissions: returns are costing the platform revenue.

## 5. Build the MySQL database
Run these in order from the project folder.

**MySQL command line**
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
mysql -u root -p < database/queries.sql
```

**MySQL Workbench**
1. Open `database/schema.sql` and run it (lightning icon).
2. Open `database/seed.sql` and run it.
3. Open `database/queries.sql` and run the queries one at a time.

The database is called `bazaargrid` and has four tables: `sellers`, `products`, `orders`, `commissions`.
Quick check after loading:
```sql
SELECT COUNT(*) FROM orders;        -- expect 1356
SELECT COUNT(*) FROM commissions;   -- expect 1310
```

## 6. What each query in `queries.sql` gives you
1. Vendor GMV ranking (gross, returned, net)
2. Return rate by vendor with a High / Medium / Low band
3. Monthly GMV trend
4. Commission earned, paid and reversed
5. Return reasons
6. GMV share by category
7. A reusable view, `vw_vendor_scorecard`, combining GMV, commission and return rate

The queries use the same definitions as the dashboard, so the numbers match.

## 7. Change or regenerate the data
The website reads `js/data.js`, not the database directly. Both `database/seed.sql` and `js/data.js` are generated together so they always match.
```bash
cd database
python3 generate_data.py
```
Edit the sellers, products, commission rates or return rates at the top of `generate_data.py`, run it again, then reload the database and the website.

## 8. Draw the architecture in Visual Paradigm
Follow `docs/visual-paradigm-guide.md`. `docs/architecture.svg` is the finished reference.

## 9. Publish on GitHub Pages
1. Create a new repository on GitHub.
2. Upload the whole project folder (keep the folders as they are).
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
5. After a minute your site is live at `https://<your-username>.github.io/<repository-name>/`.

## 10. Troubleshooting
| Problem | Fix |
|---|---|
| Page has no styling | The `css` folder is missing or moved. Keep the original folder structure. |
| Numbers show "-" or charts are empty | You are offline, or `js/data.js` is missing. Connect to the internet and reload. |
| Dashboard preview is blank on the home page | Open `dashboard.html` directly. Some browsers block embedded local files. It works on GitHub Pages. |
| `seed.sql` errors about foreign keys | Run `schema.sql` first, then `seed.sql`. |
| Changes to the Python script don't show on the site | Re-run `generate_data.py`, then refresh the browser (Ctrl+F5). |

## 11. Note
All data is synthetic and created for demonstration.
