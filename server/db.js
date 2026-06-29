import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      balance DECIMAL(18, 6) DEFAULT 100.0,
      total_cases_opened INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price DECIMAL(18, 6) NOT NULL,
      image_emoji TEXT,
      rarity TEXT DEFAULT 'common',
      is_active BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS nft_gifts (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES cases(id),
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      rarity TEXT NOT NULL,
      value DECIMAL(18, 6) NOT NULL,
      drop_chance DECIMAL(5,2) NOT NULL,
      color_from TEXT DEFAULT '#8B5CF6',
      color_to TEXT DEFAULT '#EC4899',
      telegram_gift_id TEXT
    );

    CREATE TABLE IF NOT EXISTS user_inventory (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id),
      gift_id INTEGER REFERENCES nft_gifts(id),
      obtained_at TIMESTAMP DEFAULT NOW(),
      case_id INTEGER REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id),
      type TEXT NOT NULL,
      amount DECIMAL(18, 6) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  const { rows: caseRows } = await pool.query('SELECT COUNT(*) FROM cases')
  if (parseInt(caseRows[0].count) === 0) {
    await seedData()
  }

  console.log('✅ Database initialized')
}

async function seedData() {
  const cases = [
    { name: 'Starter Case', slug: 'starter', description: 'Начни своё путешествие', price: 10, emoji: '🎁', rarity: 'common' },
    { name: 'Premium Case', slug: 'premium', description: 'Для настоящих коллекционеров', price: 50, emoji: '💎', rarity: 'rare' },
    { name: 'Legendary Case', slug: 'legendary', description: 'Легендарные NFT подарки', price: 200, emoji: '👑', rarity: 'legendary' },
    { name: 'Space Case', slug: 'space', description: 'Космические NFT из будущего', price: 100, emoji: '🚀', rarity: 'epic' },
  ]

  for (const c of cases) {
    const { rows } = await pool.query(
      'INSERT INTO cases (name, slug, description, price, image_emoji, rarity) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [c.name, c.slug, c.description, c.price, c.emoji, c.rarity]
    )
    const caseId = rows[0].id
    await seedGifts(caseId, c.slug)
  }
}

async function seedGifts(caseId, slug) {
  const giftSets = {
    starter: [
      { name: 'Durov\'s Cap', emoji: '🧢', rarity: 'common', value: 5, chance: 45, from: '#6B7280', to: '#9CA3AF' },
      { name: 'Love Potion', emoji: '🧪', rarity: 'common', value: 8, chance: 30, from: '#EC4899', to: '#F472B6' },
      { name: 'Crystal Ball', emoji: '🔮', rarity: 'uncommon', value: 15, chance: 15, from: '#8B5CF6', to: '#A78BFA' },
      { name: 'Golden Star', emoji: '⭐', rarity: 'rare', value: 40, chance: 7, from: '#F59E0B', to: '#FBBF24' },
      { name: 'Diamond Ring', emoji: '💍', rarity: 'legendary', value: 200, chance: 3, from: '#06B6D4', to: '#3B82F6' },
    ],
    premium: [
      { name: 'Flame Heart', emoji: '❤️‍🔥', rarity: 'uncommon', value: 30, chance: 40, from: '#EF4444', to: '#F97316' },
      { name: 'Cosmic Gem', emoji: '💎', rarity: 'uncommon', value: 45, chance: 25, from: '#3B82F6', to: '#8B5CF6' },
      { name: 'Thunder Badge', emoji: '⚡', rarity: 'rare', value: 80, chance: 20, from: '#EAB308', to: '#F59E0B' },
      { name: 'Magic Wand', emoji: '🪄', rarity: 'epic', value: 150, chance: 10, from: '#8B5CF6', to: '#EC4899' },
      { name: 'Infinity Cube', emoji: '🌀', rarity: 'legendary', value: 500, chance: 5, from: '#06B6D4', to: '#6366F1' },
    ],
    legendary: [
      { name: 'Dragon Scale', emoji: '🐉', rarity: 'rare', value: 120, chance: 35, from: '#EF4444', to: '#DC2626' },
      { name: 'Galaxy Token', emoji: '🌌', rarity: 'epic', value: 250, chance: 30, from: '#4F46E5', to: '#7C3AED' },
      { name: 'Phoenix Feather', emoji: '🦅', rarity: 'epic', value: 400, chance: 20, from: '#F97316', to: '#EF4444' },
      { name: 'Time Crystal', emoji: '⏳', rarity: 'legendary', value: 800, chance: 10, from: '#06B6D4', to: '#0EA5E9' },
      { name: 'Omnisphere', emoji: '🔱', rarity: 'mythic', value: 2000, chance: 5, from: '#F59E0B', to: '#EF4444' },
    ],
    space: [
      { name: 'Rocket Ship', emoji: '🚀', rarity: 'uncommon', value: 60, chance: 38, from: '#EF4444', to: '#F97316' },
      { name: 'Alien Pod', emoji: '🛸', rarity: 'rare', value: 100, chance: 28, from: '#10B981', to: '#06B6D4' },
      { name: 'Black Hole', emoji: '🕳️', rarity: 'epic', value: 200, chance: 18, from: '#1F2937', to: '#4B5563' },
      { name: 'Nebula Core', emoji: '🌠', rarity: 'legendary', value: 450, chance: 11, from: '#7C3AED', to: '#EC4899' },
      { name: 'Singularity', emoji: '✨', rarity: 'mythic', value: 1500, chance: 5, from: '#F59E0B', to: '#8B5CF6' },
    ]
  }

  const gifts = giftSets[slug] || giftSets.starter
  for (const g of gifts) {
    await pool.query(
      'INSERT INTO nft_gifts (case_id, name, emoji, rarity, value, drop_chance, color_from, color_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [caseId, g.name, g.emoji, g.rarity, g.value, g.chance, g.from, g.to]
    )
  }
}

export default pool
