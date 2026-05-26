import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { CGPABar, GradeBadge, Spinner } from '../components/UI'

export default function Search({ onSelectStudent }) {
  const [query, setQuery] = useState('')
  const [lb, setLb] = useState([])
  const [loading, setLoading] = useState(true)
  const inputRef = useRef()

  useEffect(() => {
    api.leaderboard('2025/2026', 100)
      .then(d => { setLb(d.leaderboard); setLoading(false) })
      .catch(() => setLoading(false))
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const results = query.length >= 2
    ? lb.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.matric_no.includes(query)
      )
    : []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Search Students</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Find a student by name or matric number</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type name or matric number…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '13px 14px 13px 42px',
            border: '1.5px solid #e2e8f0', borderRadius: 10,
            fontSize: 15, fontFamily: "'DM Sans', sans-serif",
            color: '#334155', outline: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'border-color 0.15s'
          }}
          onFocus={e => e.target.style.borderColor = '#1a56db'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {loading && <Spinner />}

      {!loading && query.length < 2 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>👤</p>
          <p>Type at least 2 characters to search</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>You can search by name or matric number</p>
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
          <p>No students found for "<strong>{query}</strong>"</p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 13, color: '#64748b' }}>{results.length} result{results.length !== 1 ? 's' : ''}</p>
          </div>
          {results.map((s, i) => (
            <div
              key={s.matric_no}
              onClick={() => onSelectStudent(s.matric_no)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 20px', borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer', transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 600, fontSize: 14
              }}>
                {s.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, color: '#0f172a', fontSize: 14 }}>{s.name}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>{s.matric_no}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 12, color: '#64748b' }}>Rank #{s.rank}</p>
                <div style={{ marginTop: 4, minWidth: 100 }}>
                  <CGPABar cgpa={s.cgpa} />
                </div>
              </div>
              <span style={{ fontSize: 18, color: '#cbd5e1' }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
