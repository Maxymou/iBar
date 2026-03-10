#!/bin/bash
set -e

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[IBar]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

# ── Get script directory (works from any location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log "=========================================="
log "       IBar Installation Script           "
log "=========================================="
echo ""

# ── Check Node.js
if ! command -v node &>/dev/null; then
  warn "Node.js non trouvé. Installation..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
NODE_VER=$(node --version)
NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node.js v18+ requis. Version détectée: $NODE_VER. Supprimez l'ancienne version puis relancez."
fi
log "Node.js: $NODE_VER"

# ── Check PostgreSQL
if ! command -v psql &>/dev/null; then
  warn "PostgreSQL non trouvé. Installation..."
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
fi
log "PostgreSQL: $(psql --version | head -1)"

# ── Check PHP (for Adminer)
if ! command -v php &>/dev/null; then
  warn "PHP non trouvé. Installation pour Adminer..."
  sudo apt-get install -y php-cli php-pgsql php-mbstring
fi
log "PHP: $(php --version | head -1)"

echo ""
log "── Configuration de la base de données ──"

# ── Load .env
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
  echo ""
  err "Fichier .env créé depuis .env.example — configurez-le avant de relancer l'installation :
  nano $ENV_FILE
  bash scripts/install.sh"
fi

# Source env vars
set -a; source "$ENV_FILE"; set +a

DB_NAME="${DB_NAME:-ibar}"
DB_USER="${DB_USER:-ibar_user}"
DB_PASSWORD="${DB_PASSWORD:-ibar_password}"
DB_HOST="${DB_HOST:-localhost}"

# ── Create DB user & database
log "Création de l'utilisateur PostgreSQL '$DB_USER'..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

log "Création de la base de données '$DB_NAME'..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
  warn "Base de données '$DB_NAME' existe déjà"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# ── Apply schema (superuser required for CREATE EXTENSION)
log "Application du schéma SQL..."
sudo -u postgres psql -d "$DB_NAME" -f "$PROJECT_DIR/database/schema.sql"
# Grant table and sequence access to app user
sudo -u postgres psql -d "$DB_NAME" \
  -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" \
  -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" \
  -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" \
  -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
log "Schéma appliqué avec succès"

# ── Install backend deps
echo ""
log "── Installation des dépendances backend ──"
cd "$PROJECT_DIR/backend"
npm install --omit=dev
log "Dépendances backend installées"

# ── Install frontend deps & build
echo ""
log "── Build du frontend ──"
cd "$PROJECT_DIR/frontend"
npm install
npm run build
log "Frontend compilé"

# ── Prepare runtime directories
mkdir -p "$PROJECT_DIR/backend/uploads"
chmod 755 "$PROJECT_DIR/backend/uploads"
mkdir -p "$PROJECT_DIR/logs"

# ── Download Adminer
echo ""
log "── Installation d'Adminer ──"
ADMINER_DIR="$PROJECT_DIR/adminer"
mkdir -p "$ADMINER_DIR"
if [ ! -f "$ADMINER_DIR/adminer.php" ]; then
  log "Téléchargement d'Adminer..."
  curl -fsSL -o "$ADMINER_DIR/adminer.php" \
    "https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1-pgsql.php" \
  || { warn "Téléchargement Adminer échoué. Vérifiez la connexion internet."; }
  log "Adminer téléchargé"
else
  log "Adminer déjà présent"
fi

# Verify the IBar Adminer wrapper is present (committed in repo)
if [ ! -f "$ADMINER_DIR/ibar-adminer.php" ]; then
  warn "ibar-adminer.php introuvable — interface admin non personnalisée"
else
  log "Interface IBar Admin prête"
fi

echo ""
log "=========================================="
log "✅ Installation terminée avec succès !"
log ""
log "Démarrez l'application avec :"
log "  bash scripts/start.sh"
log ""
log "Ou manuellement :"
log "  Backend:  cd backend && npm start"
log "  Adminer:  bash scripts/start-adminer.sh"
log "=========================================="
