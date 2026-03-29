import type { Env, SearchResult, AskResponse } from './types';
import { buildPrompt, buildRefusalResponse } from './prompt';

const SIMILARITY_THRESHOLD = 0.35;
const TOP_K = 5;
const MAX_TOKENS = 800;

interface Source {
  lesson: string;
  section: string;
  lessonId: string;
  sectionId: string;
}

const LLM_REFUSAL_MARKERS = [
  'ich mach nur MTA',
  'nur über MTA-Themen',
  'nur MTA-Prüfung',
  'nur MTA-Stoff',
  'zurück zum Lehrmaterial',
  'zum Metzger gehst',
  'ned amol der Hydrant',
  'kann nur Fragen zum MTA',
  'nicht mit der Feuerwehrausbildung',
  'nur Fragen zur MTA',
  'nur über MTA',
  'kann dir nur',
  'nicht im Lehrmaterial',
];

function isLlmRefusal(text: string): boolean {
  return LLM_REFUSAL_MARKERS.some(m => text.includes(m));
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function searchContext(question: string, env: Env): Promise<{ prompt: string; sources: Source[] } | null> {
  const embeddingResponse = await env.AI.run(
    '@cf/baai/bge-m3' as Parameters<Ai['run']>[0],
    { text: [question] },
  ) as { data: number[][] };
  const queryVector = embeddingResponse.data[0];

  const vectorResults = await env.VECTORIZE.query(queryVector, {
    topK: TOP_K,
    returnMetadata: 'all',
  });

  const matches = vectorResults.matches.filter(m => m.score >= SIMILARITY_THRESHOLD);

  if (matches.length === 0) return null;

  const searchResults: SearchResult[] = matches.map(m => ({
    chunk: {
      id: m.id,
      lessonId: (m.metadata?.lessonId as string) ?? '',
      sectionId: (m.metadata?.sectionId as string) ?? '',
      sectionTitle: (m.metadata?.sectionTitle as string) ?? '',
      lessonTitle: (m.metadata?.lessonTitle as string) ?? '',
      text: (m.metadata?.text as string) ?? '',
      type: (m.metadata?.type as 'lesson' | 'question') ?? 'lesson',
    },
    score: m.score,
  }));

  const prompt = buildPrompt(question, searchResults);

  const seen = new Set<string>();
  const sources = searchResults
    .filter(r => {
      const key = `${r.chunk.lessonTitle}::${r.chunk.sectionTitle}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(r => ({
      lesson: r.chunk.lessonTitle,
      section: r.chunk.sectionTitle,
      lessonId: r.chunk.lessonId,
      sectionId: r.chunk.sectionId,
    }));

  return { prompt, sources };
}

export async function ask(question: string, env: Env): Promise<AskResponse> {
  const ctx = await searchContext(question, env);

  if (!ctx) {
    return { answer: buildRefusalResponse(), sources: [], isRefusal: true };
  }

  const response = await env.AI.run(
    '@cf/meta/llama-3.1-8b-instruct' as Parameters<Ai['run']>[0],
    {
      messages: [{ role: 'user', content: ctx.prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0,
    },
  ) as { response: string };

  if (isLlmRefusal(response.response)) {
    return { answer: buildRefusalResponse(), sources: [], isRefusal: true };
  }

  return { answer: response.response, sources: ctx.sources };
}

export async function askStream(question: string, env: Env): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  const ctx = await searchContext(question, env);

  if (!ctx) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseEvent({
          type: 'done',
          content: buildRefusalResponse(),
          sources: [],
          isRefusal: true,
        })));
        controller.close();
      },
    });
  }

  const aiStream = await env.AI.run(
    '@cf/meta/llama-3.1-8b-instruct' as Parameters<Ai['run']>[0],
    {
      messages: [{ role: 'user', content: ctx.prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0,
      stream: true,
    },
  ) as ReadableStream;

  const sources = ctx.sources;

  return new ReadableStream({
    async start(controller) {
      const reader = aiStream.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop()!;

          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as { response?: string };
              if (parsed.response) {
                fullContent += parsed.response;
                controller.enqueue(encoder.encode(sseEvent({
                  type: 'token',
                  content: parsed.response,
                })));
              }
            } catch { /* skip malformed */ }
          }
        }

        if (isLlmRefusal(fullContent)) {
          controller.enqueue(encoder.encode(sseEvent({
            type: 'done',
            content: buildRefusalResponse(),
            sources: [],
            isRefusal: true,
          })));
        } else {
          controller.enqueue(encoder.encode(sseEvent({
            type: 'done',
            content: fullContent,
            sources,
          })));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Streaming error';
        controller.enqueue(encoder.encode(sseEvent({
          type: 'error',
          content: message,
        })));
      } finally {
        controller.close();
      }
    },
  });
}
