import { useState, useEffect } from 'react'
import { api } from '../api'
import { GradeBadge, RankBadge, Spinner, EmptyState } from '../components/UI'

export default function Courses({ onSelectStudent }) {
  const [lb, setLb] = useState(null)
  const [courses, setCourses] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.leaderboard('2025/2026', 100), api.courses()])
      .then(([lbData, cs]) => {
        setLb(lbData.leaderboard)
        setCourses(cs)
        if (cs.length) setSelected(cs[0].code)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!lb || !courses.length) return <EmptyState message="No courses found." />

  const course = courses.find(c => c.code === selected)

  // Build course-level ranking
  const courseRanking = lb
    .map(s => {
      const r = (s.results || []).find(r => r.course_code === selected)
      if (!r) return null
      return { matric_no: s.matric_no, name: s.name, result: r }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ta = a.result.total_score ?? 0
      const tb = b.result.total_score ?? 0
      if (tb !== ta) return tb - ta
      return a.name.localeCompare(b.name)
    })
    .map((s, i, arr) => {
      const rank = i > 0 && (s.result.total_score ?? 0) === (arr[i-1].result.total_score ?? 0)
        ? arr[i-1].rank
        : i + 1
      s.rank = rank
      return s
    })

  const withScores = courseRanking.filter(s => s.result.total_score !== null)
  const gradeOnly = courseRanking.filter(s => s.result.total_score === null)
  const avg = withScores.length ? (withScores.reduce((a, s) => a + s.result.total_score, 0) / withScores.length).toFixed(1) : null
  const topScore = withScores[0]?.result.total_score

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Course Leaderboard</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Best student per course</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {courses.map(c => (
          <button
            key={c.code}
            onClick={() => setSelected(c.code)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: '1px solid',
              borderColor: selected === c.code ? '#1a56db' : '#e2e8f0',
              background: selected === c.code ? '#1a56db' : '#fff',
              color: selected === c.code ? '#fff' : '#475569',
              fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              fontWeight: selected === c.code ? 600 : 400,
              transition: 'all 0.15s'
            }}
          >
            {c.code.replace('LAGCSC', 'CSC').replace('LAGCYB', 'CYB')}
            {c.is_elective ? ' ·E' : ''}
          </button>
        ))}
      </div>

      {course && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, padding: '16px 20px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{course.title}</h3>
          <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 13, color: '#64748b' }}>
            <span>Credit units: <strong>{course.credit_units}</strong></span>
            <span>Semester: <strong>{course.semester}</strong></span>
            {avg && <span>Class avg: <strong style={{ color: '#1a56db' }}>{avg}/100</strong></span>}
            {topScore && <span>Top score: <strong style={{ color: '#16a34a' }}>{topScore}/100</strong></span>}
            <span>Students: <strong>{courseRanking.length}</strong></span>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Rank', 'Student', 'C/A', 'Exam', 'Total', 'Grade'].map(h => (
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
            {(withScores.length ? withScores : gradeOnly).map((s, i) => (
              <tr
                key={s.matric_no}
                onClick={() => onSelectStudent(s.matric_no)}
                style={{
                  borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                  background: i % 2 === 0 ? '#fff' : '#fafbfc'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}
              >
                <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                  <RankBadge rank={s.rank} />
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <p style={{ fontWeight: 500, color: '#0f172a', fontSize: 14 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>{s.matric_no}</p>
                </td>
                <td style={{ padding: '11px 16px', color: '#475569', fontSize: 14 }}>{s.result.ca_score ?? '–'}</td>
                <td style={{ padding: '11px 16px', color: '#475569', fontSize: 14 }}>{s.result.exam_score ?? '–'}</td>
                <td style={{ padding: '11px 16px', color: '#334155', fontWeight: 500, fontSize: 14 }}>{s.result.total_score ?? '–'}</td>
                <td style={{ padding: '11px 16px' }}><GradeBadge grade={s.result.grade} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
