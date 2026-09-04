const API_BASE = import.meta.env.VITE_API_BASE 
const STORAGE_KEY = 'predikick_token'

let _token = null

try {
  _token = sessionStorage.getItem(STORAGE_KEY) || null
} catch {
  _token = null
}

export function setToken(t){
  _token = t || null
  _cache.clear(); _inFlight.clear();

  try {
    if (_token) sessionStorage.setItem(STORAGE_KEY, _token)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage access issues in restricted browser contexts
  }
}

export function clearToken(){
  _token = null; _cache.clear(); _inFlight.clear();

  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage access issues in restricted browser contexts
  }
}

function authHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {}
}

// Simple in-memory cache/in-flight dedupe for GET requests during dev
const _cache = new Map()
const _inFlight = new Map()

export async function post(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(body)
  })
  // invalidate any cached entries for matches/predictions regardless of token
  for (const k of Array.from(_cache.keys())) {
    if (k.startsWith('/matches/') || k.startsWith('/predictions/')) _cache.delete(k)
  }
  for (const k of Array.from(_inFlight.keys())) {
    if (k.startsWith('/matches/') || k.startsWith('/predictions/')) _inFlight.delete(k)
  }
  return res.json()
}

export async function get(path) {
  // include token in cache key so responses tied to auth don't leak
  const key = `${path}::${_token || ''}`
  if (_cache.has(key)) return _cache.get(key)
  if (_inFlight.has(key)) return _inFlight.get(key)

  const promise = (async () => {
    const res = await fetch(API_BASE + path, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      }
    })
    const json = await res.json()
    _cache.set(key, json)
    _inFlight.delete(key)
    return json
  })()

  _inFlight.set(key, promise)
  return promise
}

export async function put(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(body)
  })
  // invalidate any cached entries for matches/predictions regardless of token
  for (const k of Array.from(_cache.keys())) {
    if (k.startsWith('/matches/') || k.startsWith('/predictions/')) _cache.delete(k)
  }
  for (const k of Array.from(_inFlight.keys())) {
    if (k.startsWith('/matches/') || k.startsWith('/predictions/')) _inFlight.delete(k)
  }
  return res.json()
}

export async function del(path) {
  const res = await fetch(API_BASE + path, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    }
  })
  for (const k of Array.from(_cache.keys())) {
    if (k.startsWith('/matches/') || k.startsWith('/predictions/')) _cache.delete(k)
  }
  for (const k of Array.from(_inFlight.keys())) {
    if (k.startsWith('/matches/') || k.startsWith('/predictions/')) _inFlight.delete(k)
  }
  return res.json()
}

export default { get, post, put, del, setToken, clearToken }
