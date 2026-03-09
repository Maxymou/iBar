#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXPORT_DIR="$PROJECT_DIR/exports"

set -a; source "$PROJECT_DIR/.env"; set +a

mkdir -p "$EXPORT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📊 Export des données en CSV..."

# Get auth token
TOKEN=$(curl -s -X POST "http://localhost:${PORT:-8000}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EXPORT_EMAIL'","password":"'$EXPORT_PASSWORD'"}' | \
  grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentification échouée. Définissez EXPORT_EMAIL et EXPORT_PASSWORD dans .env"
  exit 1
fi

# Export restaurants
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:${PORT:-8000}/api/export/restaurants" \
  -o "$EXPORT_DIR/restaurants_$TIMESTAMP.csv"
echo "✅ Restaurants: $EXPORT_DIR/restaurants_$TIMESTAMP.csv"

# Export accommodations
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:${PORT:-8000}/api/export/accommodations" \
  -o "$EXPORT_DIR/hebergements_$TIMESTAMP.csv"
echo "✅ Hébergements: $EXPORT_DIR/hebergements_$TIMESTAMP.csv"

echo ""
echo "✅ Export terminé dans $EXPORT_DIR"
