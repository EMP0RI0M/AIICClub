/**
 * IndexedDB Persistence Layer for Universal Virtual File System (VFS).
 * Provides robust offline storage and project isolation.
 */

import type { VFSNode, VFSSnapshot } from "./types";

const DB_NAME = "corvus_vfs_db";
const DB_VERSION = 1;
const STORE_PROJECTS = "vfs_projects";
const STORE_SNAPSHOTS = "vfs_snapshots";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "projectId" });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVFSNodesToIndexedDB(
  projectId: string,
  nodes: Record<string, VFSNode>
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, "readwrite");
      const store = tx.objectStore(STORE_PROJECTS);
      const data = {
        projectId,
        nodes,
        updatedAt: Date.now(),
      };
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[VFS_STORAGE_SAVE_ERROR]", err);
  }
}

export async function loadVFSNodesFromIndexedDB(
  projectId: string
): Promise<Record<string, VFSNode> | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, "readonly");
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(projectId);
      req.onsuccess = () => {
        if (req.result && req.result.nodes) {
          resolve(req.result.nodes);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[VFS_STORAGE_LOAD_ERROR]", err);
    return null;
  }
}

export async function saveSnapshotToIndexedDB(snapshot: VFSSnapshot): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, "readwrite");
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[VFS_SNAPSHOT_SAVE_ERROR]", err);
  }
}
