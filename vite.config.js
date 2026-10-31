import { defineConfig } from 'vite';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Genera la lista de archivos para que la PWA funcione sin internet
function precache() {
  return {
    name: 'precache-sw',
    apply: 'build',
    closeBundle() {
      const dist = 'dist', files = [];
      const walk = d => readdirSync(d).forEach(f => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(relative(dist, p).split(sep).join('/')); });
      walk(dist);
      const list = files.filter(f => f !== 'sw.js' && !f.endsWith('.map'));
      const sw = readFileSync('src/sw-template.js', 'utf8').replace('__FILES__', JSON.stringify(['./', ...list.map(f => './' + f)])).replace('__VERSION__', Date.now().toString(36));
      writeFileSync(join(dist, 'sw.js'), sw);
    }
  };
}
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  plugins: [precache()],
  test: { environment: 'node', include: ['tests/**/*.test.js'] }
});
