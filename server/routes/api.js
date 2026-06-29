import express from 'express'
import crypto from 'crypto'
import pool from '../db.js'

const router = express.Router()

function verifyTelegramWebAppData(initData, botToken) {
  if (!botToken || !initData) return null
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null
    params.delete('hash')
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
    if (computedHash !== hash) return null
    const userStr = params.get('user')
    if (!userStr) return null
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

function parseUser(req) {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData
  const botToken = process.env.BOT_TOKEN

  if (initData && botToken) {
    const user = verifyTelegramWebAppData(initData, botToken)
    if (user && user.id) return user
  }

  const devId = req.headers['x-dev-user-id']
  if (devId) {
    return { id: parseInt(devId), first_name: 'Dev', username: 'devuser', last_name: '' }
  }

  const guestId = req.body?.guestId
  if (guestId) {
    const numId = parseInt(String(guestId).replace(/\D/g, '')) || Math.floor(Math.random() * 9000000 + 1000000)
    return { id: numId, first_name: 'Гость', username: null, last_name: '' }
  }

  return null
}

router.post('/auth', async (req, res) => {
  try {
    const tgUser = parseUser(req)
    if (!tgUser) return res.status(401).json({ error: 'Unauthorized' })

    const { rows } = await pool.query(
      `INSERT INTO users (id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         username = COALESCE(EXCLUDED.username, users.username),
         first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
         last_name = COALESCE(EXCLUDED.last_name, users.last_name)
       RETURNING *`,
      [tgUser.id, tgUser.username || null, tgUser.first_name || 'Игрок', tgUser.last_name || '']
    )

    res.json({ user: rows[0] })
  } catch (err) {
    console.error('Auth error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/profile', async (req, res) => {
  try {
    const tgUser = parseUser(req)
    if (!tgUser) return res.status(401).json({ error: 'Unauthorized' })

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [tgUser.id])
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })

    const { rows: inventory } = await pool.query(
      `SELECT ui.id, ui.obtained_at, g.name, g.emoji, g.rarity, g.value, g.color_from, g.color_to, c.name as case_name
       FROM user_inventory ui
       JOIN nft_gifts g ON g.id = ui.gift_id
       JOIN cases c ON c.id = ui.case_id
       WHERE ui.user_id = $1
       ORDER BY ui.obtained_at DESC
       LIMIT 50`,
      [tgUser.id]
    )

    const { rows: txRows } = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [tgUser.id]
    )

    res.json({ user: rows[0], inventory, transactions: txRows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/cases', async (req, res) => {
  try {
    const { rows: cases } = await pool.query(
      'SELECT * FROM cases WHERE is_active = TRUE ORDER BY price ASC'
    )

    for (const c of cases) {
      const { rows: gifts } = await pool.query(
        'SELECT * FROM nft_gifts WHERE case_id = $1 ORDER BY drop_chance DESC',
        [c.id]
      )
      c.gifts = gifts
    }

    res.json({ cases })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/cases/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cases WHERE slug = $1', [req.params.slug])
    if (!rows[0]) return res.status(404).json({ error: 'Case not found' })
    const c = rows[0]
    const { rows: gifts } = await pool.query(
      'SELECT * FROM nft_gifts WHERE case_id = $1 ORDER BY drop_chance DESC',
      [c.id]
    )
    c.gifts = gifts
    res.json({ case: c })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/cases/:slug/open', async (req, res) => {
  const client = await pool.connect()
  try {
    const tgUser = parseUser(req)
    if (!tgUser) return res.status(401).json({ error: 'Unauthorized' })

    await client.query('BEGIN')

    const { rows: users } = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [tgUser.id]
    )
    const user = users[0]
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { rows: cases } = await client.query(
      'SELECT * FROM cases WHERE slug = $1',
      [req.params.slug]
    )
    const caseData = cases[0]
    if (!caseData) return res.status(404).json({ error: 'Case not found' })

    if (parseFloat(user.balance) < parseFloat(caseData.price)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const { rows: gifts } = await client.query(
      'SELECT * FROM nft_gifts WHERE case_id = $1',
      [caseData.id]
    )

    const rand = Math.random() * 100
    let cumulative = 0
    let wonGift = gifts[gifts.length - 1]
    for (const g of gifts) {
      cumulative += parseFloat(g.drop_chance)
      if (rand <= cumulative) {
        wonGift = g
        break
      }
    }

    await client.query(
      'UPDATE users SET balance = balance - $1, total_cases_opened = total_cases_opened + 1 WHERE id = $2',
      [caseData.price, tgUser.id]
    )

    await client.query(
      'INSERT INTO user_inventory (user_id, gift_id, case_id) VALUES ($1, $2, $3)',
      [tgUser.id, wonGift.id, caseData.id]
    )

    await client.query(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [tgUser.id, 'case_open', -caseData.price, `Открытие кейса ${caseData.name}`]
    )

    const { rows: updated } = await client.query(
      'SELECT balance, total_cases_opened FROM users WHERE id = $1',
      [tgUser.id]
    )

    await client.query('COMMIT')

    res.json({
      gift: wonGift,
      newBalance: updated[0].balance,
      totalOpened: updated[0].total_cases_opened
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

router.post('/inventory/:id/sell', async (req, res) => {
  const client = await pool.connect()
  try {
    const tgUser = parseUser(req)
    if (!tgUser) return res.status(401).json({ error: 'Unauthorized' })

    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT ui.*, g.value, g.name FROM user_inventory ui
       JOIN nft_gifts g ON g.id = ui.gift_id
       WHERE ui.id = $1 AND ui.user_id = $2`,
      [req.params.id, tgUser.id]
    )

    if (!rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Item not found' })
    }

    const item = rows[0]
    const sellPrice = parseFloat(item.value) * 0.7

    await client.query('DELETE FROM user_inventory WHERE id = $1', [item.id])
    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [sellPrice, tgUser.id])
    await client.query(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [tgUser.id, 'sell', sellPrice, `Продажа ${item.name}`]
    )

    const { rows: updated } = await client.query('SELECT balance FROM users WHERE id = $1', [tgUser.id])

    await client.query('COMMIT')
    res.json({ newBalance: updated[0].balance, soldFor: sellPrice })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.username, u.first_name, u.last_name,
        u.balance, u.total_cases_opened, u.is_verified, u.is_admin, u.is_owner, u.is_tester,
        COALESCE(inv.total_value, 0) AS inventory_value,
        COALESCE(inv.item_count, 0) AS item_count
      FROM users u
      LEFT JOIN (
        SELECT ui.user_id, SUM(g.value) AS total_value, COUNT(*) AS item_count
        FROM user_inventory ui
        JOIN nft_gifts g ON g.id = ui.gift_id
        GROUP BY ui.user_id
      ) inv ON inv.user_id = u.id
      WHERE u.is_blocked = false
      ORDER BY u.total_cases_opened DESC, u.balance DESC
      LIMIT 50
    `)
    res.json({ leaders: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
