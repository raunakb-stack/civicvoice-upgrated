/**
 * useOfflineDrafts — saves complaint form drafts to IndexedDB
 * and syncs them when the user comes back online.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const DB_NAME    = 'civicvoice_offline';
const STORE_NAME = 'complaint_drafts';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function saveDraft(draft) {
  const db   = await openDB();
  const tx   = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put({ ...draft, savedAt: Date.now() });
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

async function getDrafts() {
  const db   = await openDB();
  const tx   = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = rej;
  });
}

async function deleteDraft(id) {
  const db   = await openDB();
  const tx   = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export function useOfflineDrafts() {
  const [isOnline, setIsOnline]   = useState(navigator.onLine);
  const [drafts, setDrafts]       = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  toast.success('🌐 Back online! Check your saved drafts.'); };
    const goOffline = () => { setIsOnline(false); toast('📴 You\'re offline. Complaints will be saved as drafts.', { icon: '💾' }); };
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const loadDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try { setDrafts(await getDrafts()); } catch { /* silent */ }
    setLoadingDrafts(false);
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const saveAsDraft = useCallback(async (formData) => {
    const draft = { id: `draft_${Date.now()}`, ...formData };
    await saveDraft(draft);
    await loadDrafts();
    toast('💾 Complaint saved as offline draft. Will sync when online.', { icon: '📴' });
    return draft.id;
  }, [loadDrafts]);

  const removeDraft = useCallback(async (id) => {
    await deleteDraft(id);
    await loadDrafts();
  }, [loadDrafts]);

  return { isOnline, drafts, loadingDrafts, saveAsDraft, removeDraft, reloadDrafts: loadDrafts };
}
