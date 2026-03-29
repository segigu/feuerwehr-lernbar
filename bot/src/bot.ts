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

interface QAResponse {
  answer: string;
  sources: { lesson: string; section: string }[];
}

function formatAnswer(data: QAResponse): string {
  let reply = data.answer;
  if (data.sources.length > 0) {
    const srcList = data.sources.map(s => `• ${s.lesson} — ${s.section}`).join('\n');
    reply += `\n\n📚 <b>Quellen:</b>\n${srcList}`;
  }
  return reply;
}

async function askWorker(question: string): Promise<QAResponse> {
  const res = await fetch(`${qaWorkerUrl}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error('Worker unavailable');
  return (await res.json()) as QAResponse;
}

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
      const data = await askWorker(question);
      await ctx.reply(formatAnswer(data), { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('Entschuldigung, es ist ein Fehler aufgetreten. Versuche es später nochmal.');
    }
  });

  bot.on('message:voice', async (ctx) => {
    const voice = ctx.message.voice;

    if (voice.duration > 120) {
      await ctx.reply('Die Sprachnachricht ist zu lang (max. 2 Minuten). Bitte fasse deine Frage kürzer.');
      return;
    }

    await ctx.replyWithChatAction('typing');

    try {
      // 1. Download voice file from Telegram
      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) {
        await ctx.reply('Die Sprachnachricht konnte nicht heruntergeladen werden.');
        return;
      }
      const audioBuffer = await fileRes.arrayBuffer();

      // 2. Transcribe via worker
      const transcribeRes = await fetch(`${qaWorkerUrl}/api/transcribe`, {
        method: 'POST',
        body: audioBuffer,
      });

      if (!transcribeRes.ok) {
        await ctx.reply('Transkription fehlgeschlagen. Versuche es später nochmal.');
        return;
      }

      const { text, translatedText } = (await transcribeRes.json()) as { text: string; translatedText: string };

      // 3. Show transcribed text (+ translation if different)
      let transcriptMsg = `🎤 <i>${escapeHtml(text)}</i>`;
      if (translatedText !== text) {
        transcriptMsg += `\n🇩🇪 <i>${escapeHtml(translatedText)}</i>`;
      }
      await ctx.reply(transcriptMsg, { parse_mode: 'HTML' });

      // 4. Answer via RAG
      await ctx.replyWithChatAction('typing');
      const data = await askWorker(translatedText);
      await ctx.reply(formatAnswer(data), { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('Entschuldigung, es ist ein Fehler aufgetreten. Versuche es später nochmal.');
    }
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

bot.catch((err) => {
  console.error('Bot error:', err);
});

bot.start({
  onStart: () => console.log('Bot is running...'),
});
