export function GradeBadge({ grade }) {
  const colors = {
    A: { bg: '#dcfce7', color: '#15803d' },
    B: { bg: '#dbeafe', color: '#1d4ed8' },
    C: { bg: '#fef9c3', color: '#a16207' },
    D: { bg: '#ffedd5', color: '#c2410c' },
    E: { bg: '#fee2e2', color: '#b91c1c' },
    F: { bg: '#fce7f3', color: '#9d174d' },
  }
  const c = colors[grade] || { bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontFamily: "'DM Mono', monospace",
      fontSize: 12,
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: 4,
      letterSpacing: '0.05em'
    }}>
      {grade}
    </span>
  )
}

export function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 18 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>
  return <span style={{ color: '#64748b', fontWeight: 500, fontSize: 14 }}>#{rank}</span>
}

export function CGPABar({ cgpa, max = 5 }) {
  const pct = (cgpa / max) * 100
  const color = cgpa >= 4.5 ? '#16a34a' : cgpa >= 3.5 ? '#2563eb' : cgpa >= 2.5 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#334155', minWidth: 32 }}>
        {cgpa.toFixed(2)}
      </span>
    </div>
  )
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '16px 20px',
      borderTop: accent ? `3px solid ${accent}` : undefined
    }}>
      <p style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#94a3b8' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
          <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite"/>
        </path>
      </svg>
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
      <p style={{ fontSize: 15 }}>{message}</p>
    </div>
  )
}
