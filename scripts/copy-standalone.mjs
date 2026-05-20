import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const standaloneDir = resolve(root, '.next', 'standalone');
const staticDir = resolve(root, '.next', 'static');
const publicDir = resolve(root, 'public');
const standaloneNextDir = resolve(standaloneDir, '.next');
const standaloneStaticDir = resolve(standaloneNextDir, 'static');
const standalonePublicDir = resolve(standaloneDir, 'public');

if (!existsSync(standaloneDir)) {
  throw new Error('Standalone build output not found. Run next build first.');
}

cpSync(staticDir, standaloneStaticDir, { recursive: true });
cpSync(publicDir, standalonePublicDir, { recursive: true });
