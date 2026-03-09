#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

set -a; source "$PROJECT_DIR/.env"; set +a

DB_NAME="${DB_NAME:-ibar}"
DB_USER="${DB_USER:-ibar_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: bash scripts/restore.sh <backup_file.sql>"
  echo ""
  echo "Sauvegardes disponibles:"
  ls -lt "$PROJECT_DIR/backups"/*.sql 2>/dev/null || echo "  Aucune sauvegarde trouvée"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Fichier introuvable: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  Cette opération va écraser la base de données '$DB_NAME'."
read -p "Continuer ? (oui/non): " confirm
if [ "$confirm" != "oui" ]; then
  echo "Restauration annulée."
  exit 0
fi

echo "🔄 Restauration en cours..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$BACKUP_FILE"

echo "✅ Restauration terminée depuis: $BACKUP_FILE"
