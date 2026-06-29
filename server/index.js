import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Telegraf, Markup } from 'telegraf'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDB } from './db.js'
import pool from './db.js'
import apiRouter from './routes/api.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use('/api', apiRouter)
app.use(express.static(join(__dirname, 'public')))
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(join(__dirname, 'public', 'index.html'))
})

const BOT_TOKEN = process.env.BOT_TOKEN
const MINI_APP_URL = process.env.MINI_APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)

const adminSessions = new Set()
const adminStates = new Map()

function isAdmin(userId) {
  const id = String(userId)
  return ADMIN_IDS.includes(id)
}

async function isAdminDB(userId) {
  try {
    const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId])
    return rows[0]?.is_admin === true
  } catch { return false }
}

async function canAdmin(userId) {
  return isAdmin(userId) || await isAdminDB(userId)
}

function adminKeyboard() {
  return Markup.keyboard([
    ['💰 Выдать GRAM', '🚫 Заблокировать'],
    ['✅ Разблокировать', '✔️ Выдать галочку'],
    ['❌ Убрать галочку', '👑 Сделать админом'],
    ['📊 Статистика', '👤 Инфо о юзере'],
    ['🚪 Выйти из админ панели']
  ]).resize()
}

function findUser(text) {
  const match = text.match(/(\d+)/)
  return match ? match[1] : null
}

let bot = null

