import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useApp } from '../App.jsx'
import GramBadge from '../components/GramBadge.jsx'

const tg = window.Telegram?.WebApp

function getHeaders() {
  const initData = tg?.initData || ''
  const headers = {}
  if (initData) headers['x-telegram-init-data'] = initData
  else headers['x-dev-user-id'] = '123456'
  return headers
}

const RARITY_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common']
const RARITY_COLORS = {
  common: { from: '#4B5563', to: '#6B7280' },
  uncommon: { from: '#059669', to: '#10B981' },
  rare: { from: '#2563EB', to: '#3B82F6' },
  epic: { from: '#7C3AED', to: '#8B5CF6' },
  legendary: { from: '#D97706', to: '#F59E0B' },
  mythic: { from: '#DC2626', to: '#EF4444' },
}

export default function ProfilePage() {
  const { user, updateBalance } = useApp()
  const [tab, setTab] = useState('inventory')
  const [inventory, setInventory] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selling, setSelling] = useState(null)

  useEffect(() => {
    axios.get('/api/profile', { headers: getHeaders() }).then(r => {
      setInventory(r.data.inventory)
      setTransactions(r.data.transactions)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function sellItem(item) {
    if (selling) return
    setSelling(item.id)
    try {
      const { data } = await axios.post(`/api/inventory/${item.id}/sell`, {}, { headers: getHeaders() })
      setInventory(prev => prev.filter(i => i.id !== item.id))
      updateBalance(data.newBalance)
      tg?.HapticFeedback?.notificationOccurred?.('success')
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка продажи')
    } finally {
      setSelling(null)
    }
  }

  const name = user?.first_name || 'Игрок'
  const balance = parseFloat(user?.balance || 0)
  const inventoryValue = inventory.reduce((sum, i) => sum + parseFloat(i.value), 0)
  const isVerified = user?.is_verified
  const isBlocked = user?.is_blocked
  const isAdmin = user?.is_admin
  const isOwner = user?.is_owner
  const isTester = user?.is_tester

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: '20px 16px', position: 'relative', zIndex: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ marginBottom: 20 }}
      >
        <div className="glass" style={{
          padding: 24,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
          border: '1px solid rgba(99,102,241,0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: isAdmin
                  ? 'linear-gradient(135deg, #F59E0B, #EF4444)'
                  : 'linear-gradient(135deg, #6366f1, #8B5CF6, #EC4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: 'white',
                boxShadow: isAdmin
                  ? '0 4px 20px rgba(245,158,11,0.6)'
                  : '0 4px 20px rgba(99,102,241,0.5)'
              }}>
                {name[0]?.toUpperCase()}
              </div>
              {isVerified && (
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, border: '2px solid #0d0b2e',
                  boxShadow: '0 0 10px rgba(59,130,246,0.6)'
                }}>✔</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{name}</h2>
                {isVerified && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.15))',
                    border: '1px solid rgba(59,130,246,0.4)', color: '#60A5FA', fontWeight: 600
                  }}>✔ Верифицирован</span>
                )}
                {isOwner && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.2))',
                    border: '1px solid rgba(251,191,36,0.55)', color: '#FDE68A', fontWeight: 700,
                    boxShadow: '0 0 8px rgba(251,191,36,0.3)'
                  }}>🔱 Владелец</span>
                )}
                {isAdmin && !isOwner && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))',
                    border: '1px solid rgba(245,158,11,0.4)', color: '#FBBF24', fontWeight: 600
                  }}>👑 Админ</span>
                )}
                {isTester && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.15))',
                    border: '1px solid rgba(16,185,129,0.4)', color: '#6EE7B7', fontWeight: 600
                  }}>🧪 Тестер</span>
                )}
              </div>
              {user?.username && (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>@{user.username}</p>
              )}
              {isBlocked && (
                <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>🚫 Аккаунт заблокирован</p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <StatCard label="Баланс" value={`${balance.toFixed(0)}`} sub="GRAM" color="#6366f1" />
            <StatCard label="Открыто" value={user?.total_cases_opened || 0} sub="кейсов" color="#10B981" />
            <StatCard label="Инвентарь" value={`${inventoryValue.toFixed(0)}`} sub="GRAM" color="#F59E0B" />
          </div>
        </div>
      </motion.div>

      <div style={{
        display: 'flex', gap: 8, marginBottom: 20,
        background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 14
      }}>
        {[
          { key: 'inventory', label: '🎒 Инвентарь' },
          { key: 'history', label: '📋 История' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px',
              background: tab === t.key ? 'linear-gradient(135deg, #6366f1, #8B5CF6)' : 'transparent',
              border: 'none', borderRadius: 10, color: 'white',
              fontSize: 14, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 32, display: 'inline-block' }}>🌀</motion.div>
        </div>
      ) : tab === 'inventory' ? (
        <InventoryTab inventory={inventory} onSell={sellItem} selling={selling} />
      ) : (
        <HistoryTab transactions={transactions} />
      )}
    </motion.div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      padding: '12px', borderRadius: 14, textAlign: 'center',
      background: `${color}15`, border: `1px solid ${color}30`
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{sub}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function InventoryTab({ inventory, onSell, selling }) {
  if (!inventory.length) return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎒</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Инвентарь пуст</h3>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Открывай кейсы и получай NFT подарки!</p>
    </div>
  )

  const sorted = [...inventory].sort((a, b) =>
    RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <AnimatePresence>
        {sorted.map((item, i) => {
          const colors = RARITY_COLORS[item.rarity] || RARITY_COLORS.common
          const sellPrice = (parseFloat(item.value) * 0.7).toFixed(0)
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: i * 0.04 }}
              style={{
                borderRadius: 16, overflow: 'hidden',
                background: `linear-gradient(135deg, ${colors.from}20, ${colors.to}10)`,
                border: `1px solid ${colors.from}40`
              }}
            >
              <div style={{
                height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${colors.from}30, ${colors.to}15)`,
                fontSize: 44
              }}>
                {item.emoji}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>{item.name}</div>
                <div style={{
                  fontSize: 10, marginBottom: 8,
                  color: colors.to
                }}>
                  {item.rarity?.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginBottom: 8 }}>
                  {parseFloat(item.value).toFixed(0)} GRAM
                </div>
                <button
                  onClick={() => onSell(item)}
                  disabled={selling === item.id}
                  style={{
                    width: '100%', padding: '7px 0',
                    background: selling === item.id ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 8, color: '#10B981',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {selling === item.id ? '...' : `Продать ${sellPrice} GRAM`}
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function HistoryTab({ transactions }) {
  if (!transactions.length) return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>История пуста</h3>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Транзакции появятся после первого открытия кейса</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {transactions.map((tx, i) => {
        const isPositive = parseFloat(tx.amount) > 0
        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass"
            style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: isPositive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
            }}>
              {tx.type === 'case_open' ? '🎁' : tx.type === 'sell' ? '💰' : '💎'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{tx.description}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {new Date(tx.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: isPositive ? '#10B981' : '#EF4444'
            }}>
              {isPositive ? '+' : ''}{parseFloat(tx.amount).toFixed(0)} GRAM
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
