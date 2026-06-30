//import dotenv from 'dotenv';
//dotenv.config();
import { Telegraf, Markup } from 'telegraf'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
})

const BOT_TOKEN = process.env.BOT_TOKEN
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://t.me/your_bot'
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean)

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not set!')
  process.exit(1)
}

const adminStates = new Map()

function isAdmin(userId) {
  return ADMIN_IDS.includes(String(userId))
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
    ['💰 Выдать GRAM', '🎁 Выдать подарок'],
    ['🚫 Заблокировать', '✅ Разблокировать'],
    ['✔️ Выдать галочку', '❌ Убрать галочку'],
    ['👑 Сделать админом', '🔱 Выдать владельца', '🧪 Выдать тестера'],
    ['❎ Убрать владельца', '🗑 Убрать тестера'],
    ['📊 Статистика', '👤 Инфо о юзере'],
    ['🚪 Выйти из админ панели']
  ]).resize()
}

function findUser(text) {
  const match = text.match(/(\d+)/)
  return match ? match[1] : null
}

const bot = new Telegraf(BOT_TOKEN)

bot.start(async (ctx) => {
  const user = ctx.from
  const name = user.first_name || 'Игрок'
  try {
    await pool.query(
      `INSERT INTO users (id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET username=$2, first_name=$3, last_name=$4`,
      [user.id, user.username || null, user.first_name || null, user.last_name || null]
    )
  } catch (e) { console.error('DB error on start:', e.message) }

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
    if (!ok) return ctx.reply('🚫 У тебя нет доступа к админ панели.')
    adminStates.delete(userId)
    return ctx.reply(
      `🛡️ <b>Добро пожаловать в админ панель!</b>\n\nВыбери действие:`,
      { parse_mode: 'HTML', ...adminKeyboard() }
    )
  }

  const ADMIN_BUTTONS = [
    '💰 выдать gram', '🎁 выдать подарок',
    '🚫 заблокировать', '✅ разблокировать',
    '✔️ выдать галочку', '❌ убрать галочку',
    '👑 сделать админом', '🔱 выдать владельца', '🧪 выдать тестера',
    '❎ убрать владельца', '🗑 убрать тестера',
    '📊 статистика', '👤 инфо о юзере',
    '🚪 выйти из админ панели'
  ]

  const hasState = adminStates.has(userId)
  const isAdminButton = ADMIN_BUTTONS.includes(text)
  if (!isAdminButton && !hasState) return

  const ok = await canAdmin(userId)
  if (!ok) return

  if (text === '🚪 выйти из админ панели') {
    adminStates.delete(userId)
    return ctx.reply('👋 Вышел из админ панели.', Markup.removeKeyboard())
  }

  if (text === '📊 статистика') {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as total_users,
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
    return ctx.reply('💰 Введи <b>ID пользователя</b>:', { parse_mode: 'HTML' })
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

  if (text === '🎁 выдать подарок') {
    const { rows: gifts } = await pool.query('SELECT id, name, emoji, rarity, value FROM nft_gifts ORDER BY value ASC')
    const list = gifts.map(g => `<code>${g.id}</code> ${g.emoji} <b>${g.name}</b> — ${g.rarity} — <b>${parseFloat(g.value).toFixed(0)} GRAM</b>`).join('\n')
    adminStates.set(userId, { action: 'give_gift_user_id' })
    return ctx.reply(`🎁 <b>Доступные подарки:</b>\n\n${list}\n\n👤 Введи <b>ID пользователя</b>:`, { parse_mode: 'HTML' })
  }

  if (text === '🔱 выдать владельца') {
    adminStates.set(userId, { action: 'set_owner' })
    return ctx.reply('🔱 Введи <b>ID пользователя</b> для выдачи статуса Владельца:', { parse_mode: 'HTML' })
  }

  if (text === '🧪 выдать тестера') {
    adminStates.set(userId, { action: 'set_tester' })
    return ctx.reply('🧪 Введи <b>ID пользователя</b> для выдачи статуса Тестера:', { parse_mode: 'HTML' })
  }

  if (text === '❎ убрать владельца') {
    adminStates.set(userId, { action: 'remove_owner' })
    return ctx.reply('❎ Введи <b>ID пользователя</b> для снятия статуса Владельца:', { parse_mode: 'HTML' })
  }

  if (text === '🗑 убрать тестера') {
    adminStates.set(userId, { action: 'remove_tester' })
    return ctx.reply('🗑 Введи <b>ID пользователя</b> для снятия статуса Тестера:', { parse_mode: 'HTML' })
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
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    adminStates.set(userId, { action: 'give_gram_amount', targetId })
    return ctx.reply(`💰 Сколько GRAM выдать пользователю <b>${targetId}</b>?`, { parse_mode: 'HTML' })
  }

  if (state.action === 'give_gram_amount') {
    const amount = parseFloat(rawText)
    if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Введи корректную сумму.')
    try {
      const { rows } = await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING first_name, username, balance', [amount, state.targetId])
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      await pool.query('INSERT INTO transactions (user_id, type, amount, description) VALUES ($1,$2,$3,$4)', [state.targetId, 'admin_grant', amount, `Выдано админом @${ctx.from.username || ctx.from.id}`])
      adminStates.delete(userId)
      const u = rows[0]
      return ctx.reply(`✅ Выдано <b>${amount} GRAM</b>\n💎 Новый баланс: <b>${parseFloat(u.balance).toFixed(0)} GRAM</b>`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'give_gift_user_id') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    const { rows: gifts } = await pool.query('SELECT id, name, emoji, rarity, value FROM nft_gifts ORDER BY value ASC')
    const list = gifts.map(g => `<code>${g.id}</code> ${g.emoji} <b>${g.name}</b> — ${g.rarity} — <b>${parseFloat(g.value).toFixed(0)} GRAM</b>`).join('\n')
    adminStates.set(userId, { action: 'give_gift_id', targetId })
    return ctx.reply(`👤 Пользователь: <b>${targetId}</b>\n\n🎁 <b>Подарки:</b>\n${list}\n\n✏️ Введи <b>ID подарка</b>:`, { parse_mode: 'HTML' })
  }

  if (state.action === 'give_gift_id') {
    const giftId = parseInt(rawText)
    if (isNaN(giftId)) return ctx.reply('❌ Введи числовой ID.')
    const { rows: giftRows } = await pool.query('SELECT id, name, emoji, rarity, value FROM nft_gifts WHERE id = $1', [giftId])
    if (!giftRows[0]) return ctx.reply('❌ Подарок не найден.')
    adminStates.set(userId, { action: 'give_gift_qty', targetId: state.targetId, giftId, gift: giftRows[0] })
    const g = giftRows[0]
    return ctx.reply(`✅ Выбран: ${g.emoji} <b>${g.name}</b> (${g.rarity}, ${parseFloat(g.value).toFixed(0)} GRAM)\n\n🔢 Сколько штук?`, { parse_mode: 'HTML' })
  }

  if (state.action === 'give_gift_qty') {
    const qty = parseInt(rawText)
    if (isNaN(qty) || qty <= 0 || qty > 100) return ctx.reply('❌ Введи число от 1 до 100.')
    try {
      const { rows: userRows } = await pool.query('SELECT first_name, username FROM users WHERE id = $1', [state.targetId])
      if (!userRows[0]) return ctx.reply('❌ Пользователь не найден.')
      for (let i = 0; i < qty; i++) {
        await pool.query('INSERT INTO user_inventory (user_id, gift_id) VALUES ($1, $2)', [state.targetId, state.giftId])
      }
      adminStates.delete(userId)
      const u = userRows[0]
      const g = state.gift
      return ctx.reply(`🎁 Выдано <b>${qty} шт.</b> ${g.emoji} <b>${g.name}</b>\n👤 ${u.first_name || ''}${u.username ? ' @' + u.username : ''}`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'block') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_blocked = TRUE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`🚫 <b>${rows[0].first_name || targetId}</b> заблокирован.`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'unblock') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_blocked = FALSE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`✅ <b>${rows[0].first_name || targetId}</b> разблокирован.`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'verify') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`✔️ Верификация выдана <b>${rows[0].first_name || targetId}</b>!`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'unverify') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_verified = FALSE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`❌ Верификация снята у <b>${rows[0].first_name || targetId}</b>.`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'make_admin') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_admin = TRUE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`👑 <b>${rows[0].first_name || targetId}</b> назначен администратором!`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'set_owner') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_owner = TRUE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`🔱 Статус <b>Владелец</b> выдан ${rows[0].first_name || targetId}!`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'set_tester') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_tester = TRUE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`🧪 Статус <b>Тестер</b> выдан ${rows[0].first_name || targetId}!`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'remove_owner') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_owner = FALSE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`❎ Статус Владельца снят у <b>${rows[0].first_name || targetId}</b>.`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'remove_tester') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('UPDATE users SET is_tester = FALSE WHERE id = $1 RETURNING first_name', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
      return ctx.reply(`🗑 Статус Тестера снят у <b>${rows[0].first_name || targetId}</b>.`, { parse_mode: 'HTML' })
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }

  if (state.action === 'user_info') {
    const targetId = findUser(rawText)
    if (!targetId) return ctx.reply('❌ Неверный ID.')
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [targetId])
      adminStates.delete(userId)
      if (!rows[0]) return ctx.reply('❌ Пользователь не найден.')
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
        `🔱 Владелец: ${u.is_owner ? 'Да' : 'Нет'}\n` +
        `🧪 Тестер: ${u.is_tester ? 'Да' : 'Нет'}\n` +
        `🚫 Заблокирован: ${u.is_blocked ? 'Да' : 'Нет'}\n` +
        `👑 Админ: ${u.is_admin ? 'Да' : 'Нет'}\n` +
        `📅 Зарегистрирован: ${new Date(u.created_at).toLocaleDateString('ru-RU')}`,
        { parse_mode: 'HTML' }
      )
    } catch (e) { return ctx.reply('❌ Ошибка: ' + e.message) }
  }
})

bot.telegram.deleteWebhook({ drop_pending_updates: true })
  .then(() => bot.launch({ dropPendingUpdates: true }))
  .then(() => console.log('🤖 Bot started!'))
  .catch(e => console.error('Launch error:', e.message))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
