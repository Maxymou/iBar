#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

set -a; source "$PROJECT_DIR/.env"; set +a

DB_NAME="${DB_NAME:-ibar}"
DB_USER="${DB_USER:-ibar_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ DB_PASSWORD non défini dans .env"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ibar_backup_$TIMESTAMP.sql"
UPLOAD_BACKUP="$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"

echo "📦 Sauvegarde de la base de données..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl -F plain \
  -f "$BACKUP_FILE"
echo "✅ Base de données sauvegardée: $BACKUP_FILE"

echo "📦 Sauvegarde des fichiers uploadés..."
if [ -d "$PROJECT_DIR/backend/uploads" ]; then
  tar -czf "$UPLOAD_BACKUP" -C "$PROJECT_DIR/backend" uploads/
  echo "✅ Uploads sauvegardés: $UPLOAD_BACKUP"
fi

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/ibar_backup_*.sql 2>/dev/null | tail -n +11 | xargs rm -f
ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f

echo ""
echo "✅ Sauvegarde terminée !"
echo "   DB:      $BACKUP_FILE"
echo "   Uploads: $UPLOAD_BACKUP"
