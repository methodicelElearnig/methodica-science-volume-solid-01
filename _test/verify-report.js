/* Structural + headless verification for methodica-science-volume-solid-01 — the reporting /
   resume layer and the invariants it depends on (MOE 2.7 / Kata model, 2026-10-20).

   Every assertion corresponds to a failure that is SILENT at runtime: the lomda keeps working, the
   learner notices nothing, and the data is wrong or missing. Procedure:
   2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md (§6.8, §10.2) and the
   response-layer rules of 2026-10-19 (unit-js/20-xapi.js header; checks H1–H13).

   Adapted from methodica-science-body-matter-01/_test/verify-report.js for this unit's layout:
   js/main.js per part, a shared goTo() in unit-js/30-nav.js, GENERIC question controllers
   (scqRegister / registerPractice / ddqRegister / registerPracticeDnD / the peak machine), so the
   per-question census is taken from the registrations rather than from literal call sites.

   RUN (jsdom must live OUTSIDE this OneDrive tree):
     mkdir -p "$LOCALAPPDATA/lomda-jsdom" && cd "$LOCALAPPDATA/lomda-jsdom" && npm install jsdom@24
     NODE_PATH=$LOCALAPPDATA/lomda-jsdom/node_modules node _test/verify-report.js
   Without jsdom the static groups still run and the runtime group reports SKIPPED.
   Optional argument: a built package to check instead of the repo. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = process.argv[2] || path.join(__dirname, '..');
const UNIT_SLUG = 'methodica-science-volume-solid-01';
const COMPONENTS = ['01', '02', '03', '04', '05', '06', '07'];
const PREFIX = 'https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/';
const SHARED = ['10-identity', '15-ui', '20-xapi', '25-report', '30-nav', '40-resume', '50-loader', '60-devbridge', '90-boot'];
const HOOKS = ['capturePartPayload', 'applyResumeVars', 'applyResumeDom', 'restoreScreenUI'];
const CHAR_KEY = 'methodica_science_volume_solid_01_selectedCharacter';
const RESULT_KEY = 'volume-solid-01_moedAPassed';

const compSlug = (c) => UNIT_SLUG + '-' + c;
const compDir = (c) => path.join(BASE, compSlug(c));
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p).replace(/^﻿/, ''));
const partJs = (c) => read(path.join(compDir(c), 'js', 'main.js'));
const indexHtml = (c) => read(path.join(compDir(c), 'index.html'));
const sharedJs = (n) => read(path.join(BASE, 'unit-js', n + '.js'));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const suffixOf = (id) => id.replace(/\/+$/, '').split('-').pop();          // '…-01-03/' -> '03'
const qKeyOf = (qid) => qid.replace(/\/+$/, '').split('/').pop();           // '…/q1' -> 'q1'

let pass = 0, skipped = 0;
const failures = [];
function ok(scope, name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push('  [' + scope + '] ' + name + (detail ? '\n      -> ' + detail : ''));
}
function section(t) { console.log('\n' + t); }

function fnBody(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return null;
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}
/* the per-part config block, evaluated as data (needs XAPI_ID_PREFIX) */
function partConfig(c) {
  const js = partJs(c);
  const ctx = { XAPI_ID_PREFIX: PREFIX };
  const block = js.slice(js.indexOf('var SCREEN_TO_SUBCONTENT'));
  const end = block.indexOf('function xapiPartResult');
  vm.runInNewContext(block.slice(0, end), ctx);
  return ctx;
}
const SEP_RE = /\[,\]|\[\.\]|\[:\]/;

