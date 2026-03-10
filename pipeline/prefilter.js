'use strict';

const fs = require('fs');
const path = require('path');

const TEXT_EXTENSIONS = new Set(['.js', '.html', '.htm']);

function stripSvg(text) {
  return text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
}

function stripStyles(text) {
  return text.replace(/<style[\s\S]*?<\/style>/gi, '');
}

function stripInlineStyles(text) {
  return text
    .replace(/\s*style\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*style\s*=\s*'[^']*'/gi, '');
}

function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function stripSvgPathData(text) {
  return text.replace(/\sd="[^"]*"/g, '');
}

function prefilter(text) {
  let result = text;
  result = stripSvg(result);
  result = stripStyles(result);
  result = stripComments(result);
  result = stripInlineStyles(result);
  result = stripSvgPathData(result);
  return result;
}

/**
 * Read all .js/.html files from a content folder,
 * apply pre-filter, return concatenated result.
 */
async function readContentFolder(folderPath) {
  const entries = await fs.promises.readdir(folderPath, { recursive: true });

  const textFiles = entries.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return TEXT_EXTENSIONS.has(ext);
  });

  let combined = '';
  for (const file of textFiles) {
    const fullPath = path.join(folderPath, file);
    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile()) continue;

    const raw = await fs.promises.readFile(fullPath, 'utf-8');
    const filtered = prefilter(raw);
    if (filtered.trim().length > 0) {
      combined += `\n--- ${file} ---\n${filtered}`;
    }
  }

  return {
    text: combined,
    charCount: combined.length,
    fileCount: textFiles.length,
  };
}

module.exports = {
  stripSvg,
  stripStyles,
  stripInlineStyles,
  stripComments,
  stripSvgPathData,
  prefilter,
  readContentFolder,
};
