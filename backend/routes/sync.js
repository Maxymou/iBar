const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_TYPES = ['restaurants', 'accommodations', 'cafes'];
const ALLOWED_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];

router.post('/push', authenticate, async (req, res) => {
  const { actions } = req.body;

  if (!Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({ error: 'Un tableau d\'actions est requis' });
  }

  if (actions.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 actions par requête' });
  }

  const client = await db.getClient();
  const results = [];

  try {
    await client.query('BEGIN');

    for (const action of actions) {
      const { type, action: actionType, data } = action;

      if (!ALLOWED_TYPES.includes(type) || !ALLOWED_ACTIONS.includes(actionType)) {
        results.push({ success: false, error: 'Type ou action invalide' });
        continue;
      }

      try {
        if (actionType === 'CREATE') {
          const id = uuidv4();
          await client.query(
            `INSERT INTO ${type} (id, name, created_by, updated_by, created_at, updated_at)
             VALUES ($1, $2, $3, $3, NOW(), NOW())`,
            [id, data.name, req.user.id]
          );
          results.push({ success: true, id });
        } else if (actionType === 'UPDATE') {
          const existing = await client.query(
            `SELECT created_by FROM ${type} WHERE id = $1 AND is_archived = false`,
            [data.id]
          );
          if (existing.rows.length === 0 || existing.rows[0].created_by !== req.user.id) {
            results.push({ success: false, error: 'Non trouvé ou non autorisé' });
            continue;
          }
          await client.query(
            `UPDATE ${type} SET name = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`,
            [data.name, req.user.id, data.id]
          );
          results.push({ success: true, id: data.id });
        } else if (actionType === 'DELETE') {
          const existing = await client.query(
            `SELECT created_by FROM ${type} WHERE id = $1 AND is_archived = false`,
            [data.id]
          );
          if (existing.rows.length === 0 || existing.rows[0].created_by !== req.user.id) {
            results.push({ success: false, error: 'Non trouvé ou non autorisé' });
            continue;
          }
          await client.query(
            `UPDATE ${type} SET is_archived = true, updated_at = NOW() WHERE id = $1`,
            [data.id]
          );
          results.push({ success: true, id: data.id });
        }
      } catch (err) {
        console.error(`Sync action error (${actionType} ${type}):`, err);
        results.push({ success: false, error: 'Erreur interne' });
      }
    }

    await client.query('COMMIT');
    res.json({ results });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync push error:', err);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  } finally {
    client.release();
  }
});

module.exports = router;
