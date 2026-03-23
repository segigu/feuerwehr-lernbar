#!/usr/bin/env node
/**
 * Migration script: replace lesson question IDs with real catalog IDs,
 * remove custom questions, add missing catalog questions.
 *
 * Usage: node scripts/migrate-to-catalog-ids.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const CATALOG_PATH = 'webapp/src/data/mta_fragenkatalog.json';
const LESSONS_DIR = 'webapp/src/data/lessons';

// ── helpers ──

function normalize(s) {
  return s
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchCatalog(questionText, catalog, usedIds = null) {
  const norm = normalize(questionText);

  // 1. Exact full-text match
  const exact = catalog.find(q =>
    (!usedIds || !usedIds.has(q.id)) && normalize(q.question) === norm
  );
  if (exact) return exact;

  // 2. Full-text match ignoring trailing punctuation (…, ?, .)
  const normStripped = norm.replace(/[…?.,:;!\s]+$/, '');
  const stripped = catalog.find(q => {
    if (usedIds && usedIds.has(q.id)) return false;
    const cn = normalize(q.question).replace(/[…?.,:;!\s]+$/, '');
    return cn === normStripped;
  });
  if (stripped) return stripped;

  // 3. One contains the other (for truncated questions)
  const containMatch = catalog.find(q => {
    if (usedIds && usedIds.has(q.id)) return false;
    const cn = normalize(q.question);
    return (cn.startsWith(normStripped) || normStripped.startsWith(cn.replace(/[…?.,:;!\s]+$/, '')))
      && Math.abs(cn.length - norm.length) < 30;
  });
  if (containMatch) return containMatch;

  // 4. Long prefix match (at least 80% of shorter text)
  const minLen = Math.min(norm.length, 80);
  const threshold = Math.floor(minLen * 0.8);
  if (threshold >= 25) {
    const prefixMatch = catalog.find(q => {
      if (usedIds && usedIds.has(q.id)) return false;
      const cn = normalize(q.question);
      const prefLen = Math.min(norm.length, cn.length, 100);
      return norm.substring(0, prefLen) === cn.substring(0, prefLen);
    });
    if (prefixMatch) return prefixMatch;
  }

  return null;
}

/**
 * Parse the questions array from a lesson file.
 * Returns { startIndex, endIndex, questions[] }
 * Each question has all original fields as strings.
 */
function parseQuestionsArray(content) {
  // Find "questions: [" marker
  const marker = content.indexOf('questions: [');
  if (marker === -1) return null;

  const arrayStart = content.indexOf('[', marker);

  // Find matching ']' — track bracket depth
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) { arrayEnd = i; break; }
    }
  }
  if (arrayEnd === -1) return null;

  // Extract individual question objects
  const arrayContent = content.substring(arrayStart + 1, arrayEnd);
  const questions = [];

  // Find each top-level { ... } block
  let objDepth = 0;
  let objStart = -1;
  for (let i = 0; i < arrayContent.length; i++) {
    const ch = arrayContent[i];
    if (ch === '{' && objDepth === 0) {
      objStart = i;
      objDepth = 1;
    } else if (ch === '{') {
      objDepth++;
    } else if (ch === '}') {
      objDepth--;
      if (objDepth === 0 && objStart !== -1) {
        const objStr = arrayContent.substring(objStart, i + 1);
        questions.push(objStr);
        objStart = -1;
      }
    }
  }

  return {
    startIndex: arrayStart,
    endIndex: arrayEnd + 1,
    questionStrings: questions,
  };
}

/**
 * Extract a field value from a question object string.
 */
function extractField(objStr, fieldName) {
  // Handle multi-line string fields
  const patterns = [
    // Single-quoted string
    new RegExp(`${fieldName}:\\s*'([^']*(?:\\\\.[^']*)*)'`),
    // Double-quoted string
    new RegExp(`${fieldName}:\\s*"([^"]*(?:\\\\.[^"]*)*)"`),
    // Backtick string (for multi-line)
    new RegExp(`${fieldName}:\\s*\`([^\`]*)\``),
    // Number
    new RegExp(`${fieldName}:\\s*(\\d+)`),
    // null/undefined
    new RegExp(`${fieldName}:\\s*(null|undefined)`),
  ];

  for (const pat of patterns) {
    const m = objStr.match(pat);
    if (m) return m[1];
  }
  return null;
}

