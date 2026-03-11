#!/bin/bash
set -eo pipefail

# ── Couleurs & helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${GREEN}[IBar]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()     { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
section() { echo -e "\n${BLUE}══ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CURRENT_USER="${SUDO_USER:-$(whoami)}"

echo ""
log "╔══════════════════════════════════════════╗"
log "║     IBar — Script d'installation         ║"
log "╚══════════════════════════════════════════╝"
echo ""

# ── Vérification OS ────────────────────────────────────────────────────────────
section "Vérification de l'environnement"

[ -f /etc/os-release ] || err "Impossible de détecter le système d'exploitation."
. /etc/os-release
if [[ "$ID" != "ubuntu" && "$ID" != "debian" && "${ID_LIKE:-}" != *"debian"* ]]; then
  err "Ce script requiert Ubuntu ou Debian. Système détecté : ${PRETTY_NAME:-$ID}"
fi
log "Système : ${PRETTY_NAME:-$ID} ✓"

# ── Mise à jour initiale des dépôts apt ───────────────────────────────────────
log "Mise à jour des dépôts apt..."
sudo apt-get update -qq

# ── Paquets système de base ────────────────────────────────────────────────────
# curl, git       : outils de base
# lsb-release     : requis par le script NodeSource
# ca-certificates : certificats TLS pour les téléchargements
# gnupg           : vérification des clés GPG pour NodeSource
# build-essential : compilation de modules natifs Node.js (ex: sharp fallback)
log "Installation des paquets système de base..."
sudo apt-get install -y \
  curl \
  git \
  lsb-release \
  ca-certificates \
  gnupg \
  build-essential \
  python3-minimal
log "Paquets système : OK ✓"

# ── Node.js ────────────────────────────────────────────────────────────────────
section "Node.js"

if ! command -v node &>/dev/null; then
  warn "Node.js non trouvé. Installation de Node.js 20.x via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Vérifier que node ET npm sont disponibles
if ! command -v node &>/dev/null; then
  err "L'installation de Node.js a échoué.
Vérifiez votre connexion internet et relancez : bash scripts/install.sh"
fi
if ! command -v npm &>/dev/null; then
  warn "npm absent après installation Node.js — tentative d'installation séparée..."
  sudo apt-get install -y npm || err "Impossible d'installer npm."
fi

NODE_VER=$(node --version)
NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node.js v18+ requis. Détecté : $NODE_VER.
Supprimez l'ancienne version et relancez : bash scripts/install.sh"
fi
NPM_VER=$(npm --version)
log "Node.js : $NODE_VER  npm : v$NPM_VER ✓"

# ── PostgreSQL ─────────────────────────────────────────────────────────────────
section "PostgreSQL"

if ! command -v psql &>/dev/null; then
  warn "PostgreSQL non trouvé. Installation..."
  sudo apt-get install -y postgresql postgresql-contrib
fi

# S'assurer que le service PostgreSQL est actif
if ! sudo systemctl is-active --quiet postgresql 2>/dev/null; then
  sudo systemctl start postgresql || err "Impossible de démarrer PostgreSQL.
Diagnostiquer : sudo journalctl -u postgresql -n 30"
  log "PostgreSQL démarré"
fi
sudo systemctl enable postgresql 2>/dev/null || true

# S'assurer que pg_isready est disponible (inclus dans postgresql-client)
if ! command -v pg_isready &>/dev/null; then
  sudo apt-get install -y postgresql-client
fi

log "PostgreSQL : $(psql --version | head -1) ✓"

# ── PHP ────────────────────────────────────────────────────────────────────────
section "PHP (Adminer)"

if ! command -v php &>/dev/null; then
  warn "PHP non trouvé. Installation..."
  sudo apt-get install -y php-cli php-pgsql php-mbstring
fi
log "PHP : $(php --version | head -1) ✓"

# ── Configuration .env ─────────────────────────────────────────────────────────
section "Configuration .env"

ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
  echo ""
  err "Fichier .env créé depuis .env.example.
Configurez les variables AVANT de relancer l'installation :

  nano $ENV_FILE

Variables obligatoires :
  DB_PASSWORD   — mot de passe PostgreSQL (pas de valeur par défaut)
  JWT_SECRET    — clé JWT, générez avec : openssl rand -hex 32
  JWT_REFRESH_SECRET — même chose

  bash scripts/install.sh"
fi

set -a; source "$ENV_FILE"; set +a

# Validation des variables critiques
check_var() {
  local var_name="$1"
  local var_val="${!var_name:-}"
  if [ -z "$var_val" ]; then
    err "Variable $var_name non définie dans .env
Éditez : nano $ENV_FILE"
  fi
  if echo "$var_val" | grep -qiE "^(changeme|ibar_password|your_|example|placeholder)"; then
    err "Variable $var_name contient une valeur placeholder : '$var_val'
Définissez une valeur sécurisée dans $ENV_FILE
Pour les secrets JWT : openssl rand -hex 32"
  fi
}

check_var "DB_PASSWORD"
check_var "JWT_SECRET"
check_var "JWT_REFRESH_SECRET"

if [ "${#JWT_SECRET}" -lt 32 ]; then
  err "JWT_SECRET trop court (${#JWT_SECRET} chars, minimum 32 requis).
Générez un secret : openssl rand -hex 32"
fi
if [ "${#JWT_REFRESH_SECRET}" -lt 32 ]; then
  err "JWT_REFRESH_SECRET trop court (${#JWT_REFRESH_SECRET} chars, minimum 32 requis).
Générez un secret : openssl rand -hex 32"
fi

# Avertissement pour les caractères spéciaux dans .env (EnvironmentFile systemd)
if echo "${DB_PASSWORD:-}" | grep -q '#'; then
  warn "DB_PASSWORD contient '#' — dans .env, entourez la valeur de guillemets :"
  warn "  DB_PASSWORD=\"votre#motdepasse\""
fi

# Valeurs par défaut pour les variables optionnelles
DB_NAME="${DB_NAME:-ibar}"
DB_USER="${DB_USER:-ibar_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
PORT="${PORT:-8000}"
ADMINER_PORT="${ADMINER_PORT:-9000}"

log "Configuration .env : OK ✓"

# ── Base de données PostgreSQL ─────────────────────────────────────────────────
section "Base de données PostgreSQL"

log "Création de l'utilisateur PostgreSQL '$DB_USER'..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

log "Création de la base de données '$DB_NAME'..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
  warn "Base de données '$DB_NAME' déjà existante — conservée"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

log "Application du schéma SQL..."
sudo -u postgres psql -d "$DB_NAME" -f "$PROJECT_DIR/database/schema.sql"

log "Attribution des permissions à '$DB_USER'..."
sudo -u postgres psql -d "$DB_NAME" \
  -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" \
  -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" \
  -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" \
  -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

log "Base de données : OK ✓"

# ── Dépendances backend ────────────────────────────────────────────────────────
section "Dépendances backend"
cd "$PROJECT_DIR/backend"
npm install --omit=dev --no-audit --no-fund
log "Dépendances backend installées ✓"

# ── Build frontend ─────────────────────────────────────────────────────────────
section "Build frontend"
cd "$PROJECT_DIR/frontend"
npm install --no-audit --no-fund
npm run build

# Vérification que le build a produit les fichiers attendus
if [ ! -f "$PROJECT_DIR/frontend/dist/index.html" ]; then
  err "Le build frontend a échoué : frontend/dist/index.html introuvable.
Relancez manuellement pour voir l'erreur :
  cd frontend && npm run build"
fi
log "Frontend compilé ✓ (dist/index.html présent)"

# ── Répertoires runtime ────────────────────────────────────────────────────────
mkdir -p "$PROJECT_DIR/backend/uploads"
chmod 755 "$PROJECT_DIR/backend/uploads"
mkdir -p "$PROJECT_DIR/logs"
if [ "$CURRENT_USER" != "root" ]; then
  chown -R "$CURRENT_USER:$CURRENT_USER" \
    "$PROJECT_DIR/logs" \
    "$PROJECT_DIR/backend/uploads" 2>/dev/null || true
fi
log "Répertoires runtime (logs/, backend/uploads/) créés ✓"

# ── Adminer ────────────────────────────────────────────────────────────────────
section "Adminer"

ADMINER_DIR="$PROJECT_DIR/adminer"
mkdir -p "$ADMINER_DIR"
if [ ! -f "$ADMINER_DIR/adminer.php" ]; then
  log "Téléchargement d'Adminer v4.8.1..."
  curl -fsSL --retry 3 --retry-delay 2 \
    -o "$ADMINER_DIR/adminer.php" \
    "https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1-pgsql.php" \
    || { warn "Téléchargement Adminer échoué. Relancez après vérification réseau."; }
  log "Adminer téléchargé ✓"
else
  log "Adminer déjà présent ✓"
fi
if [ ! -f "$ADMINER_DIR/ibar-adminer.php" ]; then
  warn "ibar-adminer.php introuvable — interface admin non personnalisée"
fi

# ── Services systemd ───────────────────────────────────────────────────────────
section "Services systemd"

NODE_BIN="$(which node)"
PHP_BIN="$(which php)"

sudo tee /etc/systemd/system/ibar.service > /dev/null <<EOF
[Unit]
Description=IBar — Backend API & Frontend
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$NODE_BIN server.js
Restart=always
RestartSec=5
EnvironmentFile=$PROJECT_DIR/.env
StandardOutput=append:$PROJECT_DIR/logs/backend.log
StandardError=append:$PROJECT_DIR/logs/backend.log

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/ibar-adminer.service > /dev/null <<EOF
[Unit]
Description=IBar Adminer — Interface d'administration DB
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR/adminer
ExecStart=$PHP_BIN -S 0.0.0.0:$ADMINER_PORT ibar-adminer.php
Restart=always
RestartSec=5
EnvironmentFile=$PROJECT_DIR/.env
StandardOutput=append:$PROJECT_DIR/logs/adminer.log
StandardError=append:$PROJECT_DIR/logs/adminer.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ibar ibar-adminer
log "Services systemd créés et activés au démarrage ✓"

# ── Démarrage des services ─────────────────────────────────────────────────────
section "Démarrage des services"
sudo systemctl restart ibar
sudo systemctl restart ibar-adminer
log "Services démarrés ✓"

# ── Vérifications post-installation ───────────────────────────────────────────
section "Vérifications post-installation"
CHECKS_OK=true

sleep 3

# PostgreSQL
if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
  log "✅ PostgreSQL : actif sur le port $DB_PORT"
else
  warn "❌ PostgreSQL ne répond pas sur le port $DB_PORT"
  CHECKS_OK=false
fi

# Backend (tentatives sur 30 secondes)
BACKEND_UP=false
for i in $(seq 1 6); do
  if curl -sf "http://localhost:$PORT/api/health" -o /dev/null 2>/dev/null; then
    BACKEND_UP=true
    break
  fi
  sleep 5
done
if [ "$BACKEND_UP" = true ]; then
  log "✅ Backend : répond sur le port $PORT"
else
  warn "❌ Backend ne répond pas sur le port $PORT"
  warn "   Diagnostiquer : sudo journalctl -u ibar -n 50 --no-pager"
  CHECKS_OK=false
fi

# Adminer (tentatives sur 15 secondes)
ADMINER_UP=false
for i in $(seq 1 3); do
  if curl -sf "http://localhost:$ADMINER_PORT/" -o /dev/null 2>/dev/null; then
    ADMINER_UP=true
    break
  fi
  sleep 5
done
if [ "$ADMINER_UP" = true ]; then
  log "✅ Adminer : répond sur le port $ADMINER_PORT"
else
  warn "❌ Adminer ne répond pas sur le port $ADMINER_PORT"
  warn "   Diagnostiquer : sudo journalctl -u ibar-adminer -n 20 --no-pager"
  CHECKS_OK=false
fi

# ── Résumé final ───────────────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
log "╔══════════════════════════════════════════════════════╗"
if [ "$CHECKS_OK" = true ]; then
  log "║  ✅  Installation terminée avec succès !             ║"
else
  log "║  ⚠️   Installation terminée avec des alertes          ║"
fi
log "╠══════════════════════════════════════════════════════╣"
log ""
log "  Application : http://$SERVER_IP:$PORT"
log "  Adminer DB  : http://$SERVER_IP:$ADMINER_PORT"
log ""
log "╠══════════════════════════════════════════════════════╣"
log "║  Commandes utiles :                                  ║"
log ""
log "  sudo systemctl status ibar"
log "  sudo systemctl restart ibar"
log "  sudo journalctl -u ibar -f"
log "  sudo journalctl -u ibar-adminer -f"
log "╚══════════════════════════════════════════════════════╝"
