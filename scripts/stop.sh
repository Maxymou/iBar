#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"

stop_pid() {
  local pidfile="$1"
  local name="$2"
  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "✅ $name arrêté (PID $pid)"
    fi
    rm -f "$pidfile"
  fi
}

stop_pid "$LOG_DIR/backend.pid" "Backend"
stop_pid "$LOG_DIR/adminer.pid" "Adminer"

echo "IBar arrêté."
