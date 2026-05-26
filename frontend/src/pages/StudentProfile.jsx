import { useState, useEffect } from 'react'
import { api } from '../api'
import { GradeBadge, CGPABar, Spinner, EmptyState } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const GRADE_COLORS = { A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#ea580c', E: '#dc2626', F: '#9d174d' }

function cgpaClass(cgpa) {
  if (cgpa >= 4.5) return { label: 'First Class', color: '#16a34a', bg: '#dcfce7' }
  if (cgpa >= 3.5) return { label: '2nd Class Upper', color: '#2563eb', bg: '#dbeafe' }
  if (cgpa >= 2.5) return { label: '2nd Class Lower', color: '#d97706', bg: '#fef9c3' }
  if (cgpa >= 1.5) return { label: 'Third Class', color: '#dc2626', bg: '#fee2e2' }
  return { label: 'Pass', color: '#475569', bg: '#f1f5f9' }
}

export default function StudentProfile({ matric_no, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!matric_no) return
    setLoading(true)
    api.student(matric_no)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [matric_no])

  if (loading) return <Spinner />
  if (!data) return <EmptyState message="Student not found." />

  const cls = cgpaClass(data.cgpa)
  const initials = data.name.split(' ').slice(0, 2).map(w => w[0]).join('')

  const barData = data.results
    .filter(r => r.total_score !== null)
    .map(r => ({
      course: r.course_code.replace('LAG', '').replace('PHY', 'PHY'),
      total: r.total_score,
      ca: r.ca_score,
      exam: r.exam_score
    }))

  const gradeCount = data.results.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(gradeCount).map(([g, v]) => ({ name: g, value: v }))

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid #e2e8f0',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
          fontSize: 13, color: '#475569', fontFamily: "'DM Sans', sans-serif",
          marginBottom: 20
        }}
      >
        ← Back to leaderboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600, fontSize: 18, flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{data.name}</h2>
            <p style={{ fontSize: 13, color: '#64748b', fontFamily: "'DM Mono', monospace" }}>{data.matric_no}</p>
            <span style={{
              display: 'inline-block', marginTop: 6, fontSize: 12,
              padding: '2px 10px', borderRadius: 20,
              background: cls.bg, color: cls.color, fontWeight: 500
            }}>{cls.label}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'CGPA', value: data.cgpa.toFixed(2), color: '#1a56db' },
            { label: 'Courses', value: data.results.length, color: '#16a34a' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 600, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Score per course</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="course" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v, n) => [v, n === 'total' ? 'Total' : n === 'ca' ? 'C/A' : 'Exam']}
                />
                <Bar dataKey="ca" fill="#bfdbfe" radius={[3, 3, 0, 0]} name="ca" />
                <Bar dataKey="exam" fill="#3b82f6" radius={[3, 3, 0, 0]} name="exam" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No score data available." />
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Grade distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={GRADE_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, `Grade ${n}`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Course results</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Course', 'Title', 'C/A', 'Exam', 'Total', 'Grade', 'Units', 'Sem'].map(h => (
                <th key={h} style={{
                  padding: '9px 14px', textAlign: 'left', fontSize: 12,
                  fontWeight: 600, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '1px solid #e2e8f0'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.results.map((r, i) => (
              <tr key={r.course_code} style={{
                borderBottom: '1px solid #f1f5f9',
                background: i % 2 === 0 ? '#fff' : '#fafbfc'
              }}>
                <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#1a56db', fontWeight: 500 }}>
                  {r.course_code}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#334155', maxWidth: 180 }}>
                  <span title={r.course_title}>{r.course_title?.length > 28 ? r.course_title.slice(0, 28) + '…' : r.course_title}</span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#475569' }}>{r.ca_score ?? '–'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#475569' }}>{r.exam_score ?? '–'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#334155' }}>{r.total_score ?? '–'}</td>
                <td style={{ padding: '10px 14px' }}><GradeBadge grade={r.grade} /></td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>{r.credit_units}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>S{r.semester}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Total credit units: <strong>{data.results.reduce((a, r) => a + (r.credit_units || 0), 0)}</strong>
            &nbsp;·&nbsp; CGPA: <strong style={{ color: '#1a56db' }}>{data.cgpa.toFixed(2)}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