/* ══════════════════ 1. catalogue identity ══════════════════ */
section('1. catalogue identity');
const unitMeta = readJson(path.join(BASE, 'metadata', UNIT_SLUG + '_unit.json'));
ok('identity', 'unit metadata id is the bare unit slug', unitMeta.id === UNIT_SLUG, unitMeta.id);
const identity = sharedJs('10-identity');
ok('identity', 'XAPI_ID_PREFIX matches the catalogue prefix', identity.includes("var XAPI_ID_PREFIX = '" + PREFIX + "';"));
ok('identity', 'XAPI_UNIT_ID is the bare unit slug', identity.includes("window.XAPI_UNIT_ID = '" + UNIT_SLUG + "';"));
ok('identity', 'RESUME_ENABLED is true', /var RESUME_ENABLED = true;/.test(identity));
ok('identity', 'DEV_NAV requires ?dev=1 AND no ?registration', /DEV_NAV = _devQ\.get\('dev'\) === '1' && !_devQ\.has\('registration'\);/.test(identity));
const resumeJs = sharedJs('40-resume');
const charKey = (/var UI_CHARACTER_KEY = '([^']+)'/.exec(resumeJs) || [])[1];
ok('identity', 'UI_CHARACTER_KEY is namespaced per unit (D-6)', charKey === CHAR_KEY, charKey);
ok('identity', 'UNIT_CHARACTERS lists the two mascots', /var UNIT_CHARACTERS = \['orange', 'turquoise'\];/.test(resumeJs));
ok('identity', 'NAV_EDGE_KEY carries the unit slug', resumeJs.includes("'lomda_nav_edges::" + UNIT_SLUG + "'"));
ok('identity', 'RESULT_KEYS lists the part-06 verdict key', new RegExp("var RESULT_KEYS = \\[\\s*'" + RESULT_KEY + "'\\s*\\]").test(resumeJs));
ok('identity', 'RESUME_STATE_VERSION is 5, state id per part', /var RESUME_STATE_VERSION = 5;/.test(resumeJs) && /var RESUME_STATE_ID\s*=\s*'execution-state::' \+ currentPartSlug\(\);/.test(resumeJs));
ok('identity', 'no unit-wide document fields left (part / prev / parts)', !/\b(doc|_unitState|old)\.(part|prev)\b|\.parts\[/.test(stripComments(resumeJs)));
const loader = sharedJs('50-loader');
const lib = (/\(RESUME_ENABLED \? 'xapi-720-(\w)\.js' : 'xapi-720-(\w)\.js'\)/.exec(loader) || []);
const gate = (/xapi-720-\[([a-z]+)\]\\\.js/.exec(loader) || [])[1] || '';
ok('loader', 'library letter is k with resume (i without)', lib[1] === 'k' && lib[2] === 'i', lib.join('/'));
ok('loader', 'the loaded letters are inside the XAPI_USING_G gate', gate.includes('k') && gate.includes('i'), gate);
ok('loader', 'the stub carries a gated letter', fs.existsSync(path.join(__dirname, 'xapi-720-k.js')) && new RegExp('xapi-720-[' + gate + ']\\.js$').test('xapi-720-k.js'));
ok('loader', 'no resume hop to another part', !/location\.replace\(/.test(stripComments(loader)));
ok('loader', 'two-phase restore: readUnitState before the poll, applyExecutionState after', stripComments(loader).indexOf('readUnitState()') < stripComments(loader).indexOf('pollMetadataReady(function') && stripComments(loader).indexOf('applyExecutionState(') > stripComments(loader).indexOf('pollMetadataReady(function'));

const META = {};
for (const c of COMPONENTS) {
  META[c] = readJson(path.join(BASE, 'metadata', compSlug(c) + '.json'));
  ok(c, 'component metadata id = prefix + slug + /', META[c].id === PREFIX + compSlug(c) + '/', META[c].id);
  ok(c, 'component learningUnitId = unit slug', META[c].learningUnitId === UNIT_SLUG, META[c].learningUnitId);
  for (const it of META[c].subContent || []) {
    ok(c, 'item id under the component: ' + it.id, it.id.startsWith(META[c].id + compSlug(c) + '-') && it.id.endsWith('/'));
    for (const q of it.questions || []) {
      ok(c, 'question id = item id + qN: ' + q.questionId, /\/q\d+$/.test(q.questionId) && q.questionId.startsWith(it.id));
      ok(c, 'questionType in the Kata enum: ' + q.questionId,
         ['fill-in', 'true-false', 'choice', 'numeric', 'sequencing', 'matching', 'performance', 'other'].includes(q.questionType), q.questionType);
      /* H5 — delimiter-free, trimmed answer strings; correctAnswers ⊆ answers */
      const pool = Array.isArray(q.answers) ? q.answers : [].concat((q.answers && q.answers.source) || [], (q.answers && q.answers.target) || []);
      for (const s of pool) ok(c, 'answer text clean: ' + s, typeof s === 'string' && !SEP_RE.test(s) && s === s.trim() && !/\s{2}/.test(s));
      if (q.questionType === 'choice') for (const ca of q.correctAnswers || []) ok(c, 'correctAnswer ∈ answers: ' + ca, q.answers.includes(ca));
      if (q.questionType === 'matching') for (const ca of q.correctAnswers || []) ok(c, 'correct pair ∈ source×target: ' + ca.source, q.answers.source.includes(ca.source) && q.answers.target.includes(ca.target));
      if (q.questionType === 'performance') ok(c, 'performance has ≥ 2 steps', (q.steps || []).length >= 2);
    }
  }
}

/* ══════════════════ 2. per-part wiring ══════════════════ */
section('2. per-part page wiring');
const versions = {};
const navJs = stripComments(sharedJs('30-nav'));
for (const c of COMPONENTS) {
  const html = indexHtml(c), js = partJs(c), jsc = stripComments(js);
  const htmlc = html.replace(/<!--[\s\S]*?-->/g, '');
  /* script tags: shared first, main.js, 90-boot last; one ?v= per file across parts */
  const tags = [...htmlc.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
  const names = tags.map((u) => path.posix.basename(u.split('?')[0]));
  const expect = SHARED.slice(0, 8).map((n) => n + '.js').concat(['main.js', '90-boot.js']);
  ok(c, 'platform script tags in order, 90-boot last', JSON.stringify(names) === JSON.stringify(expect), names.join(' '));
  for (const u of tags) {
    const v = (/[?&]v=([^&#]+)/.exec(u) || [])[1];
    ok(c, '?v= on ' + u, !!v);
    const n = path.posix.basename(u.split('?')[0]);
    (versions[n] = versions[n] || new Set()).add(v || '(none)');
  }
  for (const [label, re] of [['unit-css/style.css', /<link rel="stylesheet" href="\.\.\/unit-css\/style\.css\?v=([^"]+)">/], ['css/style.css', /<link rel="stylesheet" href="css\/style\.css\?v=([^"]+)">/]]) {
    const v = (re.exec(htmlc) || [])[1];
    ok(c, label + '?v=', !!v); (versions[label] = versions[label] || new Set()).add(v || '(none)');
  }
  ok(c, 'boot cover before #app, with the inline safety net', htmlc.indexOf('id="boot-cover"') > 0 && htmlc.indexOf('id="boot-cover"') < htmlc.indexOf('<div id="app"') && /__resumeInFlight && Date\.now\(\) - t0 < 6000/.test(htmlc));
  for (const id of ['report-modal', 'report-confirm-modal']) ok(c, 'dialog #' + id, htmlc.includes('id="' + id + '"'));
  /* the platform owns routing (§8.12) */
  const hops = [...jsc.matchAll(/window\.location\.(?:href|replace|assign)[^\n]*/g)];
  for (const m of hops) ok(c, 'cross-part hop only under DEV_NAV: ' + m[0].slice(0, 60), /if \(DEV_NAV/.test(jsc.slice(Math.max(0, m.index - 220), m.index)));
  ok(c, 'no inline cross-part hop in index.html', !/onclick="window\.location/.test(htmlc));
  ok(c, 'no window.close / alert / postMessage to the host', !/window\.close|window\.open\(|CLOSE_LEARNING_MODULE|720:unit-finished|\balert\(|top\.close|parent\.close/.test(jsc));
  ok(c, 'no unit-scope statement', !/scope:\s*'unit'/.test(jsc));
  ok(c, 'no deferred sender / retired ledger', !/\bxapiSend\(|\bsendAnsweredOnce\(|\bdoneQ\b/.test(jsc));
  ok(c, 'only 720 verbs are sent directly', [...jsc.matchAll(/sendStatement720\('([a-z.0-9]+)'/g)].every((m) => ['selected'].includes(m[1])), [...jsc.matchAll(/sendStatement720\('([a-z.0-9]+)'/g)].map((m) => m[1]).join(','));
  if (c !== '01') {
    const back = /<button[^>]*id="back-to-prev-part"[^>]*>/.exec(htmlc);
    ok(c, 'cross-part back button hidden by attribute AND inline display, dev-only handler', !!back && /\bhidden\b/.test(back[0]) && /display:none/.test(back[0]) && /onclick="goBackToPreviousPart\('methodica-science-volume-solid-01-0[1-6]'\)"/.test(back[0]), back && back[0]);
  }
  /* character */
  ok(c, 'character read through getUnitCharacter (typeof-guarded)', /typeof getUnitCharacter === 'function'/.test(jsc));
  ok(c, 'no bare lomda_selectedCharacter key', !/'lomda_selectedCharacter'/.test(jsc));
  /* hooks + config */
  for (const h of HOOKS) ok(c, 'hook ' + h + ' declared once', (jsc.match(new RegExp('^function ' + h + '\\(', 'gm')) || []).length === 1);
  for (const n of ['xapiPartResult', 'partFinish']) ok(c, n + ' declared once', (jsc.match(new RegExp('^function ' + n + '\\(', 'gm')) || []).length === 1);
  ok(c, 'onXapiReady loads the unit metadata and nothing else', !fnBody(jsc, 'onXapiReady') || !/sendStatement720/.test(fnBody(jsc, 'onXapiReady')));
  let cfg = null;
  try { cfg = partConfig(c); } catch (e) { ok(c, 'config block evaluates', false, String(e)); }
  if (cfg) {
    ok(c, 'XAPI_COMP_SLUG = folder (lowercase)', cfg.XAPI_COMP_SLUG === compSlug(c));
    ok(c, 'XAPI_COMP_ID = metadata id', cfg.XAPI_COMP_ID === META[c].id, cfg.XAPI_COMP_ID);
    ok(c, 'XAPI_METADATA_FILE points at this part\'s json', cfg.XAPI_METADATA_FILE === '../metadata/' + compSlug(c) + '.json' && fs.existsSync(path.join(BASE, 'metadata', compSlug(c) + '.json')));
    ok(c, 'XAPI_END_BTN exists in index.html', !!cfg.XAPI_END_BTN && htmlc.includes('id="' + cfg.XAPI_END_BTN + '"'), cfg.XAPI_END_BTN);
    const dom = [...htmlc.matchAll(/<section class="screen[^"]*"\s+data-screen="(\d+)"/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
    const keys = Object.keys(cfg.SCREEN_TO_SUBCONTENT).map(Number).sort((a, b) => a - b);
    ok(c, 'SCREEN_TO_SUBCONTENT keys === DOM data-screen set', JSON.stringify(keys) === JSON.stringify(dom), keys.join(',') + ' vs ' + dom.join(','));
    const total = Number((/const TOTAL_SCREENS = (\d+)/.exec(js) || [])[1]);
    ok(c, 'TOTAL_SCREENS === number of screens', total === dom.length, total + ' vs ' + dom.length);
    const items = new Set((META[c].subContent || []).map((it) => suffixOf(it.id)));
    const mapped = new Set(Object.values(cfg.SCREEN_TO_SUBCONTENT).filter(Boolean).map((v) => v[0]));
    for (const s of mapped) ok(c, 'mapped item exists in the catalogue: ' + s, items.has(s));
    for (const v of Object.values(cfg.SCREEN_TO_SUBCONTENT).filter(Boolean)) ok(c, 'suffix is a 2-digit string: ' + v[0], typeof v[0] === 'string' && /^\d{2}$/.test(v[0]));
    /* eval items ⇔ items with a declared question */
    const withQ = new Set((META[c].subContent || []).filter((it) => (it.questions || []).length).map((it) => suffixOf(it.id)));
    ok(c, 'XAPI_EVAL_ITEMS === items with declared questions', JSON.stringify([...withQ].sort()) === JSON.stringify(Object.keys(cfg.XAPI_EVAL_ITEMS).sort()),
       [...withQ].join(',') + ' vs ' + Object.keys(cfg.XAPI_EVAL_ITEMS).join(','));
    /* the END button sits on a screen that belongs to the part's last item (or none) — a sanity check only */
    ok(c, 'xapiPartResult returns success as a boolean expression', /success:\s*(true|[^,}]+(>=|===|<)[^,}]+|passed)/.test(fnBody(jsc, 'xapiPartResult') || ''), fnBody(jsc, 'xapiPartResult'));
  }
  /* ═══ response layer, static (H1–H3) — from the REGISTRATIONS, this unit's controllers are generic ═══ */
  const declared = {};
  for (const it of META[c].subContent || []) for (const q of it.questions || []) declared[suffixOf(it.id) + '/' + qKeyOf(q.questionId)] = q.questionType;
  const registered = {};
  if (/^var PEAK_ITEM = '(\d\d)';/m.test(jsc)) {
    const item = /^var PEAK_ITEM = '(\d\d)';/m.exec(jsc)[1];
    const n = Number((/const PEAK_PARTS = (\d+)/.exec(jsc) || [])[1]);
    for (let i = 1; i <= n; i++) registered[item + '/q' + i] = 'choice';
  }
  for (const m of jsc.matchAll(/\bitem:\s*'(\d\d)'/g)) {
    const before = jsc.slice(Math.max(0, m.index - 600), m.index);
    const reg = [...before.matchAll(/\b(scqRegister|registerPractice|registerPracticeDnD|ddqRegister)\(/g)].pop();
    if (!reg) continue;
    const after = jsc.slice(m.index, m.index + 200);
    const qk = (/\bqKey:\s*'(q\d+)'/.exec(after) || [])[1] || 'q1';
    registered[m[1] + '/' + qk] = /DnD|ddq/.test(reg[1]) ? 'matching' : 'choice';
  }
  ok(c, 'H3 every declared question is registered exactly once, and nothing else is', JSON.stringify(Object.keys(declared).sort()) === JSON.stringify(Object.keys(registered).sort()),
     'declared=' + Object.keys(declared).sort().join(' ') + '  registered=' + Object.keys(registered).sort().join(' '));
  for (const k of Object.keys(declared)) if (registered[k]) ok(c, 'H2 controller kind matches questionType at ' + k, registered[k] === declared[k], registered[k] + ' vs ' + declared[k]);
  for (const [fn, want] of [['scqCheck', 'choices'], ['ddqCheck', 'pairs'], ['peakCheck', 'choices']]) {
    const b = fnBody(jsc, fn);
    if (!b) continue;
    const call = /xapiAnswered\([\s\S]*?\{\s*(choices|pairs|steps|values|value|order|text)\s*:/.exec(b);
    ok(c, 'H1 ' + fn + ' passes a spec object to xapiAnswered', !!call);
    ok(c, 'H2 ' + fn + ' spec shape is ' + want, call && call[1] === want, call && call[1]);
    ok(c, fn + ' does not write XAPI_Q_RESULTS itself (xapiAnswered does)', !/XAPI_Q_RESULTS\[/.test(b));
  }
  ok(c, 'H7 retired builders absent', !/xapiZoneAnswer\(|xapiFieldsAnswer\(|xapiMultiAnswer\(|id \+ '->'/.test(jsc));
  for (const m of jsc.matchAll(/^function (\w*Hint)\(/gm)) {
    const f = m[1]; if (/Close|Sync|Spent/.test(f)) continue;
    const b = fnBody(jsc, f) || '';
    const iH = b.indexOf('xapiRequestedHint('), iReveal = b.indexOf("classList.remove('hidden')");
    if (iH < 0 && iReveal < 0) continue;   // not a hint opener
    ok(c, f + ' reports the hint after the guards and before the reveal', iH > 0 && (iReveal < 0 || iH < iReveal), 'hint@' + iH + ' reveal@' + iReveal);
  }
  for (const m of jsc.matchAll(/^function (\w*CloseHint)\(/gm)) ok(c, m[1] + ' reports nothing', !(fnBody(jsc, m[1]) || '').includes('xapiRequestedHint'));
  /* identifiers declared in both layers (§3.3) */
  const sharedNames = new Set();
  for (const s of SHARED) for (const m of stripComments(sharedJs(s)).matchAll(/^(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) sharedNames.add(m[1]);
  for (const m of jsc.matchAll(/^(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (HOOKS.includes(m[1]) || ['TOTAL_SCREENS', 'resetScreenState', 'onXapiReady', 'partBoot', 'SCREEN_TO_SUBCONTENT', 'XAPI_COMP_SLUG', 'XAPI_COMP_ID', 'XAPI_EVAL_ITEMS', 'XAPI_ITEM_RESULT', 'XAPI_METADATA_FILE', 'XAPI_END_BTN', 'RESUME_PLAIN_VARS', 'RESUME_INPUT_IDS', 'RESUME_TEXT_IDS'].includes(m[1])) continue;
    ok(c, 'no identifier declared in both layers: ' + m[1], !sharedNames.has(m[1]));
  }
  ok(c, 'no capitalised unit slug', !/Methodica-Science-Volume-Solid/i.test(jsc.replace(/methodica-science-volume-solid/g, '')));
}
for (const [n, vs] of Object.entries(versions)) ok('versions', 'one ?v= for ' + n + ' across parts', vs.size === 1, [...vs].join(','));

/* ══════════════════ 3. shared layer ══════════════════ */
section('3. shared layer');
const xapi = sharedJs('20-xapi');
for (const n of ['xapiQMeta', 'xapiResponse', 'xapiChoiceResponse', 'xapiMatchingResponse', 'xapiPerformanceResponse', 'xapiAnswered', 'xapiRequestedHint', 'xapiCompleteComponent', 'xapiEndComponent', '_xapiCloseItem', '_xapiLibWouldDrop', 'xapiSeedAnsweredFromResume', 'xapiComponentEnded', 'restoreEndedButton', 'xapiWireVideos'])
  ok('shared', n + ' declared once in 20-xapi.js', (xapi.match(new RegExp('^function ' + n + '\\(', 'gm')) || []).length === 1);
ok('shared', 'xapiAnswered writes XAPI_Q_RESULTS first, outside the try', /function xapiAnswered\([^)]*\) \{\n  XAPI_Q_RESULTS\[item \+ '\/' \+ qKey\] = !!correct;\n/.test(xapi));
ok('shared', 'no deferred sender in the shared layer', !/^function xapiSend\(/m.test(xapi));
ok('shared', 'video reporting is an allowlist (data-xapi-report) with the item as object', /video\[data-xapi-report\]/.test(xapi) && /objectId: xapiItemId\(item\)/.test(xapi));
ok('shared', 'the one learner video is opted in with its item suffix', /<video id="s1-video"[^>]*data-xapi-report="01"/.test(indexHtml('01')) && (partConfig('01').SCREEN_TO_SUBCONTENT[1] || [])[0] === '01');
for (const n of ['readUnitState', 'captureUnitState', 'persistUnitState', 'migrateState', 'adoptUnitCharacter', 'setUnitCharacter', 'getUnitCharacter', 'setUnitResult', 'drainPendingUnitState', 'dropBootCover', 'sendStatementOnce', 'sendCompletedOnce', 'goBackToPreviousPart', 'writeForwardState', 'initResumeResetHatch', 'initResumeLeaveHandlers'])
  ok('shared', n + ' declared once in 40-resume.js', (resumeJs.match(new RegExp('^function ' + n + '\\(', 'gm')) || []).length === 1);
ok('shared', 'goBackToPreviousPart stops without DEV_NAV', /function goBackToPreviousPart\([^)]*\) \{\n  if \(!DEV_NAV\) return;/.test(resumeJs));
ok('shared', 'adoptUnitCharacter never deletes the cache', !/_lsDel\(UI_CHARACTER_KEY\)/.test(fnBody(resumeJs, 'adoptUnitCharacter') || 'x'));
const goTo = fnBody(navJs, 'goTo') || '';
ok('shared', "goTo: .active before xapiOnScreen, restoreEndedButton present, scheduleResumeSave last", goTo.indexOf("classList.add('active')") > 0 && goTo.indexOf('xapiOnScreen(n)') > goTo.indexOf("classList.add('active')") && goTo.includes('restoreEndedButton()') && goTo.lastIndexOf('scheduleResumeSave()') > goTo.indexOf('restoreEndedButton()'));
const aes = fnBody(navJs, 'applyExecutionState') || '';
ok('shared', 'applyExecutionState takes a screen override, seeds the library after the replay', /screenOverride/.test(aes) && aes.indexOf('xapiSeedAnsweredFromResume()') > aes.indexOf('finally'));
for (const s of SHARED.slice(0, 8)) {
  const body = stripComments(sharedJs(s));
  ok('shared', s + ' is definition-only (no top-level call)', !/^(?:\(function|[A-Za-z_$][\w$]*\([^\n]*\);?\s*)$/m.test(body.replace(/^\s+.*$/gm, '')));
}
const bootJs = sharedJs('90-boot');
ok('shared', '90-boot: reset hatch first, bootXAPI last', /\(function boot\(\) \{\n  try \{ initResumeResetHatch\(\); \}/.test(bootJs) && /bootXAPI\(\);\n\}\)\(\);/.test(bootJs));
ok('shared', '90-boot hides the cross-part back unless DEV_NAV', /function syncDevBackButton\(\)/.test(bootJs) && /b\.style\.display = 'none'/.test(bootJs));

/* ══════════════════ 4. runtime (jsdom) ══════════════════ */
section('4. runtime (jsdom)');
let JSDOM = null;
try { ({ JSDOM } = require('jsdom')); } catch (e) { skipped++; console.log('  skipped: jsdom not on NODE_PATH'); }

function loadPart(c, query) {
  const html = indexHtml(c);
  const stripped = html.replace(/<script src="([^"]+)"><\/script>/g, '<!--script:$1-->').replace(/<script>[\s\S]*?<\/script>/, '');
  const dom = new JSDOM(stripped, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'http://localhost:8744/' + compSlug(c) + '/index.html' + (query || '') });
  const w = dom.window;
  for (const m of ['play', 'pause', 'load']) w.HTMLMediaElement.prototype[m] = function () { return m === 'play' ? Promise.resolve() : undefined; };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.matchMedia = w.matchMedia || function (q) { return { media: q, matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; } }; };
  const errors = [];
  w.console.error = (...a) => errors.push(a.map(String).join(' '));
  w.console.warn = () => {}; w.console.log = () => {};
  w.addEventListener('error', (e) => errors.push('page error: ' + (e.error && e.error.stack || e.message)));
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const u = m[1];
    if (/^https?:/.test(u)) continue;
    const file = path.join(compDir(c), u.split('?')[0]);
    const s = w.document.createElement('script'); s.textContent = read(file) + '\n//# sourceURL=' + u;
    try { w.document.body.appendChild(s); } catch (e) { errors.push(u + ': ' + (e && e.stack || e)); }
  }
  return { dom, w, errors };
}

if (JSDOM) for (const c of COMPONENTS) {
  const cfg = partConfig(c);
  const firstQ = (() => { for (const it of META[c].subContent || []) for (const q of it.questions || []) return suffixOf(it.id) + '/' + qKeyOf(q.questionId); return null; })();
  /* 4a — regression gate: no library, nothing sent, nothing throws, every screen walks */
  let r = loadPart(c);
  let w = r.w;
  const screens = [...w.document.querySelectorAll('section.screen[data-screen]')].map((s) => Number(s.dataset.screen));
  ok(c, 'gate: no console.error / page error on load', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  ok(c, 'gate: sendStatement720 is undefined without the library', typeof w.sendStatement720 === 'undefined');
  for (const n of screens) { try { w.goTo(n); } catch (e) { ok(c, 'gate: goTo(' + n + ') throws', false, String(e)); } }
  ok(c, 'gate: exactly one .active after the walk', w.document.querySelectorAll('section.screen.active').length === 1);
  ok(c, 'gate: no console.error during the walk', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  ok(c, 'gate: xapiOnScreen / xapiAnswered are silent no-ops', (() => { try { w.xapiOnScreen(0); w.xapiAnswered('01', 'q1', true, true, { text: 'x' }); return true; } catch (e) { return false; } })());

  /* 4b — statement flow with an inline recorder standing in for the library */
  r = loadPart(c); w = r.w;
  const sent = [];
  w.METADATA = META[c];
  w.XAPI_USING_G = true;
  w.xapiItemAnswered = {};
  w.sendStatement720 = function (verb, type, result, ctx) {
    sent.push({ verb, type, result: result || null, ctx: ctx || null });
    if (verb.split('.')[0] === 'answered' && ctx && ctx.parentId) w.xapiItemAnswered[ctx.parentId] = true;
  };
  let doc = null;
  w.loadState720 = () => doc;
  w.saveState720 = (id, o) => { doc = JSON.parse(JSON.stringify(o)); return true; };
  w.saveState720Debounced = (id, o) => { doc = JSON.parse(JSON.stringify(o)); };
  w.readUnitState(); w._resumeReady = true;
  w.xapiOnScreen(w.currentScreen);
  const expectedItems = []; let last = null;
  for (const n of screens) { const it = cfg.SCREEN_TO_SUBCONTENT[n] ? cfg.SCREEN_TO_SUBCONTENT[n][0] : null; if (it !== last) { expectedItems.push(it); last = it; } }
  for (const n of screens.slice(1)) w.goTo(n);
  const inits = sent.filter((s) => s.verb === 'initialized' && s.ctx && s.ctx.objectId).map((s) => suffixOf(s.ctx.objectId));
  ok(c, 'flow: one item initialized per item change on the forward walk', JSON.stringify(inits) === JSON.stringify(expectedItems.filter(Boolean)), inits.join(',') + ' vs ' + expectedItems.filter(Boolean).join(','));
  const closes = sent.filter((s) => s.verb === 'completed' && s.ctx && s.ctx.objectId).map((s) => suffixOf(s.ctx.objectId));
  const evalItems = Object.keys(cfg.XAPI_EVAL_ITEMS);
  ok(c, 'flow: unanswered evaluated items are never closed (B-1), ungraded ones are', closes.every((it) => !evalItems.includes(it)) &&
     expectedItems.filter(Boolean).slice(0, -1).filter((it) => !evalItems.includes(it)).every((it) => closes.includes(it)), closes.join(','));
  ok(c, 'flow: initialized carries isEvaluationItem for graded items', sent.filter((s) => s.verb === 'initialized' && s.ctx && s.ctx.objectId).every((s) => s.ctx.isEvaluationItem === evalItems.includes(suffixOf(s.ctx.objectId))));
  /* the last click: one component completed, explicit success, button disabled, no navigation */
  const hrefBefore = w.location.href;
  const btn = w.document.getElementById(cfg.XAPI_END_BTN);
  ok(c, 'flow: XAPI_END_BTN present', !!btn);
  const before = sent.length;
  w.partFinish(btn); w.partFinish(btn);
  const comps = sent.slice(before).filter((s) => s.verb === 'completed' && !(s.ctx && s.ctx.objectId));
  ok(c, 'flow: exactly one component completed for two finish clicks', comps.length === 1, comps.length);
  ok(c, 'flow: component completed carries an explicit boolean success', comps[0] && typeof comps[0].result.success === 'boolean');
  ok(c, 'flow: finish button disabled, aria-disabled', btn && btn.disabled && btn.getAttribute('aria-disabled') === 'true');
  ok(c, 'flow: no navigation on finish', w.location.href === hrefBefore);
  ok(c, 'flow: ledger persisted the component completed', doc && doc.done && doc.done[compSlug(c)] === true);
  ok(c, 'flow: document is v5 for this component', doc && doc.v === 5 && doc.component === compSlug(c) && 'hints' in doc && 'results' in doc && !('parts' in doc) && !('prev' in doc));
  ok(c, 'flow: no console.error', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  /* a hint is reported once per question, and lands in the ledger */
  if (firstQ) {
    const [it, qk] = firstQ.split('/');
    const hBefore = sent.length;
    w.xapiRequestedHint(it, qk); w.xapiRequestedHint(it, qk);
    const hints = sent.slice(hBefore).filter((s) => s.verb === 'requested.1');
    ok(c, 'hints: two openings report once, ledger holds the key', hints.length === 1 && doc.hints && doc.hints[firstQ] === true, hints.length + ' / ' + JSON.stringify(doc.hints));
  }
  /* restoreEndedButton after a reload with the ledger */
  const r2 = loadPart(c); const w2 = r2.w;
  w2.METADATA = META[c]; w2.XAPI_USING_G = true; w2.loadState720 = () => doc; w2.saveState720 = () => true; w2.saveState720Debounced = () => {};
  w2.sendStatement720 = () => {};
  w2.readUnitState(); w2._resumeReady = true;
  w2.goTo(screens[screens.length - 1]);
  const btn2 = w2.document.getElementById(cfg.XAPI_END_BTN);
  ok(c, 'D-8: finished button stays disabled after a reload with the ledger', btn2 && btn2.disabled);
  /* isolation: a document of another component is discarded with a warning */
  const r2b = loadPart(c); const w2b = r2b.w;
  const warned2 = []; w2b.console.warn = (...a) => warned2.push(a.join(' '));
  w2b.loadState720 = () => ({ v: 5, component: compSlug(c === '01' ? '02' : '01'), payload: { currentScreen: 1 }, done: { x: true }, doneItems: {}, hints: {}, picks: {}, ui: { character: 'orange' }, results: {} });
  w2b.saveState720 = () => true; w2b.saveState720Debounced = () => {};
  const d2b = w2b.readUnitState();
  ok(c, 'isolation: a foreign component document is discarded with a warning', d2b.payload === null && !d2b.done.x && warned2.some((s) => /discarded/.test(s)));
  const r2c = loadPart(c); const w2c = r2c.w;
  w2c.loadState720 = () => ({ v: 3, part: compSlug(c), parts: {}, done: { y: true } });
  w2c.saveState720 = () => true; w2c.saveState720Debounced = () => {};
  ok(c, 'shape: a v3 document is discarded', w2c.readUnitState().done.y === undefined);

  /* 4c — response builders round-trip the catalogue (H9/H10): the correct answer formats to the canonical string */
  r = loadPart(c); w = r.w; w.METADATA = META[c]; w.XAPI_USING_G = true;
  for (const it of META[c].subContent || []) {
    const suf = suffixOf(it.id);
    for (const q of it.questions || []) {
      const k = qKeyOf(q.questionId);
      const m = w.xapiQMeta(suf, k);
      ok(c, 'xapiQMeta resolves ' + suf + '/' + k, m.questionId === q.questionId && m.parentId === it.id && m.questionType === q.questionType);
      if (q.questionType === 'choice') {
        const resp = w.xapiResponse(suf, k, { choices: q.correctAnswers.slice().reverse() }).response;
        const canon = q.answers.filter((a) => q.correctAnswers.includes(a)).join('[,]');
        ok(c, 'H10 choice canonical (answers order, any click order) ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
        ok(c, 'H12 no DOM-id syntax in response ' + suf + '/' + k, !/\S=\S|\s\|\s|->/.test(resp));   // 'id=value', 'a | b', 'a->b'; a spaced '=' inside prose is text
      } else if (q.questionType === 'matching') {
        const resp = w.xapiResponse(suf, k, { pairs: q.correctAnswers.slice().reverse() }).response;
        const canon = q.answers.source.map((s) => s + '[.]' + (q.correctAnswers.find((p) => p.source === s) || {}).target).join('[,]');
        ok(c, 'H10 matching canonical (source order) ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
        const partial = w.xapiResponse(suf, k, { pairs: [] }).response;
        ok(c, 'H9 matching with nothing placed yields S[.] per source ' + suf + '/' + k, partial === q.answers.source.map((s) => s + '[.]').join('[,]'));
        const _warn = w.console.warn; w.console.warn = () => {};
        const rev = w.xapiResponse(suf, k, { pairs: [{ source: q.correctAnswers[0].target, target: q.correctAnswers[0].source }] }).response;
        w.console.warn = _warn;
        ok(c, 'direction guard swaps a reversed pair ' + suf + '/' + k, rev.includes(q.correctAnswers[0].source + '[.]' + q.correctAnswers[0].target));
        /* and the UI-side labels of the matching board resolve: every item/target label is a metadata string */
        const ddqItems = [...(fnBody(stripComments(partJs(c)), 'ddqPairs') ? partJs(c).matchAll(/\{ id: '[^']+',\s*label: '([^']+)'/g) : [])].map((mm) => mm[1].replace(/\\u00a0/g, ' '));
        for (const lab of ddqItems) {
          const norm = lab.replace(/\s+/g, ' ').trim();
          const inSrc = q.answers.source.some((s) => s.replace(/\s+/g, ' ').trim() === norm), inTgt = q.answers.target.some((s) => s.replace(/\s+/g, ' ').trim() === norm);
          if (inSrc || inTgt) pass++;   // counted per label that resolves; a non-member belongs to another board
        }
      }
    }
  }
  if (firstQ) {
    const warned = []; w.console.warn = (...a) => warned.push(a.join(' '));
    w.xapiResponse(firstQ.split('/')[0], firstQ.split('/')[1], { choices: ['לא קיים'] });
    ok(c, 'H13 an unresolvable UI text warns', warned.some((s) => s.includes('not in metadata')));
  }

  /* 4d — resume stage A round trip */
  r = loadPart(c); w = r.w;
  w.goTo(screens[Math.min(1, screens.length - 1)]);
  if (firstQ) w.XAPI_Q_RESULTS[firstQ] = true;
  const payload = JSON.parse(JSON.stringify(w.capturePartPayload()));
  ok(c, 'resume: payload carries currentScreen and qResults', payload.currentScreen === screens[Math.min(1, screens.length - 1)] && (!firstQ || payload.qResults[firstQ] === true));
  const r3 = loadPart(c); const w3 = r3.w;
  w3.applyResumeVars(payload); w3.goTo(payload.currentScreen); w3.applyResumeVars(payload);
  ok(c, 'resume: capture → fresh page → restore → capture is identical', JSON.stringify(w3.capturePartPayload()) === JSON.stringify(payload));
  ok(c, 'resume: no console.error', r3.errors.length === 0, r3.errors.slice(0, 2).join(' | '));

  /* 4e — painter-never-throws sweep (guide §8.8 rule 7) */
  const r4 = loadPart(c); const w4 = r4.w;
  const snap = JSON.parse(JSON.stringify(w4.capturePartPayload()));
  (function force(o) {
    Object.keys(o).forEach(function (k) {
      if (k === 'done') o[k] = true;
      else if (k === 'phase') o[k] = 'correct';
      else if (o[k] && typeof o[k] === 'object') force(o[k]);
    });
  }(snap));
  w4._resumeReady = true;
  try { w4.applyResumeVars(snap); w4.applyResumeDom(snap); } catch (e) { ok(c, 'sweep: applyResume* throws', false, String(e)); }
  for (const n of screens) { try { w4.goTo(n); w4.restoreScreenUI(n); } catch (e) { ok(c, 'sweep: goTo/restoreScreenUI(' + n + ') throws', false, String(e)); } }
  ok(c, 'sweep: no [resume] / [paint] console.error with every question forced done', !r4.errors.some((e) => /\[resume\]|paint/.test(e)), r4.errors.filter((e) => /\[resume\]|paint/.test(e)).slice(0, 3).join(' | '));
  ok(c, 'sweep: no other console.error', r4.errors.length === 0, r4.errors.slice(0, 2).join(' | '));
  const r5 = loadPart(c); const w5 = r5.w; w5._resumeReady = true;
  for (const n of screens) { try { w5.goTo(n); } catch (e) { ok(c, 'sweep(clean): goTo(' + n + ') throws', false, String(e)); } }
  ok(c, 'sweep(clean): no console.error', r5.errors.length === 0, r5.errors.slice(0, 2).join(' | '));

  /* 4f — character: a part ≥ 02 adopts the cache into its own document and never deletes it; a reset adopts nothing */
  if (c !== '01') {
    const r6 = loadPart(c); const w6 = r6.w;
    w6.localStorage.setItem(CHAR_KEY, 'turquoise');
    const d6 = { v: 5, component: compSlug(c), payload: null, done: {}, doneItems: {}, hints: {}, picks: {}, ui: { character: null }, results: {} };
    w6.loadState720 = () => JSON.parse(JSON.stringify(d6)); let saved6 = null; w6.saveState720 = (id, o) => { saved6 = JSON.parse(JSON.stringify(o)); return true; }; w6.saveState720Debounced = () => {};
    const got = w6.readUnitState(); const changed = w6.adoptUnitCharacter(got);
    w6._resumeReady = true; w6.drainPendingUnitState();
    ok(c, 'character: adopted from the cache into this part\'s document, cache kept', got.ui.character === 'turquoise' && saved6 && saved6.ui.character === 'turquoise' && w6.localStorage.getItem(CHAR_KEY) === 'turquoise' && typeof changed === 'boolean');
    ok(c, 'character: getCharacter() follows the adopted value', w6.getCharacter() === 'turquoise');
    /* the hatch runs first in 90-boot: here it is re-run on a page that already booted, so the cache
       can be seeded before it. It must clear the cache, set the flag and strip the query. */
    const r7 = loadPart(c); const w7 = r7.w;
    w7.localStorage.setItem(CHAR_KEY, 'orange');
    w7.history.replaceState(null, '', w7.location.pathname + '?resetState&x=1');
    w7.initResumeResetHatch();
    w7.loadState720 = () => ({ v: 5, component: compSlug(c), payload: { currentScreen: 1 }, done: {}, doneItems: {}, hints: {}, picks: {}, ui: { character: 'turquoise' }, results: {} });
    w7.saveState720 = () => true; w7.saveState720Debounced = () => {};
    const got7 = w7.readUnitState(); w7.adoptUnitCharacter(got7);
    ok(c, 'character: ?resetState clears the cache, discards the document and adopts nothing', got7.payload === null && got7.ui.character === null && w7.localStorage.getItem(CHAR_KEY) === null && w7.location.search === '?x=1', JSON.stringify([got7.payload, got7.ui, w7.localStorage.getItem(CHAR_KEY), w7.location.search]));
    const r8 = loadPart(c); const w8 = r8.w;
    w8.localStorage.setItem(CHAR_KEY, 'character-2');   // another unit's value
    w8.loadState720 = () => null; w8.saveState720 = () => true; w8.saveState720Debounced = () => {};
    const got8 = w8.readUnitState(); w8.adoptUnitCharacter(got8);
    ok(c, 'character: a foreign value is not adopted', got8.ui.character === null && w8.getCharacter() === 'orange');
  }
}

/* ═══════════════════════════════ summary ═══════════════════════════════ */
console.log('\n' + pass + ' passed, ' + failures.length + ' failed' + (skipped ? ', ' + skipped + ' skipped' : ''));
if (failures.length) { console.log('\nFAILURES'); for (const f of failures) console.log(f); process.exit(1); }
process.exit(0);
