import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const tabs = [
  { path: '/', icon: '🏠', label: 'Главная' },
  { path: '/cases', icon: '🎁', label: 'Кейсы' },
  { path: '/profile', icon: '👤', label: 'Профиль' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 0, right: 0,
      display: 'flex', justifyContent: 'center',
      zIndex: 100, pointerEvents: 'none'
    }}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '8px 12px',
          background: 'rgba(15, 12, 35, 0.55)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.13)',
          borderRadius: 60,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
          pointerEvents: 'all'
        }}
      >
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path ||
            (tab.path === '/cases' && location.pathname.startsWith('/cases'))
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '8px 22px', border: 'none',
                background: 'transparent', cursor: 'pointer', position: 'relative',
                borderRadius: 50, transition: 'transform 0.15s'
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 50,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.25))',
                    border: '1px solid rgba(99,102,241,0.4)',
                    boxShadow: '0 0 20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
                  }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
                />
              )}
              <motion.span
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.3 }}
                style={{ fontSize: 20, position: 'relative', zIndex: 1, lineHeight: 1 }}
              >
                {tab.icon}
              </motion.span>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 400,
                color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                position: 'relative', zIndex: 1, transition: 'color 0.2s',
                letterSpacing: 0.3
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}
