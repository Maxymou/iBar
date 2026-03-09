const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const compressImage = async (filePath, options = {}) => {
  const { width = 1200, quality = 80 } = options;
  const ext = path.extname(filePath).toLowerCase();
  const outputPath = filePath.replace(ext, '_compressed' + ext);

  try {
    await sharp(filePath)
      .resize(width, null, { withoutEnlargement: true })
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

const deleteImage = (filename) => {
  if (!filename) return;
  const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = { compressImage, deleteImage };
