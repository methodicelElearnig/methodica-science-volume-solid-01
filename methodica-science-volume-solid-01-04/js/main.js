'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 04 (class task)
   S0 — the class-task opener (TransitionScreen). S1 — the offline-synthesis task itself.
   "חזרתי" on S1 → Part 05.
   ═══════════════════════════════════════════════════════════ */

const NEXT_PART_URL = '../methodica-science-volume-solid-01-05/index.html';

/* The shared goTo() in unit-js/30-nav.js rejects n >= TOTAL_SCREENS, index_dev.html derives its
   jump range from it, and unit-js/25-report.js reads it to pick the reported page. Was 1 until the
   opener (S0) was added on 2026-10-12. */
const TOTAL_SCREENS = 2;

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
const CHARACTER_ASSETS = { selection: 'png', notebook: 'mp4', stretch: 'mp4' };
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  /* ?v= is a CACHE-BUSTER, not decoration: the sprite files were re-encoded in place
     (their near-white matte lifted to pure #FFFFFF) under their existing names, so a
     browser holding the old copy would keep showing the grey box on the white canvas.
     Bump it whenever a character asset is re-exported. Over file:// the query is ignored
     rather than breaking the load, so it is safe there too. */
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png') + '?v=3';
}
/* Restarts a freshly-sourced <video> companion; no-op for <img> ones. */
function startCompanionMedia(el) {
  if (el.tagName !== 'VIDEO') return;
  el.load();
  const p = el.play();
  if (p && p.catch) p.catch(function () {});
}
/* Empty on purpose: the class-task screen (S1) shows no companion (removed by request). S0's
   mascot is AUTHORED in the markup, inside a .companion-say group (as on part 03 s0), so it needs
   no slot either. The machinery stays so renderCompanion() still clears .has-companion and any
   stale sprite. */
const CHARACTER_SLOTS = {};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  const slot = CHARACTER_SLOTS['s' + n];
  /* An authored sprite is never removed — only its src is refreshed, so a learner who chose
     turquoise does not see the ORANGE src baked into the markup. */
  const authored = screen.querySelector('.companion-say > .companion');
  if (authored) {
    authored.src = characterAsset(authored.dataset.pose || 'selection');
    startCompanionMedia(authored);
  }
  // Lets a template reserve room for the sprite instead of being drawn over.
  screen.classList.toggle('has-companion', !!slot || !!authored);
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
  /* Square is the CSS default; a 16:9 pose declares its own so the box is right from
     first paint instead of after the mp4 header lands. */
  el.style.setProperty('--ca', slot.ca || '');
  el.classList.toggle('companion--center', slot.center === true);
  ['left', 'right', 'top', 'bottom'].forEach(function (k) {
    el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
  });
}

/* The per-screen re-entry hook the shared goTo() calls. Neither screen holds an answer, so it
   only ever renders the companion — but the hook contract requires every part to define it. */
function resetScreenState(n) {
  renderCompanion(n);
}

resetScreenState(0);

/* S0 → S1 and back. S1 leaves the component only through "חזרתי" (classTaskDone), never by arrow
   key, so the completion is always the learner's explicit act. */
function advanceScreen() { if (currentScreen === 0) goTo(1); }
function goBack()        { if (currentScreen === 1) goTo(0); }
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

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
  } catch (e) { console.error('[xAPI] completed component 04', e); }

  if (RESUME_ENABLED) writeForwardState('methodica-science-volume-solid-01-05');
  window.location.href = NEXT_PART_URL + window.location.search;
}

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* Two screens, one catalog item. The opener belongs to no item, like part 03's s0. */
var SCREEN_TO_SUBCONTENT = {
  0: null,            // opener (TransitionScreen)
  1: ['01', 1]        // the class task itself (sb110)
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-04';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* EMPTY on purpose. The metadata declares a question q1 on item 01, but it is answered on paper,
   away from the screen — the code has no way to grade it and never sends an 'answered'. Marking the
   item as an evaluation item would set expectsAnswer on its 'completed', which the library then
   DEFERS until an 'answered' arrives for that item. None ever would, and the item 'completed' would
   never be sent at all. */
var XAPI_EVAL_ITEMS = {};

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-04.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   The whole hook contract, at its smallest. Two screens, nothing answerable on either, so there is
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
