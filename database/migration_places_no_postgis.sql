-- Migration: Create unified places table for map-first architecture
-- Version without PostGIS (uses lat/lng columns for geo queries)
--
-- PURPOSE: Upgrade from v0.x (separate restaurants/accommodations/cafes tables)
--          to v1.x (unified places table). For fresh installs, use schema.sql instead.
--
-- Required extensions: pg_trgm, pgcrypto

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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
