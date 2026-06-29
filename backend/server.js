require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDatabase, prepare, exec } = require('./models/database');
const { IMGBB_API_KEY, getStorageInfo } = require('./utils/storage');
const fs = require('fs');

let app, server;

async function start() {
  await initDatabase();

  const productsRouter = require('./routes/products');
  const categoriesRouter = require('./routes/categories');
  const shippingRouter = require('./routes/shipping');
  const ordersRouter = require('./routes/orders');
  const exchangesRouter = require('./routes/exchanges');
  const adminRouter = require('./routes/admin');
  const deliveryRouter = require('./routes/delivery');
  const { apiLimiter } = require('./middleware/rateLimiter');
const { authenticateToken } = require('./middleware/auth');

  app = express();
  const PORT = process.env.PORT || 3001;

  const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'https://mits-rtb-frontend.onrender.com,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000').split(',');
  app.use(cors({
    origin: CORS_ORIGINS,
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && CORS_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const ext = req.path.split('.').pop()?.toLowerCase();
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', txt: 'text/plain', pdf: 'application/pdf' };
    if (ext && mimeMap[ext]) {
      res.setHeader('Content-Type', mimeMap[ext]);
    }
    next();
  }, express.static(path.join(__dirname, 'uploads')), (req, res) => {
    const placeholder = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#f0f0f0" width="400" height="300"/><text fill="#999" font-family="Arial,sans-serif" font-size="18" text-anchor="middle" x="200" y="155">Image non disponible</text></svg>');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(placeholder);
  });

  app.use('/api', apiLimiter);
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/shipping', shippingRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/exchanges', exchangesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/delivery', deliveryRouter);

  app.get('/api/config', (req, res) => {
    res.json({
      site_name: 'LA MAISON CD',
      site_tagline: 'Premium Laptop Store',
      currency: 'DZD',
      currency_symbol: 'DA',
      support_phone: '+213 XXX XXX XXX',
      support_whatsapp: '+213 XXX XXX XXX',
      primary_color: '#22549E',
      accent_color: '#FDF05',
      dark_color: '#22549E',
      light_bg: '#FFF4EB'
    });
  });

  async function seedDatabase() {
    const adminRow = await prepare('SELECT id FROM admin_users LIMIT 1').get();
    if (!adminRow) {
      const hash = bcrypt.hashSync('mitsrtb26', 10);
      await prepare('INSERT INTO admin_users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)')
        .run('lamaisoncd', hash, 'Administrator', 'superadmin');
    }

    const catRow = await prepare('SELECT COUNT(*)::int as c FROM categories').get();
    if (catRow.c === 0) {
      await prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)').run('Laptop', 'laptop', 'High-performance laptops and notebooks', 1);
      await prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4)').run('Accessory', 'accessory', 'Laptop accessories and peripherals', 2);
    }

    const brandRow = await prepare('SELECT COUNT(*)::int as c FROM brands').get();
    if (brandRow.c === 0) {
      await prepare('INSERT INTO brands (name) VALUES ($1)').run('Asus');
      await prepare('INSERT INTO brands (name) VALUES ($1)').run('HP');
      await prepare('INSERT INTO brands (name) VALUES ($1)').run('Dell');
      await prepare('INSERT INTO brands (name) VALUES ($1)').run('Lenovo');
      await prepare('INSERT INTO brands (name) VALUES ($1)').run('Apple');
    }

    const prodRow = await prepare('SELECT COUNT(*)::int as c FROM products').get();
    if (prodRow.c === 0) {
      const laptops = [
        [1, 'Asus ROG Zephyrus G14', 'asus-rog-zephyrus-g14', 'Premium gaming laptop with AMD Ryzen 9, NVIDIA RTX 4060, 14-inch QHD display, and 16GB RAM.', 'Ryzen 9 | RTX 4060 | 14" QHD | 16GB RAM', 249900, 200000, 2000, 5000, 3000, 15, 'الألعاب', '', JSON.stringify([{ name: 'Color', values: ['Eclipse Gray', 'Moonlight White'] }, { name: 'RAM', values: ['16GB', '32GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'Asus ZenBook 14 OLED', 'asus-zenbook-14-oled', 'Ultraportable laptop with Intel Core Ultra 7, 14-inch OLED display, and all-day battery.', 'Core Ultra 7 | 14" OLED | 16GB RAM | 1TB SSD', 189900, 152000, 2000, 4000, 3000, 12, 'الدراسة', '', JSON.stringify([{ name: 'Color', values: ['Ponder Blue', 'Foggy Silver'] }, { name: 'RAM', values: ['16GB', '32GB'] }])],
        [1, 'Asus TUF Gaming A15', 'asus-tuf-gaming-a15', 'Durable gaming laptop with AMD Ryzen 7, RTX 3050, 15.6-inch FHD 144Hz display.', 'Ryzen 7 | RTX 3050 | 15.6" FHD | 16GB RAM', 179900, 144000, 2000, 4000, 2500, 20, 'الألعاب', '', JSON.stringify([{ name: 'Color', values: ['Mecha Gray', 'Jaeger Gray'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'Asus Vivobook 16', 'asus-vivobook-16', 'Versatile everyday laptop with Intel Core i5, 16-inch FHD display, and comprehensive ports.', 'Core i5 | 16" FHD | 16GB RAM | 512GB SSD', 139900, 112000, 2000, 3000, 2000, 25, 'الدراسة', '', JSON.stringify([{ name: 'Color', values: ['Indie Black', 'Transparent Silver'] }, { name: 'RAM', values: ['8GB', '16GB'] }])],
        [1, 'HP Spectre x360 14', 'hp-spectre-x360-14', 'Premium 2-in-1 convertible with Intel Core Ultra 7, 14-inch OLED touchscreen, and stunning design.', 'Core Ultra 7 | 14" OLED Touch | 16GB RAM | 1TB SSD', 269900, 216000, 2000, 6000, 3000, 10, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Nightfall Black', 'Slate Blue'] }, { name: 'RAM', values: ['16GB', '32GB'] }])],
        [1, 'HP Envy 16', 'hp-envy-16', 'Creative laptop with Intel Core i7, 16-inch 2.5K display, and dedicated NVIDIA graphics.', 'Core i7 | 16" 2.5K | RTX 3050 | 16GB RAM', 219900, 176000, 2000, 5000, 3000, 12, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Natural Silver', 'Pewter'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'HP Pavilion 15', 'hp-pavilion-15', 'Reliable everyday laptop with Intel Core i5, 15.6-inch FHD display, and long battery life.', 'Core i5 | 15.6" FHD | 8GB RAM | 512GB SSD', 149900, 120000, 2000, 3000, 2000, 30, 'الدراسة', '', JSON.stringify([{ name: 'Color', values: ['Silver', 'Gold'] }, { name: 'RAM', values: ['8GB', '16GB'] }])],
        [1, 'HP EliteBook 840 G11', 'hp-elitebook-840-g11', 'Business laptop with Intel Core Ultra 7, 14-inch FHD display, and enterprise-grade security.', 'Core Ultra 7 | 14" FHD | 16GB RAM | 512GB SSD', 229900, 184000, 2000, 4000, 3000, 8, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Silver'] }, { name: 'RAM', values: ['16GB', '32GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'Dell XPS 15', 'dell-xps-15', 'Premium ultrabook with Intel Core i7, 15.6-inch 3.5K OLED InfinityEdge display, and premium build.', 'Core i7 | 15.6" 3.5K OLED | 16GB RAM | 512GB SSD', 289900, 232000, 2000, 6000, 3000, 10, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Platinum Silver', 'Graphite'] }, { name: 'RAM', values: ['16GB', '32GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'Dell Inspiron 16', 'dell-inspiron-16', 'Versatile laptop with Intel Core i5, 16-inch 16:10 FHD+ display, and great connectivity.', 'Core i5 | 16" FHD+ | 16GB RAM | 512GB SSD', 169900, 136000, 2000, 3000, 2000, 20, 'الدراسة', '', JSON.stringify([{ name: 'Color', values: ['Platinum Silver', 'Carbon Black'] }, { name: 'RAM', values: ['8GB', '16GB'] }])],
        [1, 'Dell Latitude 5550', 'dell-latitude-5550', 'Business-class laptop with Intel Core i7, 15.6-inch FHD display, and robust security features.', 'Core i7 | 15.6" FHD | 16GB RAM | 512GB SSD', 199900, 160000, 2000, 4000, 3000, 15, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Titan Gray'] }, { name: 'RAM', values: ['16GB', '32GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'Dell Alienware m18', 'dell-alienware-m18', 'Extreme gaming laptop with Intel Core i9, NVIDIA RTX 4070, 18-inch QHD 165Hz display.', 'Core i9 | RTX 4070 | 18" QHD | 32GB RAM | 1TB SSD', 349900, 280000, 3000, 10000, 5000, 8, 'الألعاب', '', JSON.stringify([{ name: 'Color', values: ['Dark Side of the Moon'] }, { name: 'RAM', values: ['32GB', '64GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '1TB SSD', '2TB SSD'] }])],
        [1, 'Lenovo ThinkPad X1 Carbon Gen 12', 'lenovo-thinkpad-x1-carbon-gen-12', 'Ultralight business laptop with Intel Core Ultra 7, 14-inch 2.8K OLED, and legendary keyboard.', 'Core Ultra 7 | 14" 2.8K OLED | 16GB RAM | 512GB SSD', 299900, 240000, 2000, 6000, 3000, 10, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Black'] }, { name: 'RAM', values: ['16GB', '32GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'Lenovo Legion Pro 5', 'lenovo-legion-pro-5', 'High-performance gaming laptop with AMD Ryzen 7, RTX 4060, and 16-inch QHD display.', 'Ryzen 7 | RTX 4060 | 16" QHD | 16GB RAM', 229900, 184000, 2000, 5000, 3000, 15, 'الألعاب', '', JSON.stringify([{ name: 'Color', values: ['Onyx Grey', 'Glacier White'] }, { name: 'RAM', values: ['16GB', '32GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '1TB SSD', '2TB SSD'] }])],
        [1, 'Lenovo IdeaPad 5', 'lenovo-ideapad-5', 'Affordable everyday laptop with AMD Ryzen 5, 15.6-inch FHD display, and excellent battery life.', 'Ryzen 5 | 15.6" FHD | 8GB RAM | 512GB SSD', 139900, 112000, 2000, 3000, 2000, 30, 'الدراسة', '', JSON.stringify([{ name: 'Color', values: ['Abyss Blue', 'Cloud Grey'] }, { name: 'RAM', values: ['8GB', '16GB'] }])],
        [1, 'Lenovo Yoga 9i', 'lenovo-yoga-9i', 'Premium 2-in-1 convertible with Intel Core i7, 14-inch 2.8K OLED touchscreen, and rotating sound bar.', 'Core i7 | 14" 2.8K OLED Touch | 16GB RAM | 1TB SSD', 219900, 176000, 2000, 5000, 3000, 12, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Storm Grey', 'Mist Blue'] }, { name: 'RAM', values: ['16GB', '32GB'] }])],
        [1, 'Apple MacBook Air M3', 'macbook-air-m3', 'Ultrahin laptop with Apple M3 chip, 13.6-inch Liquid Retina display, and all-day battery life.', 'Apple M3 | 13.6" Liquid Retina | 8GB RAM | 256GB SSD', 179900, 144000, 2000, 5000, 3000, 20, 'الدراسة', '', JSON.stringify([{ name: 'Color', values: ['Midnight', 'Starlight', 'Space Gray', 'Silver'] }, { name: 'RAM', values: ['8GB', '16GB', '24GB'] }, { name: 'Storage', values: ['256GB SSD', '500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD'] }])],
        [1, 'Apple MacBook Pro 14 M4 Pro', 'macbook-pro-14-m4-pro', 'Professional laptop with Apple M4 Pro chip, 14.2-inch Liquid Retina XDR display, and pro performance.', 'Apple M4 Pro | 14.2" Liquid Retina XDR | 18GB RAM | 512GB SSD', 349900, 280000, 3000, 8000, 5000, 15, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Silver', 'Space Black'] }, { name: 'RAM', values: ['18GB', '36GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '512GB SSD', '1TB SSD', '2TB SSD'] }])],
        [1, 'Apple MacBook Pro 16 M4 Max', 'macbook-pro-16-m4-max', 'Flagship professional laptop with Apple M4 Max chip, 16.2-inch Liquid Retina XDR display, and extreme power.', 'Apple M4 Max | 16.2" Liquid Retina XDR | 36GB RAM | 1TB SSD', 499900, 400000, 3000, 12000, 6000, 10, 'العمل', '', JSON.stringify([{ name: 'Color', values: ['Silver', 'Space Black'] }, { name: 'RAM', values: ['36GB', '64GB', '128GB'] }, { name: 'Storage', values: ['500GB HDD', '1TB HDD', '1TB SSD', '2TB SSD', '4TB SSD'] }])],
        [1, 'Apple MacBook Air M2', 'macbook-air-m2', 'Slim and capable laptop with Apple M2 chip, 13.6-inch Liquid Retina display, and MagSafe charging.', 'Apple M2 | 13.6" Liquid Retina | 8GB RAM | 256GB SSD', 149900, 120000, 2000, 4000, 2500, 25, 'الدراسة', '', JSON.stringify([{ name: 'Color', values: ['Midnight', 'Starlight', 'Space Gray', 'Silver'] }, { name: 'RAM', values: ['8GB', '16GB'] }, { name: 'Storage', values: ['256GB SSD', '500GB HDD', '1TB HDD', '512GB SSD'] }])],
      ];
      for (const l of laptops) {
        const discount_t1 = Math.min(5, Math.max(2, Math.round((l[5] - l[6]) / l[5] * 100 / 6) * 2));
        const discount_t2 = Math.min(8, Math.max(4, discount_t1 + 3));
        await prepare('INSERT INTO products (category_id, name, slug, description, short_description, base_price, cost_price, shipping_cost, ad_cost, overhead_cost, stock_quantity, best_of, image_url, attributes, discount_tier1_percent, discount_tier2_percent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)').run(...l, discount_t1, discount_t2);
      }

      await prepare('INSERT INTO product_offers (product_id, min_quantity, max_quantity, discount_percent) VALUES ($1, $2, $3, $4)').run(1, 2, 4, 3);
      await prepare('INSERT INTO product_offers (product_id, min_quantity, max_quantity, discount_percent) VALUES ($1, $2, $3, $4)').run(1, 5, null, 7);
      await prepare('INSERT INTO product_offers (product_id, min_quantity, max_quantity, discount_percent) VALUES ($1, $2, $3, $4)').run(5, 2, 4, 4);
      await prepare('INSERT INTO product_offers (product_id, min_quantity, max_quantity, discount_percent) VALUES ($1, $2, $3, $4)').run(9, 2, 4, 3);
      await prepare('INSERT INTO product_offers (product_id, min_quantity, max_quantity, discount_percent) VALUES ($1, $2, $3, $4)').run(13, 2, null, 5);
      await prepare('INSERT INTO product_offers (product_id, min_quantity, max_quantity, discount_percent) VALUES ($1, $2, $3, $4)').run(17, 2, 4, 3);
      await prepare('INSERT INTO product_offers (product_id, min_quantity, max_quantity, discount_percent) VALUES ($1, $2, $3, $4)').run(17, 5, null, 8);

      const attrData = [
        [1, 'Color', ['Eclipse Gray', 0], ['Moonlight White', 0]], [1, 'RAM', ['16GB', 0], ['32GB', 15000]], [1, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 20000]],
        [2, 'Color', ['Ponder Blue', 0], ['Foggy Silver', 0]], [2, 'RAM', ['16GB', 0], ['32GB', 15000]],
        [3, 'Color', ['Mecha Gray', 0], ['Jaeger Gray', 0]], [3, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 20000]],
        [4, 'Color', ['Indie Black', 0], ['Transparent Silver', 0]], [4, 'RAM', ['4GB', -5000], ['8GB', 0], ['16GB', 10000]],
        [5, 'Color', ['Nightfall Black', 0], ['Slate Blue', 0]], [5, 'RAM', ['16GB', 0], ['32GB', 15000]],
        [6, 'Color', ['Natural Silver', 0], ['Pewter', 0]], [6, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 20000]],
        [7, 'Color', ['Silver', 0], ['Gold', 0]], [7, 'RAM', ['4GB', -5000], ['8GB', 0], ['16GB', 10000]],
        [8, 'Color', ['Silver', 0]], [8, 'RAM', ['16GB', 0], ['32GB', 15000]], [8, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 20000]],
        [9, 'Color', ['Platinum Silver', 0], ['Graphite', 0]], [9, 'RAM', ['16GB', 0], ['32GB', 20000]], [9, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 25000]],
        [10, 'Color', ['Platinum Silver', 0], ['Carbon Black', 0]], [10, 'RAM', ['4GB', -5000], ['8GB', 0], ['16GB', 10000]],
        [11, 'Color', ['Titan Gray', 0]], [11, 'RAM', ['16GB', 0], ['32GB', 15000]], [11, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 20000]],
        [12, 'Color', ['Dark Side of the Moon', 0]], [12, 'RAM', ['32GB', 0], ['64GB', 25000]], [12, 'Storage', ['500GB HDD', -8000], ['1TB HDD', -3000], ['1TB SSD', 0], ['2TB SSD', 25000]],
        [13, 'Color', ['Black', 0]], [13, 'RAM', ['16GB', 0], ['32GB', 20000]], [13, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 25000]],
        [14, 'Color', ['Onyx Grey', 0], ['Glacier White', 0]], [14, 'RAM', ['16GB', 0], ['32GB', 15000]], [14, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['1TB SSD', 0], ['2TB SSD', 20000]],
        [15, 'Color', ['Abyss Blue', 0], ['Cloud Grey', 0]], [15, 'RAM', ['2GB', -8000], ['4GB', -5000], ['8GB', 0], ['16GB', 10000]],
        [16, 'Color', ['Storm Grey', 0], ['Mist Blue', 0]], [16, 'RAM', ['16GB', 0], ['32GB', 15000]],
        [17, 'Color', ['Midnight', 0], ['Starlight', 0], ['Space Gray', 0], ['Silver', 0]], [17, 'RAM', ['8GB', 0], ['16GB', 15000], ['24GB', 30000]], [17, 'Storage', ['128GB SSD', -5000], ['256GB SSD', 0], ['500GB HDD', -8000], ['1TB HDD', -3000], ['512GB SSD', 15000], ['1TB SSD', 30000]],
        [18, 'Color', ['Silver', 0], ['Space Black', 0]], [18, 'RAM', ['18GB', 0], ['36GB', 20000]], [18, 'Storage', ['500GB HDD', -5000], ['1TB HDD', -3000], ['512GB SSD', 0], ['1TB SSD', 20000], ['2TB SSD', 40000]],
        [19, 'Color', ['Silver', 0], ['Space Black', 0]], [19, 'RAM', ['36GB', 0], ['64GB', 25000], ['128GB', 50000]], [19, 'Storage', ['500GB HDD', -8000], ['1TB HDD', -3000], ['1TB SSD', 0], ['2TB SSD', 30000], ['4TB SSD', 60000]],
        [20, 'Color', ['Midnight', 0], ['Starlight', 0], ['Space Gray', 0], ['Silver', 0]], [20, 'RAM', ['8GB', 0], ['16GB', 15000]], [20, 'Storage', ['128GB SSD', -5000], ['256GB SSD', 0], ['500GB HDD', -8000], ['1TB HDD', -3000], ['512GB SSD', 15000]],
      ];
      for (const a of attrData) {
        const pid = a[0], name = a[1];
        for (let i = 2; i < a.length; i++) {
          await prepare('INSERT INTO product_attributes (product_id, attribute_name, attribute_value, price_modifier) VALUES ($1, $2, $3, $4)').run(pid, name, a[i][0], a[i][1]);
        }
      }

      const offices = [
        ['Algiers', 'Algiers Downtown Office', '123 Rue Didouche Mourad, Algiers Center', '+213 21 63 10 00'],
        ['Algiers', 'Bab Ezzouar Office', 'Bab Ezzouar Commercial Center, Dar El Beida', '+213 21 24 88 00'],
        ['Oran', 'Oran Main Office', '45 Boulevard Maata Mohamed, Oran', '+213 41 39 40 00'],
        ['Oran', 'Oran Es-Senia Office', 'Es-Senia University Complex', '+213 41 58 30 00'],
        ['Constantine', 'Constantine Downtown Office', '8 Rue Larbi Ben M\'hidi, Constantine', '+213 31 92 10 00'],
        ['Constantine', 'Constantine Ali Mendjeli Office', 'Ali Mendjeli New City', '+213 31 77 20 00'],
        ['Annaba', 'Annaba Office', '12 Boulevard de la Revolution, Annaba', '+213 38 82 00 00'],
        ['Blida', 'Blida Office', '7 Rue de la Liberte, Blida', '+213 25 43 20 00'],
        ['Setif', 'Setif Office', '25 Avenue de l\'ALN, Setif', '+213 36 91 10 00'],
        ['Tizi Ouzou', 'Tizi Ouzou Office', '15 Rue Abane Ramdane, Tizi Ouzou', '+213 26 21 30 00'],
      ];
      for (const o of offices) {
        await prepare('INSERT INTO shipping_offices (province, office_name, address, phone) VALUES ($1, $2, $3, $4)').run(...o);
      }
    }

    const prodNoDisc = await prepare("SELECT COUNT(*)::int as c FROM products WHERE discount_tier1_percent = 0 AND discount_tier2_percent = 0 AND base_price > 0").get();
    if (prodNoDisc.c > 0) {
      const undiscounted = await prepare('SELECT id, base_price, cost_price FROM products WHERE discount_tier1_percent = 0 AND discount_tier2_percent = 0 AND base_price > 0').all();
      for (const p of undiscounted) {
        const margin = (Number(p.base_price) - Number(p.cost_price || 0)) / Number(p.base_price);
        const t1 = Math.min(5, Math.max(2, Math.round(margin * 100 / 6) * 2));
        const t2 = Math.min(8, Math.max(4, t1 + 3));
        await prepare('UPDATE products SET discount_tier1_percent = $1, discount_tier2_percent = $2 WHERE id = $3').run(t1, t2, p.id);
      }
    }

    const prodNoBrand = await prepare('SELECT COUNT(*)::int as c FROM products WHERE brand_id IS NULL').get();
    if (prodNoBrand.c > 0) {
      const brands = await prepare('SELECT id, name FROM brands').all();
      for (const b of brands) {
        await prepare("UPDATE products SET brand_id = $1 WHERE name LIKE $2 AND brand_id IS NULL").run(b.id, b.name + '%');
      }
    }
  }

  await seedDatabase();

  app.get('/api/seed', authenticateToken, async (req, res) => {
    try {
      await seedDatabase();
      res.json({ success: true, message: 'Database seeded successfully.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      storage: getStorageInfo()
    });
  });

  server = app.listen(PORT, () => {
    const storageInfo = getStorageInfo();
    console.log(`LA MAISON CD Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Storage mode: ${storageInfo.mode} (${storageInfo.provider})`);
    if (!storageInfo.persistent) {
      console.warn('WARNING: Images stored locally will be lost on server restart/deploy.');
      console.warn('Set IMGBB_API_KEY environment variable for persistent cloud storage.');
    }
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, getServer: () => server };
