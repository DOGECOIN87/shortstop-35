// node --experimental-default-type=module tests/module-version.mjs
// Every local browser module must load through a content-versioned URL, so a
// new deploy never mixes with modules cached from the previous one.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { moduleFiles, moduleVersion } from '../tools/version-modules.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const v = moduleVersion();
for (const f of moduleFiles()) {
  assert.equal(map[`./scripts/${f}`], `./scripts/${f}?v=${v}`,
    `scripts/${f} changed or is missing from the import map; run: node tools/version-modules.mjs`);
}
assert.equal(map.three, './vendor/three.module.js');
for (const [, spec] of html.matchAll(/from '(\.\/scripts\/[a-z-]+\.js)'/g)) assert.ok(map[spec], `${spec} is versioned`);
console.log(`PASS: ${moduleFiles().length} local modules load through version ${v}`);
