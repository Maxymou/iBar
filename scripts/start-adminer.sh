#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

set -a; source "$PROJECT_DIR/.env" 2>/dev/null || true; set +a
ADMINER_PORT="${ADMINER_PORT:-9000}"
ADMINER_DIR="$PROJECT_DIR/adminer"

if [ ! -f "$ADMINER_DIR/adminer.php" ]; then
  bash "$SCRIPT_DIR/setup-adminer.sh" || exit 1
fi

if ! command -v php &>/dev/null; then
  echo "PHP non trouvé. Installez PHP: sudo apt-get install -y php-cli php-pgsql"
  exit 1
fi

echo "Démarrage d'IBar Admin sur le port $ADMINER_PORT..."
cd "$ADMINER_DIR"
php -S 0.0.0.0:$ADMINER_PORT ibar-adminer.php
