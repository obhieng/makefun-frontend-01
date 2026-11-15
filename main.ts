import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const outputApp = join(outputRoot, 'app');
const outputShots = join(outputRoot, 'screenshots');

mkdirSync(outputRoot, { recursive: true });
rmSync(outputApp, { recursive: true, force: true });
rmSync(outputShots, { recursive: true, force: true });
cpSync(join(repositoryRoot, 'app'), outputApp, { recursive: true, force: true });
mkdirSync(outputShots, { recursive: true });
if (existsSync(join(repositoryRoot, 'screenshots'))) {
  cpSync(join(repositoryRoot, 'screenshots'), outputShots, { recursive: true, force: true });
}

const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
