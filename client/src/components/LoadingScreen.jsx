import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0a0a1a 0%, #0d0b2e 40%, #150a2a 70%, #0a0a1a 100%)',
      gap: 24
    }}>
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 72 }}
      >
        🎁
      </motion.div>

      <div style={{ textAlign: 'center' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: 28, fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #8B5CF6, #EC4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 8
          }}
        >
          NFT Cases
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}
        >
          Загружаем твои кейсы...
        </motion.p>
      </div>

      <motion.div
        style={{
          width: 200, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.1)', overflow: 'hidden'
        }}
      >
        <motion.div
          animate={{ x: [-200, 200] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 100, height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, transparent, #6366f1, #8B5CF6, transparent)'
          }}
        />
      </motion.div>
    </div>
  )
}
