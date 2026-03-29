import type { Env, AskRequest, AskResponse, TranscribeResponse } from './types';
import { ask, askStream } from './rag';
import { transcribe } from './transcribe';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/api/health') {
      return json({ status: 'ok' });
    }

    // Q&A endpoint
    if (url.pathname === '/api/ask' && request.method === 'POST') {
      try {
        const body = (await request.json()) as AskRequest;
        const question = body.question?.trim();

        if (!question) {
          return json({ error: 'question is required' }, 400);
        }

        if (question.length > 500) {
          return json({ error: 'question too long (max 500 chars)' }, 400);
        }

        const result: AskResponse = await ask(question, env);
        return json(result);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Internal error';
        return json({ error: message }, 500);
      }
    }

    // Streaming Q&A endpoint
    if (url.pathname === '/api/ask-stream' && request.method === 'POST') {
      try {
        const body = (await request.json()) as AskRequest;
        const question = body.question?.trim();

        if (!question) {
          return json({ error: 'question is required' }, 400);
        }

        if (question.length > 500) {
          return json({ error: 'question too long (max 500 chars)' }, 400);
        }

        const stream = await askStream(question, env);
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            ...CORS_HEADERS,
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Internal error';
        return json({ error: message }, 500);
      }
    }

    // Transcription endpoint
    if (url.pathname === '/api/transcribe' && request.method === 'POST') {
      try {
        const audioBuffer = await request.arrayBuffer();
        const result: TranscribeResponse = await transcribe(audioBuffer, env);
        return json(result);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Transcription failed';
        const status = message.includes('too large') || message.includes('Empty') ? 400 : 500;
        return json({ error: message }, status);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
