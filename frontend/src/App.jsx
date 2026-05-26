import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Leaderboard from './pages/Leaderboard'
import StudentProfile from './pages/StudentProfile'
import Analytics from './pages/Analytics'
import Courses from './pages/Courses'
import Search from './pages/Search'

export default function App() {
  const [page, setPage] = useState('leaderboard')
  const [selectedStudent, setSelectedStudent] = useState(null)

  function handleSelectStudent(matric_no) {
    setSelectedStudent(matric_no)
    setPage('profile')
  }

  function handleBack() {
    setSelectedStudent(null)
    setPage('leaderboard')
  }

  const contentMap = {
    leaderboard: <Leaderboard onSelectStudent={handleSelectStudent} />,
    profile: <StudentProfile matric_no={selectedStudent} onBack={handleBack} />,
    analytics: <Analytics />,
    courses: <Courses onSelectStudent={handleSelectStudent} />,
    search: <Search onSelectStudent={handleSelectStudent} />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page === 'profile' ? 'leaderboard' : page} setPage={p => { setSelectedStudent(null); setPage(p) }} />
      <main style={{
        marginLeft: 220,
        flex: 1,
        padding: '32px 36px',
        maxWidth: 1100,
        minHeight: '100vh'
      }}>
        {contentMap[page] || contentMap['leaderboard']}
      </main>
    </div>
  )
}
