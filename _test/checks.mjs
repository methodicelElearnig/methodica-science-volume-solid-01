/* Static gates for the shared-layer extraction. Run from the repo root:
 *
 *     node _test/checks.mjs
 *
 * Exits non-zero on any failure, so it can gate a commit. Every check here exists because the
 * failure it catches is SILENT — see _test/README.md for why each one earns its keep.
 *
 * The part list is derived from the filesystem, never hard-coded. The equivalent checks in
 * methodica-math-scale-01 iterate ['01'…'05']; copying one verbatim would skip part 06, which is
 * the retake and the least-exercised component in this unit.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UNIT = 'methodica-science-volume-solid-01';

let failures = 0;
const fail = (msg) => { failures++; console.log('  FAIL  ' + msg); };
const pass = (msg) => console.log('  ok    ' + msg);

/* Part folders, in order, straight off disk. */
const parts = fs.readdirSync(ROOT)
  .filter((d) => new RegExp('^' + UNIT + '-\\d\\d$').test(d) && fs.statSync(path.join(ROOT, d)).isDirectory())
  .sort();

if (!parts.length) { console.error('no part folders found — run from the repo root'); process.exit(2); }
console.log(`parts: ${parts.join(', ')}\n`);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const mainJs = (p) => path.join(p, 'js', 'main.js');
const indexHtml = (p) => path.join(p, 'index.html');

/* ── 1. Identifier collisions between unit-js/ and each part's main.js ───────────────
   A let/const collision is a loud SyntaxError. A var/function collision is a silent
   last-wins overwrite, and main.js loads AFTER the shared files — so a leftover part-local
   copy wins and the extraction looks successful while shipping the old code. */
const HOOKS = new Set([
  // Per-part seams the shared layer reads at call time. Declared in both by design.
  'TOTAL_SCREENS', 'resetScreenState', 'restoreScreenUI', 'capturePartPayload',
  'applyResumeVars', 'applyResumeDom', 'applyResumeInputs', 'partBoot', 'onXapiReady',
  'SCREEN_TO_SUBCONTENT', 'XAPI_COMP_SLUG', 'XAPI_COMP_ID', 'XAPI_EVAL_ITEMS',
  'XAPI_ITEM_RESULT', 'XAPI_METADATA_FILE',
  'RESUME_PLAIN_VARS', 'RESUME_INPUT_IDS', 'RESUME_TEXT_IDS'
]);

const DECL = /^(?:function|var|let|const)\s+([A-Za-z0-9_$]+)/;

console.log('1. identifier collisions (unit-js/ vs each main.js)');
const unitJsDir = path.join(ROOT, 'unit-js');
if (!fs.existsSync(unitJsDir)) {
  console.log('  skip  no unit-js/ yet (pre-Stage-2)');
} else {
  const shared = new Map();
  for (const f of fs.readdirSync(unitJsDir).filter((f) => f.endsWith('.js')).sort()) {
    read(path.join('unit-js', f)).split('\n').forEach((line) => {
      const m = line.match(DECL);
      if (m) shared.set(m[1], f);
    });
  }
  for (const p of parts) {
    const hits = [];
    read(mainJs(p)).split('\n').forEach((line, i) => {
      const m = line.match(DECL);
      if (m && shared.has(m[1]) && !HOOKS.has(m[1])) hits.push(`${m[1]}@${i + 1} (also ${shared.get(m[1])})`);
    });
    if (hits.length) fail(`${p}: ${hits.join(', ')}`);
    else pass(`${p}: clean`);
  }
}

/* ── 2. ?v= equality across every index.html for every shared URL ────────────────────
   Scoped to unit-js/ and unit-css/ — the EXECUTED shared files, where two parts running
   different versions inside one learner session is the actual hazard. unit-assets/ is
   deliberately excluded: images are not executed, and one part legitimately references the
   same icon a dozen times. */
