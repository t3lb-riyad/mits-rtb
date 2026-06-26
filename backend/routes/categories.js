const express = require('express');
const router = express.Router();
const { prepare } = require('../models/database');

router.get('/', (req, res) => {
  try {
    const categories = prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC').all();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
