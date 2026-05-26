import { useState, useEffect } from 'react'
import { api } from '../api'
import { StatCard, Spinner, EmptyState } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts'

const GRADE_COLORS = { A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#ea580c', E: '#dc2626', F: '#9d174d' }
const CLASS_COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#475569']

export default function Analytics() {
  const [data, setData] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.leaderboard('2025/2026', 100), api.courses()])
      .then(([lb, cs]) => {
        setData(lb)
        setCourses(cs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data || !data.leaderboard.length) return <EmptyState message="No data available." />

  const lb = data.leaderboard

  // GPA distribution buckets
  const buckets = [
    { label: '4.5 – 5.0', min: 4.5, max: 5.01, color: '#16a34a' },
    { label: '3.5 – 4.49', min: 3.5, max: 4.5, color: '#2563eb' },
    { label: '2.5 – 3.49', min: 2.5, max: 3.5, color: '#d97706' },
    { label: '1.5 – 2.49', min: 1.5, max: 2.5, color: '#ea580c' },
    { label: '0 – 1.49', min: 0, max: 1.5, color: '#dc2626' },
  ]
  const gpaDistData = buckets.map(b => ({
    label: b.label,
    count: lb.filter(s => s.cgpa >= b.min && s.cgpa < b.max).length,
    color: b.color
  }))

  // Grade distribution across all results
  const allResults = lb.flatMap(s => s.results || [])
  const gradeCount = allResults.reduce((acc, r) => {
    if (r.grade) acc[r.grade] = (acc[r.grade] || 0) + 1
    return acc
  }, {})
  const gradePieData = Object.entries(gradeCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([g, v]) => ({ name: g, value: v }))

  // Course average scores (only courses with score data)
  const courseAvgData = courses
    .map(c => {
      const results = allResults.filter(r => r.course_code === c.code && r.total_score !== null)
      if (!results.length) return null
      const avg = results.reduce((a, r) => a + r.total_score, 0) / results.length
      const passRate = results.filter(r => r.grade !== 'F' && r.grade !== 'E').length / results.length * 100
      return { course: c.code.replace('LAGCSC', 'CSC').replace('LAGCYB', 'CYB'), avg: parseFloat(avg.toFixed(1)), passRate: parseFloat(passRate.toFixed(1)), title: c.title }
    })
    .filter(Boolean)
    .sort((a, b) => a.avg - b.avg)

  // Pass/fail per course
  const coursePassFail = courseAvgData.map(c => {
    const results = allResults.filter(r => {
      const code = r.course_code.replace('LAGCSC', 'CSC').replace('LAGCYB', 'CYB')
      return code === c.course && r.total_score !== null
    })
    return {
      course: c.course,
      pass: results.filter(r => !['F'].includes(r.grade)).length,
      fail: results.filter(r => r.grade === 'F').length
    }
  })

  const atRisk = lb.filter(s => s.cgpa < 2.0).length
  const topTen = Math.ceil(lb.length * 0.1)
  const avgCgpa = lb.reduce((a, b) => a + b.cgpa, 0) / lb.length
  const hardest = courseAvgData[0]
  const easiest = courseAvgData[courseAvgData.length - 1]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Analytics</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Performance insights · Session 2025/2026 · 100 Level</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Class Average CGPA" value={avgCgpa.toFixed(2)} accent="#1a56db" />
        <StatCard label="Top 10% Threshold" value={lb[topTen - 1]?.cgpa.toFixed(2) ?? '–'} sub={`Top ${topTen} students`} accent="#16a34a" />
        <StatCard label="At-Risk Students" value={atRisk} sub="CGPA below 2.0" accent="#dc2626" />
        <StatCard label="Courses Tracked" value={courses.length} sub="1st semester" accent="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 16 }}>CGPA distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gpaDistData} margin={{ left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }} formatter={v => [v, 'Students']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {gpaDistData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Grade distribution (all results)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={gradePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={2}>
                {gradePieData.map((entry) => (
                  <Cell key={entry.name} fill={GRADE_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, `Grade ${n}`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Average score per course</h3>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
          Hardest: <strong style={{ color: '#dc2626' }}>{hardest?.course}</strong> ({hardest?.avg}) &nbsp;·&nbsp;
          Easiest: <strong style={{ color: '#16a34a' }}>{easiest?.course}</strong> ({easiest?.avg})
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={courseAvgData} margin={{ left: -20 }}>
            <XAxis dataKey="course" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(v, n) => [n === 'avg' ? `${v}/100` : `${v}%`, n === 'avg' ? 'Avg score' : 'Pass rate']}
              labelFormatter={(l) => courseAvgData.find(c => c.course === l)?.title || l}
            />
            <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} name="avg" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Pass vs fail per course</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={coursePassFail} margin={{ left: -20 }}>
            <XAxis dataKey="course" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="pass" fill="#16a34a" radius={[4, 4, 0, 0]} name="Passed" stackId="a" />
            <Bar dataKey="fail" fill="#dc2626" radius={[4, 4, 0, 0]} name="Failed" stackId="a" />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
