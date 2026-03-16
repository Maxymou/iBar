import { openDB } from 'idb';
import api from './api';

const DB_NAME = 'ibar-offline';
const DB_VERSION = 4;
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
      // Unified places store
      if (!db.objectStoreNames.contains('places')) {
        db.createObjectStore('places', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type');
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

// Legacy-compatible exports for any remaining callers
export const cacheData = async (storeName, data) => {
  if (storeName === 'places') {
    return cachePlaces(data);
  }
  // Ignore legacy store names silently
};

export const getCachedData = async (storeName) => {
  if (storeName === 'places') {
    return getCachedPlaces();
  }
  return [];
};

// Add to sync queue (for offline operations)
export const addToSyncQueue = async (item) => {
  const db = await getDB();
  return db.add('syncQueue', { ...item, createdAt: Date.now() });
};

// Get pending sync items
export const getSyncQueue = async () => {
  const db = await getDB();
  return db.getAll('syncQueue');
};

// Remove from sync queue
export const removeSyncItem = async (id) => {
  const db = await getDB();
  return db.delete('syncQueue', id);
};

// Clear sync queue
export const clearSyncQueue = async () => {
  const db = await getDB();
  return db.clear('syncQueue');
};

// Sync pending actions to server when back online
export const syncPendingActions = async () => {
  const queue = await getSyncQueue();
  if (queue.length === 0) return;

  const errors = [];
  for (const item of queue) {
    try {
      const { type, action, data } = item;
      const endpoint = `/${type}`;

      if (action === 'CREATE') {
        await api.post(endpoint, data);
      } else if (action === 'UPDATE') {
        await api.put(`${endpoint}/${data.id}`, data);
      } else if (action === 'DELETE') {
        await api.delete(`${endpoint}/${data.id}`);
      }

      await removeSyncItem(item.id);
    } catch (err) {
      console.error(`Sync failed for item ${item.id}:`, err);
      errors.push(item.id);
    }
  }

  if (errors.length > 0) {
    console.warn(`${errors.length} action(s) non synchronisée(s)`);
  }
};

// Register online listener for auto-sync + cache cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingActions().catch(err =>
      console.error('Auto-sync failed:', err)
    );
    clearOldPlaces().catch(() => {});
  });
}
