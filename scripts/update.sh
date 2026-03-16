#!/bin/bash
set -eo pipefail

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
log "║     IBar — Script de mise à jour         ║"
log "╚══════════════════════════════════════════╝"

# Vérifier que .env existe
[ -f "$PROJECT_DIR/.env" ] || err ".env introuvable. Lancez d'abord : bash scripts/install.sh"

section "Arrêt des services"
sudo systemctl stop ibar ibar-adminer 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
pkill -f "ibar-adminer.php" 2>/dev/null || true
sleep 2
log "Services arrêtés ✓"

section "Mise à jour du code source"
cd "$PROJECT_DIR"
git fetch origin
git reset --hard origin/main
log "Code mis à jour depuis origin/main ✓"

section "Dépendances backend"
cd "$PROJECT_DIR/backend"
sudo -u "$CURRENT_USER" npm install --omit=dev --no-audit --no-fund
log "Dépendances backend ✓"

section "Build frontend"
cd "$PROJECT_DIR/frontend"
sudo -u "$CURRENT_USER" npm install --include=dev --no-audit --no-fund
sudo -u "$CURRENT_USER" npm run build
[ -f "$PROJECT_DIR/frontend/dist/index.html" ] || err "Build frontend échoué"
log "Frontend compilé ✓"

section "Correction des permissions"
chown -R "$CURRENT_USER:$CURRENT_USER" "$PROJECT_DIR/frontend/dist"
chown -R "$CURRENT_USER:$CURRENT_USER" "$PROJECT_DIR/frontend/node_modules"
chown -R "$CURRENT_USER:$CURRENT_USER" "$PROJECT_DIR/backend/node_modules"
chown -R "$CURRENT_USER:$CURRENT_USER" "$PROJECT_DIR/logs"
log "Permissions corrigées ✓"

section "Redémarrage des services"
sudo systemctl restart ibar ibar-adminer
sleep 3

section "Vérification"
set -a; source "$PROJECT_DIR/.env"; set +a
if curl -sf "http://localhost:${PORT:-8000}/api/health" -o /dev/null 2>/dev/null; then
  log "✅ Backend opérationnel"
else
  warn "❌ Backend ne répond pas — vérifiez : sudo journalctl -u ibar -n 30"
fi

log "╔══════════════════════════════════════╗"
log "║  Mise à jour terminée ✓              ║"
log "╚══════════════════════════════════════╝"
