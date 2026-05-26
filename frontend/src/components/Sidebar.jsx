const NAV = [
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'analytics',   label: 'Analytics',   icon: '📊' },
  { id: 'courses',     label: 'Courses',      icon: '📚' },
  { id: 'search',      label: 'Search',       icon: '🔍' },
]

export default function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      width: 220,
      background: '#fff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 10
    }}>
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)',
          borderRadius: 10,
          padding: '12px 14px',
        }}>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>CS 100L</p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Academic Tracker</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0 10px' }}>
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              fontWeight: page === n.id ? 600 : 400,
              background: page === n.id ? '#eff6ff' : 'transparent',
              color: page === n.id ? '#1a56db' : '#475569',
              marginBottom: 2,
              transition: 'all 0.15s',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9' }}>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>Session 2025/2026</p>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>100 Level · CS Dept</p>
      </div>
    </aside>
  )
}
