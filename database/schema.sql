-- IBar Database Schema
-- PostgreSQL

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- RESTAURANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  photo_url     TEXT,
  phone         VARCHAR(50),
  address       TEXT,
  bar           BOOLEAN NOT NULL DEFAULT FALSE,
  cuisine_type  VARCHAR(100),
  rating        NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 5),
  comment       TEXT,
  visit_date    DATE,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_archived ON restaurants (is_archived);
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON restaurants USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_address_trgm ON restaurants USING GIN (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants (rating DESC)
  WHERE is_archived = FALSE;

-- ============================================================
-- ACCOMMODATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS accommodations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  photo_url       TEXT,
  phone           VARCHAR(50),
  address         TEXT,
  comment         TEXT,
  price           NUMERIC(10,2),
  number_of_rooms INTEGER,
  wifi            BOOLEAN NOT NULL DEFAULT FALSE,
  parking         BOOLEAN NOT NULL DEFAULT FALSE,
  rating          NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 5),
  visit_date      DATE,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accommodations_archived ON accommodations (is_archived);
CREATE INDEX IF NOT EXISTS idx_accommodations_name_trgm ON accommodations USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_accommodations_address_trgm ON accommodations USING GIN (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_accommodations_location ON accommodations (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accommodations_rating ON accommodations (rating DESC)
  WHERE is_archived = FALSE;

-- ============================================================
-- CAFES
-- ============================================================
CREATE TABLE IF NOT EXISTS cafes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  photo_url     TEXT,
  phone         VARCHAR(50),
  address       TEXT,
  specialty     VARCHAR(100),
  has_food      BOOLEAN NOT NULL DEFAULT FALSE,
  rating        NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 5),
  comment       TEXT,
  visit_date    DATE,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cafes_archived ON cafes (is_archived);
CREATE INDEX IF NOT EXISTS idx_cafes_name_trgm ON cafes USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cafes_address_trgm ON cafes USING GIN (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cafes_location ON cafes (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cafes_rating ON cafes (rating DESC)
  WHERE is_archived = FALSE;

-- ============================================================
-- OFFLINE SYNC QUEUE
-- NOTE: Cette table est réservée pour une future implémentation
-- de synchronisation serveur. Actuellement la gestion offline
-- utilise IndexedDB côté client (frontend/src/services/offline.js).
-- La sync vers le serveur n'est pas encore implémentée.
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  action      VARCHAR(20) NOT NULL,
  payload     JSONB,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SAMPLE DATA (optional, commented out by default)
-- ============================================================
-- INSERT INTO users (id, name, email, password_hash) VALUES
--   (uuid_generate_v4(), 'Admin', 'admin@ibar.app',
--    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.VfJLEJJNYibu2'); -- password: admin123
