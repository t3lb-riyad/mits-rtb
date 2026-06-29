const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/fees', async (req, res) => {
  try {
    const fees = await prepare('SELECT province, home_delivery_fee, office_pickup_fee FROM delivery_fees WHERE is_active = 1 ORDER BY province').all();
    res.json({ fees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/fees/:province', async (req, res) => {
  try {
    const row = await prepare('SELECT province, home_delivery_fee, office_pickup_fee FROM delivery_fees WHERE province = $1 AND is_active = 1').get(req.params.province);
    if (!row) return res.status(404).json({ error: 'Province not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/fees', authenticateToken, async (req, res) => {
  try {
    const fees = await prepare('SELECT * FROM delivery_fees ORDER BY province').all();
    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/fees/:id', authenticateToken, async (req, res) => {
  try {
    const { home_delivery_fee, office_pickup_fee, is_active } = req.body;
    await prepare("UPDATE delivery_fees SET home_delivery_fee = $1, office_pickup_fee = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4")
      .run(Number(home_delivery_fee) || 0, Number(office_pickup_fee) || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/settings/language', authenticateToken, async (req, res) => {
  try {
    const { lang } = req.body;
    if (!['ar', 'fr', 'en'].includes(lang)) return res.status(400).json({ error: 'Invalid language. Must be ar, fr, or en.' });
    const existing = await prepare("SELECT id FROM app_settings WHERE key = 'system_language'").get();
    if (existing) {
      await prepare("UPDATE app_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = 'system_language'").run(lang);
    } else {
      await prepare("INSERT INTO app_settings (key, value) VALUES ($1, $2)").run('system_language', lang);
    }
    res.json({ success: true, lang });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings/language', async (req, res) => {
  try {
    const row = await prepare("SELECT value FROM app_settings WHERE key = 'system_language'").get();
    res.json({ lang: row ? row.value : 'fr' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
