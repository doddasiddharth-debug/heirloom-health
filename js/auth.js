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

async function hashPin(pin, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function createAccount({ name, pin, terms }) {
  const salt = randomHex(16);
  const acct = { id: 'acct-' + randomHex(6), name, salt, pinHash: pin ? await hashPin(pin, salt) : null, created: new Date().toISOString().slice(0, 10), terms };
  store.set(ACCOUNTS_KEY, [...listAccounts(), acct]);
  return acct;
}
async function checkPin(acct, pin) { return !acct.pinHash || (await hashPin(pin, acct.salt)) === acct.pinHash; }
// Record that a profile agreed to the current terms.
function agreeTerms(id, version) { store.set(ACCOUNTS_KEY, listAccounts().map(a => a.id === id ? { ...a, terms: version } : a)); }
function deleteAccount(id) { store.set(ACCOUNTS_KEY, listAccounts().filter(a => a.id !== id)); store.del(dataKey(id)); }

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

// Wrong PINs slow down: after 5 misses, wait 30 seconds.
const PIN_TRIES = { count: 0, until: 0 };
function pinLocked() { return Date.now() < PIN_TRIES.until; }
function notePinMiss() { if (++PIN_TRIES.count >= 5) { PIN_TRIES.count = 0; PIN_TRIES.until = Date.now() + 30000; } }
