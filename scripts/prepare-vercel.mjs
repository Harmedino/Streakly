import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = process.argv[2] ?? 'client/dist/streakly/browser';
const html = (await readFile(root + '/index.html', 'utf8')).replace(
  '<head>',
  '<head><meta name="streakly-backend" content="required">',
);
const manifest = JSON.parse(await readFile(root + '/ngsw.json', 'utf8'));
manifest.hashTable['/index.html'] = createHash('sha1').update(html).digest('hex');
await writeFile(root + '/index.html', html);
await writeFile(root + '/ngsw.json', JSON.stringify(manifest));
console.log(
  'Prepared Vercel client shell and service-worker manifest for the separate Express API.',
);
