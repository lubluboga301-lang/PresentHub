import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Telegraf, Markup } from 'telegraf'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDB } from './db.js'
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

let bot = null

if (BOT_TOKEN) {
  bot = new Telegraf(BOT_TOKEN)

  bot.start(async (ctx) => {
    const user = ctx.from
    const name = user.first_name || 'Игрок'
    await ctx.replyWithPhoto(
      { url: 'https://telegra.ph/file/placeholder.png' },
      {
        caption: `👋 Привет, <b>${name}</b>!\n\n🎁 <b>NFT Cases</b> — открывай кейсы и выигрывай уникальные NFT подарки из Telegram!\n\n💎 Валюта: <b>GRAM</b>\n🎯 Стартовый баланс: <b>100 GRAM</b>\n\n✨ Нажми кнопку ниже, чтобы начать!`,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🎮 Открыть NFT Cases', MINI_APP_URL)],
          [Markup.button.callback('📊 Мой профиль', 'profile')],
          [Markup.button.callback('❓ Помощь', 'help')]
        ])
      }
    ).catch(() =>
      ctx.reply(
        `👋 Привет, <b>${name}</b>!\n\n🎁 <b>NFT Cases</b> — открывай кейсы и выигрывай уникальные NFT подарки!\n\n💎 Валюта: <b>GRAM</b>\n🎯 Стартовый баланс: <b>100 GRAM</b>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('🎮 Открыть NFT Cases', MINI_APP_URL)],
            [Markup.button.callback('❓ Помощь', 'help')]
          ])
        }
      )
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
  })
}).catch(console.error)
