const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { reverseGeocode } = require('../services/geocodeService');

router.post('/reverse', authenticate, async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat et lng sont obligatoires' });
  }

  try {
    const address = await reverseGeocode(lat, lng);
    res.json({ address: address || null });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.status(500).json({ error: 'Erreur lors du géocodage inverse' });
  }
});

module.exports = router;
