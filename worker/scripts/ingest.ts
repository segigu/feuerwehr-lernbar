/**
 * Ingest script: extracts German content from lessons + questions,
 * embeds via Cloudflare Workers AI, and inserts into Vectorize.
 *
 * Usage:
 *   CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_API_TOKEN=xxx npx tsx scripts/ingest.ts
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID  — your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN   — API token with Workers AI + Vectorize permissions
 */

import { lessons } from '../../webapp/src/data/lessons/index';
import catalogData from '../../webapp/src/data/mta_fragenkatalog.json';
import type { Block, Lesson, Section, LessonQuestion } from '../../webapp/src/data/lessons/types';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const VECTORIZE_INDEX = 'mta-lessons';
const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const BATCH_SIZE = 20; // Cloudflare embedding API batch limit

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars');
  process.exit(1);
}

// ─── Content extraction ───

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function extractBlockText(block: Block): string {
  switch (block.type) {
    case 'text':
      return stripHtml(block.de);
    case 'term':
      return `Begriff: ${stripHtml(block.de)}`;
    case 'key':
      return stripHtml(block.de);
    case 'warn':
      return `Wichtig: ${stripHtml(block.de)}`;
    case 'list':
      return block.items.map(item => `• ${stripHtml(item)}`).join('\n');
    case 'table': {
      const rows = block.rows.map(row =>
        block.headers.map((h, i) => `${h}: ${row[i] ?? ''}`).join(', ')
      );
      return rows.join('\n');
    }
    case 'image':
      return [block.alt, block.caption].filter(Boolean).join(' — ');
    default:
      return '';
  }
}

function extractSectionText(section: Section): string {
  return section.blocks.map(extractBlockText).filter(Boolean).join('\n\n');
}

interface ChunkData {
  id: string;
  text: string;
  metadata: Record<string, string>;
}

function chunksFromLesson(lesson: Lesson): ChunkData[] {
  const chunks: ChunkData[] = [];

  for (const section of lesson.sections) {
    const text = extractSectionText(section);
    if (!text.trim()) continue;

    chunks.push({
      id: `lesson-${lesson.id}-${section.id}`,
      text,
      metadata: {
        type: 'lesson',
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        sectionId: section.id,
        sectionTitle: section.title,
      },
    });
  }

  return chunks;
}

function chunksFromLessonQuestions(lesson: Lesson): ChunkData[] {
  return lesson.questions.map((q: LessonQuestion) => {
    const correctOption = q.options[q.correct];
    const text = [
      `Frage: ${q.question}`,
      `A: ${q.options.a}`,
      `B: ${q.options.b}`,
      `C: ${q.options.c}`,
      `Richtige Antwort: ${q.correct.toUpperCase()}) ${correctOption}`,
      q.explanation ? `Erklärung: ${stripHtml(q.explanation)}` : '',
    ].filter(Boolean).join('\n');

    return {
      id: `lq-${lesson.id}-${q.id}`,
      text,
      metadata: {
        type: 'question',
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        sectionId: q.sectionId ?? '',
        sectionTitle: q.topic,
      },
    };
  });
}

function chunksFromCatalog(): ChunkData[] {
  const questions = (catalogData as { questions: LessonQuestion[] }).questions;
  return questions.map((q) => {
    const correctOption = q.options[q.correct];
    const text = [
      `Frage: ${q.question}`,
      `A: ${q.options.a}`,
      `B: ${q.options.b}`,
      `C: ${q.options.c}`,
      `Richtige Antwort: ${q.correct.toUpperCase()}) ${correctOption}`,
      q.explanation ? `Erklärung: ${stripHtml(q.explanation)}` : '',
    ].filter(Boolean).join('\n');

    return {
      id: `cat-${q.id}`,
      text,
      metadata: {
        type: 'question',
        lessonId: '',
        lessonTitle: q.topic,
        sectionId: '',
        sectionTitle: q.topic,
      },
    };
  });
}

// ─── Cloudflare API ───

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts }),
    }
  );
  const json = await res.json() as { success: boolean; result: { data: number[][] }; errors?: unknown[] };
  if (!json.success) {
    throw new Error(`Embedding failed: ${JSON.stringify(json.errors)}`);
  }
  return json.result.data;
}

async function upsertVectors(vectors: { id: string; values: number[]; metadata: Record<string, string> }[]): Promise<void> {
  // Vectorize upsert via REST API uses NDJSON format
  const ndjson = vectors.map(v => JSON.stringify(v)).join('\n');

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${VECTORIZE_INDEX}/upsert`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjson,
    }
  );
  const json = await res.json() as { success: boolean; errors?: unknown[] };
  if (!json.success) {
    throw new Error(`Upsert failed: ${JSON.stringify(json.errors)}`);
  }
}

// ─── Main ───

async function main() {
  console.log('Extracting content from lessons...');

  const allChunks: ChunkData[] = [];

  // Lesson content
  for (const lesson of lessons) {
    const lessonChunks = chunksFromLesson(lesson);
    const questionChunks = chunksFromLessonQuestions(lesson);
    allChunks.push(...lessonChunks, ...questionChunks);
    console.log(`  ${lesson.title}: ${lessonChunks.length} sections, ${questionChunks.length} questions`);
  }

  // Catalog questions
  const catalogChunks = chunksFromCatalog();
  allChunks.push(...catalogChunks);
  console.log(`  Fragenkatalog: ${catalogChunks.length} questions`);

  console.log(`\nTotal chunks: ${allChunks.length}`);

  // Embed in batches
  console.log('\nEmbedding chunks...');
  const allVectors: { id: string; values: number[]; metadata: Record<string, string> }[] = [];

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.text.slice(0, 2000)); // Truncate very long chunks
    const embeddings = await embed(texts);

    for (let j = 0; j < batch.length; j++) {
      allVectors.push({
        id: batch[j].id,
        values: embeddings[j],
        metadata: {
          ...batch[j].metadata,
          text: batch[j].text.slice(0, 1000), // Store truncated text in metadata for context
        },
      });
    }

    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, allChunks.length)}/${allChunks.length}`);
  }

  // Upsert to Vectorize in batches of 100
  console.log('\nUpserting to Vectorize...');
  const UPSERT_BATCH = 100;
  for (let i = 0; i < allVectors.length; i += UPSERT_BATCH) {
    const batch = allVectors.slice(i, i + UPSERT_BATCH);
    await upsertVectors(batch);
    console.log(`  Upserted ${Math.min(i + UPSERT_BATCH, allVectors.length)}/${allVectors.length}`);
  }

  console.log('\nDone! All content indexed.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
