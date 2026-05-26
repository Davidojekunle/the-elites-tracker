const BASE = '/api'

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  leaderboard: (session = '2025/2026', level = 100, semester = null) => {
    let url = `/leaderboard?session=${encodeURIComponent(session)}&level=${level}`
    if (semester) url += `&semester=${semester}`
    return get(url)
  },

  student: (matric_no) => get(`/student/${matric_no}`),

  courses: () => get('/courses'),

  analytics: async (session = '2025/2026', level = 100) => {
    const lb = await get(`/leaderboard?session=${encodeURIComponent(session)}&level=${level}`)
    return lb
  }
}
