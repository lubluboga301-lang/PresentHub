import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useApp } from '../App.jsx'

const tg = window.Telegram?.WebApp

function getHeaders() {
  const initData = tg?.initData || ''
  const headers = {}
  if (initData) headers['x-telegram-init-data'] = initData
  else headers['x-dev-user-id'] = '123456'
  return headers
}

const MEDAL = ['🥇', '🥈', '🥉']

const TABS = [
  { key: 'cases', label: '🎁 По кейсам' },
  { key: 'balance', label: '💎 По балансу' },
  { key: 'inventory', label: '📦 По инвентарю' },
]

export default function LeaderboardPage() {
  const { user } = useApp()
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('cases')

  useEffect(() => {
    axios.get('/api/leaderboard', { headers: getHeaders() })
      .then(r => setLeaders(r.data.leaders))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...leaders].sort((a, b) => {
    if (tab === 'cases') return b.total_cases_opened - a.total_cases_opened
    if (tab === 'balance') return b.balance - a.balance
    return b.inventory_value - a.inventory_value
  })

  const myRank = sorted.findIndex(l => String(l.id) === String(user?.id)) + 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: '20px 16px', position: 'relative', zIndex: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20, textAlign: 'center' }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>🏆 Топ игроков</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          {myRank > 0 ? `Твоё место: #${myRank}` : 'Открой кейс, чтобы попасть в топ'}
        </p>
      </motion.div>

      <div style={{
        display: 'flex', gap: 6, marginBottom: 20,
        background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 14
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer', borderRadius: 10,
              padding: '8px 4px', fontSize: 11, fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key
                ? 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.3))'
                : 'transparent',
              color: tab === t.key ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ fontSize: 32, display: 'inline-block' }}
          >⏳</motion.div>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>Загружаем топ...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏜️</div>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Пока никого нет</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((player, i) => {
            const isMe = String(player.id) === String(user?.id)
            const rank = i + 1
            const isMedal = rank <= 3

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="glass"
                style={{
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isMe
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.12))'
                    : isMedal
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.05))'
                    : 'rgba(255,255,255,0.04)',
                  border: isMe
                    ? '1px solid rgba(99,102,241,0.45)'
                    : isMedal
                    ? '1px solid rgba(245,158,11,0.25)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isMe && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, #6366f1, #8B5CF6, #EC4899)'
                  }} />
                )}

                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMedal ? 22 : 15, fontWeight: 800,
                  background: isMedal
                    ? 'transparent'
                    : 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  {isMedal ? MEDAL[rank - 1] : `#${rank}`}
                </div>

                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: player.is_admin
                    ? 'linear-gradient(135deg, #F59E0B, #EF4444)'
                    : 'linear-gradient(135deg, #6366f1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: 'white',
                  position: 'relative',
                  boxShadow: player.is_admin
                    ? '0 2px 12px rgba(245,158,11,0.5)'
                    : '0 2px 12px rgba(99,102,241,0.4)'
                }}>
                  {(player.first_name || player.username || '?')[0].toUpperCase()}
                  {player.is_verified && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, border: '1.5px solid #0d0b2e',
                      boxShadow: '0 0 8px rgba(59,130,246,0.7)'
                    }}>✔</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: isMe ? '#a5b4fc' : 'white',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {player.first_name || player.username || `User #${player.id}`}
                      {isMe && <span style={{ color: 'rgba(165,180,252,0.7)', fontWeight: 400 }}> (ты)</span>}
                    </span>
                    {player.is_verified && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 100, flexShrink: 0,
                        background: 'rgba(59,130,246,0.2)',
                        border: '1px solid rgba(59,130,246,0.4)', color: '#60A5FA', fontWeight: 600
                      }}>✔</span>
                    )}
                    {player.is_owner && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 100, flexShrink: 0,
                        background: 'rgba(251,191,36,0.25)',
                        border: '1px solid rgba(251,191,36,0.5)', color: '#FDE68A', fontWeight: 700,
                        boxShadow: '0 0 6px rgba(251,191,36,0.25)'
                      }}>🔱</span>
                    )}
                    {player.is_admin && !player.is_owner && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 100, flexShrink: 0,
                        background: 'rgba(245,158,11,0.2)',
                        border: '1px solid rgba(245,158,11,0.4)', color: '#FBBF24', fontWeight: 600
                      }}>👑</span>
                    )}
                    {player.is_tester && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 100, flexShrink: 0,
                        background: 'rgba(16,185,129,0.18)',
                        border: '1px solid rgba(16,185,129,0.4)', color: '#6EE7B7', fontWeight: 600
                      }}>🧪</span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', gap: 10, marginTop: 3,
                    fontSize: 12, color: 'rgba(255,255,255,0.45)'
                  }}>
                    <span>🎁 {player.total_cases_opened} кейсов</span>
                    <span>💎 {Number(player.balance).toFixed(0)} GRAM</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {tab === 'cases' && (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>{player.total_cases_opened}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>кейсов</div>
                    </>
                  )}
                  {tab === 'balance' && (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#6366f1' }}>{Number(player.balance).toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>GRAM</div>
                    </>
                  )}
                  {tab === 'inventory' && (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B' }}>{Number(player.inventory_value).toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>GRAM</div>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div style={{ height: 16 }} />
    </motion.div>
  )
}
