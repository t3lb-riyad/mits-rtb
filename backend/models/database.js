const { Pool } = require('pg');

const isRemote = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
});

async function checkConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Supabase PostgreSQL connected successfully.');
  } catch (err) {
    console.error('FATAL: Cannot connect to Supabase PostgreSQL. DATABASE_URL may be incorrect.');
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

let initialized = false;

function convertQuery(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function prepare(sql, client) {
  const text = convertQuery(sql);
  const db = client || pool;
  return {
    run: async (...params) => {
      const isInsert = /^\s*INSERT\s/i.test(text);
      const q = isInsert ? text + ' RETURNING id' : text;
      const result = await db.query(q, params);
      return { lastInsertRowid: result.rows[0]?.id || 0 };
    },
    get: async (...params) => {
      const result = await db.query(text, params);
      return result.rows[0] || undefined;
    },
    all: async (...params) => {
      const result = await db.query(text, params);
      return result.rows;
    }
  };
}

function exec(sql) {
  return pool.query(sql);
}

function saveDb() {}

function transaction(fn) {
  return async (...args) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txPrepare = (sql) => prepare(sql, client);
      await fn(txPrepare, ...args);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  };
}

async function initDatabase() {
  if (initialized) return;
  await checkConnection();
  await exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      short_description TEXT,
      base_price NUMERIC NOT NULL,
      cost_price NUMERIC DEFAULT 0,
      shipping_cost NUMERIC DEFAULT 0,
      ad_cost NUMERIC DEFAULT 0,
      overhead_cost NUMERIC DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      is_best_seller INTEGER DEFAULT 0,
      best_of TEXT DEFAULT NULL,
      image_url TEXT,
      image_urls TEXT,
      attributes TEXT,
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS product_offers (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      min_quantity INTEGER NOT NULL,
      max_quantity INTEGER,
      discount_percent NUMERIC DEFAULT 0,
      discount_amount NUMERIC DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS product_attributes (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      attribute_name TEXT NOT NULL,
      attribute_value TEXT NOT NULL,
      price_modifier NUMERIC DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS shipping_offices (
      id SERIAL PRIMARY KEY,
      province TEXT NOT NULL,
      office_name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      total_orders INTEGER DEFAULT 0,
      total_spent NUMERIC DEFAULT 0,
      successful_deliveries INTEGER DEFAULT 0,
      returned_packages INTEGER DEFAULT 0,
      is_loyal INTEGER DEFAULT 0,
      risk_score NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_phone TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_address TEXT,
      customer_city TEXT,
      customer_province TEXT,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT,
      product_attributes TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price NUMERIC NOT NULL,
      total_amount NUMERIC NOT NULL,
      shipping_method TEXT CHECK(shipping_method IN ('home_delivery', 'office_pickup')),
      shipping_office_id INTEGER REFERENCES shipping_offices(id) ON DELETE SET NULL,
      shipping_office_name TEXT,
      shipping_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      notes TEXT,
      tracking_number TEXT,
      courier_name TEXT,
      is_abandoned INTEGER DEFAULT 0,
      is_fraud_flagged INTEGER DEFAULT 0,
      delivered_at TIMESTAMP,
      item_count INTEGER DEFAULT 1,
      discount_percent NUMERIC DEFAULT 0,
      discount_amount NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      product_image TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price NUMERIC NOT NULL,
      attributes TEXT,
      selected_ram TEXT,
      selected_storage TEXT,
      selected_hdd TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id SERIAL PRIMARY KEY,
      customer_phone TEXT,
      customer_name TEXT,
      product_id INTEGER,
      product_name TEXT,
      quantity INTEGER,
      total_amount NUMERIC,
      cart_data TEXT,
      recovered INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS exchange_requests (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      customer_phone TEXT NOT NULL,
      customer_name TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      expense_type TEXT NOT NULL,
      description TEXT,
      amount NUMERIC NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      expense_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS tracking_pixels (
      id SERIAL PRIMARY KEY,
      pixel_type TEXT NOT NULL,
      pixel_id TEXT NOT NULL,
      access_token TEXT,
      is_active INTEGER DEFAULT 1,
      event_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS notifications_log (
      id SERIAL PRIMARY KEY,
      order_id INTEGER,
      customer_phone TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS loyalty_customers (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
      total_orders INTEGER DEFAULT 0,
      total_spent NUMERIC DEFAULT 0,
      last_purchase_date TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS blacklist (
      id SERIAL PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      reason TEXT,
      blocked_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await exec('CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone)');
  await exec('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status)');
  await exec('CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status)');
  await exec('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)');
  await exec('CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)');
  await exec('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
  await exec('CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id)');
  await exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_tier1_percent NUMERIC DEFAULT 0`);
  await exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_tier2_percent NUMERIC DEFAULT 0`);
  await exec('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)');
  await exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0");

  await exec(`
    CREATE TABLE IF NOT EXISTS delivery_fees (
      id SERIAL PRIMARY KEY,
      province TEXT UNIQUE NOT NULL,
      home_delivery_fee NUMERIC DEFAULT 0,
      office_pickup_fee NUMERIC DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const provCount = await prepare('SELECT COUNT(*)::int as c FROM delivery_fees').get();
  if (provCount && provCount.c === 0) {
    const provinces = [
      ['Adrar', 800, 400], ['Chlef', 600, 300], ['Laghouat', 700, 350], ['Oum El Bouaghi', 600, 300],
      ['Batna', 600, 300], ['Béjaïa', 600, 300], ['Biskra', 700, 350], ['Béchar', 1200, 600],
      ['Blida', 500, 250], ['Bouira', 600, 300], ['Tamanrasset', 1500, 800], ['Tébessa', 700, 350],
      ['Tlemcen', 800, 400], ['Tiaret', 700, 350], ['Tizi Ouzou', 600, 300], ['Algiers', 400, 200],
      ['Djelfa', 700, 350], ['Jijel', 600, 300], ['Sétif', 600, 300], ['Saïda', 700, 350],
      ['Skikda', 600, 300], ['Sidi Bel Abbès', 700, 350], ['Annaba', 600, 300], ['Guelma', 600, 300],
      ['Constantine', 500, 250], ['Médéa', 500, 250], ['Mostaganem', 700, 350], ["M'Sila", 600, 300],
      ['Mascara', 700, 350], ['Ouargla', 900, 450], ['Oran', 700, 350], ['El Bayadh', 900, 450],
      ['Illizi', 1500, 800], ['Bordj Bou Arréridj', 600, 300], ['Boumerdès', 500, 250],
      ['El Tarf', 600, 300], ['Tindouf', 1800, 900], ['Tissemsilt', 700, 350], ['El Oued', 800, 400],
      ['Khenchela', 700, 350], ['Souk Ahras', 700, 350], ['Tipaza', 500, 250], ['Mila', 600, 300],
      ['Aïn Defla', 600, 300], ['Naâma', 800, 400], ['Aïn Témouchent', 700, 350],
      ['Ghardaïa', 800, 400], ['Relizane', 700, 350], ["El M'Ghair", 800, 400], ['El Meniaa', 900, 450],
      ['Ouled Djellal', 700, 350], ['Bordj Baji Mokhtar', 2000, 1000], ['Béni Abbès', 1200, 600],
      ['Timimoun', 1200, 600], ['Touggourt', 800, 400], ['Djanet', 1800, 900],
      ['In Salah', 1500, 800], ['In Guezzam', 2000, 1000],
    ];
    for (const p of provinces) {
      await prepare('INSERT INTO delivery_fees (province, home_delivery_fee, office_pickup_fee) VALUES ($1, $2, $3)').run(p[0], p[1], p[2]);
    }
  }

  initialized = true;
}

module.exports = { initDatabase, prepare, exec, transaction, saveDb, pool };
