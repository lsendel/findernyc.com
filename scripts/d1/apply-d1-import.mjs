import { DEFAULT_IMPORT_SQL_PATH } from './lib.mjs';
import { runProcess } from '../agents/lib.mjs';

const sqlPath = process.env.D1_IMPORT_SQL_PATH ?? DEFAULT_IMPORT_SQL_PATH;
const binding = process.env.D1_BINDING ?? 'DB';
const preview = process.env.D1_PREVIEW === '1';

const args = ['wrangler', 'd1', 'execute', binding, '--remote', '--file', sqlPath, '--yes'];
if (preview) {
  args.push('--preview');
}

const result = runProcess('npx', args);

if (!result.success) {
  if (result.stdout) console.error(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(result.code || 1);
}

if (result.stdout) console.log(result.stdout);
console.log(`Applied D1 import SQL from ${sqlPath}${preview ? ' to preview' : ''}.`);
