#!/usr/bin/env node
/**
 * Audit script: compares mta_fragenkatalog.json (source of truth)
 * against lesson files to find discrepancies in options/correct fields.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'mta_fragenkatalog.json'), 'utf8'));
const catalogQuestions = catalog.questions;

// Build lookup by question text (normalized)
function normalize(s) {
  return s.replace(/\s+/g, ' ').trim();
}

const catalogByText = new Map();
for (const q of catalogQuestions) {
  catalogByText.set(normalize(q.question), q);
}

// Extract questions from lesson TS files by parsing the text
const lessonsDir = join(ROOT, 'webapp/src/data/lessons');
const lessonFiles = readdirSync(lessonsDir).filter(f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts');

let totalDiscrepancies = 0;
let totalMatched = 0;
let totalCustom = 0;
const discrepanciesByFile = {};

for (const file of lessonFiles) {
  const content = readFileSync(join(lessonsDir, file), 'utf8');

  // Extract question objects using regex - find all { id: ..., question: '...', options: {...}, correct: '...' }
  // We need to find question blocks in the questions array
  const questionRegex = /\{\s*id:\s*(\d+),\s*\n?\s*question:\s*'([^']*(?:\\.[^']*)*)'/g;
  let match;
  const lessonQuestions = [];

  while ((match = questionRegex.exec(content)) !== null) {
    const id = parseInt(match[1]);
    const question = match[2].replace(/\\'/g, "'");
    const startPos = match.index;

    // Extract the full object by finding matching braces
    let braceCount = 0;
    let objStart = -1;
    let objEnd = -1;
    for (let i = startPos; i < content.length; i++) {
      if (content[i] === '{') {
        if (objStart === -1) objStart = i;
        braceCount++;
      } else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          objEnd = i + 1;
          break;
        }
      }
    }

    if (objStart === -1 || objEnd === -1) continue;

    const objText = content.substring(objStart, objEnd);

    // Extract options
    const optA = objText.match(/a:\s*'([^']*(?:\\.[^']*)*)'/);
    const optB = objText.match(/b:\s*'([^']*(?:\\.[^']*)*)'/);
    const optC = objText.match(/c:\s*'([^']*(?:\\.[^']*)*)'/);
    const correct = objText.match(/correct:\s*'([abc])'/);

    if (optA && optB && optC && correct) {
      lessonQuestions.push({
        id,
        question,
        options: {
          a: optA[1].replace(/\\'/g, "'"),
          b: optB[1].replace(/\\'/g, "'"),
          c: optC[1].replace(/\\'/g, "'"),
        },
        correct: correct[1],
      });
    }
  }

  const fileDiscrepancies = [];

  for (const lq of lessonQuestions) {
    const normQ = normalize(lq.question);
    const catQ = catalogByText.get(normQ);

    if (!catQ) {
      totalCustom++;
      continue;
    }

    totalMatched++;

    const issues = [];

    // Compare options
    for (const key of ['a', 'b', 'c']) {
      const catOpt = normalize(catQ.options[key]);
      const lesOpt = normalize(lq.options[key]);
      if (catOpt !== lesOpt) {
        issues.push(`  option ${key}: CATALOG="${catQ.options[key]}" vs LESSON="${lq.options[key]}"`);
      }
    }

    // Compare correct
    if (catQ.correct !== lq.correct) {
      issues.push(`  correct: CATALOG="${catQ.correct}" vs LESSON="${lq.correct}"`);
    }

    if (issues.length > 0) {
      totalDiscrepancies++;
      fileDiscrepancies.push({
        lessonId: lq.id,
        catalogId: catQ.id,
        question: lq.question.substring(0, 80),
        issues,
      });
    }
  }

  if (fileDiscrepancies.length > 0) {
    discrepanciesByFile[file] = fileDiscrepancies;
  }
}

// Report
console.log('=== QUIZ AUDIT REPORT ===\n');
console.log(`Catalog questions: ${catalogQuestions.length}`);
console.log(`Matched to lessons: ${totalMatched}`);
console.log(`Custom (not in catalog): ${totalCustom}`);
console.log(`DISCREPANCIES: ${totalDiscrepancies}\n`);

for (const [file, discs] of Object.entries(discrepanciesByFile)) {
  console.log(`\n--- ${file} (${discs.length} issues) ---`);
  for (const d of discs) {
    console.log(`\nLesson ID ${d.lessonId} / Catalog ID ${d.catalogId}: ${d.question}`);
    for (const issue of d.issues) {
      console.log(issue);
    }
  }
}

if (totalDiscrepancies === 0) {
  console.log('\n✅ ALL CATALOG QUESTIONS MATCH LESSON FILES');
} else {
  console.log(`\n❌ ${totalDiscrepancies} DISCREPANCIES FOUND - NEEDS FIXING`);
}
