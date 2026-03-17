-- ATTENTION : Ce fichier requiert PostGIS. Si PostGIS n'est pas disponible,
-- utiliser migration_places_no_postgis.sql à la place.
--
-- Migration: Create unified places table for map-first architecture
-- Run this after schema.sql
--
-- Required extensions: postgis, pg_trgm, pgcrypto

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- PLACES (unified: cafe, restaurant, hotel)
-- ============================================================
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    category TEXT NOT NULL CHECK (
        category IN ('cafe', 'restaurant', 'hotel')
    ),

    description TEXT,
    address TEXT,

    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,

    geom GEOGRAPHY(Point, 4326),

    source TEXT DEFAULT 'manual'
        CHECK (source IN ('manual', 'google_import')),

    photo_url TEXT,
    rating NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 5),

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for bounding box queries
CREATE INDEX IF NOT EXISTS idx_places_geom
ON places USING GIST (geom);

-- Category filter index
CREATE INDEX IF NOT EXISTS idx_places_category
ON places (category);

-- Text search indexes (requires pg_trgm)
CREATE INDEX IF NOT EXISTS idx_places_name_trgm
ON places USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_places_address_trgm
ON places USING GIN (address gin_trgm_ops);

-- Rating index
CREATE INDEX IF NOT EXISTS idx_places_rating
ON places (rating DESC NULLS LAST);

-- Auto-populate geom from lat/lng
CREATE OR REPLACE FUNCTION places_update_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_places_geom ON places;
CREATE TRIGGER trg_places_geom
BEFORE INSERT OR UPDATE OF lat, lng ON places
FOR EACH ROW
EXECUTE FUNCTION places_update_geom();

-- ============================================================
-- GEOCODE CACHE (reverse geocoding results)
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
