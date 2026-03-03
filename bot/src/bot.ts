import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN is not set. Create a .env file with BOT_TOKEN=your_token');
  process.exit(1);
}

const webAppUrl = process.env.WEB_APP_URL;
if (!webAppUrl) {
  console.error('WEB_APP_URL is not set. Create a .env file with WEB_APP_URL=https://your-app-url');
  process.exit(1);
}

const bot = new Bot(token);

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('Prüfungstrainer öffnen', webAppUrl);

  await ctx.reply(
    'Willkommen beim MTA Prüfungstrainer!\n\n' +
    'Bereite dich auf die Zwischenprüfung des Basismoduls vor.\n' +
    '214 Fragen aus 12 Themengebieten.\n\n' +
    'Tippe auf den Button, um zu starten:',
    { reply_markup: keyboard }
  );
});

bot.catch((err) => {
  console.error('Bot error:', err);
});

bot.start({
  onStart: () => console.log('Bot is running...'),
});
