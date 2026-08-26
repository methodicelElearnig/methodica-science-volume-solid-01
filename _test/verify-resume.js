/* Headless verification of the RESUME painters against the REAL index.html + js/main.js +
   unit-js/*.js of the parts that carry questions.

   What this exists to prove: an answered question comes back answered — marks, verdict popup and,
   on the matching boards, the answer toggle — whether the learner walked back to it or reloaded the
   page a week later.

   ── Two rules this harness is built around, both learned the hard way in the sibling unit ──

   1. EVERY assertion drives through goTo() (or through a real reload), never by calling a painter
      directly. The sibling's suite called its painters and therefore missed a production lock-up
      that lived in the WIRING between goTo and the painter. A test that calls the painter tests the
      painter; only goTo tests the feature.

   2. Assert on OUTCOMES — the mark, the popup's `hidden` class, the button's `disabled` — never on
      "it did not throw". restoreScreenUI() sits under three layers of try/catch, which is exactly
      what hid a one-token typo in the sibling for two rounds. A swallowed throw looks identical to
      a painter that ran and did nothing, so this file also fails the suite on any console.error
      bearing the [resume] prefix.

   Scripts are executed by injecting real <script> elements, NOT via eval(): unit-js/*.js all start
   with 'use strict', and declarations inside a strict-mode eval stay in the eval's own scope instead
   of becoming globals. Real script tags put top-level function/var on window, which is what the
   production page relies on. `let`/`const` at top level (currentScreen, PEAK_CORRECT) never reach
   window even in a real page, so those are read through an injected expression script.

   The CDN never loads off-platform, so _test/xapi-720-j.js stands in for it — the same local library
   ?xapiLib= exists to load. Its state lives in sessionStorage, which is what makes a genuine reload
   testable: the document is copied out of one window and seeded into the next before its scripts
   run.

   Run (jsdom is NOT in the repo — see _test/README.md):
     NODE_PATH=/c/lomda-test/node_modules node _test/verify-resume.js
*/
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE = process.argv[2] || path.join(__dirname, '..');
const UNIT = 'methodica-science-volume-solid-01';

let pass = 0;
const failures = [];
function ok(ctx, name, cond, extra) {
  if (cond) { pass++; return true; }
  failures.push(ctx + ': ' + name + (extra !== undefined ? '  -> ' + extra : ''));
  return false;
}

/* ═══════════════════ the jsdom rig ═══════════════════ */

function makeRunner(w) {
  const exec = (code) => {
    const s = w.document.createElement('script');
    s.textContent = code;
    w.document.body.appendChild(s);
    s.remove();
  };
  /* Bring a value back from global scope. Errors come back as a marked string rather than throwing,
     so one broken probe cannot abort the run. */
  const val = (expr) => {
    exec('window.__V = (function(){ try { return (' + expr + '); } catch (e) { return "__THREW__" + e.message; } })();');
    return w.__V;
  };
  return { exec, val };
}

/* Boots one component. `state` is a serialised resume document to seed before any script runs —
   that is a RELOAD. Without it the part starts clean (?resetState). */
