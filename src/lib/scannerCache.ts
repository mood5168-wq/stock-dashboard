/**
 * IndexedDB cache for scanner results.
 * Keyed by `${scope}:${strategy}`. Entries expire after CACHE_TTL_MS.
 */
import { ScanResult, ScanScope, ScanStrategy } from './scanner';

const DB_NAME = 'stock-dashboard-cache';
const DB_VERSION = 1;
const STORE = 'scannerResults';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分鐘

interface CacheEntry {
  key: string;
  results: ScanResult[];
  timestamp: number;
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function buildKey(scope: ScanScope, strategy: ScanStrategy): string {
  return `${scope}:${strategy}`;
}

export async function loadCachedResults(
  scope: ScanScope,
  strategy: ScanStrategy
): Promise<{ results: ScanResult[]; isFresh: boolean } | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.get(buildKey(scope, strategy));
    req.onsuccess = () => {
      const entry = req.result as CacheEntry | undefined;
      if (!entry) {
        resolve(null);
        return;
      }
      const age = Date.now() - entry.timestamp;
      resolve({ results: entry.results, isFresh: age < CACHE_TTL_MS });
    };
    req.onerror = () => resolve(null);
  });
}

export async function saveCachedResults(
  scope: ScanScope,
  strategy: ScanStrategy,
  results: ScanResult[]
): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const entry: CacheEntry = {
      key: buildKey(scope, strategy),
      results,
      timestamp: Date.now(),
    };
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}
