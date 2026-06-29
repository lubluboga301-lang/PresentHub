import { motion } from 'framer-motion'

export default function GramBadge({ amount, size = 'md', animated = false }) {
  const sizes = {
    sm: { fontSize: 13, padding: '4px 10px', iconSize: 14 },
    md: { fontSize: 16, padding: '6px 14px', iconSize: 18 },
    lg: { fontSize: 22, padding: '10px 20px', iconSize: 24 },
    xl: { fontSize: 32, padding: '14px 28px', iconSize: 32 }
  }
  const s = sizes[size] || sizes.md
  const display = typeof amount === 'number'
    ? amount % 1 === 0 ? amount.toLocaleString() : parseFloat(amount).toFixed(2)
    : amount

  return (
    <motion.div
      animate={animated ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: s.padding,
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1))',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 100,
        backdropFilter: 'blur(10px)'
      }}
    >
      <span style={{ fontSize: s.iconSize, lineHeight: 1 }}>💎</span>
      <span style={{
        fontSize: s.fontSize, fontWeight: 700,
        background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
      }}>
        {display} GRAM
      </span>
    </motion.div>
  )
}
