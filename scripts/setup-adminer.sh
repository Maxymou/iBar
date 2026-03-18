#!/bin/bash
# Télécharge adminer.php s'il est absent.
# Appelé par : systemd ExecStartPre, start-adminer.sh, start.sh, ou manuellement.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ADMINER_DIR="$PROJECT_DIR/adminer"
ADMINER_FILE="$ADMINER_DIR/adminer.php"
ADMINER_URL="https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php"

if [ -f "$ADMINER_FILE" ]; then
  exit 0
fi

mkdir -p "$ADMINER_DIR"
echo "[IBar] Téléchargement d'Adminer v4.8.1..."

curl -fsSL --retry 3 --retry-delay 2 -o "$ADMINER_FILE" "$ADMINER_URL"

if [ -f "$ADMINER_FILE" ] && [ -s "$ADMINER_FILE" ]; then
  echo "[IBar] Adminer téléchargé avec succès."
  exit 0
else
  rm -f "$ADMINER_FILE"
  echo "[IBar] Erreur : échec du téléchargement d'Adminer." >&2
  exit 1
fi
