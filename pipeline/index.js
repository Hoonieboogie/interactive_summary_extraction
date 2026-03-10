'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { readContentFolder } = require('./prefilter');
const { synthesize } = require('./synthesizer');

const LOW_TEXT_THRESHOLD = 100;

function getModelTag() {
  const model = process.env.VLLM_MODEL || 'Qwen/Qwen3.5-35B-A3B';
  return model.split('/').pop();
}

async function processOne(folderPath) {
  const id = path.basename(folderPath);
  console.log(`[${id}] Reading and pre-filtering...`);

  const { text, charCount, fileCount } = await readContentFolder(folderPath);
  console.log(`[${id}] ${fileCount} files → ${(charCount / 1024).toFixed(1)} KB after pre-filter`);

  if (charCount < LOW_TEXT_THRESHOLD) {
    console.log(`[${id}] FLAGGED: < ${LOW_TEXT_THRESHOLD} chars (likely image-heavy)`);
    return {
      id,
      summary: null,
      flagged: true,
      reason: 'low_text_content',
      metadata: { extractedAt: new Date().toISOString(), charCount, fileCount, pipeline: 'v5.0' },
    };
  }

  console.log(`[${id}] Sending to LLM...`);
  const result = await synthesize(text);

  if (result.error) {
    console.log(`[${id}] ERROR: ${result.error}`);
    return {
      id,
      summary: null,
      error: result.error,
      raw: result.raw,
      metadata: { extractedAt: new Date().toISOString(), charCount, fileCount, pipeline: 'v5.0' },
    };
  }

  console.log(`[${id}] OK`);
  return {
    id,
    model: process.env.VLLM_MODEL || 'Qwen/Qwen3.5-35B-A3B',
    summary: result.summary,
    metadata: { extractedAt: new Date().toISOString(), charCount, fileCount, pipeline: 'v5.0' },
  };
}

async function processBatch(baseDir) {
  const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
  const folders = entries.filter(e => e.isDirectory()).map(e => path.join(baseDir, e.name));

  console.log(`Found ${folders.length} content folders in ${baseDir}\n`);

  const outputDir = path.join(__dirname, 'output');
  await fs.promises.mkdir(outputDir, { recursive: true });

  const tag = getModelTag();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `report_${tag}_${timestamp}.jsonl`);
  const stream = fs.createWriteStream(outputPath, { flags: 'a' });

  let processed = 0;
  let errors = 0;
  let flagged = 0;
  const concurrency = parseInt(process.env.CONCURRENCY, 10) || 1;

  for (let i = 0; i < folders.length; i += concurrency) {
    const batch = folders.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(f => processOne(f).catch(err => ({
      id: path.basename(f),
      summary: null,
      error: err.message,
      metadata: { extractedAt: new Date().toISOString(), pipeline: 'v5.0' },
    }))));

    for (const result of results) {
      stream.write(JSON.stringify(result) + '\n');
      processed++;
      if (result.error) errors++;
      if (result.flagged) flagged++;
    }

    console.log(`\nProgress: ${processed}/${folders.length} (errors: ${errors}, flagged: ${flagged})\n`);
  }

  stream.end();
  console.log(`Done. Report saved to: ${outputPath}`);
  console.log(`Total: ${processed} | Errors: ${errors} | Flagged: ${flagged}`);
}

async function main() {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.log('Usage:');
    console.log('  node index.js <content-folder>       Process single folder');
    console.log('  node index.js <parent-directory>      Process all subfolders');
    process.exit(1);
  }

  const resolved = path.resolve(targetPath);
  const stat = await fs.promises.stat(resolved);

  if (!stat.isDirectory()) {
    console.error(`Not a directory: ${resolved}`);
    process.exit(1);
  }

  // Check if this is a content folder (has .js or .html files) or a parent directory
  const files = await fs.promises.readdir(resolved);
  const hasContentFiles = files.some(f => f.endsWith('.js') || f.endsWith('.html'));

  if (hasContentFiles) {
    // Single content folder
    const result = await processOne(resolved);
    const outputDir = path.join(__dirname, 'output');
    await fs.promises.mkdir(outputDir, { recursive: true });
    const tag = getModelTag();
    const outputPath = path.join(outputDir, `${result.id}_${tag}.json`);
    await fs.promises.writeFile(outputPath, JSON.stringify(result, null, 2));
    console.log(`\nResult saved to: ${outputPath}`);
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Parent directory — batch process all subfolders
    await processBatch(resolved);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
