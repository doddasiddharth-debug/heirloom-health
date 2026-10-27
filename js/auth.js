// Sign-in: profiles that live on this device.
//
// Each profile keeps its own family in its own storage slot. An optional PIN is never stored;
// only a salted SHA-256 hash of it is. This keeps a brother or sister from opening your family
// by accident on a shared phone. It is a device lock, not a cloud account.
'use strict';

const ACCOUNTS_KEY = 'heirloom-accounts';
const SESSION_KEY = 'heirloom-session';
const GUEST = { id: 'guest', name: 'Guest', guest: true };
const dataKey = id => 'heirloom-health-v2:' + id;
let SESSION_ID = null; // fallback when the browser blocks storage

const store = {
  get(key, fallback, area = 'local') { try { const v = window[area + 'Storage'].getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value, area = 'local') { try { window[area + 'Storage'].setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
  del(key, area = 'local') { try { window[area + 'Storage'].removeItem(key); } catch {} },
};
const listAccounts = () => store.get(ACCOUNTS_KEY, []);
const randomHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

// Older profiles stored a fast SHA-256 hash of the PIN. They still sign in, and are upgraded (below).
async function hashPin(pin, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

// One slow calculation (PBKDF2, 600,000 rounds) turns the PIN into 64 bytes: the first half checks the PIN,
// the second half is the key that encrypts this profile's family. The slowness makes guessing PINs from a
// copied profile take a very long time, and the key itself is never stored.
const PIN_ROUNDS = 600000;
async function pinSecrets(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PIN_ROUNDS }, base, 512));
  const check = toHex(await crypto.subtle.digest('SHA-256', bits.slice(0, 32)));
  const key = await crypto.subtle.importKey('raw', bits.slice(32), 'AES-GCM', true, ['encrypt', 'decrypt']);
  return { check, key };
}

async function createAccount({ name, pin, terms }) {
  const salt = randomHex(16);
  const acct = { id: 'acct-' + randomHex(6), name, salt, pinHash: null, kdf: null, created: new Date().toISOString().slice(0, 10), terms };
  if (pin) { const { check, key } = await pinSecrets(pin, salt); acct.pinHash = check; acct.kdf = 'pbkdf2'; await setDataKey(acct.id, key); }
  store.set(ACCOUNTS_KEY, [...listAccounts(), acct]);
  return acct;
}
// Checks a PIN. On success, unlocks the profile's family key. Old-style profiles are upgraded to the slow hash.
async function checkPin(acct, pin) {
  if (!acct.pinHash) return true;
  if (acct.kdf === 'pbkdf2') {
    const { check, key } = await pinSecrets(pin, acct.salt);
    if (check !== acct.pinHash) return false;
    await setDataKey(acct.id, key); return true;
  }
  if ((await hashPin(pin, acct.salt)) !== acct.pinHash) return false;
  const { check, key } = await pinSecrets(pin, acct.salt);
  store.set(ACCOUNTS_KEY, listAccounts().map(a => a.id === acct.id ? { ...a, pinHash: check, kdf: 'pbkdf2' } : a));
  acct.pinHash = check; acct.kdf = 'pbkdf2';
  await setDataKey(acct.id, key); return true;
}

/* ---------- The family, encrypted with the PIN ---------- */
// While a profile is open its key is kept in memory, and in this tab's session storage so a reload doesn't ask
// for the PIN again. Closing the tab forgets it.
let DATA_KEY = null, DATA_KEY_FOR = null;
const KEY_STASH = 'heirloom-key';
async function setDataKey(id, key) {
  DATA_KEY = key; DATA_KEY_FOR = id;
  try { store.set(KEY_STASH, { id, raw: toHex(await crypto.subtle.exportKey('raw', key)) }, 'session'); } catch {}
}
async function restoreDataKey(id) {
  if (DATA_KEY && DATA_KEY_FOR === id) return true;
  const st = store.get(KEY_STASH, null, 'session');
  if (!st || st.id !== id) return false;
  try { DATA_KEY = await crypto.subtle.importKey('raw', Uint8Array.from(st.raw.match(/../g), h => parseInt(h, 16)), 'AES-GCM', true, ['encrypt', 'decrypt']); DATA_KEY_FOR = id; return true; } catch { return false; }
}
function forgetDataKey() { DATA_KEY = DATA_KEY_FOR = null; store.del(KEY_STASH, 'session'); }
const needsKey = acct => !!acct?.pinHash && !acct.guest;
// What is saved for a profile: plain JSON (no PIN), or { enc: 1, iv, ct } (PIN).
function storedFamily(id) { try { return JSON.parse(localStorage.getItem(dataKey(id))); } catch { return null; } }
async function encryptState(state) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, DATA_KEY, new TextEncoder().encode(JSON.stringify(state)));
  return JSON.stringify({ enc: 1, iv: toHex(iv), ct: toHex(ct) });
}
async function decryptStored(id) {
  const v = storedFamily(id);
  if (!v?.enc) return v;
  const bytes = h => Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(v.iv) }, DATA_KEY, bytes(v.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}
// Record that a profile agreed to the current terms.
function agreeTerms(id, version) { store.set(ACCOUNTS_KEY, listAccounts().map(a => a.id === id ? { ...a, terms: version } : a)); }
function deleteAccount(id) { store.set(ACCOUNTS_KEY, listAccounts().filter(a => a.id !== id)); store.del(dataKey(id)); store.del(PIN_TRIES_KEY + id); if (DATA_KEY_FOR === id) forgetDataKey(); }

// "Stay signed in" keeps the session in localStorage; otherwise it ends when the tab closes.
function startSession(id, remember) {
  SESSION_ID = id;
  store.set(SESSION_KEY, id, remember ? 'local' : 'session');
  if (!remember) store.del(SESSION_KEY, 'local');
}
function endSession() { SESSION_ID = null; store.del(SESSION_KEY, 'local'); store.del(SESSION_KEY, 'session'); }
function currentAccount() {
  const id = SESSION_ID || store.get(SESSION_KEY, null, 'session') || store.get(SESSION_KEY, null, 'local');
  if (id === 'guest') return GUEST;
  return listAccounts().find(a => a.id === id) || null;
}

// Wrong PINs slow down, and the count survives reloading the page: after 5 misses wait 30 seconds,
// after 10 wait 5 minutes, after 15 wait 30 minutes.
const PIN_TRIES_KEY = 'heirloom-pin-tries:';
function pinLockedUntil(id) { return store.get(PIN_TRIES_KEY + id, { count: 0, until: 0 }).until; }
function pinLocked(id) { return Date.now() < pinLockedUntil(id); }
function notePinMiss(id) {
  const t = store.get(PIN_TRIES_KEY + id, { count: 0, until: 0 });
  t.count++;
  if (t.count % 5 === 0) t.until = Date.now() + (t.count >= 15 ? 1800000 : t.count >= 10 ? 300000 : 30000);
  store.set(PIN_TRIES_KEY + id, t);
}
function clearPinMisses(id) { store.del(PIN_TRIES_KEY + id); }
