const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { reverseGeocode } = require('../services/geocodeService');

router.post('/', authenticate, async (req, res) => {
  const { google_maps_url } = req.body;

  if (!google_maps_url) {
    return res.status(400).json({ error: 'google_maps_url est obligatoire' });
  }

  try {
    let url = google_maps_url.trim();

    if (!isGoogleMapsUrl(url)) {
      return res.status(400).json({ error: 'URL Google Maps invalide' });
    }

    if (isShortUrl(url)) {
      const resolved = await resolveShortUrl(url);
      if (resolved) url = resolved;
    }

    const result = parseGoogleMapsUrl(url);

    if (!result) {
      return res.status(400).json({ error: 'URL Google Maps invalide ou non supportée' });
    }

    // Reverse geocode for address if we have coordinates
    let address = null;
    if (result.lat != null && result.lng != null) {
      address = await reverseGeocode(result.lat, result.lng);
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

function isGoogleMapsUrl(url) {
  return /^https?:\/\/(www\.)?(google\.[a-z]{2,}\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|maps\.google\.[a-z]{2,})/i.test(url);
}

/**
 * Check if URL is a Google Maps short link
 */
function isShortUrl(url) {
  return /^https?:\/\/(goo\.gl\/maps|maps\.app\.goo\.gl)\//i.test(url);
}

/**
 * Resolve short URL by following redirects
 */
async function resolveShortUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'iBar/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    // The final URL after redirects
    if (response.url && response.url !== url) {
      return response.url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse Google Maps URL and extract coordinates and name.
 * Supports multiple URL formats. Returns partial results when possible.
 */
function parseGoogleMapsUrl(url) {
  try {
    // Pattern 1: /place/Name/@lat,lng — most common desktop share
    const placeMatch = url.match(/\/place\/([^/@]+)\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      const lat = parseFloat(placeMatch[2]);
      const lng = parseFloat(placeMatch[3]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, name: decodeName(placeMatch[1]) };
      }
    }

    // Pattern 2: @lat,lng (without /place/) — map view URL
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidCoord(lat, lng)) {
        // Try to extract name from /place/ segment even without coords in that segment
        const nameMatch = url.match(/\/place\/([^/@]+)/);
        const name = nameMatch ? decodeName(nameMatch[1]) : '';
        return { lat, lng, name };
      }
    }

    // Pattern 3: ?q=lat,lng — query with coordinates
    const qCoordMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qCoordMatch) {
      const lat = parseFloat(qCoordMatch[1]);
      const lng = parseFloat(qCoordMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, name: '' };
      }
    }

    // Pattern 4: ?ll=lat,lng — mobile share format
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      const lat = parseFloat(llMatch[1]);
      const lng = parseFloat(llMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, name: '' };
      }
    }

    // Pattern 5: !3dlat!4dlng — embedded/data parameter format
    const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lng = parseFloat(dataMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, name: '' };
      }
    }

    // Pattern 6: !8m2!3dlat!4dlng — alternate embed format
    const embedMatch = url.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (embedMatch) {
      const lat = parseFloat(embedMatch[1]);
      const lng = parseFloat(embedMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, name: '' };
      }
    }

    // Pattern 7: /dir/ destination — extract last @lat,lng
    if (url.includes('/dir/')) {
      const dirCoords = [...url.matchAll(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/g)];
      if (dirCoords.length > 0) {
        const last = dirCoords[dirCoords.length - 1];
        const lat = parseFloat(last[1]);
        const lng = parseFloat(last[2]);
        if (isValidCoord(lat, lng)) {
          return { lat, lng, name: '' };
        }
      }
    }

    // Pattern 8: ?q=Name (text query, no coords) — return name only
    const qTextMatch = url.match(/[?&]q=([^&]+)/);
    if (qTextMatch) {
      const name = decodeName(qTextMatch[1]);
      if (name && !/^-?\d/.test(name)) {
        return { lat: null, lng: null, name };
      }
    }

    // Pattern 9: /place/Name (no coordinates at all)
    const placeNameOnly = url.match(/\/place\/([^/@?]+)/);
    if (placeNameOnly) {
      return { lat: null, lng: null, name: decodeName(placeNameOnly[1]) };
    }

    return null;
  } catch {
    return null;
  }
}

function isValidCoord(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function decodeName(raw) {
  try {
    return decodeURIComponent(raw).replace(/\+/g, ' ').trim();
  } catch {
    return raw.replace(/\+/g, ' ').trim();
  }
}

module.exports = router;