function boot(part, opts) {
  opts = opts || {};
  const slug = UNIT + '-' + part;
  const dir = path.join(BASE, slug);
  const search = opts.state ? '' : '?resetState';

  const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
    url: 'http://localhost:8777/' + slug + '/index.html' + search,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const { exec, val } = makeRunner(w);

  const errors = [];
  w.addEventListener('error', e => errors.push(String(e.error || e.message)));
  w.console.error = function () { errors.push([].map.call(arguments, String).join(' ')); };
  w.console.warn = function () {};
  w.console.log = function () {};

  /* Metadata is fetched for real by the local library; serve it from disk so xapiQ() resolves
     against the true catalog instead of an empty object. */
  w.fetch = function (url) {
    const rel = String(url).split('?')[0];
    const file = path.resolve(dir, rel);
    if (!fs.existsSync(file)) return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
    const txt = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
    return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(txt)) });
  };

  /* jsdom has no matchMedia, and part 01 reads it at main.js TOP LEVEL
     (`const COMIC_REDUCED_MOTION = window.matchMedia(...)`). Unstubbed it throws there, and every
     declaration after it — SCQ_REG, DDQ_REG, the registrations — silently never happens. Another
     jsdom gap, not a defect. */
  w.matchMedia = w.matchMedia || function (q) {
    return { media: q, matches: false, addEventListener: function () {}, removeEventListener: function () {},
             addListener: function () {}, removeListener: function () {}, onchange: null,
             dispatchEvent: function () { return false; } };
  };

  /* jsdom implements neither load() nor play(); play() returns undefined, so the unit's
     `video.play().catch(...)` throws. A jsdom gap, not a defect — stub to the browser contract. */
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};

  if (opts.state) w.sessionStorage.setItem('__test_state', opts.state);

  /* The local stand-in for the CDN library goes FIRST, so saveState720/loadState720 exist by the
     time anything reads them. */
  exec(fs.readFileSync(path.join(__dirname, 'xapi-720-j.js'), 'utf8'));

  for (const src of [...w.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))) {
    const p = path.resolve(dir, src.split('?')[0]);
    if (!fs.existsSync(p)) { errors.push('missing script file: ' + src); continue; }
    try { exec(fs.readFileSync(p, 'utf8')); } catch (e) { errors.push(src + ': ' + e.message); }
  }

  /* Drive the resume seam exactly as 50-loader.js does, in its order. The loader's own two nested
     loadScript() callbacks need the network, so they never fire here; everything INSIDE them that
     matters to resume is reproduced verbatim. The cross-part hop is deliberately skipped — this
     suite is about painters, and a hop would leave no window to assert against. */
  exec([
    'try {',
    '  var saved = readUnitState();',
    '  _resumeReady = true;',
    '  var payload = saved.parts[currentPartSlug()];',
    '  if (payload) applyExecutionState(payload);',
    '} catch (e) { console.error("[resume] harness init", e); }'
  ].join('\n'));

  return {
    w, exec, val, d: w.document, errors, part,
    /* The state document as the next page load would find it. */
    dump: () => w.sessionStorage.getItem('__test_state'),
    close: () => dom.window.close(),
  };
}

/* ═══════════════════ probes ═══════════════════ */

/* Every class on every option of a screen, keyed by data-id. A hotspot option is two elements with
   one data-id, so the classes are unioned rather than read off the first match. */
function optClasses(p, screen) {
  return p.val('(function(){ var o = {};' +
    ' document.querySelectorAll("#' + screen + ' .scq-opt").forEach(function (e) {' +
    '   var id = e.dataset.id; o[id] = (o[id] || "") + " " + e.className; });' +
    ' return o; })()') || {};
}
const hasClass = (map, id, cls) => !!map[id] && map[id].split(/\s+/).indexOf(cls) !== -1;

/* A title read back through innerHTML comes out with the parser's own serialisation — `<br />` in
   the source is `<br>` on the way out — so both sides are normalised before comparing. */
const sameHtml = (a, b) => String(a).replace(/<br\s*\/?>/g, '<br>') === String(b).replace(/<br\s*\/?>/g, '<br>');

function popup(p, screen, kind) {
  return p.val('(function(){ var el = document.getElementById("' + screen + '-' + kind + '-popup");' +
    ' if (!el) return null;' +
    ' return { hidden: el.classList.contains("hidden"),' +
    '          title: (document.getElementById("' + screen + '-' + kind + '-popup-title") || {}).innerHTML || "",' +
    '          body: (document.getElementById("' + screen + '-' + kind + '-popup-body") || {}).textContent || "" }; })()');
}

const slotClasses = (p, screen) => p.val(
  '[].map.call(document.querySelectorAll("#' + screen + ' .dnd-slot"), function (s) { return s.className; })') || [];

const btnDisabled = (p, id) => p.val('(function(){ var b = document.getElementById("' + id + '"); ' +
  'return b ? !!b.disabled : "__NOBUTTON__"; })()');

/* ═══════════════════ SCQ scenarios ═══════════════════ */

/* Which screens carry a feedback popup, and where to park the learner in between. AWAY is a screen
   with no question of its own, so bouncing off it cannot disturb what is being measured. */
