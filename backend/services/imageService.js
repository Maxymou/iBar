const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const IMAGE_MAX_WIDTH = 1200;
const IMAGE_MAX_HEIGHT = 1200;
const IMAGE_QUALITY = 80;
const AVATAR_MAX_WIDTH = 400;
const AVATAR_MAX_HEIGHT = 400;
const AVATAR_QUALITY = 85;

const compressImage = async (filePath, options = {}) => {
  const {
    width = IMAGE_MAX_WIDTH,
    height = IMAGE_MAX_HEIGHT,
    quality = IMAGE_QUALITY,
  } = options;
  const ext = path.extname(filePath).toLowerCase();
  const outputPath = filePath.replace(ext, '_compressed' + ext);

  try {
    await sharp(filePath)
      .rotate()                                                        // auto-orient via EXIF
      .resize(width, height, { withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality })
      .toFile(outputPath);

    // Replace original with compressed
    fs.unlinkSync(filePath);
    fs.renameSync(outputPath, filePath);
  } catch (err) {
    console.error('Image compression error:', err);
    // Keep original if compression fails
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }

  return filePath;
};

const compressAvatar = (filePath) =>
  compressImage(filePath, {
    width: AVATAR_MAX_WIDTH,
    height: AVATAR_MAX_HEIGHT,
    quality: AVATAR_QUALITY,
  });

const deleteImage = (filename) => {
  if (!filename) return;
  const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = { compressImage, compressAvatar, deleteImage };
