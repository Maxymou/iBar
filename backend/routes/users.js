const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { updateProfile } = require('../controllers/userController');

router.put('/profile', authenticate, upload.single('avatar'), updateProfile);

module.exports = router;
