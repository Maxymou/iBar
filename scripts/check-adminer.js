const fs = require('fs');
const path = require('path');

const adminerPath = path.join(__dirname, '..', 'adminer', 'adminer.php');
if (!fs.existsSync(adminerPath)) {
  console.warn('AVERTISSEMENT : adminer/adminer.php absent.');
  console.warn('Exécutez "npm run setup" pour télécharger Adminer et activer l\'interface d\'administration.');
}
