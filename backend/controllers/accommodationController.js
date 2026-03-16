const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../models/db');
const { compressImage, deleteImage } = require('../services/imageService');
const { haversineSQL } = require('../utils/geoUtils');

const getAll = async (req, res) => {
  const { search, sort, lat, lng, limit = 100, offset = 0 } = req.query;
  const hasLocation = sort === 'distance' && lat && lng;

  const params = [];
  let paramIdx = 1;
  let distanceSelect = 'NULL AS distance';
  let orderBy = 'a.created_at DESC';

  if (search) {
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (sort === 'rating') {
    orderBy = 'a.rating DESC NULLS LAST';
  } else if (hasLocation) {
    const geo = haversineSQL('a', paramIdx, lat, lng);
    distanceSelect = geo.select;
    orderBy = geo.orderBy;
    params.push(...geo.params);
    paramIdx = geo.nextIdx;
  }

  params.push(parseInt(limit), parseInt(offset));

  const searchClause = search
    ? 'AND (a.name ILIKE $1 OR a.address ILIKE $1)'
    : '';

  const query = `
    SELECT a.*, u1.name AS created_by_name, u2.name AS updated_by_name,
           ${distanceSelect}
    FROM accommodations a
    LEFT JOIN users u1 ON a.created_by = u1.id
    LEFT JOIN users u2 ON a.updated_by = u2.id
    WHERE a.is_archived = false ${searchClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get accommodations error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des hébergements' });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*,
             u1.name as created_by_name,
             u2.name as updated_by_name
      FROM accommodations a
      LEFT JOIN users u1 ON a.created_by = u1.id
      LEFT JOIN users u2 ON a.updated_by = u2.id
      WHERE a.id = $1 AND a.is_archived = false
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hébergement introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Accommodation getOne error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  const {
    name, phone, address, comment, price, number_of_rooms,
    wifi, parking, rating, visit_date, latitude, longitude,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom est obligatoire' });
  }

  let photo_url = null;
  try {
    if (req.file) {
      await compressImage(req.file.path);
      photo_url = `/uploads/${req.file.filename}`;
    }

    const result = await db.query(`
      INSERT INTO accommodations (
        id, name, photo_url, phone, address, comment, price,
        number_of_rooms, wifi, parking, rating, visit_date,
        latitude, longitude, created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15,NOW(),NOW())
      RETURNING *
    `, [
      uuidv4(), name.trim(), photo_url, phone || null, address || null,
      comment || null, price ? parseFloat(price) : null,
      number_of_rooms ? parseInt(number_of_rooms) : null,
      wifi === 'true' || wifi === true,
      parking === 'true' || parking === true,
      rating ? parseFloat(rating) : null,
      visit_date || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      req.user.id,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create accommodation error:', err);
    if (req.file) deleteImage(req.file.filename);
    res.status(500).json({ error: 'Erreur lors de la création de l\'hébergement' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const {
    name, phone, address, comment, price, number_of_rooms,
    wifi, parking, rating, visit_date, latitude, longitude,
  } = req.body;

  try {
    const existing = await db.query(
      'SELECT photo_url, name, created_by FROM accommodations WHERE id = $1 AND is_archived = false', [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Hébergement introuvable' });
    }
    if (existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    let photo_url = existing.rows[0].photo_url;
    if (req.file) {
      await compressImage(req.file.path);
      if (photo_url) deleteImage(path.basename(photo_url));
      photo_url = `/uploads/${req.file.filename}`;
    } else if (req.body.remove_photo === 'true') {
      if (photo_url) deleteImage(path.basename(photo_url));
      photo_url = null;
    }

    const result = await db.query(`
      UPDATE accommodations SET
        name = $1, photo_url = $2, phone = $3, address = $4,
        comment = $5, price = $6, number_of_rooms = $7,
        wifi = $8, parking = $9, rating = $10, visit_date = $11,
        latitude = $12, longitude = $13,
        updated_by = $14, updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `, [
      name?.trim() || existing.rows[0].name,
      photo_url, phone || null, address || null, comment || null,
      price ? parseFloat(price) : null,
      number_of_rooms ? parseInt(number_of_rooms) : null,
      wifi === 'true' || wifi === true,
      parking === 'true' || parking === true,
      rating ? parseFloat(rating) : null,
      visit_date || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      req.user.id, id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update accommodation error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'hébergement' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT created_by FROM accommodations WHERE id = $1 AND is_archived = false', [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Hébergement introuvable' });
    }
    if (existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await db.query(
      `UPDATE accommodations SET is_archived = true, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Hébergement supprimé avec succès' });
  } catch (err) {
    console.error('Accommodation remove error:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
