import { openDB } from 'idb';
import api from './api';

const DB_NAME = 'ibar-offline';
const DB_VERSION = 2;

const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('accommodations')) {
        db.createObjectStore('accommodations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cafes')) {
        db.createObjectStore('cafes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type');
      }
    },
  });

// Cache data for offline use
export const cacheData = async (storeName, data) => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all([
    ...data.map(item => tx.store.put(item)),
    tx.done,
  ]);
};

// Get cached data
export const getCachedData = async (storeName) => {
  const db = await getDB();
  return db.getAll(storeName);
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

// Register online listener for auto-sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingActions().catch(err =>
      console.error('Auto-sync failed:', err)
    );
  });
}
