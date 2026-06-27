const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');

router.get('/', async (req, res) => {
  try {
    const { category, best_of, brand, ram, storage } = req.query;
    let where = 'WHERE p.is_active = 1';
    const params = [];
    if (category) { where += ' AND c.slug = $' + (params.length + 1); params.push(category); }
    if (best_of) { where += ' AND p.best_of = $' + (params.length + 1); params.push(best_of); }
    if (brand) { where += ' AND b.name = $' + (params.length + 1); params.push(brand); }
    if (ram) {
      where += " AND EXISTS (SELECT 1 FROM product_attributes pa WHERE pa.product_id = p.id AND pa.attribute_name = 'RAM' AND pa.attribute_value = $" + (params.length + 1) + ")";
      params.push(ram);
    }
    if (storage) {
      where += " AND EXISTS (SELECT 1 FROM product_attributes pa WHERE pa.product_id = p.id AND pa.attribute_name = 'Storage' AND pa.attribute_value = $" + (params.length + 1) + ")";
      params.push(storage);
    }
    where += ' ORDER BY p.created_at DESC';
    const products = await prepare(`SELECT p.*, c.name as category_name, b.name as brand_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id ${where}`).all(...params);
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/filters', async (req, res) => {
  try {
    const brands = (await prepare("SELECT DISTINCT b.name FROM brands b JOIN products p ON p.brand_id = b.id WHERE p.is_active = 1 ORDER BY b.name").all()).map(r => r.name);
    const rams = (await prepare("SELECT DISTINCT attribute_value FROM product_attributes WHERE attribute_name = 'RAM' ORDER BY attribute_value").all()).map(r => r.attribute_value);
    const storages = (await prepare("SELECT DISTINCT attribute_value FROM product_attributes WHERE attribute_name = 'Storage' ORDER BY attribute_value").all()).map(r => r.attribute_value);
    res.json({ brands, rams, storages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const product = await prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id WHERE p.slug = $1
    `).get(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const offers = await prepare('SELECT * FROM product_offers WHERE product_id = $1 AND is_active = 1 ORDER BY min_quantity ASC').all(product.id);
    const attributes = await prepare('SELECT * FROM product_attributes WHERE product_id = $1 ORDER BY attribute_name, attribute_value').all(product.id);
    res.json({ product, offers, attributes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
