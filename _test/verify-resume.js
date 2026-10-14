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
const SCQ_SCREENS = { '01': [15, 29, 31, 32, 33, 35], '02': [1, 2, 3, 4, 6, 7], '04': [1, 2, 3, 4, 5] };
const AWAY        = { '01': 0, '02': 0, '04': 0 };

/* s15's question is locked until the ruler applet has been used. Unlock it the way the learner does,
   not by writing the flag. */
function unlock(p, part, n) {
  if (part === '01' && n === 15) p.exec('aqMeasure();');
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
    /* Retry gate (2026-10-11): the judged option cannot be submitted again — the button is locked on
       it after a return, re-picking it changes nothing, and a submit on it is refused unspent. */
    ok(ctx, 'the check button stays locked on the judged option after a return',
       btnDisabled(p, screen + '-scq-check') === true);
    p.exec('scqSelect("' + screen + '", "' + w1 + '"); scqCheck("' + screen + '");');
    ok(ctx, 'the same wrong option again spends no attempt',
       p.val('SCQ_REG["' + screen + '"].attempts') === 1 && p.val('SCQ_REG["' + screen + '"].phase') === 'retry' && btnDisabled(p, screen + '-scq-check') === true);

    // ── spend the last attempt, on a DIFFERENT wrong option ──
    const w2 = wrong[1];
    if (!w2) continue;                                   // one wrong option only: no wrong-final to reach
    p.exec('scqSelect("' + screen + '", "' + w2 + '");');
    ok(ctx, 'a different option opens the check button', btnDisabled(p, screen + '-scq-check') === false);
    p.exec('scqCheck("' + screen + '");');
    ok(ctx, 'second wrong attempt closes the question', p.val('!!SCQ_REG["' + screen + '"].done') === true);

    p.exec('goTo(' + AWAY[part] + '); goTo(' + n + ');');
    cls = optClasses(p, screen); fb = popup(p, screen, 'scq');
    ok(ctx, 'wrong-final keeps the learner mark', hasClass(cls, w2, 'wrong'), cls[w2]);
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

const DDQ_SCREENS = [34, 28];

/* The model board, and a board that is wrong in every slot — built from correctMap so it stays right
   if the content changes. */
function boards(p, screen) {
  return p.val('(function(){ var c = DDQ_REG["' + screen + '"].cfg;' +
    ' var t = c.targets.map(function (x) { return x.id; });' +
    ' var model = {}, wrong = {};' +
    ' c.items.forEach(function (i) { model[i.id] = "source"; wrong[i.id] = "source"; });' +
    ' var part = {}; c.items.forEach(function (i) { part[i.id] = "source"; });' +
    ' t.forEach(function (tid, i) { model[c.correctMap[tid]] = tid;' +
    '   wrong[c.correctMap[t[(i + 1) % t.length]]] = tid; });' +
    /* partly right: the first target holds its own item; the others are rotated among themselves */
    ' var rest = t.slice(1); part[c.correctMap[t[0]]] = t[0];' +
    ' rest.forEach(function (tid, i) { part[c.correctMap[rest[(i + 1) % rest.length]]] = tid; });' +
    ' return { model: model, wrong: wrong, partly: part, n: t.length }; })()');
}

function place(p, screen, board) {
  p.exec('DDQ_REG["' + screen + '"].cfg.placement = ' + JSON.stringify(board) + '; ddqRender("' + screen + '");');
}

/* Check a board as the learner's FINAL answer. s34 takes two attempts (slides 66-70, 2026-10-11), so
   there the first attempt is spent on the other wrong board — different, so the retry gate allows the
   second check — and `board` is what the question resolves on. Single-attempt boards check once. */
function ddqCheckFinal(p, screen, board, b) {
  if (p.val('DDQ_REG["' + screen + '"].cfg.maxAttempts') > 1) {
    place(p, screen, board === b.wrong ? b.partly : b.wrong);
    p.exec('ddqCheck("' + screen + '");');
  }
  place(p, screen, board);
  p.exec('ddqCheck("' + screen + '");');
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
  ddqCheckFinal(p, screen, b.wrong, b);
  p.exec('goTo(' + AWAY['01'] + '); goTo(' + n + ');');

  let slots = slotClasses(p, screen);
  const fb = popup(p, screen, 'ddq');
  ok(ctx, 'a wrong board reopens on the MODEL answer',
     slots.length === b.n && slots.every(c => /\bcorrect\b/.test(c)), slots.join(' | '));
  ok(ctx, 'wrong feedback reopens on a return', fb && fb.hidden === false, fb && fb.hidden);
  /* Title: first line the authored wrong title (nothing on this board is right), second line the
     board note — slide 70's two bold lines (G7, 2026-10-10). */
  const t1 = p.val('DDQ_REG["' + screen + '"].cfg.popups.incorrect.title');
  const note = p.val('DDQ_REG["' + screen + '"].cfg.answerNote');
  ok(ctx, 'the reopened popup is the INCORRECT one',
     fb && sameHtml(fb.title, t1 + '<br>' + note), fb && fb.title);
  ok(ctx, 'the answer toggle is back',
     p.val('(document.getElementById("' + screen + '-ddq-answer-toggle") || {}).textContent') === 'התשובה שלי');
  ok(ctx, 'the board note is back as the title\'s second line',
     fb && fb.title.split(/<br\s*\/?>/)[1] === note, fb && fb.title);
  ok(ctx, 'the explanation body has no note paragraph',
     p.val('!document.getElementById("' + screen + '-ddq-answer-note")') === true);

  /* The toggle is the whole point: the learner's own answer has to still be reachable. */
  p.exec('ddqToggleAnswer("' + screen + '");');
  slots = slotClasses(p, screen);
  ok(ctx, 'the toggle still yields the learner\'s own board',
     slots.length === b.n && slots.every(c => /\bwrong\b/.test(c)), slots.join(' | '));
  const own = popup(p, screen, 'ddq');
  ok(ctx, 'over the learner\'s own board the second line is the View My Answer line',
     own && sameHtml(own.title, t1 + '<br>אפשר לצפות שוב בפתרון הנכון.'), own && own.title);
  ok(ctx, 'and the explanation body is unchanged',   // paragraphs only — the toggle's label flips by design
     own && fb && own.body.replace('תשובה נכונה', '') === fb.body.replace('התשובה שלי', ''));
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

/* A partly right board (G7): the first title line is 'not fully correct' on the model board, on
   the learner's own board, and after a return — decided from the snapshot, never from the board. */
function ddqPartlyRight(p, n) {
  const screen = 's' + n, ctx = '01/' + screen + '/partly';
  const b = boards(p, screen);
  p.exec('goTo(' + n + ');');
  ddqCheckFinal(p, screen, b.partly, b);
  const note = p.val('DDQ_REG["' + screen + '"].cfg.answerNote');
  const FIRST = 'התשובה אינה נכונה במלואה.';
  let fb = popup(p, screen, 'ddq');
  ok(ctx, 'a partly right board is still scored wrong', p.val('XAPI_Q_RESULTS["' + p.val('DDQ_REG["' + screen + '"].cfg.item') + '/q1"]') === false);
  ok(ctx, 'model view: not-fully title + board note', fb && sameHtml(fb.title, FIRST + '<br>' + note), fb && fb.title);
  p.exec('ddqToggleAnswer("' + screen + '");');
  fb = popup(p, screen, 'ddq');
  ok(ctx, 'own view: not-fully title + View My Answer line', fb && sameHtml(fb.title, FIRST + '<br>אפשר לצפות שוב בפתרון הנכון.'), fb && fb.title);
  p.exec('goTo(' + AWAY['01'] + '); goTo(' + n + ');');
  fb = popup(p, screen, 'ddq');
  ok(ctx, 'after a return: still not-fully, back on the model board', fb && sameHtml(fb.title, FIRST + '<br>' + note), fb && fb.title);
}

/* s34's retry phase (two attempts, 2026-10-11): between the attempts nothing is resolved, and a
   return or a reload must bring back exactly the retry look — popup, per-slot marks, the closed gate,
   the hint — without sending anything. Then the second attempt resolves it once. */
function ddqRetryState(p, screen) {
  return p.val('(function(){ var s = DDQ_REG["' + screen + '"];' +
    ' var chk = document.getElementById("' + screen + '-ddq-check"), h = document.getElementById("' + screen + '-ddq-hint");' +
    ' return { attempts: s.attempts, phase: s.phase, done: s.done, checkDisabled: chk.disabled, hint: h.style.visibility,' +
    '   answered: __stmts().filter(function (x) { return /^answered/.test(x.verb) && /-01-08\\//.test(x.questionId || ""); }).map(function (x) { return x.verb; }).join(",") }; })()');
}
/* xapiSend() defers to the next tick, so the log is read after one. */
const nextTick = () => new Promise(r => setTimeout(r, 20));
async function ddqRetry(p) {
  const screen = 's34', ctx = '01/s34/retry';
  const b = boards(p, screen);
  p.exec('goTo(34);');
  ok(ctx, 'the hint starts hidden (slide 68: after a first wrong answer)', ddqRetryState(p, screen).hint === 'hidden');
  place(p, screen, b.wrong);
  p.exec('ddqCheck("s34");');
  await nextTick();
  let st = ddqRetryState(p, screen), fb = popup(p, screen, 'ddq'), slots = slotClasses(p, screen);
  ok(ctx, 'a first wrong check is an interim answered, unresolved', st.attempts === 1 && st.phase === 'retry' && !st.done && st.answered === 'answered', JSON.stringify(st));
  ok(ctx, 'no result recorded yet', p.val('XAPI_Q_RESULTS["08/q1"] === undefined') === true);
  ok(ctx, 'the retry popup: title + שננסה שוב?', fb && !fb.hidden && fb.title === 'התשובה אינה נכונה.' && /שננסה שוב/.test(fb.body), fb && fb.title + ' | ' + fb.body);
  ok(ctx, 'every judged slot carries its verdict', slots.length === b.n && slots.every(c => /\bwrong\b/.test(c)), slots.join(' | '));
  ok(ctx, 'the gate is closed on the judged board, the hint is shown', st.checkDisabled === true && st.hint === '', JSON.stringify(st));

  p.exec('goTo(' + AWAY['01'] + '); goTo(34);');
  await nextTick();
  st = ddqRetryState(p, screen); fb = popup(p, screen, 'ddq'); slots = slotClasses(p, screen);
  ok(ctx, 'a return keeps the retry look and sends nothing',
     st.attempts === 1 && st.phase === 'retry' && fb && !fb.hidden && slots.every(c => /\bwrong\b/.test(c)) && st.checkDisabled === true && st.hint === '' && st.answered === 'answered', JSON.stringify(st));

  p.exec('flushResumeSave();');
  const state = p.dump();
  const r = boot('01', { state });
  r.exec('if (currentScreen !== 17) goTo(34);');
  await nextTick();
  st = ddqRetryState(r, screen); fb = popup(r, screen, 'ddq'); slots = slotClasses(r, screen);
  ok('reload/' + ctx, 'a reload keeps the retry look (popup, marks, gate, hint)',
     st.attempts === 1 && st.phase === 'retry' && fb && !fb.hidden && slots.every(c => /\bwrong\b/.test(c)) && st.checkDisabled === true && st.hint === '', JSON.stringify(st));
  ok('reload/' + ctx, 'and sends nothing', r.val('__stmts().filter(function (x) { return /^answered/.test(x.verb); }).length') === 0);

  place(r, screen, b.model);
  st = ddqRetryState(r, screen);
  ok('reload/' + ctx, 'a different full board opens the gate', st.checkDisabled === false, JSON.stringify(st));
  r.exec('ddqCheck("s34");');
  await nextTick();
  st = ddqRetryState(r, screen); fb = popup(r, screen, 'ddq');
  ok('reload/' + ctx, 'right on the second attempt: one answered.last, counted correct',
     st.done && st.answered === 'answered.last' && r.val('XAPI_Q_RESULTS["08/q1"]') === true && r.val('practiceProgress.questions[3].state') === 'correct', JSON.stringify(st));
  ok('reload/' + ctx, 'correct popup, hint hidden', fb && !fb.hidden && /תשובה נכונה/.test(fb.title) && st.hint === 'hidden', fb && fb.title);
  r.exec('goTo(' + AWAY['01'] + '); goTo(34);');
  await nextTick();
  ok('reload/' + ctx, 'no duplicate answered.last', r.val('__dupes().length') === 0);
  collectErrors('reload/' + ctx, r);
  r.close();
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

  p.exec('peakSelect(1, "' + correct + '");');
  ok(ctx, 'a mere pick does NOT lock the options',
     p.val('document.querySelector("#s1-opts .peak-opt").disabled') === false);

  p.exec('peakCheck(1);');
  p.exec('goTo(1);');
  ok(ctx, 'a resolved sub-part is locked',
     p.val('[].every.call(document.querySelectorAll("#s1-opts .peak-opt"), function (o) { return o.disabled; })') === true);
  ok(ctx, 'the correct pick is still marked',
     p.val('document.querySelector("#s1-opts .peak-opt[data-id=\\"' + correct + '\\"]").classList.contains("correct")') === true);
  ok(ctx, 'its feedback is shown again',
     p.val('!document.getElementById("s1-scq-popup").classList.contains("hidden")') === true);

  const other = p.val('(function(){ var o = document.querySelector("#s1-opts .peak-opt:not([data-id=\\"' + correct + '\\"])");' +
                      ' return o ? o.dataset.id : null; })()');
  if (other) {
    p.exec('peakSelect(1, "' + other + '");');
    ok(ctx, 'a locked pick cannot be changed', p.val('peakState[1].sel') === correct, p.val('peakState[1].sel'));
  }
}

/* ═══════════════════ reloads ═══════════════════ */

function reloadTests() {
  /* R1 — a correct SCQ answer, then a real page load. */
  {
    const a = boot('01');
    a.exec('goTo(31);');
    const correct = a.val('SCQ_REG["s31"].cfg.correctId');
    a.exec('scqSelect("s31", "' + correct + '"); scqCheck("s31");');
    const state = a.dump();
    a.close();

    ok('reload/01', 'the answer reached the state document synchronously', !!state && state.indexOf('"phase"') !== -1);

    const b = boot('01', { state });
    const ctx = 'reload/01/s31';
    ok(ctx, 'resumes onto the answered screen', b.val('currentScreen') === 31, b.val('currentScreen'));
    ok(ctx, 'the correct mark is repainted', hasClass(optClasses(b, 's31'), correct, 'correct'));
    const fb = popup(b, 's31', 'scq');
    ok(ctx, 'the feedback is repainted', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'it is the CORRECT popup', fb && sameHtml(fb.title, b.val('SCQ_REG["s31"].cfg.popups.correct.title')));
    collectErrors(ctx, b);
    b.close();
  }

  /* R2 — the learner's report: a wrong matching answer, viewed as "my answer", then reloaded. */
  {
    const a = boot('01');
    a.exec('goTo(28);');
    const b18 = boards(a, 's28');
    place(a, 's28', b18.wrong);
    a.exec('ddqCheck("s28"); ddqToggleAnswer("s28");');    // leave it showing the learner's own board
    a.exec('flushResumeSave();');
    const state = a.dump();
    a.close();

    const b = boot('01', { state });
    const ctx = 'reload/01/s28';
    ok(ctx, 'resumes onto the matching screen', b.val('currentScreen') === 28, b.val('currentScreen'));
    ok(ctx, 'both boards survived the reload',
       b.val('!!(DDQ_REG["s28"].learnerPlacement && DDQ_REG["s28"].correctPlacement)') === true);
    const slots = slotClasses(b, 's28');
    ok(ctx, 'it reopens on the MODEL answer, not on five red slots',
       slots.length === b18.n && slots.every(c => /\bcorrect\b/.test(c)), slots.join(' | '));
    const fb = popup(b, 's28', 'ddq');
    ok(ctx, 'the feedback is repainted', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'the answer toggle is reachable again',
       b.val('!!document.getElementById("s28-ddq-answer-toggle")') === true);
    b.exec('ddqToggleAnswer("s28");');
    const own = slotClasses(b, 's28');
    ok(ctx, 'and it still leads back to the learner\'s own answer',
       own.length === b18.n && own.every(c => /\bwrong\b/.test(c)), own.join(' | '));
    collectErrors(ctx, b);
    b.close();
  }

  /* R2b — a PARTLY right matching answer, then reloaded: the 'not fully' title is re-derived. */
  {
    const a = boot('01');
    a.exec('goTo(34);');
    const b17 = boards(a, 's34');
    ddqCheckFinal(a, 's34', b17.partly, b17);
    a.exec('flushResumeSave();');
    const state = a.dump();
    a.close();
    const b = boot('01', { state });
    const ctx = 'reload/01/s34/partly';
    const fb = popup(b, 's34', 'ddq');
    ok(ctx, 'the not-fully title survives a reload',
       fb && sameHtml(fb.title, 'התשובה אינה נכונה במלואה.<br>' + b.val('DDQ_REG["s34"].cfg.answerNote')), fb && fb.title);
    collectErrors(ctx, b);
    b.close();
  }

  /* R3 — a wrong-final in a different part, to prove the painter is not part-01-shaped. */
  {
    const a = boot('02');
    a.exec('goTo(3);');
    const { correct, wrong } = ids(a, 's3');
    a.exec('scqSelect("s3", "' + wrong[0] + '"); scqCheck("s3");');
    a.exec('scqSelect("s3", "' + wrong[1] + '"); scqCheck("s3");');   // retry gate: a different wrong option
    const state = a.dump();
    a.close();

    const b = boot('02', { state });
    const ctx = 'reload/02/s3';
    ok(ctx, 'resumes onto the answered screen', b.val('currentScreen') === 3, b.val('currentScreen'));
    const cls = optClasses(b, 's3');
    ok(ctx, 'the learner mark is repainted', hasClass(cls, wrong[1], 'wrong'), cls[wrong[1]]);
    ok(ctx, 'the correct mark is repainted', hasClass(cls, correct, 'correct'), cls[correct]);
    const fb = popup(b, 's3', 'scq');
    ok(ctx, 'the feedback is repainted', fb && fb.hidden === false, fb && fb.hidden);
    ok(ctx, 'it is the WRONG-FINAL popup', fb && sameHtml(fb.title, b.val('SCQ_REG["s3"].cfg.popups.wrong2.title')));
    collectErrors(ctx, b);
    b.close();
  }

  /* R4 — a resolved peak sub-part stays locked across a reload. */
  {
    const a = boot('05');
    a.exec('goTo(1);');
    const c = a.val('PEAK_CORRECT[1]');
    a.exec('peakSelect(1, "' + c + '");');
    a.exec('peakCheck(1);');
    const state = a.dump();
    a.close();

    const b = boot('05', { state });
    const ctx = 'reload/05/s1';
    b.exec('goTo(1);');
    ok(ctx, 'the resolution survived the reload', b.val('!!(peakState[1] && peakState[1].done)') === true);
    ok(ctx, 'the feedback is repainted', b.val('!document.getElementById("s1-scq-popup").classList.contains("hidden")') === true);
    ok(ctx, 'the options are still locked',
       b.val('[].every.call(document.querySelectorAll("#s1-opts .peak-opt"), function (o) { return o.disabled; })') === true);
    collectErrors(ctx, b);
    b.close();
  }
}

/* ═══════════════════ comic (part 01) ═══════════════════
   The comic is one carousel over seven screens (COMIC_SCREENS). What must survive a reload: the
   screen, the panel, which panels were seen (the forward gate), the guess picks (the guess gate),
   and the `reported` flags (one 'experienced' per comic screen, never re-sent). What must NOT come
   back: an open zoom, or more than one bubble reveal. All walking goes through the carousel's own
   functions (comicArrowNext/Prev, guessPick), the same ones the arrows and the keyboard call. */

const sleep = ms => new Promise(r => setTimeout(r, ms));

function comicProbe(p, sid) {
  return p.val('(function () {' +
    ' var st = comicState["' + sid + '"] || {};' +
    ' var tr = [].map.call(document.querySelectorAll("#' + sid + ' .comic-track"), function (t) { return t.style.transform; });' +
    ' var dots = [].map.call(document.querySelectorAll("#' + sid + '-dots .comic-dot"), function (d) { return d.className; });' +
    ' var rev = [].map.call(document.querySelectorAll("#' + sid + '-bleed-track .comic-panel"), function (x, k) { return x.classList.contains("is-revealed") ? k : -1; }).filter(function (k) { return k >= 0; });' +
    ' var g = function (id) { var e = document.getElementById(id); return e ? e.disabled : null; };' +
    ' return { i: st.i, seen: st.seen, done: !!st.done, reported: !!st.reported, tracks: tr, dots: dots, revealed: rev,' +
    '   prev: g("' + sid + '-prev"), next: g("' + sid + '-next"), cont: g("' + sid + '-continue"),' +
    '   zoom: comicZoomedId, zoomCls: !!document.querySelector("#' + sid + ' .comic-frame.is-zoomed") };' +
    '})()');
}
function experiencedCount(p) {
  return p.val('__stmts().filter(function (s) { return /experienced/.test(JSON.stringify(s.verb || s)); }).length');
}

/* Walk part 01 from s0 into the comic: character, comic path, then the carousel to s11 panel 3,
   picking option c on the s10 guess on the way. */
function walkIntoComic(a) {
  a.exec('selectOption(document.querySelector("#s0 .option-card[data-value=orange]"));');
  a.exec('goTo(7); selectPathOption(document.querySelector("#s7 .option-card[data-value=comic]")); advanceFromPathChoice();');
  a.exec('comicArrowNext("s8");');                                   // s8 (single panel) -> s9
  a.exec('comicArrowNext("s9");');                                  // s9 (single panel) -> s10
  a.exec('guessPick("s10", document.querySelector("#s10-guess .guess-opt[data-id=c]"));');
  a.exec('comicArrowNext("s10");');                                  // s10 -> s11 panel 1
  a.exec('comicArrowNext("s11"); comicArrowNext("s11");');          // panel 3
}

async function comicTests() {
  /* C1 — reload in the middle of s11, with the zoom left open. */
  let state;
  {
    const a = boot('01');
    walkIntoComic(a);
    const ctx = 'comic/walk';
    ok(ctx, 'the walk reached s11 panel 3', a.val('currentScreen') === 11 && a.val('comicState.s11.i') === 2,
       a.val('currentScreen') + '/' + a.val('comicState.s11 && comicState.s11.i'));
    a.exec('comicZoomOpen("s11");');
    await sleep(50);
    ok(ctx, 'one experienced each for s8 and s9, none yet for s11', experiencedCount(a) === 2, experiencedCount(a));
    a.exec('flushResumeSave();');
    state = a.dump();
    collectErrors(ctx, a);
    a.close();
  }
  {
    const b = boot('01', { state });
    const ctx = 'comic/reload-s25';
    ok(ctx, 'resumes onto s11', b.val('currentScreen') === 11, b.val('currentScreen'));
    ok(ctx, 'on the comic path', b.val('window.lomdaState.learningPath') === 'comic', b.val('window.lomdaState.learningPath'));
    let c = comicProbe(b, 's11');
    ok(ctx, 'on panel 3', c.i === 2, c.i);
    ok(ctx, 'both tracks painted at panel 3 at once (no slide from panel 1)',
       c.tracks.length === 2 && c.tracks.every(t => t === 'translateX(200%)'), c.tracks.join(' | '));
    ok(ctx, 'seen = panels 1–3 only', JSON.stringify(c.seen) === '[true,true,true,false,false]', JSON.stringify(c.seen));
    ok(ctx, 'the active dot is the third', /is-active/.test(c.dots[2]) && c.dots.filter(d => /is-active/.test(d)).length === 1, c.dots.join(' | '));
    ok(ctx, 'the slider is not done, so Continue stays locked', c.done === false && c.cont === true, c.done + '/' + c.cont);
    ok(ctx, 'both carousel arrows are live mid-slider', c.prev === false && c.next === false, c.prev + '/' + c.next);
    ok(ctx, 'the zoom did not survive the reload', c.zoom === null && c.zoomCls === false, c.zoom + '/' + c.zoomCls);
    ok(ctx, 'no bubbles revealed before the reveal delay', c.revealed.length === 0, c.revealed.join(','));
    await sleep(1200);
    c = comicProbe(b, 's11');
    ok(ctx, 'exactly one panel revealed, and it is panel 3', c.revealed.length === 1 && c.revealed[0] === 2, c.revealed.join(','));
    ok(ctx, 'no experienced re-sent on resume', experiencedCount(b) === 0, experiencedCount(b));

    /* Back across the carousel to the guess: the pick, the bubble and the forward gate are intact. */
    b.exec('comicArrowPrev("s11"); comicArrowPrev("s11"); comicArrowPrev("s11");');
    ok(ctx, 'the back arrow crosses to s10', b.val('currentScreen') === 10, b.val('currentScreen'));
    ok(ctx, 's10: the pick is restored',
       b.val('document.querySelector("#s10-guess .guess-opt[data-id=c]").classList.contains("selected")') === true);
    ok(ctx, 's10: the mascot + bubble are shown',
       b.val('!document.getElementById("s10-guess-bubble").classList.contains("hidden")') === true);
    ok(ctx, 's10: forward arrow live, Continue still locked (not the comic end)',
       b.val('document.getElementById("s10-next").disabled') === false && b.val('document.getElementById("s10-continue").disabled') === true);

    /* Forward again: s11 comes back on its remembered panel, the seen gate intact, then finishes once. */
    b.exec('comicArrowNext("s10");');
    c = comicProbe(b, 's11');
    ok(ctx, 'forward lands on s11 at its remembered panel', b.val('currentScreen') === 11 && c.i === 0, b.val('currentScreen') + '/' + c.i);
    ok(ctx, 'seen survived the round trip', c.dots.filter(d => /is-seen|is-active/.test(d)).length === 3, c.dots.join(' | '));
    b.exec('for (var k = 0; k < 4; k++) comicArrowNext("s11");');
    await sleep(50);
    c = comicProbe(b, 's11');
    ok(ctx, 'finishing s11 marks it done and unlocks the forward arrow', c.done === true && c.next === false, c.done + '/' + c.next);
    ok(ctx, 'exactly one experienced for s11', experiencedCount(b) === 1, experiencedCount(b));
    b.exec('comicArrowNext("s11"); comicArrowPrev("s12"); comicArrowNext("s11");');
    await sleep(50);
    ok(ctx, 'leaving and re-finishing s11 does not re-send it', experiencedCount(b) === 1, experiencedCount(b));
    /* s9 and s8 were finished BEFORE the reload and never rebuilt since: walking back onto them
       must find their saved records (done + reported), not seed fresh ones. */
    b.exec('goTo(10); comicArrowPrev("s10"); comicArrowPrev("s9");');
    await sleep(50);
    ok(ctx, 'walking back reaches s8', b.val('currentScreen') === 8, b.val('currentScreen'));
    ok(ctx, 's9/s8 keep their pre-reload progress',
       b.val('!!(comicState.s9 && comicState.s9.done && comicState.s9.reported && comicState.s8 && comicState.s8.reported)') === true,
       JSON.stringify(b.val('[comicState.s9, comicState.s8].map(function (s) { return s && { done: s.done, reported: s.reported }; })')));
    ok(ctx, 'and do not re-send their experienced', experiencedCount(b) === 1, experiencedCount(b));
    ok(ctx, 'no duplicate completed/answered', b.val('__dupes().length') === 0, JSON.stringify(b.val('__dupes()')));
    collectErrors(ctx, b);
    b.close();
  }

  /* C2 — reload on the s12 guess after a pick: gate and pick restored. */
  {
    const a = boot('01');
    walkIntoComic(a);
    a.exec('for (var k = 0; k < 3; k++) comicArrowNext("s11"); comicArrowNext("s11");');   // finish s11 -> s12
    a.exec('guessPick("s12", document.querySelector("#s12-guess .guess-opt[data-id=b]"));');
    a.exec('flushResumeSave();');
    const st2 = a.dump();
    a.close();
    const b = boot('01', { state: st2 });
    const ctx = 'comic/reload-s26';
    ok(ctx, 'resumes onto s12', b.val('currentScreen') === 12, b.val('currentScreen'));
    ok(ctx, 'the pick is restored',
       b.val('document.querySelector("#s12-guess .guess-opt[data-id=b]").classList.contains("selected")') === true);
    ok(ctx, 'the forward arrow is live (gate satisfied)', b.val('document.getElementById("s12-next").disabled') === false);
    ok(ctx, 'Continue stays locked mid-comic', b.val('document.getElementById("s12-continue").disabled') === true);
    b.exec('comicArrowPrev("s12");');
    ok(ctx, 'back lands on s11, finished', b.val('currentScreen') === 11 && b.val('comicState.s11.done') === true,
       b.val('currentScreen') + ' / ' + JSON.stringify(b.val('comicState.s11 ? {i: comicState.s11.i, seen: comicState.s11.seen, done: comicState.s11.done} : null')));
    collectErrors(ctx, b);
    b.close();
  }

  /* C3 — reload at the comic end: s14 finished -> Continue open, next arrow grey, Continue reaches the shared ending. */
  {
    const a = boot('01');
    walkIntoComic(a);
    a.exec('for (var k = 0; k < 3; k++) comicArrowNext("s11"); comicArrowNext("s11");');
    a.exec('guessPick("s12", document.querySelector("#s12-guess .guess-opt[data-id=c]")); comicArrowNext("s12");');
    a.exec('for (var k = 0; k < 7; k++) comicArrowNext("s13");');
    a.exec('for (var k = 0; k < 2; k++) comicArrowNext("s14");');
    ok('comic/walk-end', 'the walk reached the last panel of s14',
       a.val('currentScreen') === 14 && a.val('comicState.s14.done') === true, a.val('currentScreen'));
    a.exec('flushResumeSave();');
    const st3 = a.dump();
    a.close();
    const b = boot('01', { state: st3 });
    const ctx = 'comic/reload-s28';
    const c = comicProbe(b, 's14');
    ok(ctx, 'resumes onto s14 last panel', b.val('currentScreen') === 14 && c.i === 2, b.val('currentScreen') + '/' + c.i);
    ok(ctx, 'Continue is open, the next arrow grey', c.cont === false && c.next === true, c.cont + '/' + c.next);
    await sleep(50);
    ok(ctx, 'no experienced re-sent on resume', experiencedCount(b) === 0, experiencedCount(b));
    b.exec('advanceScreen();');
    ok(ctx, 'Continue goes on to the shared ending (s22)', b.val('currentScreen') === 22, b.val('currentScreen'));
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

async function main() {
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
    p = boot('01'); ddqPartlyRight(p, n); collectErrors('01/ddq-partly-right-s' + n, p); p.close();
  }
  {
    const p = boot('01'); await ddqRetry(p); collectErrors('01/ddq-retry-s34', p); p.close();
  }

  for (const part of ['05', '06']) {
    const p = boot(part); peakScenarios(p, part); collectErrors(part + '/peak', p); p.close();
  }

  reloadTests();
  await comicTests();

  console.log('\n' + pass + ' passed, ' + failures.length + ' failed');
  if (failures.length) {
    console.log('\nFAILURES\n' + failures.map(f => '  ' + f).join('\n'));
    process.exit(1);
  }
  console.log('all resume checks passed');
}

main();
