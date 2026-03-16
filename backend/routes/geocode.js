const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.post('/reverse', authenticate, async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat et lng sont obligatoires' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'iBar/1.0',
        'Accept-Language': 'fr',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Erreur du service de géocodage' });
    }

    const data = await response.json();
    res.json({
      address: data.display_name || null,
    });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.status(500).json({ error: 'Erreur lors du géocodage inverse' });
  }
});

module.exports = router;
