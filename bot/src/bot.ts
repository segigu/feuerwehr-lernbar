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

const qaWorkerUrl = process.env.QA_WORKER_URL ?? '';

const bot = new Bot(token);

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('Prüfungstrainer öffnen', webAppUrl);

  await ctx.reply(
    '🚒 Willkommen beim MTA Prüfungstrainer!\n\n' +
    '🎯 Bereite dich auf die Zwischenprüfung des Basismoduls vor\n' +
    '(Staatliche Feuerwehrschule Würzburg)\n\n' +
    '📚 Unterricht\n' +
    '12 Themen mit Lerninhalt, Quiz und Vokabeln\n\n' +
    '❓ Fragen & Prüfung\n' +
    '• Nach Thema — gezielt einzelne Gebiete üben\n' +
    '• Alle Fragen — 214 Fragen, Fortschritt wird gespeichert\n' +
    '• Prüfung — 50 zufällige Fragen mit 45-Minuten-Timer\n\n' +
    '👇 Tippe auf den Button, um zu starten:',
    { reply_markup: keyboard }
  );
});

// Q&A: answer text messages using the RAG worker
if (qaWorkerUrl) {
  bot.on('message:text', async (ctx) => {
    const question = ctx.message.text.trim();
    if (!question || question.startsWith('/')) return;

    await ctx.replyWithChatAction('typing');

    try {
      const res = await fetch(`${qaWorkerUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        await ctx.reply('Entschuldigung, der Lernassistent ist gerade nicht erreichbar. Versuche es später nochmal.');
        return;
      }

      const data = (await res.json()) as { answer: string; sources: { lesson: string; section: string }[] };

      let reply = data.answer;
      if (data.sources.length > 0) {
        const srcList = data.sources.map(s => `• ${s.lesson} — ${s.section}`).join('\n');
        reply += `\n\n📚 <b>Quellen:</b>\n${srcList}`;
      }

      await ctx.reply(reply, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('Entschuldigung, es ist ein Fehler aufgetreten. Versuche es später nochmal.');
    }
  });
}

bot.catch((err) => {
  console.error('Bot error:', err);
});

bot.start({
  onStart: () => console.log('Bot is running...'),
});
