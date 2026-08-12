'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 06 (peak ב)
   Final attempt (reached only after failing מועד א). Intro + 4
   single-attempt sub-parts (NO per-part feedback) → score. Both
   success (≥3/4) and failure end screens are TERMINAL — the unit ends.
   ═══════════════════════════════════════════════════════════ */

const TOTAL_SCREENS = 7;               // S0 intro, S1–S4 sub-parts, S5 success, S6 failure
const PEAK_CORRECT = { 1: 'a', 2: 'a', 3: 'b', 4: 'a' };
const PEAK_PARTS = 4, PEAK_PASS = 3;
let peakAnswers = {};

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
const CHARACTER_ASSETS = { selection: 'png', 'two-fingers': 'png', party: 'mp4', panting: 'mp4' };
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png');
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
  s0: { pose: 'two-fingers', w: 210, right: 40, bottom: 95 },  /* sb160 */
  s5: { pose: 'party',       w: 230, left:  30, bottom: 105 }, /* sb173 */
  s6: { pose: 'panting',     w: 220, left:  30, bottom:  95 }  /* sb172 */
};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  const slot = CHARACTER_SLOTS['s' + n];
  // Lets a template reserve room for the sprite instead of being drawn over.
  screen.classList.toggle('has-companion', !!slot);
  let el = screen.querySelector(':scope > .companion');
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
    screen.appendChild(el);
  }
  el.src = characterAsset(slot.pose);
  startCompanionMedia(el);
  el.style.setProperty('--cw', slot.w + 'px');
  el.classList.toggle('companion--center', slot.center === true);
  ['left', 'right', 'top', 'bottom'].forEach(function (k) {
    el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
  });
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
    const el = document.getElementById('s' + n + '-score');
    if (el) el.textContent = 'ענית נכון על ' + peakScore() + ' מתוך ' + PEAK_PARTS + ' סעיפים.';
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  { if (currentScreen >= 1 && currentScreen <= PEAK_PARTS) return; }
  if (e.key === 'ArrowRight') goBack();
});
function goBack() {
  if (currentScreen >= 2 && currentScreen <= PEAK_PARTS) { goTo(currentScreen - 1); return; }
  if (currentScreen === 1) { goTo(0); return; }
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
function peakStart() { goTo(1); }
function peakSelect(idx, id, btn) {
  peakAnswers[idx] = id;
  document.querySelectorAll('#s' + idx + '-opts .peak-opt').forEach(o => o.classList.remove('picked'));
  btn.classList.add('picked');
  const cont = document.getElementById('s' + idx + '-continue'); if (cont) cont.disabled = false;
}
function peakEnter(idx) {
  const picked = peakAnswers[idx];
  document.querySelectorAll('#s' + idx + '-opts .peak-opt').forEach(o => o.classList.toggle('picked', o.dataset.id === picked));
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
  6: ['01', 5]        // score - failed   (terminal; no third attempt)
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
    peakAnswers: Object.assign({}, peakAnswers),   // clone, not reference
    vars: {}
  };
}

/* The parameter MUST stay named `st` — see unit-js/README.md. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  if (st.peakAnswers) peakAnswers = Object.assign({}, st.peakAnswers);
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
