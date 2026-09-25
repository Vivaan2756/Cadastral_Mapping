import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendRoot = path.resolve(__dirname, '..');
const distDir = path.join(frontendRoot, 'node_modules', 'maplibre-gl', 'dist');
const targetDir = path.join(frontendRoot, 'public', 'maplibre');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const filesToCopy = [
  'maplibre-gl-worker.mjs',
  'maplibre-gl-shared.mjs'
];

for (const file of filesToCopy) {
  const src = path.join(distDir, file);
  const dest = path.join(targetDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[copy-maplibre-worker] Copied ${file} -> public/maplibre/${file}`);
  } else {
    console.error(`[copy-maplibre-worker] Error: Could not find ${src}`);
    process.exit(1);
  }
}

console.log('[copy-maplibre-worker] MapLibre worker files ready in public/maplibre/');