const SCQ_SCREENS = { '01': [10, 13, 14, 15, 16, 19], '02': [1, 2, 3, 4, 5, 6], '04': [1, 2, 3, 4, 5] };
const AWAY        = { '01': 0, '02': 0, '04': 0 };

/* s10's question is locked until the ruler applet has been used. Unlock it the way the learner does,
   not by writing the flag. */
function unlock(p, part, n) {
  if (part === '01' && n === 10) p.exec('aqMeasure();');
}

function ids(p, screen) {
  const correct = p.val('SCQ_REG["' + screen + '"].cfg.correctId');
  const all = p.val('[].map.call(document.querySelectorAll("#' + screen + ' .scq-opt"), function (o) { return o.dataset.id; })') || [];
  const uniq = [...new Set(all)];
  return { correct, wrong: uniq.filter(x => x !== correct) };
}

function scenarioCorrect(p, part) {
  for (const n of SCQ_SCREENS[part]) {
    const screen = 's' + n, ctx = part + '/' + screen;
    p.exec('goTo(' + n + ');');
    unlock(p, part, n);
    const { correct } = ids(p, screen);
    p.exec('scqSelect("' + screen + '", "' + correct + '"); scqCheck("' + screen + '");');

    p.exec('goTo(' + AWAY[part] + '); goTo(' + n + ');');
    const cls = optClasses(p, screen), fb = popup(p, screen, 'scq');
    const want = p.val('SCQ_REG["' + screen + '"].cfg.popups.correct.title');

    ok(ctx, 'correct answer keeps its mark across a return', hasClass(cls, correct, 'correct'), cls[correct]);
    ok(ctx, 'correct feedback reopens on a return', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'the reopened popup is the CORRECT one', fb && sameHtml(fb.title, want), fb && fb.title);
  }
}

function scenarioWrong(p, part) {
  for (const n of SCQ_SCREENS[part]) {
    const screen = 's' + n, ctx = part + '/' + screen;
    p.exec('goTo(' + n + ');');
    unlock(p, part, n);
    const { correct, wrong } = ids(p, screen);
    const w1 = wrong[0];

    // ── one wrong attempt, then leave mid-question ──
    p.exec('scqSelect("' + screen + '", "' + w1 + '"); scqCheck("' + screen + '");');
    p.exec('goTo(' + AWAY[part] + '); goTo(' + n + ');');
    let cls = optClasses(p, screen), fb = popup(p, screen, 'scq');
    ok(ctx, 'mid-attempt wrong mark survives a return', hasClass(cls, w1, 'wrong'), cls[w1]);
    ok(ctx, 'retry feedback reopens on a return', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'the reopened popup is the RETRY one',
       fb && sameHtml(fb.title, p.val('SCQ_REG["' + screen + '"].cfg.popups.retry.title')), fb && fb.title);
    ok(ctx, 'the check button is alive after a mid-attempt return',
       btnDisabled(p, screen + '-scq-check') === false);

    // ── spend the last attempt ──
    p.exec('scqSelect("' + screen + '", "' + w1 + '"); scqCheck("' + screen + '");');
    ok(ctx, 'second wrong attempt closes the question', p.val('!!SCQ_REG["' + screen + '"].done') === true);

    p.exec('goTo(' + AWAY[part] + '); goTo(' + n + ');');
    cls = optClasses(p, screen); fb = popup(p, screen, 'scq');
    ok(ctx, 'wrong-final keeps the learner mark', hasClass(cls, w1, 'wrong'), cls[w1]);
    ok(ctx, 'wrong-final keeps the correct mark', hasClass(cls, correct, 'correct'), cls[correct]);
    ok(ctx, 'wrong-final feedback reopens on a return', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'the reopened popup is the WRONG-FINAL one',
       fb && sameHtml(fb.title, p.val('SCQ_REG["' + screen + '"].cfg.popups.wrong2.title')), fb && fb.title);
  }
}

/* The defect a `phase`-less painter cannot avoid: a re-pick clears the marks and the popup, but
   `attempts` stays spent — so a painter keyed on attempts marks an option the learner never
   submitted. */