console.log('\n2. ?v= equality on shared URLs');
const sharedRefs = new Map();   // url path -> Map(version -> Set(parts))
for (const p of parts) {
  const html = read(indexHtml(p));
  for (const m of html.matchAll(/(?:src|href)="(\.\.\/unit-(?:js|css)\/[^"?]+)(?:\?v=([^"]*))?"/g)) {
    const [, url, ver] = m;
    if (!sharedRefs.has(url)) sharedRefs.set(url, new Map());
    const byVer = sharedRefs.get(url);
    const key = ver === undefined ? '(none)' : ver;
    if (!byVer.has(key)) byVer.set(key, new Set());
    byVer.get(key).add(p);
  }
}
if (!sharedRefs.size) console.log('  skip  no shared URLs referenced yet');
for (const [url, byVer] of sharedRefs) {
  const short = url.replace(/^\.\.\//, '');
  if (byVer.size > 1) {
    const detail = [...byVer].map(([v, ps]) => `?v=${v} in ${[...ps].join('/')}`).join('  vs  ');
    fail(`${short}: version mismatch — ${detail}`);
  } else {
    const [[ver, ps]] = [...byVer];
    if (ps.size !== parts.length) fail(`${short}: ?v=${ver} but referenced by only ${ps.size}/${parts.length} parts (${[...ps].join(', ')})`);
    else pass(`${short}: ?v=${ver} in all ${parts.length}`);
  }
}

/* ── 3. TOTAL_SCREENS vs the .screen[data-screen] count in the markup ───────────────
   goTo() rejects n >= TOTAL_SCREENS while index_dev.html derives its jump range from the
   DOM, so the two silently disagree if only one is edited. */
console.log('\n3. TOTAL_SCREENS vs markup');
for (const p of parts) {
  const js = read(mainJs(p));
  const m = js.match(/TOTAL_SCREENS\s*=\s*(\d+)/);
  const html = read(indexHtml(p));
  const ids = [...html.matchAll(/class="screen[^"]*"\s+data-screen="(\d+)"/g)].map((x) => +x[1]);
  const count = ids.length;
  if (!m) { fail(`${p}: TOTAL_SCREENS not declared (markup has ${count} screens)`); continue; }
  const declared = +m[1];
  if (declared !== count) { fail(`${p}: TOTAL_SCREENS=${declared} but markup has ${count} screens`); continue; }
  /* Contiguity is not required — flow order is not numeric order — but a gap means goTo()
     can reach a screen that does not exist, which under resume gets written to the state doc. */
  const missing = [];
  for (let i = 0; i < declared; i++) if (!ids.includes(i)) missing.push(i);
  if (missing.length) fail(`${p}: TOTAL_SCREENS=${declared} but data-screen values missing: ${missing.join(',')}`);
  else pass(`${p}: ${declared} screens, contiguous 0..${declared - 1}`);
}

/* ── 4. Metadata id resolution ───────────────────────────────────────────────────────
   Every id the lomda reports must match metadata/*.json BYTE-FOR-BYTE, or the platform answers
   "שאלה לא נמצאה" and the answer is recorded against nothing. The pre-extraction code built
   '<prefix><comp>-NN/q1', omitting the component segment, and matched NOTHING.

   This runs the REAL xapiItemId/xapiQ out of unit-js/20-xapi.js inside a minimal shim, rather than
   reimplementing them here — a second copy of the id logic would be free to drift from the one
   that ships, which is the whole class of bug this check exists to catch. */
console.log('\n4. metadata id resolution (real xapiItemId/xapiQ vs metadata/*.json)');
const xapiSrc = path.join(ROOT, 'unit-js', '20-xapi.js');
if (!fs.existsSync(xapiSrc)) {
  console.log('  skip  no unit-js/20-xapi.js yet');
} else {
  const warnings = [];
  const shim = {
    window: {}, document: { querySelectorAll: () => [] },
    console: { warn: (...a) => warnings.push(a.join(' ')), log: () => {}, error: () => {} }
  };
  const src = fs.readFileSync(xapiSrc, 'utf8').replace(/^'use strict';/, '');

  const PREFIX = (fs.readFileSync(path.join(ROOT, 'unit-js', '10-identity.js'), 'utf8')
    .match(/XAPI_ID_PREFIX\s*=\s*'([^']+)'/) || [])[1];
  if (!PREFIX) fail('could not read XAPI_ID_PREFIX from 10-identity.js');

  /* The file reads XAPI_COMP_SLUG / XAPI_COMP_ID as bare globals (they are per-part seams), so they
     have to be function parameters — hence one instantiation per part rather than a shared one. */
  const loadFor = (slug) => new Function(
    'window', 'document', 'console', 'XAPI_ID_PREFIX', 'XAPI_COMP_SLUG', 'XAPI_COMP_ID',
    src + '\n;return { xapiItemId, xapiQ };'
  )(shim.window, shim.document, shim.console, PREFIX, slug, PREFIX + slug + '/');

  let checkedItems = 0, checkedQs = 0;
  const bad = [];
  for (const p of parts) {
    const metaFile = path.join(ROOT, 'metadata', p + '.json');
    if (!fs.existsSync(metaFile)) { fail(`${p}: metadata/${p}.json missing`); continue; }
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

    shim.window.METADATA = meta;          // what the real library publishes after the metadata load
    const scoped = loadFor(p);

    for (const sc of meta.subContent || []) {
      const suffix = sc.id.replace(/\/+$/, '').split('-').pop();
      const builtItem = scoped.xapiItemId(suffix);
      checkedItems++;
      if (builtItem !== sc.id) bad.push(`${p} item ${suffix}: built ${builtItem} != meta ${sc.id}`);
      for (const q of sc.questions || []) {
        checkedQs++;
        const r = scoped.xapiQ(suffix, q.questionId);
        const expect = sc.id + q.questionId;      // this unit stores bare 'qN' in metadata
        if (r.questionId !== expect) bad.push(`${p} q ${suffix}/${q.questionId}: built ${r.questionId} != ${expect}`);
        /* v2.4 §2: parent must be the containing item — the same id when the question IS the item. */
        if (r.parentId !== sc.id) bad.push(`${p} parent ${suffix}/${q.questionId}: ${r.parentId} != ${sc.id}`);
      }
    }
  }
  if (bad.length) { bad.slice(0, 10).forEach(fail); if (bad.length > 10) fail(`… and ${bad.length - 10} more`); }
  else pass(`${checkedItems} items / ${checkedQs} questions resolve byte-for-byte, parents correct`);
  if (warnings.length) fail(`xapiQ fell back for: ${[...new Set(warnings)].join(' | ')}`);
}

/* ── 5. SCREEN_TO_SUBCONTENT completeness and validity ───────────────────────────────
   Three ways this map fails silently:
     - a screen missing from it reports NO item, in the statements and in the bug report alike;
     - a suffix that matches no metadata item makes xapiItemId() build an id the catalog rejects;
     - an item in the metadata that no screen maps to is content nobody can ever report against.
   All three are invisible at runtime, so they are checked here. */
console.log('\n5. SCREEN_TO_SUBCONTENT vs TOTAL_SCREENS and metadata');
for (const p of parts) {
  const js = read(mainJs(p));
  /* Matches both the multi-line map and the single-line form part 01 still uses — an earlier
     version of this check only handled the former and silently reported part 01 as "not yet
     authored" while it had a (wrong) map all along. */
  const m = js.match(/var SCREEN_TO_SUBCONTENT = (\{[\s\S]*?\});/);
  const legacy = /var SCREEN_TO_SUB\b/.test(js);
  if (!m) {
    console.log(`  todo  ${p}: no SCREEN_TO_SUBCONTENT yet${legacy ? ' (still on the legacy SCREEN_TO_SUB)' : ''}`);
    continue;
  }
  if (legacy) fail(`${p}: has BOTH SCREEN_TO_SUBCONTENT and the legacy SCREEN_TO_SUB — delete the latter`);

  const total = +(js.match(/TOTAL_SCREENS\s*=\s*(\d+)/) || [])[1];
  /* Entries are `N: null` or `N: ['NN', page]`. NOT line-anchored — part 01's map is a one-liner,
     and an anchored pattern matched none of it and claimed all 33 screens were unmapped. A colon
     after digits is unambiguous here: nothing inside the value has one. */
  const entries = [...m[1].matchAll(/(\d+)\s*:\s*(null|\[\s*'(\d+)'\s*,\s*(\d+)\s*\])/g)]
    .map((x) => ({ screen: +x[1], suffix: x[3] ?? null, page: x[4] ? +x[4] : null }));

  const missing = [];
  for (let i = 0; i < total; i++) if (!entries.some((e) => e.screen === i)) missing.push(i);
  if (missing.length) { fail(`${p}: screens unmapped: ${missing.join(',')} (of ${total})`); continue; }
  if (entries.length !== total) { fail(`${p}: ${entries.length} entries for ${total} screens`); continue; }

  const meta = JSON.parse(read(path.join('metadata', p + '.json')));
  const metaSuffixes = new Set((meta.subContent || []).map((s) => s.id.replace(/\/+$/, '').split('-').pop()));
  const used = new Set(entries.filter((e) => e.suffix).map((e) => e.suffix));

  const unknown = [...used].filter((s) => !metaSuffixes.has(s));
  if (unknown.length) fail(`${p}: suffixes not in metadata: ${unknown.join(',')}`);

  /* An unmapped metadata item is reported, not failed: part 01's item 01 is a walked-through hook
     with no question, and a component may legitimately not surface every catalog item on a screen. */
  const orphan = [...metaSuffixes].filter((s) => !used.has(s));
  if (!unknown.length) {
    pass(`${p}: ${entries.length}/${total} screens mapped, ${used.size} items used` +
         (orphan.length ? `  [note: metadata items with no screen: ${orphan.join(',')}]` : ''));
  }
}

console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
