import { openDB } from 'idb';

const DB_NAME = 'ibar-offline';
const DB_VERSION = 5;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Remove legacy stores from previous versions
      if (oldVersion < 4) {
        for (const name of ['restaurants', 'accommodations', 'cafes']) {
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name);
          }
        }
      }
      // Remove unused syncQueue store
      if (oldVersion < 5) {
        if (db.objectStoreNames.contains('syncQueue')) {
          db.deleteObjectStore('syncQueue');
        }
      }
      // Unified places store
      if (!db.objectStoreNames.contains('places')) {
        db.createObjectStore('places', { keyPath: 'id' });
      }
    },
  });

/**
 * Cache places with timestamp and category metadata.
 * Upserts by id — naturally deduplicates across fetches.
 */
export const cachePlaces = async (data, category) => {
  if (!data || data.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('places', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...data.map(item => tx.store.put({
      ...item,
      _cachedAt: now,
      _category: item.category || category || 'unknown',
    })),
    tx.done,
  ]);
};

/**
 * Get cached places, optionally filtered by category.
 * Returns only items cached within the last 24h.
 */
export const getCachedPlaces = async (category) => {
  const db = await getDB();
  const all = await db.getAll('places');
  const cutoff = Date.now() - CACHE_MAX_AGE_MS;

  return all.filter(item => {
    if (item._cachedAt && item._cachedAt < cutoff) return false;
    if (category && item._category !== category) return false;
    return true;
  });
};

/**
 * Remove stale cached places (older than 24h).
 */
export const clearOldPlaces = async () => {
  const db = await getDB();
  const tx = db.transaction('places', 'readwrite');
  const all = await tx.store.getAll();
  const cutoff = Date.now() - CACHE_MAX_AGE_MS;

  await Promise.all([
    ...all
      .filter(item => item._cachedAt && item._cachedAt < cutoff)
      .map(item => tx.store.delete(item.id)),
    tx.done,
  ]);
};

// Periodically clean stale cache entries when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    clearOldPlaces().catch(() => {});
  });
}
