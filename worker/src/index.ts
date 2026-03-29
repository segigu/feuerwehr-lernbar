import type { Env, AskRequest, AskResponse } from './types';
import { ask } from './rag';

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

    return json({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
