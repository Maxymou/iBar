const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { exportRestaurants, exportAccommodations, exportCafes } = require('../services/exportService');

router.get('/restaurants', authenticate, async (req, res) => {
  try {
    const csv = await exportRestaurants();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="restaurants.csv"');
    res.send('\ufeff' + csv); // BOM for Excel UTF-8
  } catch (err) {
    console.error('Export restaurants error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

router.get('/accommodations', authenticate, async (req, res) => {
  try {
    const csv = await exportAccommodations();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hebergements.csv"');
    res.send('\ufeff' + csv);
  } catch (err) {
    console.error('Export accommodations error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

router.get('/cafes', authenticate, async (req, res) => {
  try {
    const csv = await exportCafes();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cafes.csv"');
    res.send('\ufeff' + csv);
  } catch (err) {
    console.error('Export cafes error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

module.exports = router;