function scenarioRepick(p, part) {
  for (const n of SCQ_SCREENS[part]) {
    const screen = 's' + n, ctx = part + '/' + screen;
    p.exec('goTo(' + n + ');');
    unlock(p, part, n);
    const { wrong } = ids(p, screen);
    if (wrong.length < 2) continue;                    // needs two wrong options to re-pick between

    p.exec('scqSelect("' + screen + '", "' + wrong[0] + '"); scqCheck("' + screen + '");');
    p.exec('scqSelect("' + screen + '", "' + wrong[1] + '");');
    p.exec('goTo(' + AWAY[part] + '); goTo(' + n + ');');

    const cls = optClasses(p, screen), fb = popup(p, screen, 'scq');
    ok(ctx, 're-picked option comes back SELECTED', hasClass(cls, wrong[1], 'selected'), cls[wrong[1]]);
    ok(ctx, 're-picked option is NOT marked wrong', !hasClass(cls, wrong[1], 'wrong'), cls[wrong[1]]);
    ok(ctx, 'no feedback over an unsubmitted answer', fb && fb.hidden === true, fb && fb.hidden);
    ok(ctx, 'the check button is alive on a re-picked answer',
       btnDisabled(p, screen + '-scq-check') === false);
  }
}

/* A screen nobody has touched must come back untouched — the painter has to know when to do
   nothing. */
function scenarioPristine(p, part) {
  for (const n of SCQ_SCREENS[part]) {
    const screen = 's' + n, ctx = part + '/' + screen;
    p.exec('goTo(' + n + '); goTo(' + AWAY[part] + '); goTo(' + n + ');');
    const cls = optClasses(p, screen), fb = popup(p, screen, 'scq');
    const marked = Object.keys(cls).filter(k => /\b(correct|wrong|selected)\b/.test(cls[k]));
    ok(ctx, 'pristine screen carries no marks', marked.length === 0, marked.join(','));
    ok(ctx, 'pristine screen shows no feedback', fb && fb.hidden === true, fb && fb.hidden);
  }
}

/* ═══════════════════ the two matching boards ═══════════════════ */

const DDQ_SCREENS = [17, 18];

/* The model board, and a board that is wrong in every slot — built from correctMap so it stays right
   if the content changes. */
function boards(p, screen) {
  return p.val('(function(){ var c = DDQ_REG["' + screen + '"].cfg;' +
    ' var t = c.targets.map(function (x) { return x.id; });' +
    ' var model = {}, wrong = {};' +
    ' c.items.forEach(function (i) { model[i.id] = "source"; wrong[i.id] = "source"; });' +
    ' t.forEach(function (tid, i) { model[c.correctMap[tid]] = tid;' +
    '   wrong[c.correctMap[t[(i + 1) % t.length]]] = tid; });' +
    ' return { model: model, wrong: wrong, n: t.length }; })()');
}

function place(p, screen, board) {
  p.exec('DDQ_REG["' + screen + '"].cfg.placement = ' + JSON.stringify(board) + '; ddqRender("' + screen + '");');
}

function ddqScenarios(p) {
  for (const n of DDQ_SCREENS) {
    const screen = 's' + n, ctx = '01/' + screen;
    const b = boards(p, screen);

    // ── every slot right ──
    p.exec('goTo(' + n + ');');
    place(p, screen, b.model);
    p.exec('ddqCheck("' + screen + '");');
    p.exec('goTo(' + AWAY['01'] + '); goTo(' + n + ');');
    let slots = slotClasses(p, screen), fb = popup(p, screen, 'ddq');
    ok(ctx, 'a fully correct board comes back green',
       slots.length === b.n && slots.every(c => /\bcorrect\b/.test(c)), slots.join(' | '));
    ok(ctx, 'correct feedback reopens on a return', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'a correct board carries NO answer toggle',
       p.val('!document.getElementById("' + screen + '-ddq-answer-toggle")') === true);
  }

  /* The wrong path needs a clean question, so it gets its own window. */
  return DDQ_SCREENS;
}

