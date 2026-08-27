'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 06 (peak ב)
   Final attempt (reached only after failing מועד א). Intro + 4
   single-attempt sub-parts (NO per-part feedback) → score. Both
   success (≥3/4) and failure end screens are TERMINAL — the unit ends.
   ═══════════════════════════════════════════════════════════ */

const TOTAL_SCREENS = 8;               // S0 intro, S7 scenario, S1–S4 sub-parts, S5 success, S6 failure
/* The scenario (storyboard 161) took the next free id rather than renumbering four sub-parts,
   their options, hints and SCREEN_TO_SUBCONTENT rows. Reading order lives in peakStart() and
   goBack(), not in the ids — same as part 05. */
const SCENARIO_SCREEN = 7;
const PEAK_CORRECT = { 1: 'a', 2: 'a', 3: 'b', 4: 'a' };
/* PEAK_PASS is 4 here, not 3 as in מועד א: slide 160 tells the learner "עליכם להצליח בכולם", and
   מועד ב is the terminal attempt, so the screen and the gate have to agree. Resolved 2026-08-26 by
   the content owner (was F-12, the deck-versus-build contradiction). One consequence worth knowing:
   pass now means all four, so renderPeakResult's variant split — which keys on all four being right
   — and the screen split, which keys on this threshold, coincide in this part. They still diverge in
   part 05, where 3 of 4 passes. */
const PEAK_PARTS = 4, PEAK_PASS = 4;
let peakAnswers = {};
/* Which sub-parts have been COMMITTED, as distinct from merely picked. peakAnswers[idx] is written
   the moment an option is clicked; this is written when peakContinue() reports it. The two must stay
   separate, or a learner would find their options locked the instant they touched one. */
let peakCommitted = {};

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Companion character
   The learner picks a mascot on part-01 S0; localStorage is the only
   carrier across parts, so a missing value must never blank the mascot.
   Slots are per-screen records injected by renderCompanion() rather than
   authored markup: ~20 slots across six index.html files would have to be
   kept in sync with every position tweak, and injecting lets the pose
   resolver run at render time.
   Offsets are storyboard positions mapped onto this 1280x710 canvas
   (bottom = 710 - (y + h)), anchored to the nearer PHYSICAL edge so the
   mascot stays on its intended side when the canvas grows wider than 1280.
   Where the storyboard centred the mascot under a block of text, the unit
   centres that text vertically instead, so those slots are moved to the
   free edge rather than dropped on top of the copy.
   ═══════════════════════════════════════════════════════════ */
function getCharacter() {
  try { return localStorage.getItem('lomda_selectedCharacter') || 'orange'; }
  catch (e) { return 'orange'; }
}
/* Which pose files exist on disk, and in which format. A manifest, not an
   <img onerror> fallback: onerror would fire a real 404 on nearly every
   screen and this unit's QA gate checks the network log for zero 404s.
   Landing a produced GIF is one line here plus the file. */
