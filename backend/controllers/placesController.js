const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../models/db');
const { compressImage, deleteImage } = require('../services/imageService');
const { haversineSQL } = require('../utils/geoUtils');

const VALID_CATEGORIES = ['cafe', 'restaurant', 'hotel'];
const MAX_LIMIT = 500;

const getAll = async (req, res) => {
  const { bbox, category, search, limit = 100, sort, lat, lng } = req.query;
  const safeLimit = Math.min(parseInt(limit) || 100, MAX_LIMIT);

  const params = [];
  const conditions = [];
  let paramIdx = 1;
  let distanceSelect = 'NULL AS distance';
  let orderBy = 'p.created_at DESC';

  // Category filter
  if (category && VALID_CATEGORIES.includes(category)) {
    conditions.push(`p.category = $${paramIdx}`);
    params.push(category);
    paramIdx++;
  }

  // Search filter
  if (search) {
    conditions.push(`(p.name ILIKE $${paramIdx} OR p.address ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  // Bounding box filter using PostGIS: bbox=south,west,north,east
  if (bbox) {
    const [south, west, north, east] = bbox.split(',').map(Number);
    if ([south, west, north, east].every(n => !isNaN(n))) {
      // ST_MakeEnvelope(xmin, ymin, xmax, ymax, srid) = (west, south, east, north)
      conditions.push(
        `ST_Intersects(p.geom, ST_MakeEnvelope($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, 4326)::geography)`
      );
      params.push(west, south, east, north);
      paramIdx += 4;
    }
  }

  // Sort
  if (sort === 'rating') {
    orderBy = 'p.rating DESC NULLS LAST';
  } else if (sort === 'distance' && lat && lng) {
    const geo = haversineSQL('p', paramIdx, lat, lng);
    distanceSelect = geo.select;
    orderBy = geo.orderBy;
    params.push(...geo.params);
    paramIdx = geo.nextIdx;
  }

  params.push(safeLimit);

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const query = `
    SELECT p.*, u1.name AS created_by_name,
           ${distanceSelect}
    FROM places p
    LEFT JOIN users u1 ON p.created_by = u1.id
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx}
  `;

  try {
    const result = await db.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('Get places error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des lieux' });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, u1.name AS created_by_name
      FROM places p
      LEFT JOIN users u1 ON p.created_by = u1.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lieu introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Place getOne error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  const { name, category, description, address, lat, lng, rating, source } = req.body;

  if (!name || !category || !lat || !lng) {
    return res.status(400).json({ error: 'name, category, lat et lng sont obligatoires' });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Catégorie invalide' });
  }

  let photo_url = null;
  try {
    if (req.file) {
      await compressImage(req.file.path);
      photo_url = `/uploads/${req.file.filename}`;
    }

    const result = await db.query(`
      INSERT INTO places (
        id, name, category, description, address,
        lat, lng, source, photo_url, rating,
        created_by, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
      RETURNING *
    `, [
      uuidv4(), name.trim(), category, description || null, address || null,
      parseFloat(lat), parseFloat(lng),
      source || 'manual', photo_url,
      rating ? parseFloat(rating) : null,
      req.user.id,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create place error:', err);
    if (req.file) deleteImage(req.file.filename);
    res.status(500).json({ error: 'Erreur lors de la création du lieu' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, category, description, address, lat, lng, rating } = req.body;

  try {
    const existing = await db.query(
      'SELECT * FROM places WHERE id = $1', [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lieu introuvable' });
    }
    if (existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const current = existing.rows[0];

    let photo_url = current.photo_url;
    if (req.file) {
      await compressImage(req.file.path);
      const newPhotoUrl = `/uploads/${req.file.filename}`;
      if (photo_url) deleteImage(path.basename(photo_url));
      photo_url = newPhotoUrl;
    } else if (req.body.remove_photo === 'true') {
      if (photo_url) deleteImage(path.basename(photo_url));
      photo_url = null;
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Catégorie invalide' });
    }

    const result = await db.query(`
      UPDATE places SET
        name = $1, category = $2, description = $3, address = $4,
        lat = $5, lng = $6, photo_url = $7, rating = $8,
        updated_by = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      name?.trim() || current.name,
      category || current.category,
      description !== undefined ? description : current.description,
      address !== undefined ? address : current.address,
      lat ? parseFloat(lat) : current.lat,
      lng ? parseFloat(lng) : current.lng,
      photo_url,
      rating !== undefined ? (rating ? parseFloat(rating) : null) : current.rating,
      req.user.id, id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update place error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du lieu' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT created_by, photo_url FROM places WHERE id = $1', [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lieu introuvable' });
    }
    if (existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (existing.rows[0].photo_url) {
      deleteImage(path.basename(existing.rows[0].photo_url));
    }

    await db.query('DELETE FROM places WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lieu supprimé avec succès' });
  } catch (err) {
    console.error('Place remove error:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
