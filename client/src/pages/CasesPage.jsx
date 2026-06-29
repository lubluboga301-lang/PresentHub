import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import GramBadge from '../components/GramBadge.jsx'
import { useApp } from '../App.jsx'

const RARITY_COLORS = {
  common: { from: '#4B5563', to: '#6B7280', label: 'Common', border: 'rgba(107,114,128,0.3)' },
  uncommon: { from: '#059669', to: '#10B981', label: 'Uncommon', border: 'rgba(16,185,129,0.3)' },
  rare: { from: '#2563EB', to: '#3B82F6', label: 'Rare', border: 'rgba(59,130,246,0.3)' },
  epic: { from: '#7C3AED', to: '#8B5CF6', label: 'Epic', border: 'rgba(139,92,246,0.3)' },
  legendary: { from: '#D97706', to: '#F59E0B', label: 'Legendary', border: 'rgba(245,158,11,0.35)' },
}

export default function CasesPage() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('/api/cases').then(r => {
      setCases(r.data.cases)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 40 }}>🌀</motion.div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: '20px 16px', position: 'relative', zIndex: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20 }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>🎁 Кейсы</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Открывай и получай NFT подарки из Telegram</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass"
        style={{
          padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)'
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Твой баланс</span>
        <GramBadge amount={parseFloat(user?.balance || 0)} size="sm" />
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cases.map((c, i) => {
          const rarity = RARITY_COLORS[c.rarity] || RARITY_COLORS.common
          const canAfford = parseFloat(user?.balance || 0) >= parseFloat(c.price)
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => navigate(`/cases/${c.slug}`)}
              style={{ cursor: 'pointer' }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{
                borderRadius: 20, overflow: 'hidden',
                border: `1px solid ${rarity.border}`,
                background: `linear-gradient(135deg, rgba(${hexToRgb(rarity.from)},0.1), rgba(0,0,0,0.3))`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}>
                <div style={{
                  height: 140, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', position: 'relative',
                  background: `linear-gradient(135deg, ${rarity.from}22, ${rarity.to}11)`
                }}>
                  <motion.div
                    animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    style={{ fontSize: 70 }}
                  >
                    {c.image_emoji}
                  </motion.div>
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    padding: '4px 12px', borderRadius: 100,
                    background: `linear-gradient(135deg, ${rarity.from}, ${rarity.to})`,
                    fontSize: 11, fontWeight: 700, color: 'white'
                  }}>
                    {rarity.label}
                  </div>
                  {!canAfford && (
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      padding: '4px 10px', borderRadius: 100,
                      background: 'rgba(239,68,68,0.3)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      fontSize: 10, fontWeight: 600, color: '#FCA5A5'
                    }}>
                      Не хватает
                    </div>
                  )}
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{c.name}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{c.description}</p>
                    </div>
                    <GramBadge amount={parseFloat(c.price)} size="sm" />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>Возможные дропы:</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.gifts?.slice(0, 5).map(g => (
                        <div key={g.id} style={{
                          padding: '4px 10px', borderRadius: 100,
                          background: `linear-gradient(135deg, ${g.color_from}33, ${g.color_to}22)`,
                          border: `1px solid ${g.color_from}44`,
                          fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <span>{g.emoji}</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{g.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button style={{
                    width: '100%', padding: '12px',
                    background: canAfford
                      ? `linear-gradient(135deg, ${rarity.from}, ${rarity.to})`
                      : 'rgba(255,255,255,0.05)',
                    border: canAfford ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: canAfford ? 'white' : 'rgba(255,255,255,0.3)',
                    fontSize: 15, fontWeight: 700, cursor: canAfford ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}>
                    {canAfford ? `🎲 Открыть за ${c.price} GRAM` : `Нужно ещё ${(parseFloat(c.price) - parseFloat(user?.balance || 0)).toFixed(0)} GRAM`}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}` : '99,102,241'
}
