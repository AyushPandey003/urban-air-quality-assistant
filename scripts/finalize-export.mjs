import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const output = process.env.NEXT_DIST_DIR || 'out';
await access(join(output, 'index.html'));
let inspected = 0;
async function verifyDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await verifyDirectory(path);
      continue;
    }
    if (!['.html', '.js', '.mjs', '.map', '.json', '.txt', '.css'].includes(extname(path)))
      continue;
    let text = await readFile(path, 'utf8');
    const key = process.env.OPENAQ_API_KEY;
    if (key && text.includes(key))
      throw new Error('A credential was detected in the static export. Publication blocked.');
    if (/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/.test(text))
      throw new Error('A possible GitHub credential was detected. Publication blocked.');
    if (extname(path) === '.html') {
      const hashes = [...text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
        (match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`,
      );
      const policy = [
        "default-src 'self'",
        `script-src 'self' 'wasm-unsafe-eval' ${[...new Set(hashes)].join(' ')}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.cartocdn.com",
        "connect-src 'self' https://*.cartocdn.com",
        "worker-src 'self' blob:",
        "font-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
      text = text.replace(
        '<head>',
        `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="strict-origin-when-cross-origin">`,
      );
      await writeFile(path, text);
    }
    inspected++;
  }
}
await verifyDirectory(output);
await writeFile(join(output, '.nojekyll'), '');
console.log(
  `Static site ready in ${output}/; ${inspected} files checked for credentials, HTML protected with hashed-script CSP.`,
);
