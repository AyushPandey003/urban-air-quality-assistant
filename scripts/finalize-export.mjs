import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
const output = process.env.NEXT_DIST_DIR || 'out';
await access(join(output, 'index.html'));
await writeFile(join(output, '.nojekyll'), '');
console.log(`Static site ready in ${output}/`);
