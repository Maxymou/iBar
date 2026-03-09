const path = require('path');
const db = require('../models/db');
const { compressImage, deleteImage } = require('../services/imageService');

const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  try {
    if (email) {
      const existing = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase(), userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    let avatar_url = undefined;
    if (req.file) {
      await compressImage(req.file.path, { width: 400, quality: 85 });
      const current = await db.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
      if (current.rows[0]?.avatar_url) {
        deleteImage(path.basename(current.rows[0].avatar_url));
      }
      avatar_url = `/uploads/${req.file.filename}`;
    }

    const sets = [];
    const values = [];
    let idx = 1;

    if (name) { sets.push(`name = $${idx++}`); values.push(name.trim()); }
    if (email) { sets.push(`email = $${idx++}`); values.push(email.toLowerCase()); }
    if (avatar_url !== undefined) { sets.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      return res.status(400).json({ error: 'Aucune modification fournie' });
    }

    values.push(userId);
    const result = await db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, avatar_url, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
};

module.exports = { updateProfile };
