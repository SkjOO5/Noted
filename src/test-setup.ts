import 'fake-indexeddb/auto';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Ensure globals are set for dexie
globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;
