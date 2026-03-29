import type { Env } from './types';

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

export async function transcribe(
  audioBuffer: ArrayBuffer,
  env: Env,
): Promise<{ text: string; translatedText: string }> {
  if (audioBuffer.byteLength === 0) {
    throw new Error('Empty audio data');
  }
  if (audioBuffer.byteLength > MAX_AUDIO_SIZE) {
    throw new Error('Audio too large (max 5 MB)');
  }

  // 1. Transcribe with Whisper
  const audioArray = Array.from(new Uint8Array(audioBuffer));

  const whisperResult = await env.AI.run(
    '@cf/openai/whisper' as Parameters<Ai['run']>[0],
    { audio: audioArray },
  ) as { text: string };

  const text = whisperResult.text?.trim();
  if (!text) {
    throw new Error('Transcription returned empty text');
  }

  // 2. Translate to German via Llama
  const translationResult = await env.AI.run(
    '@cf/meta/llama-3.1-8b-instruct' as Parameters<Ai['run']>[0],
    {
      messages: [{
        role: 'user',
        content: `Translate the following text to German. If it is already in German, return it unchanged. Return ONLY the translation, nothing else.\n\nText: ${text}`,
      }],
      max_tokens: 300,
      temperature: 0,
    },
  ) as { response: string };

  const translatedText = translationResult.response?.trim() || text;

  return { text, translatedText };
}
