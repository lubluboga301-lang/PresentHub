import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App.jsx'
import GramBadge from '../components/GramBadge.jsx'

export default function HomePage() {
  const { user } = useApp()
  const navigate = useNavigate()

  const name = user?.first_name || 'Игрок'
  const balance = parseFloat(user?.balance || 0)
  const opened = user?.total_cases_opened || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: '20px 16px', position: 'relative', zIndex: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 24
        }}
      >
        <div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Добро пожаловать,</p>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{name} 👋</h2>
        </div>
        <div
          onClick={() => navigate('/profile')}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
          }}
        >
          {name[0]?.toUpperCase() || '?'}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass"
        style={{
          padding: 24, marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
          border: '1px solid rgba(99,102,241,0.25)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent)',
          pointerEvents: 'none'
        }} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 8 }}>Твой баланс</p>
        <GramBadge amount={balance} size="lg" animated />
        <div style={{
          display: 'flex', gap: 16, marginTop: 20,
          paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <StatItem label="Кейсов открыто" value={opened} emoji="🎁" />
          <StatItem label="Редких находок" value={Math.floor(opened * 0.15)} emoji="💎" />
        </div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}
      >
        🔥 Популярные кейсы
      </motion.h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FEATURED_CASES.map((c, i) => (
          <motion.div
            key={c.slug}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.08 }}
            onClick={() => navigate(`/cases/${c.slug}`)}
            className="glass"
            style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              cursor: 'pointer', border: `1px solid ${c.borderColor}`,
              background: c.bgGradient, transition: 'transform 0.15s',
            }}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: c.iconBg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 28,
              boxShadow: `0 4px 20px ${c.glowColor}`
            }}>
              {c.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{c.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{c.desc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontSize: 16, fontWeight: 700,
                background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                {c.price}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>GRAM</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/cases')}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%', marginTop: 20, padding: '16px',
          background: 'linear-gradient(135deg, #6366f1, #8B5CF6)',
          border: 'none', borderRadius: 16, color: 'white',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(99,102,241,0.35)'
        }}
      >
        🎁 Все кейсы
      </motion.button>
    </motion.div>
  )
}

function StatItem({ label, value, emoji }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{emoji} {value}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  )
}

const FEATURED_CASES = [
  {
    slug: 'starter', name: 'Starter Case', desc: 'Идеально для начала',
    emoji: '🎁', price: 10,
    bgGradient: 'linear-gradient(135deg, rgba(107,114,128,0.1), rgba(156,163,175,0.05))',
    borderColor: 'rgba(156,163,175,0.2)',
    iconBg: 'linear-gradient(135deg, #4B5563, #6B7280)',
    glowColor: 'rgba(107,114,128,0.4)'
  },
  {
    slug: 'premium', name: 'Premium Case', desc: 'Для настоящих коллекционеров',
    emoji: '💎', price: 50,
    bgGradient: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.05))',
    borderColor: 'rgba(99,102,241,0.25)',
    iconBg: 'linear-gradient(135deg, #2563EB, #3B82F6)',
    glowColor: 'rgba(59,130,246,0.4)'
  },
  {
    slug: 'legendary', name: 'Legendary Case', desc: 'Легендарные NFT подарки',
    emoji: '👑', price: 200,
    bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.05))',
    borderColor: 'rgba(245,158,11,0.25)',
    iconBg: 'linear-gradient(135deg, #D97706, #F59E0B)',
    glowColor: 'rgba(245,158,11,0.4)'
  },
]
