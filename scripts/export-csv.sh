#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXPORT_DIR="$PROJECT_DIR/exports"

set -a; source "$PROJECT_DIR/.env"; set +a

if [ -z "$EXPORT_EMAIL" ] || [ -z "$EXPORT_PASSWORD" ]; then
  echo "❌ EXPORT_EMAIL et EXPORT_PASSWORD doivent être définis dans .env"
  exit 1
fi

mkdir -p "$EXPORT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📊 Export des données en CSV..."

# Get auth token (python3 is always available on Ubuntu for robust JSON parsing)
RESPONSE=$(curl -s -X POST "http://localhost:${PORT:-8000}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EXPORT_EMAIL\",\"password\":\"$EXPORT_PASSWORD\"}")

TOKEN=$(echo "$RESPONSE" | python3 -c \
  "import sys, json; d=json.load(sys.stdin); print(d.get('accessToken',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentification échouée. Vérifiez EXPORT_EMAIL et EXPORT_PASSWORD dans .env"
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
