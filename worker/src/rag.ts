import type { Env, SearchResult, AskResponse } from './types';
import { buildPrompt, buildRefusalResponse } from './prompt';

const SIMILARITY_THRESHOLD = 0.35;
const TOP_K = 5;
const MAX_TOKENS = 400;

export async function ask(question: string, env: Env): Promise<AskResponse> {
  // 1. Embed the question
  const embeddingResponse = await env.AI.run(
    '@cf/baai/bge-m3' as Parameters<Ai['run']>[0],
    { text: [question] },
  ) as { data: number[][] };
  const queryVector = embeddingResponse.data[0];

  // 2. Search Vectorize for relevant chunks
  const vectorResults = await env.VECTORIZE.query(queryVector, {
    topK: TOP_K,
    returnMetadata: 'all',
  });

  // 3. Check similarity threshold
  const matches = vectorResults.matches.filter(m => m.score >= SIMILARITY_THRESHOLD);

  if (matches.length === 0) {
    return {
      answer: buildRefusalResponse(),
      sources: [],
    };
  }

  // 4. Build search results with chunk metadata
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

  // 5. Build grounded prompt and generate answer
  const prompt = buildPrompt(question, searchResults);

  const response = await env.AI.run(
    '@cf/meta/llama-3.1-8b-instruct' as Parameters<Ai['run']>[0],
    {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0,
    },
  ) as { response: string };

  // 6. Extract unique sources
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
    }));

  return {
    answer: response.response,
    sources,
  };
}
