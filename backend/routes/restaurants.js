const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getAll, getOne, create, update, remove } = require('../controllers/restaurantController');

router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.post('/', authenticate, upload.single('photo'), create);
router.put('/:id', authenticate, upload.single('photo'), update);
router.delete('/:id', authenticate, remove);

module.exports = router;
