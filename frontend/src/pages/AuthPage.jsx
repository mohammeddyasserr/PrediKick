import React, { useState } from 'react'
import api from '../api'

function decodePayload(token) {
  try {
    const p = token.split('.')[1]
    return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))
  } catch (e) {
    return null
  }
}

export default function AuthPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setErr(null)

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', {
          username: form.username,
          email: form.email,
          password: form.password
        })
        if (res.user_id) {
          alert('Registered — now login')
          setIsRegister(false)
        } else {
          setErr(res.detail || 'Registration failed')
        }
      } else {
        const res = await api.post('/auth/login', {
          username: form.username,
          password: form.password
        })

        if (res.access_token) {
          onLogin(res.access_token)
        } else {
          setErr(res.detail || 'Login failed')
        }
      }
    } catch (e) {
      setErr(String(e))
    }
  }

  return (
    <div className="auth">
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={submit}>
        <div>
          <label>Username</label>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        {isRegister && (
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
        )}
        <div>
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
          <button type="button" onClick={() => setIsRegister(!isRegister)}>{isRegister ? 'Switch to Login' : 'Switch to Register'}</button>
        </div>
        {err && <p className="error">{err}</p>}
      </form>
    </div>
  )
}
