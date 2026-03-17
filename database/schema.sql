-- IBar Database Schema
-- PostgreSQL
--
-- This is the primary schema file for fresh installations.
-- It creates all tables needed by the application.
-- Run with: psql -d ibar -f schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
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
-- PLACES (unified: cafe, restaurant, hotel)
-- ============================================================
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('cafe', 'restaurant', 'hotel')),
    description TEXT,
    address TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'google_import')),
    photo_url TEXT,
    rating NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 5),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_category ON places (category);
CREATE INDEX IF NOT EXISTS idx_places_location ON places (lat, lng);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_address_trgm ON places USING GIN (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_rating ON places (rating DESC NULLS LAST);

-- ============================================================
-- GEOCODE CACHE (reverse geocoding results from Nominatim)
-- ============================================================
CREATE TABLE IF NOT EXISTS geocode_cache (
    id SERIAL PRIMARY KEY,
    lat_rounded DOUBLE PRECISION NOT NULL,
    lng_rounded DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lat_rounded, lng_rounded)
);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_coords
ON geocode_cache (lat_rounded, lng_rounded);
