import { readFile } from 'node:fs/promises';
import { SnapshotSchema } from '../src/lib/snapshot-schema.ts';
const snapshot = SnapshotSchema.parse(
  JSON.parse(await readFile(new URL('../public/data/air-quality.json', import.meta.url), 'utf8')),
);
console.log(
  `Validated ${snapshot.cities.length} city snapshots with the same schema used by the browser.`,
);