const CHARACTER_ASSETS = { selection: 'png', 'two-fingers': 'png', party: 'mp4', panting: 'mp4', challenge: 'mp4' };
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  /* ?v= is a CACHE-BUSTER, not decoration: the sprite files were re-encoded in place
     (their near-white matte lifted to pure #FFFFFF) under their existing names, so a
     browser holding the old copy would keep showing the grey box on the white canvas.
     Bump it whenever a character asset is re-exported. Over file:// the query is ignored
     rather than breaking the load, so it is safe there too. */
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png') + '?v=2';
}
/* Restarts a freshly-sourced <video> companion; no-op for <img> ones. */
function startCompanionMedia(el) {
  if (el.tagName !== 'VIDEO') return;
  el.load();
  const p = el.play();
  if (p && p.catch) p.catch(function () {});
}
/* s5 is the SUCCESS end screen and s6 the RETRY one — not the other way round. */
const CHARACTER_SLOTS = {
  /* sb160: the transition carries the sprite as its illustration, 640x360 in the middle of the
     column. `two-fingers` moves to s1, which is where slide 162 puts a companion line. */
  s0: { pose: 'challenge',   w: 640, into: 's0-video', ca: '16 / 9' },  /* sb160 */
  /* 248px — the same size part 05's s1 uses, so the two peak intros match. See the note there:
     the shared .companion-say width (578) is derived from it. */
  s1: { pose: 'two-fingers', w: 248, into: 's1-say' },         /* sb162 */
  s5: { pose: 'party',       w: 210, into: 's5-say' },         /* sb170 */
  s6: { pose: 'panting',     w: 200, into: 's6-say', ca: '16 / 9' }          /* sb171 */
};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  const slot = CHARACTER_SLOTS['s' + n];
  // Lets a template reserve room for the sprite instead of being drawn over.
  screen.classList.toggle('has-companion', !!slot);
  /* `into` hands the sprite to a .companion-say group so the group's own bottom-alignment
     aims the bubble's beak at him — see the peak result screens. */
  const host = slot && slot.into ? (document.getElementById(slot.into) || screen) : screen;
  let el = screen.querySelector('.companion');
  if (!slot) { if (el) el.remove(); return; }
  const tag = CHARACTER_ASSETS[slot.pose] === 'mp4' ? 'video' : 'img';
  if (el && el.tagName.toLowerCase() !== tag) { el.remove(); el = null; }
  if (!el) {
    el = document.createElement(tag);
    el.className = 'companion';
    el.alt = '';                                   // decorative, carries no information
    el.setAttribute('aria-hidden', 'true');
    el.draggable = false;
    if (tag === 'video') { el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true; }
  }
  if (el.parentElement !== host) host.appendChild(el);
  el.src = characterAsset(slot.pose);
  startCompanionMedia(el);
  el.style.setProperty('--cw', slot.w + 'px');
  /* Square is the CSS default; a 16:9 pose declares its own so the box is right from
     first paint instead of after the mp4 header lands. */
  el.style.setProperty('--ca', slot.ca || '');
  el.classList.toggle('companion--center', slot.center === true);
  ['left', 'right', 'top', 'bottom'].forEach(function (k) {
    el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
  });
}

/* ═══ Peak result — storyboard 170 (all four right) / 171 (not all) ═══
   Both slides carry the SAME body — the model answer to each סעיף — and differ only in title and
   in the companion's reflective prompt, so the body is written once. Same shape as part 04's
   SECTION_RESULT, which the deck gives its silent סעיפים group.
   Departures from the deck: it bolds the "א." / "ב." markers but not "ג." / "ד."; all four are
   bold here.
   Slide 170 writes the volume as "12,50 סמ"ק" — a transposition of 1,250, which is what every
   other line on the same slide and the question itself use; slide 171 opens סעיף א with "א. .". */
const PEAK_RESULT = {
  correct: { title: 'כל התשובות נכונות! כל הכבוד!',
             bubble: 'מהו "טיפ זהב" לחבר או לחברה שייגשו לשאלה הזו מחר בבוקר?' },
  partial: { title: 'התשובה אינה נכונה במלואה.<br />הנה התשובות הנכונות.',
             bubble: 'רגע לחשוב: מה יכול לעזור לך לזהות טעויות כאלו בעתיד?' },
  body: [
    '<b>א.</b> הפסל הוא גוף שאינו הנדסי ואינו נכנס במשורה, לכן ארז בחר <b>בשיטת ההצפה</b>.',
    '<b>ב.</b> בשיטת ההצפה נפח המים שנאספו שווה לנפח הפסל.<br />למדנו ש: 1 מ"ל = 1 סמ"ק, ו-1,000 מ"ל = 1 ליטר.<br />ולכן 1,250 סמ"ק שווים ל־1.25 ליטר.',
    '<b>ג.</b> כאשר האקווריום מלא עד הקצה, כל המים שגולשים החוצה נדחקים על ידי הגוף שהוכנס לתוכו. לכן, כמות המים שנאספה שווה לנפח הפסל שנמצא בתוך המים.',
    '<b>ד.</b> הטיעון המדעי הנתמך בראייה הוא: בשיטת ההצפה נאספו בממוצע 1,250 מ"ל מים, ונפח המים שנדחק שווה לנפח הגוף שהוכנס למים.'
  ]
};
/* The title follows the DECK's split (all four right), the screen follows the pass threshold.
   With PEAK_PASS = 4 the two coincide here, so s5 only ever shows the all-correct variant and
   s6 only ever the partial one. The keying is left as it is rather than simplified: it is the
   same function part 05 uses, where the two genuinely differ. */
