#!/bin/sh
set -e

echo "Waiting for PostgreSQL at ${DB_HOST:-postgres}:${DB_PORT:-5432}..."

until node -e "
  const net = require('net');
  const s = net.createConnection({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT) || 5432
  });
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
  setTimeout(() => process.exit(1), 1000);
" 2>/dev/null; do
  echo "PostgreSQL not ready, retrying in 2s..."
  sleep 2
done

echo "PostgreSQL is ready. Starting iBar..."
exec node /app/backend/server.js
