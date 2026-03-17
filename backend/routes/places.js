const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { upload, validateMagicBytes } = require('../middleware/upload');
const { getAll, getOne, create, update, remove } = require('../controllers/placesController');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const placeValidation = [
  body('name').trim().notEmpty().withMessage('Le nom est obligatoire').isLength({ max: 200 }),
  body('category').isIn(['cafe', 'restaurant', 'hotel']).withMessage('Catégorie invalide'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  body('rating').optional({ values: 'falsy' }).isFloat({ min: 0, max: 5 }).withMessage('La note doit être entre 0 et 5'),
];

const updateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Le nom est obligatoire').isLength({ max: 200 }),
  body('category').optional().isIn(['cafe', 'restaurant', 'hotel']).withMessage('Catégorie invalide'),
  body('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  body('rating').optional({ values: 'falsy' }).isFloat({ min: 0, max: 5 }).withMessage('La note doit être entre 0 et 5'),
];

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Format de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.post('/', authenticate, upload.single('photo'), handleUploadError, validateMagicBytes, placeValidation, validate, create);
router.put('/:id', authenticate, upload.single('photo'), handleUploadError, validateMagicBytes, updateValidation, validate, update);
router.delete('/:id', authenticate, remove);

module.exports = router;