if (BOT_TOKEN) {
  bot = new Telegraf(BOT_TOKEN)

  bot.start(async (ctx) => {
    const user = ctx.from
    const name = user.first_name || 'Игрок'
    await ctx.reply(
      `👋 Привет, <b>${name}</b>!\n\n🎁 <b>NFT Cases</b> — открывай кейсы и выигрывай уникальные NFT подарки из Telegram!\n\n💎 Валюта: <b>GRAM</b>\n🎯 Стартовый баланс: <b>100 GRAM</b>\n\n✨ Нажми кнопку ниже, чтобы начать!`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🎮 Открыть NFT Cases', MINI_APP_URL)],
          [Markup.button.callback('📊 Мой профиль', 'profile')],
          [Markup.button.callback('❓ Помощь', 'help')]
        ])
      }
    )
  })

  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.reply('👤 Профиль доступен в Mini App!', Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Открыть NFT Cases', MINI_APP_URL)]
    ]))
  })

  bot.action('help', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.reply(
      `❓ <b>Как играть?</b>\n\n1️⃣ Открой Mini App кнопкой ниже\n2️⃣ Выбери кейс на свой вкус\n3️⃣ Трать GRAM и открывай кейсы\n4️⃣ Получай уникальные NFT подарки!\n\n💡 <b>Редкости:</b>\n⚪ Common — часто\n🟢 Uncommon — иногда\n🔵 Rare — редко\n🟣 Epic — очень редко\n🟡 Legendary — крайне редко\n🔴 Mythic — почти невозможно!`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.webApp('🎮 Играть', MINI_APP_URL)]])
      }
    )
  })

  bot.command('cases', async (ctx) => {
    await ctx.reply('🎁 Выбери кейс в Mini App!', Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Открыть кейсы', MINI_APP_URL)]
    ]))
  })

  bot.command('balance', async (ctx) => {
    await ctx.reply('💎 Проверь баланс в Mini App!', Markup.inlineKeyboard([
      [Markup.button.webApp('💼 Мой профиль', MINI_APP_URL)]
    ]))
  })

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim().toLowerCase()
    const userId = ctx.from.id

    if (text === 'войти в админ панель') {
      const ok = await canAdmin(userId)
      if (!ok) {
        return ctx.reply('🚫 У тебя нет доступа к админ панели.')
      }
      adminSessions.add(userId)
      adminStates.delete(userId)
      return ctx.reply(
        `🛡️ <b>Добро пожаловать в админ панель!</b>\n\nВыбери действие:`,
        { parse_mode: 'HTML', ...adminKeyboard() }
      )
    }

    if (!adminSessions.has(userId)) return

    if (text === '🚪 выйти из админ панели') {
      adminSessions.delete(userId)
      adminStates.delete(userId)
      return ctx.reply('👋 Вышел из админ панели.', Markup.removeKeyboard())
    }

    if (text === '📊 статистика') {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_blocked) as blocked,
          COUNT(*) FILTER (WHERE is_verified) as verified,
          SUM(balance) as total_balance,
          SUM(total_cases_opened) as total_opens
        FROM users
      `)
      const s = rows[0]
      return ctx.reply(
        `📊 <b>Статистика</b>\n\n👥 Всего юзеров: <b>${s.total_users}</b>\n🚫 Заблокировано: <b>${s.blocked}</b>\n✔️ Верифицировано: <b>${s.verified}</b>\n💎 GRAM в обороте: <b>${parseFloat(s.total_balance || 0).toFixed(0)}</b>\n🎁 Кейсов открыто: <b>${s.total_opens || 0}</b>`,
        { parse_mode: 'HTML' }
      )
    }

    if (text === '💰 выдать gram') {
      adminStates.set(userId, { action: 'give_gram_id' })
      return ctx.reply('💰 Введи <b>ID пользователя</b> (Telegram ID):', { parse_mode: 'HTML' })
    }

    if (text === '🚫 заблокировать') {
      adminStates.set(userId, { action: 'block' })
      return ctx.reply('🚫 Введи <b>ID пользователя</b> для блокировки:', { parse_mode: 'HTML' })
    }

    if (text === '✅ разблокировать') {
      adminStates.set(userId, { action: 'unblock' })
      return ctx.reply('✅ Введи <b>ID пользователя</b> для разблокировки:', { parse_mode: 'HTML' })
    }

    if (text === '✔️ выдать галочку') {
      adminStates.set(userId, { action: 'verify' })
      return ctx.reply('✔️ Введи <b>ID пользователя</b> для верификации:', { parse_mode: 'HTML' })
    }

    if (text === '❌ убрать галочку') {
      adminStates.set(userId, { action: 'unverify' })
      return ctx.reply('❌ Введи <b>ID пользователя</b> для снятия верификации:', { parse_mode: 'HTML' })
    }

    if (text === '👑 сделать админом') {
      adminStates.set(userId, { action: 'make_admin' })
      return ctx.reply('👑 Введи <b>ID пользователя</b> для назначения админом:', { parse_mode: 'HTML' })
    }

    if (text === '👤 инфо о юзере') {
      adminStates.set(userId, { action: 'user_info' })
      return ctx.reply('👤 Введи <b>ID пользователя</b>:', { parse_mode: 'HTML' })
    }

    const state = adminStates.get(userId)
    if (!state) return

    const rawText = ctx.message.text.trim()

    if (state.action === 'give_gram_id') {
      const targetId = findUser(rawText)
      if (!targetId) return ctx.reply('❌ Неверный ID. Введи числовой Telegram ID.')
      adminStates.set(userId, { action: 'give_gram_amount', targetId })
      return ctx.reply(`💰 Сколько GRAM выдать пользователю <b>${targetId}</b>?`, { parse_mode: 'HTML' })
    }

    if (state.action === 'give_gram_amount') {
      const amount = parseFloat(rawText)
      if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Введи корректную сумму (число больше 0).')
      try {
        const { rows } = await pool.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING first_name, username, balance',
          [amount, state.targetId]
        )
        if (!rows[0]) return ctx.reply('❌ Пользователь не найден в базе. Возможно, ещё не заходил в Mini App.')
        await pool.query(
          'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
          [state.targetId, 'admin_grant', amount, `Выдано админом @${ctx.from.username || ctx.from.id}`]
        )
        adminStates.delete(userId)
        const u = rows[0]
        return ctx.reply(
          `✅ Выдано <b>${amount} GRAM</b> пользователю ${u.first_name || ''} ${u.username ? '@' + u.username : '(#' + state.targetId + ')'}\n💎 Новый баланс: <b>${parseFloat(u.balance).toFixed(0)} GRAM</b>`,
          { parse_mode: 'HTML' }
        )
      } catch (e) {
        return ctx.reply('❌ Ошибка: ' + e.message)
      }
    }

    if (state.action === 'block') {
      const targetId = findUser(rawText)
      if (!targetId) return ctx.reply('❌ Неверный ID.')
      try {
        const { rows } = await pool.query(
          'UPDATE users SET is_blocked = TRUE WHERE id = $1 RETURNING first_name, username',
          [targetId]
        )
        adminStates.delete(userId)
        if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
        const u = rows[0]
        return ctx.reply(`🚫 Пользователь <b>${u.first_name || targetId}</b> заблокирован.`, { parse_mode: 'HTML' })
      } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
    }

    if (state.action === 'unblock') {
      const targetId = findUser(rawText)
      if (!targetId) return ctx.reply('❌ Неверный ID.')
      try {
        const { rows } = await pool.query(
          'UPDATE users SET is_blocked = FALSE WHERE id = $1 RETURNING first_name',
          [targetId]
        )
        adminStates.delete(userId)
        if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
        return ctx.reply(`✅ Пользователь <b>${rows[0].first_name || targetId}</b> разблокирован.`, { parse_mode: 'HTML' })
      } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
    }

    if (state.action === 'verify') {
      const targetId = findUser(rawText)
      if (!targetId) return ctx.reply('❌ Неверный ID.')
      try {
        const { rows } = await pool.query(
          'UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING first_name, username',
          [targetId]
        )
        adminStates.delete(userId)
        if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
        const u = rows[0]
        return ctx.reply(`✔️ Пользователь <b>${u.first_name || targetId}</b> верифицирован — галочка выдана!`, { parse_mode: 'HTML' })
      } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
    }

    if (state.action === 'unverify') {
      const targetId = findUser(rawText)
      if (!targetId) return ctx.reply('❌ Неверный ID.')
      try {
        const { rows } = await pool.query(
          'UPDATE users SET is_verified = FALSE WHERE id = $1 RETURNING first_name',
          [targetId]
        )
        adminStates.delete(userId)
        if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
        return ctx.reply(`❌ Верификация снята у пользователя <b>${rows[0].first_name || targetId}</b>.`, { parse_mode: 'HTML' })
      } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
    }

    if (state.action === 'make_admin') {
      const targetId = findUser(rawText)
      if (!targetId) return ctx.reply('❌ Неверный ID.')
      try {
        const { rows } = await pool.query(
          'UPDATE users SET is_admin = TRUE WHERE id = $1 RETURNING first_name, username',
          [targetId]
        )
        adminStates.delete(userId)
        if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
        const u = rows[0]
        return ctx.reply(`👑 Пользователь <b>${u.first_name || targetId}</b> назначен администратором!`, { parse_mode: 'HTML' })
      } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
    }

    if (state.action === 'user_info') {
      const targetId = findUser(rawText)
      if (!targetId) return ctx.reply('❌ Неверный ID.')
      try {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [targetId])
        adminStates.delete(userId)
        if (!rows[0]) return ctx.reply('❌ Пользователь не найден в базе.')
        const u = rows[0]
        const inv = await pool.query('SELECT COUNT(*) FROM user_inventory WHERE user_id = $1', [u.id])
        return ctx.reply(
          `👤 <b>Пользователь #${u.id}</b>\n\n` +
          `Имя: ${u.first_name || '—'} ${u.last_name || ''}\n` +
          `Username: ${u.username ? '@' + u.username : '—'}\n` +
          `💎 Баланс: <b>${parseFloat(u.balance).toFixed(0)} GRAM</b>\n` +
          `🎁 Кейсов открыто: <b>${u.total_cases_opened}</b>\n` +
          `🎒 Предметов в инвентаре: <b>${inv.rows[0].count}</b>\n` +
          `✔️ Верифицирован: ${u.is_verified ? 'Да' : 'Нет'}\n` +
          `🚫 Заблокирован: ${u.is_blocked ? 'Да' : 'Нет'}\n` +
          `👑 Админ: ${u.is_admin ? 'Да' : 'Нет'}\n` +
          `📅 Зарегистрирован: ${new Date(u.created_at).toLocaleDateString('ru-RU')}`,
          { parse_mode: 'HTML' }
        )
      } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
    }
  })

  bot.launch().then(() => console.log('🤖 Bot launched')).catch(console.error)

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
} else {
  console.warn('⚠️  BOT_TOKEN not set — bot disabled, API only mode')
}

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🌐 Mini App URL: ${MINI_APP_URL}`)
    if (ADMIN_IDS.length) console.log(`🛡️  Admins: ${ADMIN_IDS.join(', ')}`)
  })
}).catch(console.error)
