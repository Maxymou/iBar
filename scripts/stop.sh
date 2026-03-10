#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[IBar]${NC} $1"; }

# ── Mode systemd (post-installation) ──────────────────────────────────────────
if [ -f /etc/systemd/system/ibar.service ]; then
  sudo systemctl stop ibar ibar-adminer 2>/dev/null || true
  log "✅ Services systemd arrêtés"
  echo "IBar arrêté."
  exit 0
fi

# ── Mode manuel (sans systemd — fallback) ──────────────────────────────────────
LOG_DIR="$PROJECT_DIR/logs"

stop_pid() {
  local pidfile="$1"
  local name="$2"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      log "✅ $name arrêté (PID $pid)"
    fi
    rm -f "$pidfile"
  fi
}

stop_pid "$LOG_DIR/backend.pid" "Backend"
stop_pid "$LOG_DIR/adminer.pid" "Adminer"

echo "IBar arrêté."
