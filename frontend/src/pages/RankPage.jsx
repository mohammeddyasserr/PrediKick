import React, { useEffect, useState } from 'react'
import api from '../api'

export default function RankPage({ username }){
  const [rank, setRank] = useState([])

  useEffect(()=>{
    async function load(){
      const r = await api.get('/rank/')
      setRank(r || [])
    }
    load()
  }, [])

  return (
    <div>
      <h3>Rank</h3>
      <table className="rank-table">
        <thead>
          <tr><th>#</th><th>User</th><th>Points</th></tr>
        </thead>
        <tbody>
          {rank.map(r=> (
              <tr key={r.id} className={r.username===username? 'highlight':''}>
              <td>{r.rank}</td>
              <td>{r.username}</td>
              <td>{r.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
