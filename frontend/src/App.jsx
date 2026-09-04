import React, { useEffect, useState } from 'react'
import AuthPage from './pages/AuthPage'
import MainPage from './pages/MainPage'
import api from './api'

function decodeUsername(token) {
  if (!token) return null

  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    )
    return payload.user_metadata?.username || payload.email || null
  } catch {
    return null
  }
}

export default function App() {
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('predikick_token') || null
    } catch {
      return null
    }
  })
  const [username, setUsername] = useState(() => {
    try {
      const saved = sessionStorage.getItem('predikick_token')
      return decodeUsername(saved)
    } catch {
      return null
    }
  })
  const [teamLogos, setTeamLogos] = useState({})

  useEffect(() => {
    if (!token) {
      api.clearToken()
      setTeamLogos({})
      return
    }

    api.setToken(token)
  }, [token])

  useEffect(() => {
    if (!token) {
      setTeamLogos({})
      return
    }

    let active = true

    api.get('/matches/logos')
      .then((logos) => {
        if (!active) return
        const map = {}
        ;(logos || []).forEach((team) => {
          map[team.team_id] = team.logo_url
        })
        setTeamLogos(map)
      })
      .catch(() => {
        if (active) setTeamLogos({})
      })

    return () => { active = false }
  }, [token])

  function handleLogin(tok){
    api.setToken(tok)
    setToken(tok)
    setUsername(decodeUsername(tok))
  }

  function handleLogout(){
    api.clearToken()
    setToken(null)
    setUsername(null)
    setTeamLogos({})
  }

  if (!token) return <AuthPage onLogin={handleLogin} />

  return <MainPage token={token} username={username} onLogout={handleLogout} teamLogos={teamLogos} />
}
