// "Play your own copy": a visitor who has a game's .swf file (from an old
// Miniclip CD or download, for example) can play it on the game's page. The
// file is read in the browser and never uploaded; if the visitor ticks
// "remember", it is kept in this browser's IndexedDB so the game stays
// playable for them on this computer.
const DB = 'mcc-own-copies';
const STORE = 'files';
// Ruffle can play much bigger files, but a browser store is not a warehouse
export const MAX_SIZE = 64 * 1024 * 1024;

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('This browser cannot store files.')); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}
function run(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storing the file was cancelled.'));
  }));
}

// { id, name, size, width, height, added, data: ArrayBuffer } or null
export const getCopy = (id) => run('readonly', (s) => s.get(id)).then((r) => r || null).catch(() => null);
export const saveCopy = (rec) => run('readwrite', (s) => s.put(rec));
export const forgetCopy = (id) => run('readwrite', (s) => s.delete(id));
// the stored copies without their file data (for My Games)
export function listCopies() {
  return db().then((d) => new Promise((resolve) => {
    const out = [];
    const req = d.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) { resolve(out); return; }
      const { data, ...meta } = c.value;
      out.push(meta);
      c.continue();
    };
    req.onerror = () => resolve(out);
  })).catch(() => []);
}

// ---------------------------------------------------------------- SWF files

const sig = (b) => String.fromCharCode(b[0], b[1], b[2]);
export const isSwf = (buf) => buf.byteLength > 8 && ['FWS', 'CWS', 'ZWS'].includes(sig(new Uint8Array(buf, 0, 3)));

// Stage size from the SWF header (FWS, or CWS via the browser's zlib stream).
// LZMA-packed (ZWS) files and anything unexpected fall back to null.
export async function swfSize(buf) {
  try {
    const bytes = new Uint8Array(buf);
    let body;
    if (sig(bytes) === 'FWS') body = bytes.subarray(8, 40);
    else if (sig(bytes) === 'CWS' && 'DecompressionStream' in window) {
      // the whole body goes in (a cut-off stream would error); only the first chunk is read
      const stream = new Blob([bytes.subarray(8)]).stream().pipeThrough(new DecompressionStream('deflate'));
      const reader = stream.getReader();
      const { value } = await reader.read();
      reader.cancel().catch(() => {});
      body = value;
    }
    if (!body || body.length < 17) return null;
    const nbits = body[0] >> 3;
    let bits = '';
    for (let i = 0; i < 17; i++) bits += body[i].toString(2).padStart(8, '0');
    const v = [0, 1, 2, 3].map((i) => parseInt(bits.slice(5 + i * nbits, 5 + (i + 1) * nbits), 2));
    const w = Math.round((v[1] - v[0]) / 20), h = Math.round((v[3] - v[2]) / 20);
    return w > 50 && h > 50 && w < 4000 && h < 4000 ? { width: w, height: h } : null;
  } catch (e) {
    return null;
  }
}

export const fileSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
