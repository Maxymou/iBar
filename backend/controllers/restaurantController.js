const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../models/db');
const { compressImage, deleteImage } = require('../services/imageService');

const getAll = async (req, res) => {
  const { search, sort, lat, lng, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT r.*,
           u1.name as created_by_name,
           u2.name as updated_by_name
    FROM restaurants r
    LEFT JOIN users u1 ON r.created_by = u1.id
    LEFT JOIN users u2 ON r.updated_by = u2.id
    WHERE r.is_archived = false
  `;
  const params = [];
  let paramIdx = 1;

  if (search) {
    query += ` AND (r.name ILIKE $${paramIdx} OR r.address ILIKE $${paramIdx} OR r.cuisine_type ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (sort === 'rating') {
    query += ' ORDER BY r.rating DESC NULLS LAST';
  } else if (sort === 'distance' && lat && lng) {
    query += ` ORDER BY (
      6371 * acos(
        cos(radians($${paramIdx})) * cos(radians(r.latitude)) *
        cos(radians(r.longitude) - radians($${paramIdx + 1})) +
        sin(radians($${paramIdx})) * sin(radians(r.latitude))
      )
    ) ASC NULLS LAST`;
    params.push(parseFloat(lat), parseFloat(lng));
    paramIdx += 2;
  } else {
    query += ' ORDER BY r.created_at DESC';
  }

  query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(parseInt(limit), parseInt(offset));

  try {
    const result = await db.query(query, params);

    // Add distance if coordinates provided
    const rows = result.rows.map(row => {
      if (lat && lng && row.latitude && row.longitude) {
        const R = 6371;
        const dLat = (row.latitude - parseFloat(lat)) * Math.PI / 180;
        const dLon = (row.longitude - parseFloat(lng)) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(parseFloat(lat) * Math.PI / 180) * Math.cos(row.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        row.distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }
      return row;
    });

    res.json(rows);
  } catch (err) {
    console.error('Get restaurants error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des restaurants' });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*,
             u1.name as created_by_name,
             u2.name as updated_by_name
      FROM restaurants r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.updated_by = u2.id
      WHERE r.id = $1 AND r.is_archived = false
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  const {
    name, phone, address, bar, cuisine_type, rating, comment,
    visit_date, latitude, longitude,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom est obligatoire' });
  }

  let photo_url = null;
  if (req.file) {
    await compressImage(req.file.path);
    photo_url = `/uploads/${req.file.filename}`;
  }

  try {
    const result = await db.query(`
      INSERT INTO restaurants (
        id, name, photo_url, phone, address, bar, cuisine_type,
        rating, comment, visit_date, latitude, longitude,
        created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,NOW(),NOW())
      RETURNING *
    `, [
      uuidv4(), name.trim(), photo_url, phone || null, address || null,
      bar === 'true' || bar === true, cuisine_type || null,
      rating ? parseFloat(rating) : null, comment || null,
      visit_date || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      req.user.id,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create restaurant error:', err);
    if (req.file) deleteImage(req.file.filename);
    res.status(500).json({ error: 'Erreur lors de la création du restaurant' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const {
    name, phone, address, bar, cuisine_type, rating, comment,
    visit_date, latitude, longitude,
  } = req.body;

  try {
    const existing = await db.query(
      'SELECT * FROM restaurants WHERE id = $1 AND is_archived = false', [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant introuvable' });
    }

    let photo_url = existing.rows[0].photo_url;
    if (req.file) {
      await compressImage(req.file.path);
      const newPhotoUrl = `/uploads/${req.file.filename}`;
      // Delete old photo
      if (photo_url) {
        deleteImage(path.basename(photo_url));
      }
      photo_url = newPhotoUrl;
    }

    const result = await db.query(`
      UPDATE restaurants SET
        name = $1, photo_url = $2, phone = $3, address = $4,
        bar = $5, cuisine_type = $6, rating = $7, comment = $8,
        visit_date = $9, latitude = $10, longitude = $11,
        updated_by = $12, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      name?.trim() || existing.rows[0].name,
      photo_url, phone || null, address || null,
      bar === 'true' || bar === true,
      cuisine_type || null,
      rating ? parseFloat(rating) : null,
      comment || null, visit_date || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      req.user.id, id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update restaurant error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du restaurant' });
  }
};

const remove = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE restaurants SET is_archived = true, updated_at = NOW()
       WHERE id = $1 AND is_archived = false RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant introuvable' });
    }
    res.json({ message: 'Restaurant supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