function extractId(objStr) {
  const m = objStr.match(/id:\s*(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function extractQuestionText(objStr) {
  // Handle question text that may contain quotes
  const m = objStr.match(/question:\s*'((?:[^'\\]|\\.|'(?=[^,}\s]))*?)'\s*[,}]/s) ||
            objStr.match(/question:\s*"((?:[^"\\]|\\.)*)"\s*[,}]/s) ||
            objStr.match(/question:\s*`([^`]*)`/s);
  return m ? m[1] : null;
}

// ── main ──

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const catalogQuestions = catalog.questions;

const lessonFiles = fs.readdirSync(LESSONS_DIR)
  .filter(f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts')
  .sort();

let totalRemoved = 0;
let totalKept = 0;
let totalAdded = 0;
const allMappedCatalogIds = new Set();
const report = [];

for (const file of lessonFiles) {
  const filePath = path.join(LESSONS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  const parsed = parseQuestionsArray(content);
  if (!parsed) {
    report.push(`${file}: ⚠️  Could not find questions array`);
    continue;
  }

  const kept = [];     // catalog questions to keep (with original formatting)
  const removed = [];  // custom questions removed
  const usedIdsInFile = new Set(); // prevent duplicate matches within same file

  for (const objStr of parsed.questionStrings) {
    const id = extractId(objStr);
    const qText = extractQuestionText(objStr);

    if (!qText) {
      // Try to match without proper parsing
      const rawMatch = objStr.match(/question:\s*['"`](.{20,}?)['"`]\s*,/s);
      if (rawMatch) {
        const catalogMatch = matchCatalog(rawMatch[1], catalogQuestions, usedIdsInFile);
        if (catalogMatch) {
          kept.push({ objStr, catalogId: catalogMatch.id, originalId: id });
          usedIdsInFile.add(catalogMatch.id);
          allMappedCatalogIds.add(catalogMatch.id);
          continue;
        }
      }
      removed.push(id);
      continue;
    }

    const catalogMatch = matchCatalog(qText, catalogQuestions, usedIdsInFile);
    if (catalogMatch) {
      kept.push({ objStr, catalogId: catalogMatch.id, originalId: id });
      usedIdsInFile.add(catalogMatch.id);
      allMappedCatalogIds.add(catalogMatch.id);
    } else {
      removed.push(id);
    }
  }

  // Sort kept questions by catalog ID
  kept.sort((a, b) => a.catalogId - b.catalogId);

  // Replace IDs in kept question strings
  const newQuestionStrings = kept.map(k => {
    // Replace the id field with the catalog ID
    return k.objStr.replace(/id:\s*\d+/, `id: ${k.catalogId}`);
  });

  // Build new array content
  let newArrayContent;
  if (newQuestionStrings.length === 0) {
    newArrayContent = '[]';
  } else {
    newArrayContent = '[\n' + newQuestionStrings.map(s => '    ' + s.trim()).join(',\n') + ',\n  ]';
  }

  // Replace in file
  const before = content.substring(0, parsed.startIndex);
  const after = content.substring(parsed.endIndex);
  const newContent = before + newArrayContent + after;

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }

  totalRemoved += removed.length;
  totalKept += kept.length;

  report.push(
    `${file.padEnd(32)} kept: ${kept.length.toString().padStart(2)}  removed: ${removed.length.toString().padStart(2)}  ` +
    `catalog IDs: ${kept.map(k => k.catalogId).join(', ')}`
  );
}

// ── Report missing catalog questions ──
const missingIds = [];
for (const q of catalogQuestions) {
  if (!allMappedCatalogIds.has(q.id)) {
    missingIds.push(q.id);
  }
}

console.log('=== MIGRATION REPORT ===');
console.log(DRY_RUN ? '(DRY RUN — no files modified)\n' : '\n');
for (const line of report) {
  console.log(line);
}
console.log(`\nTotal kept: ${totalKept}`);
console.log(`Total removed: ${totalRemoved}`);
console.log(`Total added: ${totalAdded}`);
console.log(`Missing from lessons: ${missingIds.length} → IDs: ${missingIds.join(', ')}`);
console.log(`\nCatalog coverage: ${allMappedCatalogIds.size} / ${catalogQuestions.length}`);
