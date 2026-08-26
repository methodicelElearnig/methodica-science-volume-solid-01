'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 05 (peak א)
   PeakAssessment: intro + 4 single-attempt sub-parts (NO per-part
   feedback) → score. ≥3/4 → success (unit done); <3 → Part 06 (peak ב).
   ═══════════════════════════════════════════════════════════ */

const TOTAL_SCREENS = 7;               // S0 intro, S1–S4 sub-parts, S5 success, S6 failure
const PART_06_URL = '../methodica-science-volume-solid-01-06/index.html';
const PEAK_CORRECT = { 1: 'b', 2: 'a', 3: 'a', 4: 'b' };
const PEAK_PARTS = 4, PEAK_PASS = 3;
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
const CHARACTER_ASSETS = { selection: 'png', run: 'mp4', cheer: 'mp4', think: 'mp4' };
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
  s0: { pose: 'run',   w: 210, right: 40, bottom: 95, ca: '16 / 9' },        /* sb147 */
  s5: { pose: 'cheer', w: 200, into: 's5-say', ca: '16 / 9' },              /* sb157 */
  s6: { pose: 'think', w: 200, into: 's6-say' }                              /* sb158 */
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

/* ═══ Peak result — storyboard 157 (all four right) / 158 (not all) ═══
   Both slides carry the SAME body — the model answer to each סעיף — and differ only in title and
   in the companion's reflective prompt, so the body is written once. Same shape as part 04's
   SECTION_RESULT, which the deck gives its silent סעיפים group.
   Departures from the deck: it bolds the "א." / "ב." markers but not "ג." / "ד."; all four are
   bold here. */
const PEAK_RESULT = {
  correct: { title: 'כל התשובות נכונות! כל הכבוד!',
             bubble: 'קחו שנייה לחגוג את ההצלחה. מה הניצחון הקטן שלכם בתרגיל הזה?' },
  partial: { title: 'התשובה אינה נכונה במלואה.<br />הנה התשובות הנכונות.',
             bubble: 'אם תפגשו מחר שאלה דומה, מה יהיה הדבר הראשון שתעשו כדי להצליח?' },
  body: [
    '<b>א.</b> נפח הפסלון = נפח המים הסופי פחות נפח המים המקורי = <b>60 סמ"ק</b>.',
    '<b>ב.</b> בוצעו 3 מדידות כדי <b>לצמצם טעויות מקריות ולקבל קריאה מהימנה</b>. כדאי <b>לדווח על הממוצע</b> = 60 סמ"ק.',
    '<b>ג.</b> איריס צודקת: שלוש תוצאות המדידה קרובות מאוד זו לזו, מה שמוכיח שהתוצאות יציבות ואינן מקריות.',
    '<b>ד.</b> המדידה חריגה מאוד וסביר שנפלה בה טעות. <b>יש למדוד מחדש ולא להכליל את הערך 80 בחישוב הסופי</b>.'
  ]
};
/* The title follows the DECK's split (all four right), the screen follows the pass threshold. */
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
   and (from Stage 5) every resume replay, so a statement sent from here repeats.

   It used to send the component 'completed' when the learner landed on screen 5 — via xapiSend,
   which defers by a macrotask. Three separate faults in one line: it fired on mere navigation (so
   the dev bridge or a back-button produced a completed assessment), it hard-coded success:true so a
   learner who answered nothing was reported as having PASSED, and being deferred it would have
   escaped both of resume's guards — the sender stub and the _restoring flag are both gone by the
   time a macrotask runs. See RESUME.md risk R1. It now lives in peakFinish(), synchronously. */
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

  /* xAPI: one attempt per sub-part and no per-part feedback, so every answer is 'answered.last'.

     response is the option's VISIBLE TEXT, not the 'a'/'b' data-id it used to send. The metadata's
     `answers` for these four questions are the full option strings, and v2.4 requires the reported
     response to match them — an id matched nothing.

     success and score were missing entirely: the send carried only { response }. */
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

  /* Outside the send — see the note in part 02's scqCheck. */
  XAPI_Q_RESULTS[PEAK_ITEM + '/q' + idx] = correct;

  /* Commit, lock, and save synchronously — before either exit path navigates. A debounced save alone
     would lose an answer given by a learner who then closes the tab. */
  peakCommitted[idx] = true;
  peakEnter(idx);
  try { flushResumeSave(); } catch (e) {}

  if (idx < PEAK_PARTS) { goTo(idx + 1); return; }

  /* Last sub-part: report the attempt, then show the verdict. */
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

