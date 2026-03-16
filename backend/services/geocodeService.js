const db = require('../models/db');

const PRECISION = 4; // ~11m accuracy

function round(val) {
  const factor = Math.pow(10, PRECISION);
  return Math.round(parseFloat(val) * factor) / factor;
}

/**
 * Reverse geocode with database cache.
 * Rounds coordinates to 4 decimal places to avoid redundant Nominatim calls.
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {Promise<string|null>} address or null
 */
async function reverseGeocode(lat, lng) {
  const latR = round(lat);
  const lngR = round(lng);

  // 1. Check cache
  try {
    const cached = await db.query(
      `SELECT address FROM geocode_cache
       WHERE lat_rounded = $1 AND lng_rounded = $2`,
      [latR, lngR]
    );

    if (cached.rows.length > 0) {
      // Update last_used_at asynchronously (fire-and-forget)
      db.query(
        `UPDATE geocode_cache SET last_used_at = NOW()
         WHERE lat_rounded = $1 AND lng_rounded = $2`,
        [latR, lngR]
      ).catch(() => {});
      return cached.rows[0].address;
    }
  } catch (err) {
    // Cache lookup failed, proceed to Nominatim
    console.warn('Geocode cache lookup failed:', err.message);
  }

  // 2. Call Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'iBar/1.0',
        'Accept-Language': 'fr',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const address = data.display_name || null;

    if (!address) return null;

    // 3. Store in cache (fire-and-forget)
    db.query(
      `INSERT INTO geocode_cache (lat_rounded, lng_rounded, address)
       VALUES ($1, $2, $3)
       ON CONFLICT (lat_rounded, lng_rounded)
       DO UPDATE SET address = $3, last_used_at = NOW()`,
      [latR, lngR, address]
    ).catch(() => {});

    return address;
  } catch (err) {
    console.error('Nominatim reverse geocode failed:', err.message);
    return null;
  }
}

module.exports = { reverseGeocode };
