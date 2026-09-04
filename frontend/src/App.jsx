import React, { useEffect, useState } from 'react'
import AuthPage from './pages/AuthPage'
import MainPage from './pages/MainPage'
import api from './api'

export default function App() {
  const [token, setToken] = useState(null)
  const [username, setUsername] = useState(null)
  const [teamLogos, setTeamLogos] = useState({})

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
    try{
      const p = JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
      const meta = p.user_metadata || {}
      setUsername(meta.username || p.email || null)
    }catch(e){/* ignore */}
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
