'use strict';

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'output');

function loadReport(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  return lines.map(line => JSON.parse(line));
}

function findReports() {
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith('report_') && f.endsWith('.jsonl'));
  // Group by model tag: report_<model>_<timestamp>.jsonl
  const byModel = {};
  for (const file of files) {
    const match = file.match(/^report_(.+?)_\d{4}-\d{2}-.+\.jsonl$/);
    if (!match) continue;
    const model = match[1];
    // Keep the latest report per model
    if (!byModel[model] || file > byModel[model]) {
      byModel[model] = file;
    }
  }
  return byModel;
}

function compare() {
  const reports = findReports();
  const models = Object.keys(reports);

  if (models.length < 2) {
    console.log('Need at least 2 model reports to compare.');
    console.log(`Found: ${models.length === 0 ? 'none' : models.join(', ')}`);
    console.log('\nRun the pipeline with different VLLM_MODEL values first.');
    console.log('Reports are saved to: pipeline/output/report_<model>_<timestamp>.jsonl');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  MODEL COMPARISON — ${models.length} models`);
  console.log(`${'='.repeat(80)}\n`);

  // Load all reports
  const data = {};
  for (const model of models) {
    data[model] = loadReport(path.join(outputDir, reports[model]));
    console.log(`  ${model}: ${reports[model]} (${data[model].length} entries)`);
  }
  console.log('');

  // Get all content IDs from the first model
  const ids = data[models[0]].map(r => r.id);

  // Print side-by-side comparison
  for (const id of ids) {
    console.log(`${'─'.repeat(80)}`);
    console.log(`  ${id}`);
    console.log(`${'─'.repeat(80)}`);

    for (const model of models) {
      const entry = data[model].find(r => r.id === id);
      if (!entry) {
        console.log(`  [${model}] (not found)`);
      } else if (entry.error) {
        console.log(`  [${model}] ERROR: ${entry.error}`);
      } else if (entry.flagged) {
        console.log(`  [${model}] FLAGGED: ${entry.reason}`);
      } else {
        console.log(`  [${model}]`);
        console.log(`    ${entry.summary}`);
      }
      console.log('');
    }
  }

  // Summary table
  console.log(`${'='.repeat(80)}`);
  console.log('  SUMMARY');
  console.log(`${'='.repeat(80)}\n`);

  const header = ['Content ID', ...models];
  console.log(`  ${header.join(' | ')}`);
  console.log(`  ${header.map(h => '-'.repeat(h.length)).join(' | ')}`);

  for (const id of ids) {
    const cols = [id];
    for (const model of models) {
      const entry = data[model].find(r => r.id === id);
      if (!entry) cols.push('N/A');
      else if (entry.error) cols.push('ERROR');
      else if (entry.flagged) cols.push('FLAGGED');
      else cols.push('OK');
    }
    console.log(`  ${cols.join(' | ')}`);
  }
  console.log('');

  // Save comparison as JSON
  const comparison = ids.map(id => {
    const row = { id };
    for (const model of models) {
      const entry = data[model].find(r => r.id === id);
      row[model] = entry ? (entry.summary || entry.error || entry.reason) : null;
    }
    return row;
  });

  const outPath = path.join(outputDir, 'comparison.json');
  fs.writeFileSync(outPath, JSON.stringify(comparison, null, 2));
  console.log(`Comparison saved to: ${outPath}\n`);
}

compare();
