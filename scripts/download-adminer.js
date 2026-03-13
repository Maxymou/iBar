/**
 * Télécharge adminer.php depuis GitHub de façon portable.
 * Fonctionne sans curl, sans sudo, sur tous les OS (Linux, macOS, Windows).
 * Gère les redirections HTTP 301/302 (GitHub releases redirige vers un CDN).
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ADMINER_URL = 'https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php';
const adminerDir = path.join(__dirname, '..', 'adminer');
const dest = path.join(adminerDir, 'adminer.php');

if (fs.existsSync(dest)) {
  console.log('Adminer déjà présent — téléchargement ignoré.');
  process.exit(0);
}

fs.mkdirSync(adminerDir, { recursive: true });
console.log('Téléchargement d\'Adminer v4.8.1...');

function download(url, destPath) {
  const file = fs.createWriteStream(destPath);
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      file.close();
      fs.unlink(destPath, () => {});
      download(res.headers.location, destPath);
      return;
    }
    if (res.statusCode !== 200) {
      file.close();
      fs.unlink(destPath, () => {});
      console.error(`Erreur HTTP ${res.statusCode} lors du téléchargement d'Adminer.`);
      process.exit(1);
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Adminer téléchargé avec succès.');
    });
  }).on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error('Erreur de téléchargement :', err.message);
    process.exit(1);
  });
}

download(ADMINER_URL, dest);
