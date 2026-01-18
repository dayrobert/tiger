CREATE TABLE IF NOT EXISTS items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(1024) NOT NULL,
  description TEXT,
  purchase_price DECIMAL(10,2),
  purchase_date DATE,
  `condition` ENUM('new', 'good', 'fair', 'bad'),
  shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  ebay_item_id VARCHAR(128),
  last_checked_at DATETIME NULL,
  current_price DECIMAL(10,2) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
