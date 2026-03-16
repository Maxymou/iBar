const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getAll, getOne, create, update, remove } = require('../controllers/accommodationController');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const accommodationValidation = [
  body('name').trim().notEmpty().withMessage('Le nom est obligatoire').isLength({ max: 200 }),
  body('rating').optional({ values: 'falsy' }).isFloat({ min: 0, max: 5 }).withMessage('La note doit être entre 0 et 5'),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
  body('price').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Le prix doit être positif'),
  body('number_of_rooms').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Le nombre de chambres doit être positif'),
  body('wifi').optional().isBoolean(),
  body('parking').optional().isBoolean(),
  body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }),
  body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }),
];

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Format de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.post('/', authenticate, upload.single('photo'), handleUploadError, accommodationValidation, validate, create);
router.put('/:id', authenticate, upload.single('photo'), handleUploadError, accommodationValidation, validate, update);
router.delete('/:id', authenticate, remove);

module.exports = router;
