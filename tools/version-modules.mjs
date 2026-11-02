// Stamp the local browser modules in index.html's import map with a content
// version, so a freshly deployed page never runs against modules the browser
// still has cached from the previous deploy (GitHub Pages caches for 10 min;
// a mismatch breaks module imports and shows the "couldn't start 3D" screen).
//
//   node tools/version-modules.mjs          rewrite index.html's import map
//   (tests/module-version.mjs fails if a script changed without restamping)
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = new URL('../', import.meta.url);
export function moduleFiles() {
  return fs.readdirSync(new URL('scripts/', root)).filter(f => f.endsWith('.js')).sort();
}
export function moduleVersion() {
  const hash = crypto.createHash('sha256');
  for (const f of moduleFiles()) hash.update(f + '\0').update(fs.readFileSync(new URL(`scripts/${f}`, root))).update('\0');
  return hash.digest('hex').slice(0, 10);
}
export function importMapEntries(version = moduleVersion()) {
  return moduleFiles().map(f => `  "./scripts/${f}": "./scripts/${f}?v=${version}"`);
}
const IMPORT_MAP = /<script type="importmap">\n\{ "imports": \{\n[\s\S]*?\n\} \}\n<\/script>/;
export function stampedImportMap(version = moduleVersion()) {
  return ['<script type="importmap">', '{ "imports": {', '  "three": "./vendor/three.module.js",', '  "three/addons/": "./vendor/jsm/",',
    importMapEntries(version).join(',\n'), '} }', '</script>'].join('\n');
}
if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const file = new URL('index.html', root), html = fs.readFileSync(file, 'utf8');
  if (!IMPORT_MAP.test(html)) throw new Error('import map block not found in index.html');
  fs.writeFileSync(file, html.replace(IMPORT_MAP, stampedImportMap()));
  console.log(`index.html import map stamped with module version ${moduleVersion()}`);
}