function ddqWrong(p, n) {
  const screen = 's' + n, ctx = '01/' + screen;
  const b = boards(p, screen);

  p.exec('goTo(' + n + ');');
  place(p, screen, b.wrong);
  p.exec('ddqCheck("' + screen + '");');
  p.exec('goTo(' + AWAY['01'] + '); goTo(' + n + ');');

  let slots = slotClasses(p, screen);
  const fb = popup(p, screen, 'ddq');
  ok(ctx, 'a wrong board reopens on the MODEL answer',
     slots.length === b.n && slots.every(c => /\bcorrect\b/.test(c)), slots.join(' | '));
  ok(ctx, 'wrong feedback reopens on a return', fb && fb.hidden === false, fb && fb.hidden);
  ok(ctx, 'the reopened popup is the INCORRECT one',
     fb && sameHtml(fb.title, p.val('DDQ_REG["' + screen + '"].cfg.popups.incorrect.title')), fb && fb.title);
  ok(ctx, 'the answer toggle is back',
     p.val('(document.getElementById("' + screen + '-ddq-answer-toggle") || {}).textContent') === 'התשובה שלי');
  ok(ctx, 'the board note is back and visible',
     p.val('(function(){ var e = document.getElementById("' + screen + '-ddq-answer-note");' +
           ' return e ? e.style.display !== "none" : false; })()') === true);

  /* The toggle is the whole point: the learner's own answer has to still be reachable. */
  p.exec('ddqToggleAnswer("' + screen + '");');
  slots = slotClasses(p, screen);
  ok(ctx, 'the toggle still yields the learner\'s own board',
     slots.length === b.n && slots.every(c => /\bwrong\b/.test(c)), slots.join(' | '));
  ok(ctx, 'the note hides over the learner\'s own board',
     p.val('document.getElementById("' + screen + '-ddq-answer-note").style.display') === 'none');
  ok(ctx, 'the toggle label flips', p.val('document.getElementById("' + screen + '-ddq-answer-toggle").textContent') === 'תשובה נכונה');

  /* Leaving while looking at your OWN answer and coming back must STILL land on the model board —
     the arrival rule is a rule about arriving, not a memory of the last view. Without this the
     learner returns to the same red board the whole fix exists to get them out of. */
  p.exec('goTo(' + AWAY['01'] + '); goTo(' + n + ');');
  const back = slotClasses(p, screen);
  ok(ctx, 'leaving on your own answer still returns to the model board',
     back.length === b.n && back.every(function (c) { return / correct /.test(' ' + c + ' '); }), back.join(' | '));
  ok(ctx, 'and the toggle offers the learner board again',
     p.val('(document.getElementById("' + screen + '-ddq-answer-toggle") || {}).textContent') === 'התשובה שלי');

  /* And state must not have drifted from what is on screen — the divergence that used to persist
     the learner's board under an answerView that said otherwise. */
  ok(ctx, 'placement agrees with answerView',
     p.val('(function(){ var s = DDQ_REG["' + screen + '"];' +
           ' var want = s.answerView === "learner" ? s.learnerPlacement : s.correctPlacement;' +
           ' return Object.keys(want).every(function (k) { return s.cfg.placement[k] === want[k]; }); })()') === true);
}

/* Drags the learner made but never submitted have to survive a return: ddqEnter()'s unanswered
   branch empties the board back into the source bank before the state is re-applied. */
function ddqUnsubmitted(p, n) {
  const screen = 's' + n, ctx = '01/' + screen;
  const b = boards(p, screen);
  const partial = Object.assign({}, b.model);
  const keys = Object.keys(partial).filter(k => partial[k] !== 'source');
  keys.slice(2).forEach(k => { partial[k] = 'source'; });   // keep only the first two placements

  p.exec('goTo(' + n + ');');
  place(p, screen, partial);
  p.exec('goTo(' + AWAY['01'] + '); goTo(' + n + ');');

  const occupied = p.val('document.querySelectorAll("#' + screen + ' .dnd-slot.occupied").length');
  ok(ctx, 'unsubmitted drags survive a return', occupied === 2, 'occupied=' + occupied);
  ok(ctx, 'an unsubmitted board shows no feedback',
     (popup(p, screen, 'ddq') || {}).hidden === true);
}

/* ═══════════════════ the peak assessment ═══════════════════ */

