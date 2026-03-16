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
  let orderBy = 'c.created_at DESC';

  if (search) {
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (sort === 'rating') {
    orderBy = 'c.rating DESC NULLS LAST';
  } else if (hasLocation) {
    const geo = haversineSQL('c', paramIdx, lat, lng);
    distanceSelect = geo.select;
    orderBy = geo.orderBy;
    params.push(...geo.params);
    paramIdx = geo.nextIdx;
  }

  params.push(parseInt(limit), parseInt(offset));

  const searchClause = search
    ? 'AND (c.name ILIKE $1 OR c.address ILIKE $1 OR c.specialty ILIKE $1)'
    : '';

  const query = `
    SELECT c.*, u1.name AS created_by_name, u2.name AS updated_by_name,
           ${distanceSelect}
    FROM cafes c
    LEFT JOIN users u1 ON c.created_by = u1.id
    LEFT JOIN users u2 ON c.updated_by = u2.id
    WHERE c.is_archived = false ${searchClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get cafes error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des cafés' });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*,
             u1.name as created_by_name,
             u2.name as updated_by_name
      FROM cafes c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.updated_by = u2.id
      WHERE c.id = $1 AND c.is_archived = false
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Café introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Cafe getOne error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  const {
    name, phone, address, specialty, has_food, rating, comment,
    visit_date, latitude, longitude,
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
      INSERT INTO cafes (
        id, name, photo_url, phone, address, specialty, has_food,
        rating, comment, visit_date, latitude, longitude,
        created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,NOW(),NOW())
      RETURNING *
    `, [
      uuidv4(), name.trim(), photo_url, phone || null, address || null,
      specialty || null,
      has_food === 'true' || has_food === true,
      rating ? parseFloat(rating) : null, comment || null,
      visit_date || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      req.user.id,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create cafe error:', err);
    if (req.file) deleteImage(req.file.filename);
    res.status(500).json({ error: 'Erreur lors de la création du café' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const {
    name, phone, address, specialty, has_food, rating, comment,
    visit_date, latitude, longitude,
  } = req.body;

  try {
    const existing = await db.query(
      'SELECT photo_url, name, created_by FROM cafes WHERE id = $1 AND is_archived = false', [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Café introuvable' });
    }
    if (existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    let photo_url = existing.rows[0].photo_url;
    if (req.file) {
      await compressImage(req.file.path);
      const newPhotoUrl = `/uploads/${req.file.filename}`;
      if (photo_url) deleteImage(path.basename(photo_url));
      photo_url = newPhotoUrl;
    } else if (req.body.remove_photo === 'true') {
      if (photo_url) deleteImage(path.basename(photo_url));
      photo_url = null;
    }

    const result = await db.query(`
      UPDATE cafes SET
        name = $1, photo_url = $2, phone = $3, address = $4,
        specialty = $5, has_food = $6, rating = $7, comment = $8,
        visit_date = $9, latitude = $10, longitude = $11,
        updated_by = $12, updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      name?.trim() || existing.rows[0].name,
      photo_url, phone || null, address || null,
      specialty || null,
      has_food === 'true' || has_food === true,
      rating ? parseFloat(rating) : null,
      comment || null, visit_date || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      req.user.id, id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update cafe error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du café' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT created_by FROM cafes WHERE id = $1 AND is_archived = false', [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Café introuvable' });
    }
    if (existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await db.query(
      `UPDATE cafes SET is_archived = true, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Café supprimé avec succès' });
  } catch (err) {
    console.error('Cafe remove error:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
