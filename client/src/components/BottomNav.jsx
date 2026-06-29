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
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '8px 16px 20px',
      background: 'rgba(10, 10, 26, 0.8)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path ||
            (tab.path === '/cases' && location.pathname.startsWith('/cases'))
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '8px 20px', border: 'none',
                background: 'transparent', cursor: 'pointer', position: 'relative'
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                    border: '1px solid rgba(99,102,241,0.3)'
                  }}
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span style={{ fontSize: 22, position: 'relative', zIndex: 1 }}>{tab.icon}</span>
              <span style={{
                fontSize: 11, fontWeight: isActive ? 600 : 400,
                color: isActive ? '#6366f1' : 'rgba(255,255,255,0.4)',
                position: 'relative', zIndex: 1, transition: 'color 0.2s'
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