function peakScenarios(p, part) {
  const ctx = part + '/peak';
  const correct = p.val('PEAK_CORRECT[1]');

  p.exec('goTo(1);');
  ok(ctx, 'options start unlocked', p.val('document.querySelector("#s1-opts .peak-opt").disabled') === false);

  p.exec('peakSelect(1, "' + correct + '", document.querySelector("#s1-opts .peak-opt[data-id=\\"' + correct + '\\"]"));');
  ok(ctx, 'a mere pick does NOT lock the options',
     p.val('document.querySelector("#s1-opts .peak-opt").disabled') === false);

  p.exec('peakContinue(1);');
  p.exec('goTo(1);');
  ok(ctx, 'a committed sub-part is locked',
     p.val('[].every.call(document.querySelectorAll("#s1-opts .peak-opt"), function (o) { return o.disabled; })') === true);
  ok(ctx, 'the committed pick is still shown',
     p.val('document.querySelector("#s1-opts .peak-opt[data-id=\\"' + correct + '\\"]").classList.contains("selected")') === true);

  const other = p.val('(function(){ var o = document.querySelector("#s1-opts .peak-opt:not([data-id=\\"' + correct + '\\"])");' +
                      ' return o ? o.dataset.id : null; })()');
  if (other) {
    p.exec('peakSelect(1, "' + other + '", document.querySelector("#s1-opts .peak-opt[data-id=\\"' + other + '\\"]"));');
    ok(ctx, 'a locked pick cannot be changed', p.val('peakAnswers[1]') === correct, p.val('peakAnswers[1]'));
  }
}

/* ═══════════════════ reloads ═══════════════════ */

function reloadTests() {
  /* R1 — a correct SCQ answer, then a real page load. */
  {
    const a = boot('01');
    a.exec('goTo(13);');
    const correct = a.val('SCQ_REG["s13"].cfg.correctId');
    a.exec('scqSelect("s13", "' + correct + '"); scqCheck("s13");');
    const state = a.dump();
    a.close();

    ok('reload/01', 'the answer reached the state document synchronously', !!state && state.indexOf('"phase"') !== -1);

    const b = boot('01', { state });
    const ctx = 'reload/01/s13';
    ok(ctx, 'resumes onto the answered screen', b.val('currentScreen') === 13, b.val('currentScreen'));
    ok(ctx, 'the correct mark is repainted', hasClass(optClasses(b, 's13'), correct, 'correct'));
    const fb = popup(b, 's13', 'scq');
    ok(ctx, 'the feedback is repainted', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'it is the CORRECT popup', fb && sameHtml(fb.title, b.val('SCQ_REG["s13"].cfg.popups.correct.title')));
    collectErrors(ctx, b);
    b.close();
  }

  /* R2 — the learner's report: a wrong matching answer, viewed as "my answer", then reloaded. */
  {
    const a = boot('01');
    a.exec('goTo(18);');
    const b18 = boards(a, 's18');
    place(a, 's18', b18.wrong);
    a.exec('ddqCheck("s18"); ddqToggleAnswer("s18");');    // leave it showing the learner's own board
    a.exec('flushResumeSave();');
    const state = a.dump();
    a.close();

    const b = boot('01', { state });
    const ctx = 'reload/01/s18';
    ok(ctx, 'resumes onto the matching screen', b.val('currentScreen') === 18, b.val('currentScreen'));
    ok(ctx, 'both boards survived the reload',
       b.val('!!(DDQ_REG["s18"].learnerPlacement && DDQ_REG["s18"].correctPlacement)') === true);
    const slots = slotClasses(b, 's18');
    ok(ctx, 'it reopens on the MODEL answer, not on five red slots',
       slots.length === b18.n && slots.every(c => /\bcorrect\b/.test(c)), slots.join(' | '));
    const fb = popup(b, 's18', 'ddq');
    ok(ctx, 'the feedback is repainted', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'the answer toggle is reachable again',
       b.val('!!document.getElementById("s18-ddq-answer-toggle")') === true);
    b.exec('ddqToggleAnswer("s18");');
    const own = slotClasses(b, 's18');
    ok(ctx, 'and it still leads back to the learner\'s own answer',
       own.length === b18.n && own.every(c => /\bwrong\b/.test(c)), own.join(' | '));
    collectErrors(ctx, b);
    b.close();
  }

  /* R3 — a wrong-final in a different part, to prove the painter is not part-01-shaped. */
  {
    const a = boot('02');
    a.exec('goTo(3);');
    const { correct, wrong } = ids(a, 's3');
    a.exec('scqSelect("s3", "' + wrong[0] + '"); scqCheck("s3");');
    a.exec('scqSelect("s3", "' + wrong[0] + '"); scqCheck("s3");');
    const state = a.dump();
    a.close();

    const b = boot('02', { state });
    const ctx = 'reload/02/s3';
    ok(ctx, 'resumes onto the answered screen', b.val('currentScreen') === 3, b.val('currentScreen'));
    const cls = optClasses(b, 's3');
    ok(ctx, 'the learner mark is repainted', hasClass(cls, wrong[0], 'wrong'), cls[wrong[0]]);
    ok(ctx, 'the correct mark is repainted', hasClass(cls, correct, 'correct'), cls[correct]);
    const fb = popup(b, 's3', 'scq');
    ok(ctx, 'the feedback is repainted', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'it is the WRONG-FINAL popup', fb && sameHtml(fb.title, b.val('SCQ_REG["s3"].cfg.popups.wrong2.title')));
    collectErrors(ctx, b);
    b.close();
  }

  /* R4 — a committed peak sub-part stays locked across a reload. */
  {
    const a = boot('05');
    a.exec('goTo(1);');
    const c = a.val('PEAK_CORRECT[1]');
    a.exec('peakSelect(1, "' + c + '", document.querySelector("#s1-opts .peak-opt[data-id=\\"' + c + '\\"]"));');
    a.exec('peakContinue(1);');
    const state = a.dump();
    a.close();

    const b = boot('05', { state });
    const ctx = 'reload/05/s1';
    b.exec('goTo(1);');
    ok(ctx, 'the commitment survived the reload', b.val('!!peakCommitted[1]') === true);
    ok(ctx, 'the options are still locked',
       b.val('[].every.call(document.querySelectorAll("#s1-opts .peak-opt"), function (o) { return o.disabled; })') === true);
    collectErrors(ctx, b);
    b.close();
  }
}

