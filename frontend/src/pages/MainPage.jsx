import React, { useEffect, useState } from 'react'
import api from '../api'
import RankPage from './RankPage'
import AdminPage from './AdminPage'

function decodePayload(token) {
  try {
    const p = token.split('.')[1]
    return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))
  } catch (e) {
    return null
  }
}

function formatKickoff(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const day = d.toLocaleDateString(undefined, { weekday: 'short' })
  const dateStr = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day}, ${dateStr} • ${timeStr}`
}

function Predictions({ token }) {
  const [matches, setMatches] = useState([])
  const [preds, setPreds] = useState([])
  const [local, setLocal] = useState({})
  const [inputs, setInputs] = useState({})
  const [eventsList, setEventsList] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    async function load() {
      const [m, p] = await Promise.all([api.get('/matches/'), api.get('/predictions/')])
      const matchesList = m || []
      const predsList = p || []

      setMatches(matchesList)
      setPreds(predsList)

      const map = {}
      const iv = {}
      predsList.forEach(x => { map[x.match_id] = x; iv[x.match_id] = { h: String(x.predicted_team_h_score), a: String(x.predicted_team_a_score) } })

      matchesList.forEach(mm => {
        if (!iv[mm.id]) iv[mm.id] = { h: '', a: '' }
      })

      setLocal(map)
      setInputs(iv)

      const uniqueEvents = Array.from(new Set(matchesList.map(x => x.event))).sort((a, b) => a - b)
      setEventsList(uniqueEvents)

      if (uniqueEvents.length > 0) {
        const scheduled = matchesList.filter(x => x.status === 'scheduled')
        if (scheduled.length > 0) {
          scheduled.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
          setSelectedEvent(scheduled[0].event)
        } else {
          const ended = matchesList.filter(x => x.status === 'ended')
          if (ended.length > 0) {
            ended.sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
            setSelectedEvent(ended[0].event)
          } else {
            setSelectedEvent(uniqueEvents[0])
          }
        }
      } else {
        setSelectedEvent(1)
      }
    }
    load()
  }, [])

  async function createPrediction(matchId) {
    const entry = local[matchId]
    const team_h = inputs[matchId]?.h || '0'
    const team_a = inputs[matchId]?.a || '0'

    try {
      if (entry && entry.id) {
        const res = await api.put(`/predictions/${entry.id}`, {
          predicted_team_h_score: Number(team_h || 0),
          predicted_team_a_score: Number(team_a || 0)
        })
        setLocal({ ...local, [matchId]: res })
        setInputs({ ...inputs, [matchId]: { h: String(res.predicted_team_h_score), a: String(res.predicted_team_a_score) } })
      } else {
        const res = await api.post('/predictions/', {
          match_id: matchId,
          predicted_team_h_score: Number(team_h || 0),
          predicted_team_a_score: Number(team_a || 0)
        })
        setLocal({ ...local, [matchId]: res })
        setInputs({ ...inputs, [matchId]: { h: String(res.predicted_team_h_score), a: String(res.predicted_team_a_score) } })
      }
    } catch (e) {
      alert('Prediction failed: ' + e)
    }
  }

  function renderMatch(match) {
    const entry = local[match.id]
    const started = match.status === 'started'
    const ended = match.status === 'ended'
    const predicted_h = inputs[match.id]?.h ?? ''
    const predicted_a = inputs[match.id]?.a ?? ''
    const canPredict = match.status === 'scheduled'

    const isSameAsExisting = (() => {
      if (!entry) return predicted_h === '' && predicted_a === ''
      return String(entry.predicted_team_h_score) === String(predicted_h) && String(entry.predicted_team_a_score) === String(predicted_a)
    })()

    return (
      <div key={match.id} className="match">
        <div className="match-kickoff" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--pl-text-muted)', paddingBottom: '6px', borderBottom: '1px dashed #e3e3e3', marginBottom: '4px' }}>
          {formatKickoff(match.kickoff_time)}
        </div>
        <div className="teams">
          <div className="team home-team">
            <span className="team-name">{match.team_h_name}</span>
            {match.team_h_logo && (
              <img
                src={match.team_h_logo}
                alt={match.team_h_name}
                className="team-logo"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
          </div>
          <input id={`h-${match.id}`} value={predicted_h} disabled={!canPredict} onChange={(e) => setInputs({ ...inputs, [match.id]: { ...(inputs[match.id] || {}), h: e.target.value } })} />
          <span>vs</span>
          <input id={`a-${match.id}`} value={predicted_a} disabled={!canPredict} onChange={(e) => setInputs({ ...inputs, [match.id]: { ...(inputs[match.id] || {}), a: e.target.value } })} />
          <div className="team away-team">
            {match.team_a_logo && (
              <img
                src={match.team_a_logo}
                alt={match.team_a_name}
                className="team-logo"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <span className="team-name">{match.team_a_name}</span>
          </div>
        </div>
        <div className="actions">
          {started && (
            <span className="badge started">
              {match.minutes != null ? `In progress (${match.minutes}')` : 'In progress'}
            </span>
          )}
          {ended && <span className="badge ended">Calculated</span>}
          {!started && !ended && <span className="badge scheduled">Scheduled</span>}
          {ended && entry && <span className="points">You got: {entry.points}</span>}
          {ended && <div className="result">Result: {match.team_h_score ?? '-'} - {match.team_a_score ?? '-'}</div>}
          {canPredict && (
            <button id={`btn-${match.id}`} onClick={() => createPrediction(match.id)} disabled={isSameAsExisting}>{'Predict'}</button>
          )}
        </div>
      </div>
    )
  }

  const handlePrevEvent = () => {
    const idx = eventsList.indexOf(selectedEvent)
    if (idx > 0) {
      setSelectedEvent(eventsList[idx - 1])
    }
  }

  const handleNextEvent = () => {
    const idx = eventsList.indexOf(selectedEvent)
    if (idx < eventsList.length - 1) {
      setSelectedEvent(eventsList[idx + 1])
    }
  }

  const filteredMatches = matches.filter(m => m.event === selectedEvent)

  return (
    <div>
      <h3>Predictions</h3>
      
      <div className="event-switcher">
        <button 
          onClick={handlePrevEvent} 
          disabled={eventsList.length <= 1 || selectedEvent === eventsList[0]} 
          className="arrow-btn"
        >
          &larr;
        </button>
        <span className="gameweek-title">Gameweek {selectedEvent || 1}</span>
        <button 
          onClick={handleNextEvent} 
          disabled={eventsList.length <= 1 || selectedEvent === eventsList[eventsList.length - 1]} 
          className="arrow-btn"
        >
          &rarr;
        </button>
      </div>

      <div className="matches">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(renderMatch)
        ) : (
          <p style={{ textAlign: 'center', color: '#666' }}>No matches found for this gameweek.</p>
        )}
      </div>
    </div>
  )
}

export default function MainPage({ token, username, onLogout }) {
  const [tab, setTab] = useState('predictions')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // client-side claim check
    const payload = token ? decodePayload(token) : null
    if (payload) {
      const meta = payload.user_metadata || {}
      if (meta.role === 'admin' || payload.role === 'admin' || meta.is_admin) setIsAdmin(true)
    }

    // verify admin-server side (will return username on success)
    ;(async ()=>{
      try{
        const res = await api.get('/admin/test')
        if (res && res.username) setIsAdmin(true)
      }catch(e){/* ignore */}
    })()
  }, [token])

  return (
    <div className="app">
      <header>
        <div className="tabs">
          <button onClick={()=>setTab('predictions')} className={tab==='predictions'? 'active':''}>Predictions</button>
          <button onClick={()=>setTab('rank')} className={tab==='rank'? 'active':''}>Rank</button>
          {isAdmin && <button onClick={()=>setTab('admin')} className={tab==='admin'? 'active':''}>Admin</button>}
        </div>
        <div className="right">
          <span>{username || ''}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      <main>
        {tab === 'predictions' && <Predictions token={token} />}
        {tab === 'rank' && <RankPage username={username} />}
        {tab === 'admin' && <AdminPage />}
      </main>
    </div>
  )
}
