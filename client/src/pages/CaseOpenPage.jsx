import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useApp } from '../App.jsx'
import GramBadge from '../components/GramBadge.jsx'

const tg = window.Telegram?.WebApp
const RARITY_LABELS = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
  epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic'
}

function getHeaders() {
  const initData = tg?.initData || ''
  const headers = {}
  if (initData) headers['x-telegram-init-data'] = initData
  else headers['x-dev-user-id'] = '123456'
  return headers
}

export default function CaseOpenPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, updateBalance } = useApp()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [wonGift, setWonGift] = useState(null)
  const [spinnerGifts, setSpinnerGifts] = useState([])
  const [spinOffset, setSpinOffset] = useState(0)
  const spinRef = useRef(null)

  useEffect(() => {
    axios.get(`/api/cases/${slug}`).then(r => {
      setCaseData(r.data.case)
      setLoading(false)
    }).catch(() => { setLoading(false); navigate('/cases') })
  }, [slug])

  async function openCase() {
    if (opening || !caseData) return
    const balance = parseFloat(user?.balance || 0)
    if (balance < parseFloat(caseData.price)) {
      tg?.showAlert?.('Недостаточно GRAM!')
      return
    }

    setOpening(true)
    setPhase('spinning')
    setWonGift(null)

    const gifts = caseData.gifts || []
    const pool = []
    gifts.forEach(g => {
      const count = Math.max(1, Math.round(g.drop_chance))
      for (let i = 0; i < count; i++) pool.push(g)
    })
    const deck = []
    for (let i = 0; i < 60; i++) deck.push(pool[Math.floor(Math.random() * pool.length)])
    setSpinnerGifts(deck)

    try {
      const { data } = await axios.post(`/api/cases/${slug}/open`, {}, { headers: getHeaders() })
      
      const targetGift = data.gift
      const targetIdx = 48
      deck[targetIdx] = targetGift
      setSpinnerGifts([...deck])

      const itemW = 110
      const visibleW = window.innerWidth - 32
      const targetPx = targetIdx * itemW - (visibleW / 2 - itemW / 2)

      setTimeout(() => {
        setSpinOffset(targetPx)
        setTimeout(() => {
          setPhase('reveal')
          setWonGift(targetGift)
          updateBalance(data.newBalance)
          if (tg) {
            tg.HapticFeedback?.notificationOccurred?.('success')
          }
        }, 4200)
      }, 100)
    } catch (e) {
      const msg = e.response?.data?.error || 'Ошибка при открытии'
      tg?.showAlert ? tg.showAlert(msg) : alert(msg)
      setPhase('idle')
      setOpening(false)
    }
  }

  function reset() {
    setPhase('idle')
    setOpening(false)
    setWonGift(null)
    setSpinnerGifts([])
    setSpinOffset(0)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 40 }}>🌀</motion.div>
    </div>
  )

  const canAfford = parseFloat(user?.balance || 0) >= parseFloat(caseData?.price || 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}
    >
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/cases')} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>←</button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{caseData?.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{caseData?.description}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase !== 'reveal' ? (
          <motion.div key="opening" style={{ padding: '24px 0' }}>
            <div style={{ position: 'relative', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {phase === 'idle' ? (
                <motion.div
                  animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ fontSize: 100 }}
                >
                  {caseData?.image_emoji}
                </motion.div>
              ) : (
                <>
                  <div style={{
                    position: 'absolute', left: '50%', top: 0, bottom: 0,
                    width: 3, background: 'linear-gradient(180deg, transparent, #6366f1, transparent)',
                    zIndex: 10, transform: 'translateX(-50%)',
                    boxShadow: '0 0 12px rgba(99,102,241,0.8)'
                  }} />
                  <div style={{ overflow: 'hidden', width: '100%' }}>
                    <motion.div
                      animate={{ x: -spinOffset }}
                      transition={{ duration: 4, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ display: 'flex', gap: 10, paddingLeft: 'calc(50% - 50px)', willChange: 'transform' }}
                    >
                      {spinnerGifts.map((g, i) => (
                        <div key={i} style={{
                          width: 100, height: 100, flexShrink: 0, borderRadius: 16,
                          background: `linear-gradient(135deg, ${g.color_from}33, ${g.color_to}22)`,
                          border: `2px solid ${g.color_from}55`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 44
                        }}>
                          {g.emoji}
                        </div>
                      ))}
                    </motion.div>
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '0 16px', marginBottom: 20 }}>
              <div className="glass" style={{
                padding: '12px 16px', marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Баланс</span>
                <GramBadge amount={parseFloat(user?.balance || 0)} size="sm" />
              </div>

              <motion.button
                onClick={phase === 'idle' ? openCase : undefined}
                disabled={!canAfford || phase !== 'idle'}
                whileTap={phase === 'idle' && canAfford ? { scale: 0.97 } : {}}
                style={{
                  width: '100%', padding: '18px',
                  background: phase === 'spinning'
                    ? 'rgba(99,102,241,0.3)'
                    : canAfford
                      ? 'linear-gradient(135deg, #6366f1, #8B5CF6)'
                      : 'rgba(255,255,255,0.05)',
                  border: 'none', borderRadius: 16, color: 'white',
                  fontSize: 17, fontWeight: 800, cursor: phase === 'idle' && canAfford ? 'pointer' : 'not-allowed',
                  boxShadow: canAfford && phase === 'idle' ? '0 8px 30px rgba(99,102,241,0.4)' : 'none',
                  transition: 'all 0.3s'
                }}
              >
                {phase === 'spinning'
                  ? '🎲 Открываем...'
                  : canAfford
                    ? `🎁 Открыть за ${caseData?.price} GRAM`
                    : `Не хватает ${(parseFloat(caseData?.price || 0) - parseFloat(user?.balance || 0)).toFixed(0)} GRAM`}
              </motion.button>
            </div>

            <div style={{ padding: '0 16px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Содержимое кейса</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {caseData?.gifts?.map(g => (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${g.color_from}15, ${g.color_to}08)`,
                    border: `1px solid ${g.color_from}30`
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(135deg, ${g.color_from}, ${g.color_to})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, boxShadow: `0 4px 12px ${g.color_from}50`
                    }}>
                      {g.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        {RARITY_LABELS[g.rarity] || g.rarity}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: '#F59E0B'
                      }}>{parseFloat(g.value).toFixed(0)} GRAM</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{g.drop_chance}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <WinReveal gift={wonGift} onClose={reset} onOpenAgain={reset} canAfford={canAfford} balance={parseFloat(user?.balance || 0)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function WinReveal({ gift, onClose, onOpenAgain, canAfford, balance }) {
  const navigate = useNavigate()
  const { user } = useApp()

  if (!gift) return null

  return (
    <motion.div
      key="reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)', padding: 24
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
        style={{ marginBottom: 24, position: 'relative' }}
      >
        <div style={{
          width: 160, height: 160, borderRadius: 32,
          background: `linear-gradient(135deg, ${gift.color_from}, ${gift.color_to})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 80, boxShadow: `0 0 60px ${gift.color_from}80, 0 0 120px ${gift.color_from}40`,
        }}>
          {gift.emoji}
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: -12, borderRadius: 44,
            border: `2px solid ${gift.color_from}60`,
            borderTopColor: 'transparent'
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <div style={{
          display: 'inline-block', padding: '4px 16px', borderRadius: 100,
          background: `linear-gradient(135deg, ${gift.color_from}, ${gift.color_to})`,
          fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 12
        }}>
          {RARITY_LABELS[gift.rarity] || gift.rarity} NFT
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{gift.name}</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 16 }}>
          Ты получил NFT подарок из Telegram!
        </p>
        <GramBadge amount={parseFloat(gift.value)} size="md" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {canAfford && (
          <button
            onClick={onOpenAgain}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #6366f1, #8B5CF6)',
              border: 'none', borderRadius: 14, color: 'white',
              fontSize: 16, fontWeight: 700, cursor: 'pointer'
            }}
          >
            🎲 Открыть ещё раз
          </button>
        )}
        <button
          onClick={() => navigate('/profile')}
          style={{
            width: '100%', padding: '16px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer'
          }}
        >
          👤 Посмотреть инвентарь
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px',
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer'
          }}
        >
          Закрыть
        </button>
      </motion.div>
    </motion.div>
  )
}
