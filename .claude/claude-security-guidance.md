# Security guidance for mta

## Secrets policy
- (TODO: список ключей проекта — Supabase, Anthropic, Mapbox, Telegram, OAuth)
- Не хардкодить; читать из .env / env vars; .env-файлы permissions 600

## Auth / RLS
- (TODO: какие endpoints какие права требуют; где Supabase RLS должна срабатывать)

## User input
- (TODO: где обрабатывается чужой ввод — формы, Telegram, файлы — правила санитизации)