function renderPeakResult(n) {
  const card = document.getElementById('s' + n + '-result');
  if (!card) return;
  const allRight = peakScore() === PEAK_PARTS;
  const v = allRight ? PEAK_RESULT.correct : PEAK_RESULT.partial;
  card.classList.toggle('section-result--retry', !allRight);
  document.getElementById('s' + n + '-result-title').innerHTML = v.title;
  document.getElementById('s' + n + '-result-body').innerHTML =
    PEAK_RESULT.body.map(x => '<p>' + x + '</p>').join('');
  document.getElementById('s' + n + '-result-bubble').textContent = v.bubble;
}

/* ⚠️ NOTHING HERE MAY REPORT. resetScreenState() runs on every navigation, every back-navigation
   and (from Stage 5) every resume replay.

   This was the worst instance in the unit: the send sat OUTSIDE the `n === 5` test, so it fired on
   BOTH end screens — one pass through the screens produced two component 'completed' statements,
   one claiming success and one claiming failure. `__dupes()` caught it on the very first Stage 0
   sweep, before any of this work began. Now in peakFinish(), once, synchronously. */
function resetScreenState(n) {
  renderCompanion(n);
  if (n >= 1 && n <= PEAK_PARTS) peakEnter(n);
  if (n === 5 || n === 6) {
    renderPeakResult(n);
    const el = document.getElementById('s' + n + '-score');
    if (el) el.textContent = 'ענית נכון על ' + peakScore() + ' מתוך ' + PEAK_PARTS + ' סעיפים.';
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('[id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  if (e.key === 'ArrowLeft')  { if (currentScreen >= 1 && currentScreen <= PEAK_PARTS) return; }
  if (e.key === 'ArrowRight') goBack();
});
function goBack() {
  if (currentScreen >= 2 && currentScreen <= PEAK_PARTS) { goTo(currentScreen - 1); return; }
  if (currentScreen === 1) { goTo(SCENARIO_SCREEN); return; }
  if (currentScreen === SCENARIO_SCREEN) { goTo(0); return; }
}
function advanceScreen() { if (currentScreen === 0) peakStart(); }

/* ─── Peak hints (storyboard gives every sub-part its own hint slide) ───
   Not the scq* hint machinery: that is keyed on SCQ_REG, which the peak
   components do not use. The overlay id ends in -hint-overlay so goTo()
   closes it on navigation, the same convention as the other parts. */
function peakHint(idx) {
  const ov = document.getElementById('s' + idx + '-hint-overlay');
  if (!ov) return;
  ov.classList.remove('hidden');
  /* Reported on open. No parentId: v2.4 mandates it for answered/evaluated only. */
  xapiSend('requested.1', 'question', null, { questionId: xapiQ(PEAK_ITEM, 'q' + idx).questionId });
}
function peakCloseHint(idx) {
  document.getElementById('s' + idx + '-hint-overlay')?.classList.add('hidden');
}

/* ─── Peak assessment ─────────────────────────────────────── */
/* s0 (transition, slide 160) -> s7 (scenario, slide 161) -> s1 (סעיף א, slide 162). */
function peakStart() { goTo(SCENARIO_SCREEN); }
/* The options are template .scq-opt pills, so the picked state is `.selected` — the class
   .scq-opt.selected .scq-radio keys on to fill the radio — and aria-checked follows it. */
function peakSelect(idx, id, btn) {
  if (peakCommitted[idx]) return;          // locked; see peakEnter
  peakAnswers[idx] = id;
  document.querySelectorAll('#s' + idx + '-opts .peak-opt').forEach(o => {
    o.classList.remove('selected');
    o.setAttribute('aria-checked', 'false');
  });
  btn.classList.add('selected');
  btn.setAttribute('aria-checked', 'true');
  const cont = document.getElementById('s' + idx + '-continue'); if (cont) cont.disabled = false;
}
function peakEnter(idx) {
  const picked = peakAnswers[idx];
  /* A committed sub-part is locked. One attempt each, peakContinue() is the only way forward, and
     the doneQ ledger refuses a second graded send — so an editable pick could only ever drift away
     from what the LRS already holds. */
  const locked = !!peakCommitted[idx];
  document.querySelectorAll('#s' + idx + '-opts .peak-opt').forEach(o => {
    const sel = o.dataset.id === picked;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
    o.disabled = locked;
  });
  const cont = document.getElementById('s' + idx + '-continue'); if (cont) cont.disabled = (picked === undefined);
}
function peakContinue(idx) {
  if (peakAnswers[idx] === undefined) return;
  const correct = peakAnswers[idx] === PEAK_CORRECT[idx];

  /* One attempt, no per-part feedback, so always 'answered.last'. response is the option's visible
     text (the metadata's `answers` are the full option strings); success and score were absent. */
  /* SYNCHRONOUS, not xapiSend. On the last sub-part this call and peakFinish() happen in the SAME
     click, and peakFinish must be synchronous (risk R1) — so a deferred answer would be overtaken by
     the item, component and unit 'completed' and arrive after all three. Observed exactly that: q4's
     answer landed last in the log. Four sends in an assessment do not need deferring. */
  const q = xapiQ(PEAK_ITEM, 'q' + idx);
  try {
    /* Through the doneQ ledger, not sendStatement720 directly. This is an isAssessment component and
       part 06's back edge makes מועד א re-enterable, so a graded answer must never be reported twice.
       See sendAnsweredOnce() in unit-js/40-resume.js. Falls through to a plain send while
       RESUME_ENABLED is false. */
    sendAnsweredOnce(PEAK_ITEM, 'q' + idx,
      { response: xapiAnswerText(document.querySelector('#s' + idx + '-opts .peak-opt[data-id="' + peakAnswers[idx] + '"]')),
        success: correct,
        score: { scaled: correct ? 1 : 0 } },
      { questionId: q.questionId, parentId: q.parentId });
  } catch (e) { console.error('[xAPI] answered q' + idx, e); }

  XAPI_Q_RESULTS[PEAK_ITEM + '/q' + idx] = correct;

  /* Commit, lock, and save synchronously — before either exit path navigates. A debounced save alone
     would lose an answer given by a learner who then closes the tab. */
  peakCommitted[idx] = true;
  peakEnter(idx);
  try { flushResumeSave(); } catch (e) {}

  if (idx < PEAK_PARTS) { goTo(idx + 1); return; }

  /* Navigate FIRST, then report. Both orders show the same screen, but reporting first emitted a
     spurious item 'initialized' AFTER the item's own 'completed': xapiFinishItems() clears the
     current-item latch, and the score screen belongs to the same item, so the next goTo() re-opened
     it. Navigating first keeps the latch on item 01 across the move (xapiOnScreen emits nothing when
     the item is unchanged) and peakFinish() then closes it exactly once, last.
     Safe in this order because peakFinish() catches everything internally and cannot throw. */
  const passed = peakScore() >= PEAK_PASS;
  goTo(passed ? 5 : 6);
  peakFinish(passed);
}

/* Reports the end of מועד ב — and with it the end of the unit, on EVERY path.
   Called from peakContinue() only, synchronously (RESUME.md risk R1).

   Both end screens are terminal here: there is no third attempt. So unlike part 05, this component
   closes the unit whether the learner passed or failed — a learner who fails the final attempt has
   still finished the lomda, and REPORT-XAPI.md is explicit that a component the learner does not
   clear must still be reported or the whole attempt goes unrecorded. */
function peakFinish(passed) {
  try { xapiFinishItems(); } catch (e) {}

  const result = { success: passed, score: { scaled: peakScore() / PEAK_PARTS } };

  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', result);
  } catch (e) { console.error('[xAPI] completed component 06', e); }

  try {
    sendCompletedOnce('done', 'unit', 'onlinelesson', result, { scope: 'unit' });
  } catch (e) { console.error('[xAPI] completed unit (via 06)', e); }
}
function peakScore() { let s = 0; for (let i = 1; i <= PEAK_PARTS; i++) if (peakAnswers[i] === PEAK_CORRECT[i]) s++; return s; }
/* מועד ב is the final attempt — no retake; both end screens are terminal. */

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* Four sub-parts = q1..q4 of ONE item, so the item spans screens 1-4 and both score screens. */
var SCREEN_TO_SUBCONTENT = {
  /* The intro is page 0 OF THE ITEM, not a no-item screen. Mapping it to null made the item close
     the moment a learner navigated back to the intro (goBack allows 2->1->0), emitting a premature
     item 'completed' carrying a partial score — which, once the Stage 5a ledger lands, would mark
     the item done and SUPPRESS the real one from peakFinish(). Keeping the intro inside the item
     means the item opens on entry and closes only in peakFinish(), whatever route the learner takes. */
  0: ['01', 0],       // intro
  1: ['01', 1],       // sub-part 1
  2: ['01', 2],       // sub-part 2
  3: ['01', 3],       // sub-part 3
  4: ['01', 4],       // sub-part 4
  5: ['01', 5],       // score - passed   (terminal)
  6: ['01', 5],       // score - failed   (terminal; no third attempt)
  /* Same item and page as the intro: the scenario asks nothing, so opening or closing the item
     on it would report a screen that carries no answer. */
  7: ['01', 0]        // scenario
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-06';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* The single item. NOTE it shares the suffix '01' with part 05's item — the two are distinguished
   only by XAPI_COMP_ID. That is why the Stage 5a resume ledger must namespace doneItems by part
   slug: '<slug>#01' for each, or מועד א and מועד ב would cancel each other out. */
var PEAK_ITEM = '01';

var XAPI_EVAL_ITEMS = { '01': 1 };

/* Explicit item result: 3 of 4 passes, but the library's aggregate is an all-correct AND. */
var XAPI_ITEM_RESULT = {
  '01': function () {
    return { success: peakScore() >= PEAK_PASS, score: { scaled: peakScore() / PEAK_PARTS } };
  }
};

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-06.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   The assessment. peakAnswers is the whole of it, and restoring it is LAYER 1 of the re-answer guard:
   with the answers back, peakEnter() re-marks the picked option and peakContinue() cannot be reached
   for a sub-part the learner already committed, so no graded answer can be sent twice. Layer 2 is the
   doneQ ledger in unit-js/40-resume.js, which does not depend on this working.
   That matters here specifically because part 06 offers "חזרה" back into part 05 — see
   ROUTING-AND-RETAKE.md.
   ═══════════════════════════════════════════════════════════ */

/* peakAnswers is an OBJECT, so it cannot travel through RESUME_PLAIN_VARS' verbatim copy — that
   would store a live reference that mutates along with the original, and the snapshot goTo() takes
   before resetScreenState() would already contain the change it exists to undo. It is cloned
   explicitly below instead. Nothing else in this component holds answer state at file scope. */
var RESUME_PLAIN_VARS = [];
var RESUME_INPUT_IDS  = [];
var RESUME_TEXT_IDS   = [];

function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    peakAnswers: Object.assign({}, peakAnswers),      // clone, not reference
    peakCommitted: Object.assign({}, peakCommitted),
    vars: {}
  };
}

/* The parameter MUST stay named `st` — see unit-js/README.md. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  if (st.peakAnswers) peakAnswers = Object.assign({}, st.peakAnswers);
  if (st.peakCommitted) peakCommitted = Object.assign({}, st.peakCommitted);
}

function applyResumeDom(st) {}

/* peakEnter() already repaints a sub-part completely from peakAnswers — it re-marks the picked option
   and re-enables the continue button — and resetScreenState() calls it for screens 1-4. The score
   screens likewise rebuild their text from peakScore(), which reads the restored peakAnswers. So
   there is genuinely nothing left to paint here, and saying so explicitly is better than an empty
   function that reads like an oversight.

   NOTE what this deliberately does NOT do: it does not disable the options on an answered sub-part.
   The assessment allows one attempt per sub-part and peakContinue() is the only path forward, so a
   learner returning to an answered screen can change their pick but cannot re-submit it — and the
   doneQ ledger refuses a second graded answer even if that ever changed. */
function restoreScreenUI(n) {}


/* ── xAPI ready hook ──
   Loads the unit metadata but reports NO unit-scope 'initialized' — this component is not the one
   that opens the unit. Preserved from the pre-extraction code; see the note in component 01. */
function onXapiReady() {
  loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {});
}
