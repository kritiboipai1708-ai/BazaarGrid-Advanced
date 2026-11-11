-- BazaarGrid : analytical (DSS) queries. Same definitions the dashboard uses.
-- GMV          = value of all orders that were not cancelled (returned orders still count: they were sold)
-- Net GMV      = GMV minus returned orders
-- Return rate  = returned orders / (delivered + returned orders)   [in-flight orders are excluded]
USE bazaargrid;

-- 1. Vendor Gross Merchandise Value (GMV) ranking
SELECT s.seller_id,
       s.store_name,
       COUNT(*)                                                         AS orders_placed,
       SUM(o.order_amount)                                              AS gmv,
       SUM(CASE WHEN o.order_status = 'Returned' THEN o.order_amount ELSE 0 END) AS returned_value,
       SUM(o.order_amount)
         - SUM(CASE WHEN o.order_status = 'Returned' THEN o.order_amount ELSE 0 END) AS net_gmv
FROM orders o
JOIN sellers s ON s.seller_id = o.seller_id
WHERE o.order_status <> 'Cancelled'
GROUP BY s.seller_id, s.store_name
ORDER BY gmv DESC;

-- 2. Return rate by vendor (with a risk flag)
SELECT s.store_name,
       SUM(o.order_status = 'Returned')                                  AS returned_orders,
       SUM(o.order_status IN ('Delivered','Returned'))                   AS completed_orders,
       ROUND(100 * SUM(o.order_status = 'Returned')
             / NULLIF(SUM(o.order_status IN ('Delivered','Returned')), 0), 2) AS return_rate_pct,
       CASE
         WHEN 100 * SUM(o.order_status = 'Returned')
              / NULLIF(SUM(o.order_status IN ('Delivered','Returned')), 0) >= 15 THEN 'High'
         WHEN 100 * SUM(o.order_status = 'Returned')
              / NULLIF(SUM(o.order_status IN ('Delivered','Returned')), 0) >= 8  THEN 'Medium'
         ELSE 'Low'
       END                                                               AS risk_band
FROM orders o
JOIN sellers s ON s.seller_id = o.seller_id
GROUP BY s.store_name
ORDER BY return_rate_pct DESC;

-- 3. Monthly GMV trend
SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,
       COUNT(*)                         AS orders_placed,
       SUM(order_amount)                AS gmv
FROM orders
WHERE order_status <> 'Cancelled'
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY month;

-- 4. Platform commission earned vs paid out vs reversed
SELECT payout_status,
       COUNT(*)               AS commission_rows,
       SUM(commission_amount) AS amount
FROM commissions
GROUP BY payout_status;

-- 5. Return reasons (what to fix with sellers)
SELECT return_reason, COUNT(*) AS returned_orders
FROM orders
WHERE order_status = 'Returned'
GROUP BY return_reason
ORDER BY returned_orders DESC;

-- 6. Category GMV share
SELECT p.category,
       SUM(o.order_amount) AS gmv,
       ROUND(100 * SUM(o.order_amount) / SUM(SUM(o.order_amount)) OVER (), 1) AS share_pct
FROM orders o
JOIN products p ON p.product_id = o.product_id
WHERE o.order_status <> 'Cancelled'
GROUP BY p.category
ORDER BY gmv DESC;

-- 7. Seller scorecard view (GMV, take rate, return rate in one place)
CREATE OR REPLACE VIEW vw_vendor_scorecard AS
SELECT s.seller_id,
       s.store_name,
       s.category,
       SUM(CASE WHEN o.order_status <> 'Cancelled' THEN o.order_amount ELSE 0 END)           AS gmv,
       COALESCE(SUM(CASE WHEN c.payout_status <> 'Reversed' THEN c.commission_amount END), 0) AS commission_earned,
       ROUND(100 * SUM(o.order_status = 'Returned')
             / NULLIF(SUM(o.order_status IN ('Delivered','Returned')), 0), 2)                 AS return_rate_pct
FROM sellers s
LEFT JOIN orders o      ON o.seller_id = s.seller_id
LEFT JOIN commissions c ON c.order_id = o.order_id
GROUP BY s.seller_id, s.store_name, s.category;
