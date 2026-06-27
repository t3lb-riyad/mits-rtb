const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');

router.get('/offices', async (req, res) => {
  try {
    const { province } = req.query;
    let sql = 'SELECT * FROM shipping_offices WHERE is_active = 1';
    const params = [];
    if (province) { sql += ' AND province = $' + (params.length + 1); params.push(province); }
    sql += ' ORDER BY province, office_name';
    const offices = await prepare(sql).all(...params);
    res.json({ offices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/provinces', async (req, res) => {
  try {
    const provinces = await prepare('SELECT DISTINCT province FROM shipping_offices WHERE is_active = 1 ORDER BY province').all();
    res.json({ provinces: provinces.map(p => p.province) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
