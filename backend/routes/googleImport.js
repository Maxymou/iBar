const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, async (req, res) => {
  const { google_maps_url } = req.body;

  if (!google_maps_url) {
    return res.status(400).json({ error: 'google_maps_url est obligatoire' });
  }

  try {
    const result = parseGoogleMapsUrl(google_maps_url);

    if (!result) {
      return res.status(400).json({ error: 'URL Google Maps invalide ou non supportée' });
    }

    // Try to reverse geocode for address
    let address = null;
    if (result.lat && result.lng) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${result.lat}&lon=${result.lng}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'iBar/1.0', 'Accept-Language': 'fr' },
        });
        if (response.ok) {
          const data = await response.json();
          address = data.display_name || null;
        }
      } catch (e) {
        // Address lookup failed, continue without it
      }
    }

    res.json({
      name: result.name || '',
      address: address || '',
      lat: result.lat,
      lng: result.lng,
    });
  } catch (err) {
    console.error('Google import error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'import Google Maps' });
  }
});

function parseGoogleMapsUrl(url) {
  try {
    // Pattern 1: @lat,lng,zoom
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        // Try to extract name from URL
        const nameMatch = url.match(/place\/([^/@]+)/);
        const name = nameMatch ? decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ') : '';
        return { lat, lng, name };
      }
    }

    // Pattern 2: ?q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
        name: '',
      };
    }

    // Pattern 3: /maps/place/Name/@lat,lng (already handled above with name extraction)

    // Pattern 4: Short URL with coordinates in data parameter
    const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dataMatch) {
      return {
        lat: parseFloat(dataMatch[1]),
        lng: parseFloat(dataMatch[2]),
        name: '',
      };
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = router;
