import React, { useEffect, useState } from 'react'
import api from '../api'
import { TEAM_NAMES } from './admin_teams'

function toLocalInput(dt){
  if(!dt) return ''
  const d = new Date(dt)
  // produce yyyy-MM-ddThh:mm for datetime-local
  const pad = (n)=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminPage(){
  const [matches, setMatches] = useState([])
  const [form, setForm] = useState({ team_h: 1, team_a: 2, event: 1, kickoff_time: '' })
  const [editing, setEditing] = useState(null)
  const [eventsList, setEventsList] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(()=>{ load() }, [])

  async function load(){
    const m = await api.get('/matches/')
    const matchesList = m || []
    setMatches(matchesList)

    const uniqueEvents = Array.from(new Set(matchesList.map(x => x.event))).sort((a, b) => a - b)
    setEventsList(uniqueEvents)

    setSelectedEvent(current => {
      if (uniqueEvents.length === 0) return 1;
      if (current !== null && uniqueEvents.includes(current)) return current;

      const scheduled = matchesList.filter(x => x.status === 'scheduled')
      if (scheduled.length > 0) {
        scheduled.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
        return scheduled[0].event
      } else {
        const ended = matchesList.filter(x => x.status === 'ended')
        if (ended.length > 0) {
          ended.sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
          return ended[0].event
        } else {
          return uniqueEvents[0]
        }
      }
    })
  }

  async function create(e){
    e.preventDefault()
    try{
      const payload = {
        team_h: Number(form.team_h),
        team_a: Number(form.team_a),
        event: Number(form.event),
        kickoff_time: new Date(form.kickoff_time).toISOString()
      }
      await api.post('/matches/', payload)
      setForm({ team_h:1, team_a:2, event: Number(form.event), kickoff_time: '' })
      load()
    }catch(e){ alert('Create failed: '+e) }
  }

  function startEdit(m){
    setEditing(m.id)
    setForm({
      team_h: m.team_h,
      team_a: m.team_a,
      event: m.event,
      kickoff_time: toLocalInput(m.kickoff_time),
      team_h_score: m.team_h_score ?? '',
      team_a_score: m.team_a_score ?? '',
      status: m.status
    })
  }

  async function saveEdit(e){
    e.preventDefault()
    try{
      const payload = {}
      if(form.team_h) payload.team_h = Number(form.team_h)
      if(form.team_a) payload.team_a = Number(form.team_a)
      if(form.event) payload.event = Number(form.event)
      if(form.kickoff_time) payload.kickoff_time = new Date(form.kickoff_time).toISOString()
      if(form.team_h_score !== '') payload.team_h_score = form.team_h_score === '' ? null : Number(form.team_h_score)
      if(form.team_a_score !== '') payload.team_a_score = form.team_a_score === '' ? null : Number(form.team_a_score)
      if(form.status) payload.status = form.status

      await api.put(`/matches/${editing}`, payload)
      setEditing(null)
      setForm({ team_h:1, team_a:2, event:1, kickoff_time:'' })
      load()
    }catch(e){ alert('Update failed: '+e) }
  }

  async function remove(id){
    if(!confirm('Delete match?')) return
    try{ await api.del(`/matches/${id}`); load() }catch(e){ alert('Delete failed: '+e) }
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
      <h3>Admin — Create Match</h3>
      <form onSubmit={editing? saveEdit : create} className="admin-form">
        <div>
          <label>Home</label>
          <select value={form.team_h} onChange={(e)=>setForm({...form, team_h:e.target.value})}>
            {Object.entries(TEAM_NAMES).map(([k,v])=> <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label>Away</label>
          <select value={form.team_a} onChange={(e)=>setForm({...form, team_a:e.target.value})}>
            {Object.entries(TEAM_NAMES).map(([k,v])=> <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label>Event</label>
          <input type="number" value={form.event} onChange={(e)=>setForm({...form, event:e.target.value})} />
        </div>
        <div>
          <label>Kickoff</label>
          <input type="datetime-local" value={form.kickoff_time} onChange={(e)=>setForm({...form, kickoff_time:e.target.value})} />
        </div>
        <div>
          <label>Status</label>
          <select value={form.status || 'scheduled'} onChange={(e)=>setForm({...form, status:e.target.value})}>
            <option value="scheduled">scheduled</option>
            <option value="started">started</option>
            <option value="ended">ended</option>
          </select>
        </div>
        <div>
          <label>Home Score</label>
          <input type="number" value={form.team_h_score || ''} onChange={(e)=>setForm({...form, team_h_score:e.target.value})} />
        </div>
        <div>
          <label>Away Score</label>
          <input type="number" value={form.team_a_score || ''} onChange={(e)=>setForm({...form, team_a_score:e.target.value})} />
        </div>
        <div>
          <button type="submit">{editing? 'Save' : 'Create'}</button>
          {editing && <button type="button" onClick={()=>{ setEditing(null); setForm({team_h:1,team_a:2,event:1, kickoff_time:''}) }}>Cancel</button>}
        </div>
      </form>

      <h3>Existing Matches</h3>
      
      <div className="event-switcher">
        <button 
          onClick={handlePrevEvent} 
          disabled={eventsList.length <= 1 || selectedEvent === eventsList[0]} 
          className="arrow-btn"
          type="button"
        >
          &larr;
        </button>
        <span className="gameweek-title">Gameweek {selectedEvent || 1}</span>
        <button 
          onClick={handleNextEvent} 
          disabled={eventsList.length <= 1 || selectedEvent === eventsList[eventsList.length - 1]} 
          className="arrow-btn"
          type="button"
        >
          &rarr;
        </button>
      </div>

      <div className="matches admin-matches">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(m=> (
            <div key={m.id} className="match admin-match">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: '#888', marginRight: '4px' }}>#{m.id}</span>
                {m.team_h_logo && (
                  <img
                    src={m.team_h_logo}
                    alt={m.team_h_name}
                    className="admin-team-logo"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
                <strong>{m.team_h_name}</strong>
                <span style={{ color: '#888', fontSize: '13px' }}>vs</span>
                {m.team_a_logo && (
                  <img
                    src={m.team_a_logo}
                    alt={m.team_a_name}
                    className="admin-team-logo"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
                <strong>{m.team_a_name}</strong>
                <span className={`badge ${m.status}`} style={{ marginLeft: '8px' }}>
                  {m.status}
                </span>
                {(m.status === 'ended' || m.team_h_score !== null) && (
                  <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                    ({m.team_h_score ?? '-'} - {m.team_a_score ?? '-'})
                  </span>
                )}
              </div>
              <div>
                <button onClick={()=>startEdit(m)}>Edit</button>
                <button onClick={()=>remove(m.id)}>Delete</button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: '#666', gridColumn: 'span 2' }}>No matches found for this gameweek.</p>
        )}
      </div>
    </div>
  )
}
