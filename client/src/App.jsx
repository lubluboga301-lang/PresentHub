import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import HomePage from './pages/HomePage.jsx'
import CasesPage from './pages/CasesPage.jsx'
import CaseOpenPage from './pages/CaseOpenPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import BottomNav from './components/BottomNav.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

export const AppContext = createContext(null)

const tg = window.Telegram?.WebApp

export function useApp() {
  return useContext(AppContext)
}

function getHeaders() {
  const initData = tg?.initData || ''
  const headers = { 'Content-Type': 'application/json' }
  if (initData) {
    headers['x-telegram-init-data'] = initData
  }
  return headers
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
    }
    authenticate()
  }, [])

  async function authenticate() {
    try {
      const initData = tg?.initData || ''
      const headers = getHeaders()

      const bodyData = {}
      if (initData) {
        bodyData.initData = initData
      } else {
        const userId = tg?.initDataUnsafe?.user?.id || 'guest_' + Math.floor(Math.random() * 1000000)
        bodyData.guestId = String(userId)
      }

      const { data } = await axios.post('/api/auth', bodyData, { headers })
      setUser(data.user)
    } catch (e) {
      console.error('Auth error:', e?.response?.status, e?.message)
      setError('Не удалось подключиться. Попробуй ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  function updateBalance(newBalance) {
    setUser(prev => ({ ...prev, balance: newBalance }))
  }

  if (loading) return <LoadingScreen />

  if (error) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center',
      background: 'linear-gradient(160deg, #0a0a1a 0%, #0d0b2e 40%, #0a0a1a 100%)'
    }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ color: '#EF4444', fontSize: 16, maxWidth: 280 }}>{error}</div>
      <button onClick={() => { setError(null); setLoading(true); authenticate() }} style={{
        background: 'linear-gradient(135deg, #6366f1, #8B5CF6)',
        color: 'white', border: 'none', borderRadius: 12,
        padding: '12px 24px', fontSize: 16, cursor: 'pointer'
      }}>
        🔄 Попробовать снова
      </button>
    </div>
  )

  return (
    <AppContext.Provider value={{ user, setUser, updateBalance }}>
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg, #0a0a1a 0%, #0d0b2e 40%, #150a2a 70%, #0a0a1a 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <BackgroundOrbs />
        <BrowserRouter>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }}>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/cases/:slug" element={<CaseOpenPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AnimatePresence>
          </div>
          <BottomNav />
        </BrowserRouter>
      </div>
    </AppContext.Provider>
  )
}

function BackgroundOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%', top: -100, left: -100,
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute', width: 350, height: 350,
        borderRadius: '50%', top: '30%', right: -100,
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        animation: 'float 10s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300,
        borderRadius: '50%', bottom: 100, left: '20%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
        animation: 'float 12s ease-in-out infinite'
      }} />
    </div>
  )
}
