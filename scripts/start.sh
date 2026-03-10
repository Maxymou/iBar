#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[IBar]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

set -a; source "$PROJECT_DIR/.env" 2>/dev/null || true; set +a
PORT="${PORT:-8000}"
ADMINER_PORT="${ADMINER_PORT:-9000}"
SERVER_IP=$(hostname -I | awk '{print $1}')

# ── Mode systemd (post-installation) ──────────────────────────────────────────
if [ -f /etc/systemd/system/ibar.service ]; then
  log "Démarrage via systemd..."
  sudo systemctl start ibar
  sudo systemctl start ibar-adminer 2>/dev/null || warn "Service ibar-adminer indisponible"
  sleep 2
  echo ""
  log "=========================================="
  log "✅ IBar démarré !"
  log ""
  log "  Application:  http://$SERVER_IP:$PORT"
  log "  Adminer:      http://$SERVER_IP:$ADMINER_PORT"
  log ""
  log "  sudo systemctl status ibar"
  log "  sudo journalctl -u ibar -f"
  log "=========================================="
  exit 0
fi

# ── Mode manuel (sans systemd — fallback) ──────────────────────────────────────
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  err "Fichier .env introuvable. Lancez d'abord: bash scripts/install.sh"
fi

mkdir -p "$PROJECT_DIR/logs"

# Arrêter les processus précédents via PID files
if [ -f "$PROJECT_DIR/logs/backend.pid" ]; then
  OLD_PID=$(cat "$PROJECT_DIR/logs/backend.pid")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$PROJECT_DIR/logs/backend.pid"
fi
if [ -f "$PROJECT_DIR/logs/adminer.pid" ]; then
  OLD_PID=$(cat "$PROJECT_DIR/logs/adminer.pid")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$PROJECT_DIR/logs/adminer.pid"
fi
sleep 1

log "Démarrage d'IBar (mode manuel)..."

# Backend
cd "$PROJECT_DIR/backend"
nohup node server.js > "$PROJECT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_DIR/logs/backend.pid"
log "Backend démarré (PID $BACKEND_PID) sur le port $PORT"

# Adminer
ADMINER_DIR="$PROJECT_DIR/adminer"
if [ -f "$ADMINER_DIR/adminer.php" ] && [ -f "$ADMINER_DIR/ibar-adminer.php" ] && command -v php &>/dev/null; then
  cd "$ADMINER_DIR"
  nohup php -S 0.0.0.0:$ADMINER_PORT ibar-adminer.php > "$PROJECT_DIR/logs/adminer.log" 2>&1 &
  ADMINER_PID=$!
  echo $ADMINER_PID > "$PROJECT_DIR/logs/adminer.pid"
  log "IBar Admin démarré (PID $ADMINER_PID) sur le port $ADMINER_PORT"
else
  warn "Adminer non disponible. Lancez d'abord: bash scripts/install.sh"
fi

echo ""
log "=========================================="
log "✅ IBar est démarré !"
log ""
log "  Application:  http://$SERVER_IP:$PORT"
log "  Adminer:      http://$SERVER_IP:$ADMINER_PORT"
log ""
log "Logs: tail -f $PROJECT_DIR/logs/backend.log"
log "=========================================="