/* A swallowed throw and a painter that did nothing look identical from the outside, so any
   [resume] error is itself a failure. */
function collectErrors(ctx, p) {
  const resume = p.errors.filter(e => /\[resume\]/.test(e));
  ok(ctx, 'no [resume] errors', resume.length === 0, resume.join(' | '));
  const other = p.errors.filter(e => !/\[resume\]/.test(e));
  ok(ctx, 'no script load errors', other.length === 0, other.slice(0, 3).join(' | '));
}

/* ═══════════════════ run ═══════════════════ */

function main() {
  for (const part of ['01', '02', '04']) {
    for (const [name, fn] of [['correct', scenarioCorrect], ['wrong', scenarioWrong],
                              ['repick', scenarioRepick], ['pristine', scenarioPristine]]) {
      const p = boot(part);
      fn(p, part);
      collectErrors(part + '/' + name, p);
      p.close();
    }
  }

  {
    const p = boot('01'); ddqScenarios(p); collectErrors('01/ddq-correct', p); p.close();
  }
  for (const n of DDQ_SCREENS) {
    let p = boot('01'); ddqWrong(p, n); collectErrors('01/ddq-wrong-s' + n, p); p.close();
    p = boot('01'); ddqUnsubmitted(p, n); collectErrors('01/ddq-partial-s' + n, p); p.close();
  }

  for (const part of ['05', '06']) {
    const p = boot(part); peakScenarios(p, part); collectErrors(part + '/peak', p); p.close();
  }

  reloadTests();

  console.log('\n' + pass + ' passed, ' + failures.length + ' failed');
  if (failures.length) {
    console.log('\nFAILURES\n' + failures.map(f => '  ' + f).join('\n'));
    process.exit(1);
  }
  console.log('all resume checks passed');
}

main();
