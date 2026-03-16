import { openDB } from 'idb';

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
// TODO: La synchronisation vers le serveur (POST vers /api/sync) n'est pas encore implémentée.
// Les items sont stockés localement dans IndexedDB mais ne sont jamais envoyés au backend.
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
