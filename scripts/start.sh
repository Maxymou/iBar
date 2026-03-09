#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[IBar]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Load env
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  err "Fichier .env introuvable. Lancez d'abord: bash scripts/install.sh"
fi
set -a; source "$ENV_FILE"; set +a

PORT="${PORT:-8000}"
ADMINER_PORT="${ADMINER_PORT:-9000}"

# Kill any existing processes on those ports
pkill -f "node server.js" 2>/dev/null || true
pkill -f "php.*adminer" 2>/dev/null || true
sleep 1

log "Démarrage d'IBar..."

# Start backend in background
cd "$PROJECT_DIR/backend"
nohup node server.js > "$PROJECT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_DIR/logs/backend.pid"
log "Backend démarré (PID $BACKEND_PID) sur le port $PORT"

# Start Adminer in background
ADMINER_DIR="$PROJECT_DIR/adminer"
if [ -f "$ADMINER_DIR/adminer.php" ] && command -v php &>/dev/null; then
  cd "$ADMINER_DIR"
  nohup php -S 0.0.0.0:$ADMINER_PORT adminer.php > "$PROJECT_DIR/logs/adminer.log" 2>&1 &
  ADMINER_PID=$!
  echo $ADMINER_PID > "$PROJECT_DIR/logs/adminer.pid"
  log "Adminer démarré (PID $ADMINER_PID) sur le port $ADMINER_PORT"
else
  warn "Adminer non disponible. Lancez d'abord: bash scripts/install.sh"
fi

echo ""
log "=========================================="
log "✅ IBar est démarré !"
log ""
log "  Application:  http://$(hostname -I | awk '{print $1}'):$PORT"
log "  Adminer:      http://$(hostname -I | awk '{print $1}'):$ADMINER_PORT"
log ""
log "Logs: tail -f $PROJECT_DIR/logs/backend.log"
log "=========================================="
