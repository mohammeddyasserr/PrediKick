const API_BASE = import.meta.env.VITE_API_BASE 

export function setToken(t){
  // tokens are now stored in HttpOnly cookies on the backend; JS should not hold them
  return t
}

export function clearToken(){
  return null
}

function authHeaders() {
  return {}
}

// Simple in-memory cache/in-flight dedupe for GET requests during dev
const _cache = new Map()
const _inFlight = new Map()

export async function post(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    credentials: 'include',
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
  const key = `${path}::cookie-session`
  if (_cache.has(key)) return _cache.get(key)
  if (_inFlight.has(key)) return _inFlight.get(key)

  const promise = (async () => {
    const res = await fetch(API_BASE + path, {
      credentials: 'include',
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
    credentials: 'include',
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
    credentials: 'include',
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
