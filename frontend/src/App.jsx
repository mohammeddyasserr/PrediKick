import React, { useEffect, useState } from 'react'
import AuthPage from './pages/AuthPage'
import MainPage from './pages/MainPage'
import api from './api'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState(null)
  const [teamLogos, setTeamLogos] = useState({})

  useEffect(() => {
    let active = true

    api.get('/me')
      .then((user) => {
        if (!active) return
        setIsAuthenticated(true)
        setUsername(user?.email || user?.username || null)
      })
      .catch(() => {
        if (!active) return
        setIsAuthenticated(false)
        setUsername(null)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
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
  }, [isAuthenticated])

  function handleLogin(name){
    setIsAuthenticated(true)
    setUsername(name || 'User')
  }

  function handleLogout(){
    api.post('/auth/logout', {})
      .catch(() => {})
    setIsAuthenticated(false)
    setUsername(null)
    setTeamLogos({})
  }

  if (!isAuthenticated) return <AuthPage onLogin={handleLogin} />

  return <MainPage token={null} username={username} onLogout={handleLogout} teamLogos={teamLogos} />
}
