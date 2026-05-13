# Ziyod AI Bot

Telegram uchun ChatGPT kabi universal AI yordamchi boti - o'zbek tilida.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Telegram bot (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (conversations + messages tables)
- AI: OpenAI gpt-5.4 via Replit AI Integrations
- Telegram: node-telegram-bot-api (polling mode)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/bot/index.ts` — all Telegram bot logic
- `artifacts/api-server/src/index.ts` — server entry, imports bot
- `lib/db/src/schema/` — conversations + messages Drizzle schema
- `lib/integrations-openai-ai-server/` — OpenAI client lib

## Architecture decisions

- Bot runs inside the same Express process (imported in index.ts), no separate process needed
- Conversation history stored in-memory per chat ID (Map), not in DB — fast and stateless, resets on restart
- Religious keyword filter catches 20+ keywords and redirects to 1171
- All commands handled via bot.onText regex, general messages via bot.on("message")
- No markdown at all — system prompt explicitly forbids **, ##, etc.

## Product

- /start — welcome message with command list
- /imkoniyatlar — capabilities list
- /viktorina — random quiz question (AI-generated)
- /latifa — Uzbek joke (AI-generated)
- /kurs — approximate currency rates
- /bugun — today's date and time
- /togirla [text] — Uzbek text grammar correction
- /rezyume — resume creation assistant
- /xat — formal letter writing assistant
- /goya — business idea generator for Uzbekistan
- /reset — clear conversation history

## User preferences

- Never use markdown: no **, ##, *, _, backticks in bot responses
- Never add sources/links unless user specifically asks "manba ko'rsat"
- Never mention Islam/religion unless user asks — respond with 1171 number
- Never reference islom.uz
- Conversation memory persists per session using in-memory Map

## Gotchas

- Bot uses polling mode — only one instance should run at a time
- The bot's system prompt is injected as the first message in each user's history
- /togirla command requires inline text: /togirla [text]
