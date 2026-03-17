const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { upload, validateMagicBytes } = require('../middleware/upload');
const { updateProfile } = require('../controllers/userController');

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Format de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

router.put('/profile', authenticate, upload.single('avatar'), handleUploadError, validateMagicBytes, updateProfile);

module.exports = router;
