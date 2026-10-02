/*
  Where exports go.
  ------------------
  The default export path is whatever the browser's download directory is,
  which is invisible to the user and, on some setups, a temp folder. For a
  backup file that is the wrong default: you want to choose once and then have
  every later export land in the same place you can find.

  Two mechanisms, in order of preference:

  1. **File System Access API** (`showSaveFilePicker`) — a real folder dialog,
     and the chosen directory handle can be stored so later exports skip the
     dialog entirely. Chromium only.
  2. **`<a download>`** — the only option in Firefox/Safari, where the browser
     silently decides the destination. The status line says so rather than
     pretending the user chose anything.

  Handles live in IndexedDB, not localStorage: a FileSystemHandle is only
  structured-cloneable, so JSON.stringify drops it. That is the whole reason
  this file talks to IDB at all.
*/

const DB_NAME = 'project-tracker';
const STORE = 'handles';
const HANDLE_KEY = 'exportDirectory';

/** True when the browser can show a real save dialog. */
export const canChooseLocation = () =>
  typeof window !== 'undefined' &&
  typeof window.showSaveFilePicker === 'function' &&
  !fsWritesBlocked();

// --- host capability --------------------------------------------------------
// Some hosts expose showSaveFilePicker but block the actual write: the picker
// resolves, then createWritable() throws NotAllowedError, leaving an empty
// 0-byte shell where the user pointed. Once that happens, stop offering the
// picker in this browser and go straight to <a download>.
const FS_BLOCKED_KEY = 'project-tracker.fsBlocked';

export function fsWritesBlocked() {
  if (markFsBlocked.memory) return true;
  try {
    return localStorage.getItem(FS_BLOCKED_KEY) === '1';
  } catch {
    return false;
  }
}

function markFsBlocked() {
  try {
    localStorage.setItem(FS_BLOCKED_KEY, '1');
  } catch {
    /* memory-only fallback below */
  }
  markFsBlocked.memory = true;
}

/** Clear a recorded block (the "try folder save again" affordance). */
export function resetFsBlock() {
  markFsBlocked.memory = false;
  try {
    localStorage.removeItem(FS_BLOCKED_KEY);
  } catch {
    /* nothing to do */
  }
}

/** The platform refused a write (not a user cancel, not a stale handle). */
function isPlatformBlock(err) {
  if (!err || err.name === 'AbortError') return false;
  if (err.name === 'NotAllowedError' || err.name === 'SecurityError') return true;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('not allowed') && msg.includes('current context');
}

// --- IndexedDB (promisified, degrades to null) ------------------------------

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(value) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet() {
  const db = await openDb();
  const out = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return out;
}

async function idbDelete() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** The remembered export directory, or null. Never throws. */
export async function loadDirectory() {
  try {
    return await idbGet();
  } catch {
    return null;   // private mode, IDB blocked, etc. — just forget it
  }
}

export async function rememberDirectory(handle) {
  try {
    await idbPut(handle);
  } catch {
    /* not fatal: the export still happened, it just will not be remembered */
  }
}

export async function forgetDirectory() {
  try {
    await idbDelete();
  } catch {
    /* nothing to do */
  }
}

// --- permissions ------------------------------------------------------------

/*
  A stored handle does not carry its permission across sessions. Querying is
  silent; requesting needs a user gesture, which every call site here has (the
  click on Export).
*/
async function canWrite(handle) {
  if (!handle || typeof handle.queryPermission !== 'function') return true;
  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

// --- writing ----------------------------------------------------------------

async function writeInto(dirHandle, fileName, text) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

function downloadViaAnchor(text, fileName) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const pad = (n) => String(n).padStart(2, '0');

/** `project-tracker-2026-10-02.json` */
export function datedName(when = new Date()) {
  return `project-tracker-${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}.json`;
}

/**
 * `project-tracker-2026-10-02-014533.json`
 *
 * Used ONLY for the no-dialog path. Writing to a remembered folder bypasses
 * the save dialog's overwrite warning, so a fixed name would silently eat the
 * previous export — the one thing a backup must never do.
 */
export function stampedName(when = new Date()) {
  return `project-tracker-${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(
    when.getDate()
  )}-${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}.json`;
}

/**
 * Save `text` to a file.
 *
 * @param {object} opts
 * @param {string} opts.text              file contents
 * @param {string} [opts.suggestedName]   name offered in the picker
 * @param {boolean} [opts.forceDialog]    true to always ask, ignoring the
 *                                        remembered directory (the "change
 *                                        location" affordance)
 * @returns {Promise<{ok: boolean, cancelled?: boolean, where?: string, error?: string}>}
 *   `where` is the human label shown back to the user.
 */
export async function saveExport({ text, suggestedName, forceDialog = false }) {
  const name = suggestedName || datedName();

  if (!canChooseLocation()) {
    try {
      downloadViaAnchor(text, name);
      return { ok: true, where: 'your browser’s downloads folder' };
    } catch (err) {
      return { ok: false, error: err?.message || 'The download could not be started.' };
    }
  }

  // Fast path: the folder the user already chose.
  if (!forceDialog) {
    const remembered = await loadDirectory();
    if (remembered && (await canWrite(remembered))) {
      try {
        await writeInto(remembered, stampedName(), text);
        return { ok: true, where: remembered.name || 'your chosen folder' };
      } catch (err) {
        if (err?.name === 'AbortError') return { ok: false, cancelled: true };
        if (isPlatformBlock(err)) {
          // Host blocks writes entirely: skip the dialog (it would only make
          // another empty shell) and go straight to downloads.
          markFsBlocked();
          await forgetDirectory();
          try {
            downloadViaAnchor(text, name);
            return { ok: true, where: 'your browser’s downloads folder' };
          } catch {
            return { ok: false, error: err?.message || 'The file could not be saved.' };
          }
        }
        // Stale permission, folder deleted, disk full. Fall through to the
        // dialog rather than silently failing.
        await forgetDirectory();
      }
    }
  }

  // Dialog path — opens in the remembered folder when we have one.
  try {
    const remembered = await loadDirectory();
    const handle = await window.showSaveFilePicker({
      suggestedName: name,
      types: [{ description: 'Project Tracker board export', accept: { 'application/json': ['.json'] } }],
      ...(remembered ? { startIn: remembered } : {}),
    });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();

    // Remember the folder, not this file, so tomorrow's export keeps landing
    // beside it instead of overwriting it.
    if (handle.parent) {
      await rememberDirectory(handle.parent);
      return { ok: true, where: handle.parent.name || 'your chosen folder' };
    }
    return { ok: true, where: 'your chosen folder' };
  } catch (err) {
    if (err?.name === 'AbortError') return { ok: false, cancelled: true };
    // Host allows the picker but blocks the write (review iframe, WebView,
    // insecure context): showSaveFilePicker resolves, then createWritable
    // throws NotAllowedError. Remember that so the next export skips the
    // picker instead of leaving another empty file behind, then fall back to
    // <a download> so this export still lands somewhere real.
    if (isPlatformBlock(err)) markFsBlocked();
    try {
      downloadViaAnchor(text, name);
      return { ok: true, where: 'your browser’s downloads folder' };
    } catch {
      return { ok: false, error: err?.message || 'The file could not be saved.' };
    }
  }
}