'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 03 (class task)
   Single offline-synthesis task screen. "חזרתי" → Part 04.
   ═══════════════════════════════════════════════════════════ */

const PART_04_URL = '../methodica-science-volume-solid-01-04/index.html';

/* One screen, and no in-component navigation — but the constant is still required. The shared
   goTo() in unit-js/30-nav.js rejects n >= TOTAL_SCREENS, index_dev.html derives its jump range
   from it, and unit-js/25-report.js reads it to decide that a single-screen component reports
   page 1 rather than the live screen index. It was absent, which is why the report from this part
   briefly went out as page 0 during the extraction. */
const TOTAL_SCREENS = 1;

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
const CHARACTER_ASSETS = { selection: 'png' };
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png');
}
const CHARACTER_SLOTS = {
  s0: { pose: 'notebook', w: 180, right: 14, bottom: 95 }      /* sb110 */
};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  const slot = CHARACTER_SLOTS['s' + n];
  // Lets a template reserve room for the sprite instead of being drawn over.
  screen.classList.toggle('has-companion', !!slot);
  let el = screen.querySelector(':scope > .companion');
  if (!slot) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('img');
    el.className = 'companion';
    el.alt = '';                                   // decorative, carries no information
    el.setAttribute('aria-hidden', 'true');
    el.draggable = false;
    screen.appendChild(el);
  }
  el.src = characterAsset(slot.pose);
  el.style.setProperty('--cw', slot.w + 'px');
  el.classList.toggle('companion--center', slot.center === true);
  ['left', 'right', 'top', 'bottom'].forEach(function (k) {
    el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
  });
}

/* The per-screen re-entry hook the shared goTo() calls. This component has exactly one screen and
   never navigates, so it only ever renders the companion — but the hook contract requires every
   part to define it, and leaving it out would make the shared goTo() throw if the dev bridge or a
   resume ever pointed here. */
function resetScreenState(n) {
  renderCompanion(n);
}

resetScreenState(0);

/* The learner presses "חזרתי" when they come back from the off-computer task. */
function classTaskDone() {
  /* Close the item before reporting the component, so the two arrive in order. */
  try { xapiFinishItems(); } catch (e) {}

  /* xAPI: component 'completed' with success and NO score.
     Deliberate: this component is an off-computer inquiry task (metadata contentType
     "Task Inquiry or Project"). Nothing about it is measurable in the browser — there is no answer
     UI at all, only the "חזרתי" button — so there is no numerator and no denominator to report, and
     a fabricated score would be worse than none. Reaching this button IS the completion.
     v2.4 asks for score only where the component contains 'answered' interactions; this one has
     none. */
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', { success: true });
  } catch (e) { console.error('[xAPI] completed component 03', e); }

  if (RESUME_ENABLED) writeForwardState('methodica-science-volume-solid-01-04');
  window.location.href = PART_04_URL + window.location.search;
}

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* One screen, one catalog item. */
var SCREEN_TO_SUBCONTENT = {
  0: ['01', 1]        // the class task itself (sb110)
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-03';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* EMPTY on purpose. The metadata declares a question q1 on item 01, but it is answered on paper,
   away from the screen — the code has no way to grade it and never sends an 'answered'. Marking the
   item as an evaluation item would set expectsAnswer on its 'completed', which the library then
   DEFERS until an 'answered' arrives for that item. None ever would, and the item 'completed' would
   never be sent at all. */
var XAPI_EVAL_ITEMS = {};

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-03.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   The whole hook contract, at its smallest. One screen, nothing answerable on it, so there is
   nothing to restore beyond the fact that the learner got here. The functions still have to exist:
   the shared goTo() and applyExecutionState() call them unconditionally.
   ═══════════════════════════════════════════════════════════ */

var RESUME_PLAIN_VARS = [];      // no answer variables in this component
var RESUME_INPUT_IDS  = [];
var RESUME_TEXT_IDS   = [];

function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    /* Carried even though nothing here writes it: the learner may arrive with results already in
       XAPI_Q_RESULTS from an earlier part, and a payload that dropped them would make a later
       component's score wrong. Object.assign is a sufficient clone — the values are booleans. */
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    vars: {}
  };
}

/* The parameter MUST stay named `st` — see unit-js/README.md. Nothing here uses eval, but keeping
   the name uniform across all six parts is what stops someone copying this one as a template and
   renaming it in a part that does. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
}

function applyResumeDom(st) {}
function restoreScreenUI(n) {}

/* ── xAPI ready hook ──
   Loads the unit metadata but reports NO unit-scope 'initialized' — this component is not the one
   that opens the unit. Preserved from the pre-extraction code; see the note in component 01. */
function onXapiReady() {
  loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {});
}
