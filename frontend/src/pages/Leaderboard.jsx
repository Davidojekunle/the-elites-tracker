import { useState, useEffect } from 'react'
import { api } from '../api'
import { GradeBadge, RankBadge, CGPABar, StatCard, Spinner, EmptyState } from '../components/UI'

function cgpaClass(cgpa) {
  if (cgpa >= 4.5) return 'First Class'
  if (cgpa >= 3.5) return 'Second Class Upper'
  if (cgpa >= 2.5) return 'Second Class Lower'
  if (cgpa >= 1.5) return 'Third Class'
  return 'Pass'
}

export default function Leaderboard({ onSelectStudent }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  useEffect(() => {
    setLoading(true)
    api.leaderboard('2025/2026', 100, semester || null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [semester])

  if (loading) return <Spinner />
  if (!data || !data.leaderboard.length) return <EmptyState message="No results ingested yet." />

  const lb = data.leaderboard
  const filtered = lb.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.matric_no.includes(search)
  )
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const top = lb[0]
  const firstClass = lb.filter(s => s.cgpa >= 4.5).length
  const avgCgpa = lb.reduce((a, b) => a + b.cgpa, 0) / lb.length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Leaderboard</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>{lb.length} students ranked · Session 2025/2026 · 100 Level</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Top Student" value={top.name.split(' ')[0]} sub={`CGPA ${top.cgpa.toFixed(2)}`} accent="#1a56db" />
        <StatCard label="Average CGPA" value={avgCgpa.toFixed(2)} sub="Class average" accent="#16a34a" />
        <StatCard label="First Class" value={firstClass} sub={`${((firstClass/lb.length)*100).toFixed(0)}% of class`} accent="#d97706" />
        <StatCard label="Students" value={lb.length} sub="Ranked" accent="#7c3aed" />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name or matric…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{
              flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0',
              borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              outline: 'none', color: '#334155'
            }}
          />
          <select
            value={semester}
            onChange={e => { setSemester(e.target.value); setPage(1) }}
            style={{
              padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
              fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#334155',
              background: '#fff', cursor: 'pointer'
            }}
          >
            <option value="">All Semesters</option>
            <option value="1">1st Semester</option>
            <option value="2">2nd Semester</option>
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Rank', 'Student', 'CGPA', 'Class', 'Courses', 'Units'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: h === 'Rank' ? 'center' : 'left',
                  fontSize: 12, fontWeight: 600, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '1px solid #e2e8f0'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((s, i) => (
              <tr
                key={s.matric_no}
                onClick={() => onSelectStudent(s.matric_no)}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  background: i % 2 === 0 ? '#fff' : '#fafbfc'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}
              >
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <RankBadge rank={s.rank} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontWeight: 500, color: '#0f172a', fontSize: 14 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>{s.matric_no}</p>
                </td>
                <td style={{ padding: '12px 16px', minWidth: 140 }}>
                  <CGPABar cgpa={s.cgpa} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 4,
                    background: s.cgpa >= 4.5 ? '#dcfce7' : s.cgpa >= 3.5 ? '#dbeafe' : s.cgpa >= 2.5 ? '#fef9c3' : '#fee2e2',
                    color: s.cgpa >= 4.5 ? '#15803d' : s.cgpa >= 3.5 ? '#1d4ed8' : s.cgpa >= 2.5 ? '#a16207' : '#b91c1c',
                    fontWeight: 500
                  }}>
                    {cgpaClass(s.cgpa)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#475569', fontSize: 14 }}>{s.courses_sat}</td>
                <td style={{ padding: '12px 16px', color: '#475569', fontSize: 14 }}>{s.total_units}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 32, height: 32, borderRadius: 6, border: '1px solid',
                    borderColor: p === page ? '#1a56db' : '#e2e8f0',
                    background: p === page ? '#1a56db' : '#fff',
                    color: p === page ? '#fff' : '#475569',
                    fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
                  }}
                >{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
