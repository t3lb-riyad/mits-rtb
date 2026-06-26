const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'mits_rtb.db');

let db = null;

function getDb() {
  if (db) return db;
  throw new Error('Database not initialized. Call initDatabase() first.');
}

async function initDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      short_description TEXT,
      base_price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      ad_cost REAL DEFAULT 0,
      overhead_cost REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      is_best_seller INTEGER DEFAULT 0,
      best_of TEXT DEFAULT NULL,
      image_url TEXT,
      image_urls TEXT,
      attributes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS product_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      min_quantity INTEGER NOT NULL,
      max_quantity INTEGER,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS product_attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      attribute_name TEXT NOT NULL,
      attribute_value TEXT NOT NULL,
      price_modifier REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS shipping_offices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      province TEXT NOT NULL,
      office_name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      successful_deliveries INTEGER DEFAULT 0,
      returned_packages INTEGER DEFAULT 0,
      is_loyal INTEGER DEFAULT 0,
      risk_score REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_phone TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_address TEXT,
      customer_city TEXT,
      customer_province TEXT,
      product_id INTEGER,
      product_name TEXT,
      product_attributes TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      shipping_method TEXT CHECK(shipping_method IN ('home_delivery', 'office_pickup')),
      shipping_office_id INTEGER,
      shipping_office_name TEXT,
      shipping_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      notes TEXT,
      tracking_number TEXT,
      courier_name TEXT,
      is_abandoned INTEGER DEFAULT 0,
      is_fraud_flagged INTEGER DEFAULT 0,
      delivered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (shipping_office_id) REFERENCES shipping_offices(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone TEXT,
      customer_name TEXT,
      product_id INTEGER,
      product_name TEXT,
      quantity INTEGER,
      total_amount REAL,
      cart_data TEXT,
      recovered INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS exchange_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      customer_phone TEXT NOT NULL,
      customer_name TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_type TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      product_id INTEGER,
      expense_date DATE DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tracking_pixels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pixel_type TEXT NOT NULL,
      pixel_id TEXT NOT NULL,
      access_token TEXT,
      is_active INTEGER DEFAULT 1,
      event_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      customer_phone TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER UNIQUE,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      last_purchase_date DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)');
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      product_image TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      attributes TEXT,
      selected_ram TEXT,
      selected_storage TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);
  try { db.run("ALTER TABLE orders ADD COLUMN item_count INTEGER DEFAULT 1"); } catch(e) {}
  try { db.run("ALTER TABLE order_items ADD COLUMN selected_ram TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE order_items ADD COLUMN selected_storage TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE orders ADD COLUMN discount_percent REAL DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0"); } catch(e) {}
  db.run('CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)');
  db.run(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { db.run("ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL"); } catch(e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      reason TEXT,
      blocked_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)');

  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function prepare(sql) {
  const d = getDb();
  return {
    run: (...params) => {
      d.run(sql, params);
      const rows = d.exec('SELECT last_insert_rowid() as id');
      const id = rows && rows[0] && rows[0].values ? rows[0].values[0][0] : 0;
      saveDb();
      return { lastInsertRowid: id };
    },
    get: (...params) => {
      try {
        const stmt = d.prepare(sql);
        stmt.bind(params.length > 0 && params[0] !== undefined ? params : []);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const obj = {};
          cols.forEach((c, i) => obj[c] = vals[i]);
          return obj;
        }
        stmt.free();
        return undefined;
      } catch (e) {
        return undefined;
      }
    },
    all: (...params) => {
      try {
        const stmt = d.prepare(sql);
        stmt.bind(params.length > 0 && params[0] !== undefined ? params : []);
        const results = [];
        const cols = stmt.getColumnNames();
        while (stmt.step()) {
          const vals = stmt.get();
          const obj = {};
          cols.forEach((c, i) => obj[c] = vals[i]);
          results.push(obj);
        }
        stmt.free();
        return results;
      } catch (e) {
        return [];
      }
    }
  };
}

function exec(sql) {
  const d = getDb();
  d.exec(sql);
  saveDb();
}

function transaction(fn) {
  return (...args) => {
    const d = getDb();
    d.exec('BEGIN');
    try {
      fn(...args);
      d.exec('COMMIT');
      saveDb();
    } catch (e) {
      d.exec('ROLLBACK');
      throw e;
    }
  };
}

module.exports = { initDatabase, getDb, prepare, exec, transaction, saveDb };