function peakScore() { let s = 0; for (let i = 1; i <= PEAK_PARTS; i++) if (peakAnswers[i] === PEAK_CORRECT[i]) s++; return s; }

/* Reports the end of מועד א. Called from peakContinue() only — once, at the moment the learner
   commits their last answer — never from a screen-entry hook.

   SYNCHRONOUS on purpose (sendStatement720, not xapiSend): the pass path navigates nowhere but the
   fail path leads to peakGoRetake(), and a deferred send would be racing an unload. It is also the
   standing rule from RESUME.md risk R1 — a 'completed' must never be deferred, because the deferral
   outlives resume's sender stub. */
function peakFinish(passed) {
  /* Close item 01 (all four questions live in it) before the component. */
  try { xapiFinishItems(); } catch (e) {}

  /* The component is reported on BOTH paths. Previously only the pass path reported anything, so a
     learner who failed מועד א produced no component 'completed' at all and their whole attempt went
     unrecorded — the platform could not tell them apart from a learner who never started.
     Routing a failed learner onward is the content's job here (see ROUTING-AND-RETAKE.md); the
     report just has to be truthful about the outcome. */
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson',
      { success: passed, score: { scaled: peakScore() / PEAK_PARTS } });
  } catch (e) { console.error('[xAPI] completed component 05', e); }

  /* The UNIT closes here only when the learner PASSES מועד א — that is the end of the lomda for
     them. A learner who fails goes on to מועד ב (part 06), which owns the unit 'completed' for
     every path through it. Nobody sent this before, at any point in the unit. */
  if (passed) {
    try {
      sendCompletedOnce('done', 'unit', 'onlinelesson',
        { success: true, score: { scaled: peakScore() / PEAK_PARTS } }, { scope: 'unit' });
    } catch (e) { console.error('[xAPI] completed unit (via 05)', e); }
  }
}

function peakGoRetake() {
  /* The retake edge. Unlike a normal forward hop this leads to a component the learner reaches by
     FAILING, and writeForwardState records prev['…-06'] = '…-05' — so מועד ב offers "חזרה" back into
     the failed מועד א. That is a deliberate product decision, not an oversight, and it is why the
     doneQ ledger exists: walking back must not let a graded answer be reported twice.
     See ROUTING-AND-RETAKE.md. */
  if (RESUME_ENABLED) writeForwardState('methodica-science-volume-solid-01-06');
  window.location.href = PART_06_URL + window.location.search;
}

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* All four sub-parts are questions q1–q4 of ONE catalog item, so the item stays open across screens
   1–4 and the result screen; xapiOnScreen() emits nothing while the suffix is unchanged, and
   peakFinish() closes it. Screens 5 and 6 stay on the item so a problem report filed from the score
   screen still attributes to it. */
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
  5: ['01', 5],       // score — passed
  6: ['01', 5]        // score — failed (same page of the same item)
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-05';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* The single item, referenced by every send in this component. Replaces the old PEAK_QID constant,
   which hand-built the IRI and omitted the component segment. */
var PEAK_ITEM = '01';

var XAPI_EVAL_ITEMS = { '01': 1 };

/* The item's own 'completed' needs an explicit result, because the library's aggregate is an
   all-correct AND: a learner who scores 3 of 4 — which PASSES here — would otherwise be reported as
   success:false on the item while the component said success:true. */
var XAPI_ITEM_RESULT = {
  '01': function () {
    return { success: peakScore() >= PEAK_PASS, score: { scaled: peakScore() / PEAK_PARTS } };
  }
};

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-05.json';

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
