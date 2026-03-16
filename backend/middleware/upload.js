const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const FileType = require('file-type');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  },
});

const ALLOWED_MAGIC_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const validateMagicBytes = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const buffer = fs.readFileSync(req.file.path);
    const type = await FileType.fromBuffer(buffer);

    if (!type || !ALLOWED_MAGIC_MIMES.includes(type.mime)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Type de fichier non autorisé' });
    }

    next();
  } catch (err) {
    console.error('Magic bytes validation error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Erreur lors de la validation du fichier' });
  }
};

module.exports = { upload, validateMagicBytes };
