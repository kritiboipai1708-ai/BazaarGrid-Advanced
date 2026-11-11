-- BazaarGrid : Multi-Vendor Online Marketplace System (E-Commerce / TPS)
-- MySQL 8.x
CREATE DATABASE IF NOT EXISTS bazaargrid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bazaargrid;

DROP TABLE IF EXISTS commissions;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sellers;

-- 1. Sellers (vendors onboarded on the marketplace)
CREATE TABLE sellers (
    seller_id        INT AUTO_INCREMENT PRIMARY KEY,
    store_name       VARCHAR(100) NOT NULL,
    owner_name       VARCHAR(100) NOT NULL,
    city             VARCHAR(60)  NOT NULL,
    category         VARCHAR(40)  NOT NULL,
    joined_on        DATE         NOT NULL,
    commission_rate  DECIMAL(5,2) NOT NULL COMMENT 'Percent of order value kept by the platform',
    status           ENUM('Active','Suspended') NOT NULL DEFAULT 'Active',
    UNIQUE KEY uq_store (store_name)
) ENGINE=InnoDB;

-- 2. Products (catalogue listed by each seller)
CREATE TABLE products (
    product_id    INT AUTO_INCREMENT PRIMARY KEY,
    seller_id     INT          NOT NULL,
    product_name  VARCHAR(120) NOT NULL,
    category      VARCHAR(40)  NOT NULL,
    unit_price    DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    stock_qty     INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES sellers(seller_id),
    INDEX idx_products_seller (seller_id)
) ENGINE=InnoDB;

-- 3. Orders (one row per order line; returns are tracked on the same row)
CREATE TABLE orders (
    order_id        INT AUTO_INCREMENT PRIMARY KEY,
    order_ref       VARCHAR(20)  NOT NULL,
    seller_id       INT          NOT NULL,
    product_id      INT          NOT NULL,
    customer_name   VARCHAR(100) NOT NULL,
    customer_city   VARCHAR(60)  NOT NULL,
    order_date      DATE         NOT NULL,
    quantity        INT          NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(10,2) NOT NULL,
    order_amount    DECIMAL(12,2) NOT NULL,
    payment_method  ENUM('UPI','Card','COD','Net Banking') NOT NULL,
    order_status    ENUM('Placed','Shipped','Delivered','Returned','Cancelled') NOT NULL,
    return_reason   VARCHAR(60)  NULL,
    return_date     DATE         NULL,
    UNIQUE KEY uq_order_ref (order_ref),
    CONSTRAINT fk_orders_seller  FOREIGN KEY (seller_id)  REFERENCES sellers(seller_id),
    CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX idx_orders_date (order_date),
    INDEX idx_orders_seller_status (seller_id, order_status)
) ENGINE=InnoDB;

-- 4. Commissions (platform fee earned on each non-cancelled order)
CREATE TABLE commissions (
    commission_id      INT AUTO_INCREMENT PRIMARY KEY,
    order_id           INT          NOT NULL,
    seller_id          INT          NOT NULL,
    commission_rate    DECIMAL(5,2) NOT NULL,
    commission_amount  DECIMAL(10,2) NOT NULL,
    payout_status      ENUM('Pending','Paid','Reversed') NOT NULL DEFAULT 'Pending',
    payout_date        DATE         NULL,
    UNIQUE KEY uq_commission_order (order_id),
    CONSTRAINT fk_comm_order  FOREIGN KEY (order_id)  REFERENCES orders(order_id),
    CONSTRAINT fk_comm_seller FOREIGN KEY (seller_id) REFERENCES sellers(seller_id)
) ENGINE=InnoDB;
