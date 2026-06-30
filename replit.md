# NFT Cases — Telegram Mini App

A Telegram Mini App game where users open virtual cases to win NFT-themed gifts using GRAM (virtual currency).

## Architecture

- **Backend**: Express.js server (`server/index.js`) on port 5000
- **Frontend**: React + Vite SPA built into `server/public/`
- **Database**: Replit PostgreSQL (via `DATABASE_URL` secret)
- **Bot**: Telegraf-based Telegram bot (requires `BOT_TOKEN` secret)

## How to run

The workflow `Start application` runs `bash start.sh`, which:
1. Installs root + client dependencies
2. Builds the React frontend into `server/public/`
3. Starts the Express server on port 5000

## Environment variables / secrets

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | Replit PostgreSQL connection string (auto-set) |
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `ADMIN_IDS` | Comma-separated Telegram user IDs for admin panel |
| `MINI_APP_URL` | Public URL of the Mini App (defaults to Replit dev domain) |

## User preferences

- Keep all secrets in Replit's secret store — never hardcode tokens or keys
- The bot runs in webhook mode on Replit (uses `REPLIT_DEV_DOMAIN` automatically)
- Bot is optional: if `BOT_TOKEN` is not set, the server runs in API-only mode
