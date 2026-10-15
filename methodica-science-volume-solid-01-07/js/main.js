'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 07 (peak ב)
   Final attempt (reached only after failing מועד א). Intro + scenario
   + 4 sub-parts, each with its own feedback (2 attempts). After סעיף ד
   the unit ends on either outcome — there are no end screens.
   ═══════════════════════════════════════════════════════════ */

/* 2026-10-14: the combined answer review (old S5/S6, storyboard 170/171) was removed — feedback now
   follows each סעיף — and the scenario and the two endings (old S7/S8/S9) moved down into S5/S6/S7,
   so the ids stay contiguous (_test/checks.mjs gate 3). */
/* 2026-10-15: both endings (S6 success / S7 less-successful, storyboard 173/172 — the confetti
   screens) were removed at the content owner's request. The unit now finishes straight from סעיף ד's
   שנמשיך? (see peakNext()). */
const TOTAL_SCREENS = 6;               // S0 intro, S5 scenario, S1–S4 sub-parts
/* The scenario (storyboard 161) took the next free id rather than renumbering four sub-parts,
   their options, hints and SCREEN_TO_SUBCONTENT rows. Reading order lives in peakStart() and
   goBack(), not in the ids — same as part 06. */
const SCENARIO_SCREEN = 5;
const PEAK_CORRECT = { 1: 'a', 2: 'a', 3: 'b', 4: 'a' };
/* PEAK_PASS is 4 here, not 3 as in מועד א: slide 160 tells the learner "עליכם להצליח בכולם", and
   מועד ב is the terminal attempt, so the screen and the gate have to agree. Resolved 2026-08-26 by
   the content owner (was F-12, the deck-versus-build contradiction). */
const PEAK_PARTS = 4, PEAK_PASS = 4;
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
/* '2num' keeps the delivered filename (Copmpanion/Orange_2num.mp4, turquoise_2num.mp4) so the
   pose maps 1:1 to the source and nobody has to guess which clip it is. 960x960, 4.06s — square,
   unlike the 1280x720 clips around it, so its slot must NOT declare `ca`. */
const CHARACTER_ASSETS = { selection: 'png', 'two-fingers': 'png', panting: 'mp4', challenge: 'mp4', '2num': 'mp4' };
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  /* ?v= is a CACHE-BUSTER, not decoration: the sprite files were re-encoded in place
     (their near-white matte lifted to pure #FFFFFF) under their existing names, so a
     browser holding the old copy would keep showing the grey box on the white canvas.
     Bump it whenever a character asset is re-exported. Over file:// the query is ignored
     rather than breaking the load, so it is safe there too.
     ?v=4 here, still ?v=2 in parts 01-04, because THIS part's sprites were replaced IN PLACE twice
     on 2026-08-27 — the confetti re-export of turquoise-success, then the matte lift below — and a
     browser holding an old copy would keep playing it under the same filename. Parts 01-04 need no
     bump: all 44 of their sprites were already on pure #FFFFFF and none of them changed. */
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png') + '?v=5';
}
/* Restarts a freshly-sourced <video> companion; no-op for <img> ones. */
function startCompanionMedia(el) {
  if (el.tagName !== 'VIDEO') return;
  el.load();
  const p = el.play();
  if (p && p.catch) p.catch(function () {});
}
const CHARACTER_SLOTS = {
  /* sb160: the transition carries the sprite as its illustration, 640x360 in the middle of the
     column. */
  s0: { pose: 'challenge',   w: 640, into: 's0-video', ca: '16 / 9' }   /* sb160 */
};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  screen.dataset.character = getCharacter();
  const slot = CHARACTER_SLOTS['s' + n];
  // Lets a template reserve room for the sprite instead of being drawn over.
  screen.classList.toggle('has-companion', !!slot);
  /* `into` hands the sprite to a .companion-say group so the group's own bottom-alignment
     aims the bubble's beak at him. */
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

/* ═══ Per-סעיף feedback copy (2026-10-14) ═══
   Feedback now follows each סעיף (producer decision, as in יעד 4 and יעד 9), replacing the combined
   answer slides 170/171. Each סעיף's explanation is its own row of those slides; the retry and
   wrong-final titles are the unit's standard ones (part 05's FB_RETRY / FB_WRONG2).
   Slide 170 writes the volume as "12,50 סמ"ק" — a transposition of 1,250, which is what every other
   line on the same slide and the question itself use. */
const FB_RETRY  = { title: 'התשובה אינה נכונה.', body: ['שננסה שוב?'] };
const FB_WRONG2 = 'התשובה אינה נכונה.<br />התשובה הנכונה מסומנת.';
const fbPopups = explanation => ({
  retry:   FB_RETRY,
  correct: { title: 'נכון מאוד!', body: explanation },
  wrong2:  { title: FB_WRONG2,    body: explanation }
});
const PEAK_FEEDBACK = {
  1: fbPopups([   /* sb170 א */
    'הפסל הוא גוף שאינו הנדסי ואינו נכנס במשורה, לכן ארז בחר <b>בשיטת ההצפה</b>.']),
  2: fbPopups([   /* sb170 ב */
    'בשיטת ההצפה נפח המים שנאספו שווה לנפח הפסל.',
    'למדנו ש: 1\u00A0מ"ל = 1\u00A0סמ"ק,<br />ו-1,000\u00A0מ"ל = 1\u00A0ליטר.',
    'ולכן 1,250 סמ"ק שווים ל-1.25 ליטר.']),
  3: fbPopups([   /* sb170 ג */
    'כאשר האקווריום מלא עד הקצה, כל המים שגולשים החוצה נדחקים על ידי הגוף שהוכנס לתוכו.',
    'לכן, כמות המים שנאספה שווה לנפח הפסל שנמצא בתוך המים.']),
  4: fbPopups([   /* sb170 ד */
    'הטיעון המדעי הנתמך בראייה הוא: בשיטת ההצפה נאספו בממוצע 1,250 מ"ל מים, ונפח המים שנדחק שווה לנפח הגוף שהוכנס למים.'])
};

/* ⚠️ NOTHING HERE MAY REPORT. resetScreenState() runs on every navigation, every back-navigation
   and (from Stage 5) every resume replay.

   This was the worst instance in the unit: the send sat OUTSIDE the `n === 5` test, so it fired on
   BOTH end screens — one pass through the screens produced two component 'completed' statements,
   one claiming success and one claiming failure. `__dupes()` caught it on the very first Stage 0
   sweep, before any of this work began. Now in peakFinish(), once, synchronously. */
function resetScreenState(n) {
  renderCompanion(n);
  if (n >= 1 && n <= PEAK_PARTS) peakPaint(n);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('[id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  if (e.key === 'ArrowLeft')  { if (currentScreen >= 1 && currentScreen <= PEAK_PARTS) return; }
  if (e.key === 'ArrowRight') goBack();
});
/* The end screens were unreachable in reverse: this only ever handled 1-4, the scenario and 0, so
   every `חזרה` added to them would have been a dead button. Named edges, not `currentScreen - 1` —
   ROUTING-AND-RETAKE.md forbids assuming the numeric order anywhere in this unit, and it is wrong
   here twice over (the scenario is screen 5). Walking back into an answered
   sub-part is already safe: the doneQ ledger is what stops a graded answer being reported twice. */
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
/* s0 (transition) -> s5 (scenario) -> s1 (סעיף א). */
function peakStart() { goTo(SCENARIO_SCREEN); }

/* Per-סעיף feedback (2026-10-14), the same controller contract as the practice questions in part 05
   (scqCheck): צדקתי? checks; a first wrong answer gets the retry popup and the option it judged is
   gated; a correct answer, or a second wrong one, closes the סעיף with its explanation and the
   button turns into שנמשיך?. A סעיף counts toward the pass only if it was answered correctly, on
   either attempt.

   peakState[idx] = { sel, attempts, done, phase, lastWrong }. `phase` is WHAT THE LEARNER WAS LAST
   SHOWN — 'retry' | 'correct' | 'wrong2', or null for unchecked — and is the single source for the
   marks and the popup, so peakPaint() can rebuild a screen from state alone (navigation, resume). */
const PEAK_MAX_ATTEMPTS = 2;
let peakState = {};
function ps(idx) {
  return peakState[idx] || (peakState[idx] = { sel: null, attempts: 0, done: false, phase: null, lastWrong: null });
}
function peakOpts(idx) { return document.querySelectorAll('#s' + idx + '-opts .peak-opt'); }

/* The options are template .scq-opt pills, so the picked state is `.selected` — the class
   .scq-opt.selected .scq-radio keys on to fill the radio — and aria-checked follows it. */
function peakSelect(idx, id) {
  const s = ps(idx);
  if (s.done) return;
  /* Retry gate (720-templates): the option just judged wrong cannot be submitted again. */
  if (s.phase === 'retry' && id === s.sel) return;
  s.sel = id;
  s.phase = null;                 // a re-pick clears the retry verdict and its popup
  peakPaint(idx);
}

function peakCheck(idx) {
  const s = ps(idx);
  if (s.done) { peakNext(idx); return; }
  if (!s.sel || s.sel === s.lastWrong) return;
  s.attempts++;
  const correct = s.sel === PEAK_CORRECT[idx];
  const final = correct || s.attempts >= PEAK_MAX_ATTEMPTS;

  /* xAPI. response is the option's visible text (the metadata's `answers` are the full option
     strings). The closing attempt goes through the doneQ ledger, synchronously: this is an
     isAssessment component and the retake edge makes it re-enterable, so a graded answer must never
     be reported twice (sendAnsweredOnce, unit-js/40-resume.js). A first wrong attempt is a plain
     'answered'. */
  const q = xapiQ(PEAK_ITEM, 'q' + idx);
  const result = {
    response: xapiAnswerText(document.querySelector('#s' + idx + '-opts .peak-opt[data-id="' + s.sel + '"]')),
    success: correct,
    score: { scaled: correct ? 1 : 0 }
  };
  if (final) {
    try { sendAnsweredOnce(PEAK_ITEM, 'q' + idx, result, { questionId: q.questionId, parentId: q.parentId }); }
    catch (e) { console.error('[xAPI] answered q' + idx, e); }
    /* Outside the send — see the note in part 03's scqCheck. */
    XAPI_Q_RESULTS[PEAK_ITEM + '/q' + idx] = correct;
  } else {
    xapiSend('answered', 'question', result, { questionId: q.questionId, parentId: q.parentId });
  }

  if (correct) s.phase = 'correct';
  else if (final) s.phase = 'wrong2';
  else { s.phase = 'retry'; s.lastWrong = s.sel; }
  if (final) { s.done = true; peakCloseHint(idx); }
  peakPaint(idx);

  /* Synchronous: an answer given and then abandoned without navigating would otherwise rest on the
     page-leave handlers, which Chrome may drop. */
  try { flushResumeSave(); } catch (e) {}
}

/* Rebuilds a סעיף's whole answered look from peakState: marks, button, hint, popup. Mirrors
   peakCheck's DOM writes and nothing else — no state, no statements. */
function peakPaint(idx) {
  const s = ps(idx), screen = 's' + idx, right = PEAK_CORRECT[idx];
  const verdict = s.phase === 'correct' || s.phase === 'wrong2';
  peakOpts(idx).forEach(o => {
    const id = o.dataset.id, picked = id === s.sel;
    const isCorrect = verdict && id === right;
    const isWrong = picked && id !== right && (s.phase === 'wrong2' || s.phase === 'retry');
    o.classList.toggle('correct', isCorrect);
    o.classList.toggle('wrong', isWrong);
    o.classList.toggle('selected', picked && !isCorrect && !isWrong);
    o.setAttribute('aria-checked', picked ? 'true' : 'false');
    o.disabled = s.done;
  });
  const btn = document.getElementById(screen + '-continue');
  if (btn) {
    btn.textContent = s.done ? 'שנמשיך?' : 'צדקתי?';
    btn.disabled = s.done ? (idx === PEAK_PARTS && unitFinished) : (!s.sel || s.sel === s.lastWrong);
  }
  /* Hint policy: available on every סעיף until it resolves (slides "אפשר רמז?"), hidden — not
     disabled — afterwards. */
  const hint = document.getElementById(screen + '-hint');
  if (hint) hint.style.visibility = s.done ? 'hidden' : '';
  if (s.phase) renderFeedbackPopup(screen, s.phase, PEAK_FEEDBACK[idx]);
  else peakClosePopup(screen);
}

/* ═══ Feedback popup — same renderer as part 05's ═══ */
function renderFeedbackPopup(screen, type, popups) {
  const popup = document.getElementById(screen + '-scq-popup'); if (!popup) return;
  const cfg = popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  document.getElementById(screen + '-scq-popup-title').innerHTML = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
  /* Marks the screen while a popup is up (a companion line there would step aside, as in part 06). */
  document.getElementById(screen)?.classList.add('fb-shown');
}
function peakClosePopup(screen) {
  document.getElementById(screen + '-scq-popup')?.classList.add('hidden');
  document.getElementById(screen)?.classList.remove('fb-shown');
}
/* Draggable, like every other feedback popup in the unit (unit-js/15-ui.js). */
for (let i = 1; i <= PEAK_PARTS; i++) attachPopupDrag(document.getElementById('s' + i + '-scq-popup'));

/* שנמשיך? on a resolved סעיף. After סעיף ד the unit ends whatever the outcome — מועד ב is the last
   attempt, and since 2026-10-15 there is no end screen. Report first (synchronously, RESUME.md risk
   R1), then signal the host. peakFinish() cannot throw. */
function peakNext(idx) {
  if (idx < PEAK_PARTS) { goTo(idx + 1); return; }
  const passed = peakScore() >= PEAK_PASS;
  peakFinish(passed);
  unitFinish();
}

/* Reports the end of מועד ב — and with it the end of the unit, on EVERY path.
   Called from peakNext() only, synchronously (RESUME.md risk R1).

   Both outcomes end the unit here: there is no third attempt. So unlike part 06, this component
   closes the unit whether the learner passed or failed — a learner who fails the final attempt has
   still finished the lomda, and REPORT-XAPI.md is explicit that a component the learner does not
   clear must still be reported or the whole attempt goes unrecorded. */
function peakFinish(passed) {
  try { xapiFinishItems(); } catch (e) {}

  const result = { success: passed, score: { scaled: peakScore() / PEAK_PARTS } };

  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', result);
  } catch (e) { console.error('[xAPI] completed component 07', e); }

  try {
    sendCompletedOnce('done', 'unit', 'onlinelesson', result, { scope: 'unit' });
  } catch (e) { console.error('[xAPI] completed unit (via 07)', e); }
}

/* ─── End of the unit ─────────────────────────────────────
   ⚠️ THIS MUST NOT REPORT. peakFinish() already sent the item, the component and (on the paths that
   own it) the unit `completed`, synchronously, just before this runs. sendCompletedOnce() would
   dedupe a second call, but sending one would still be wrong: this is an exit signal, not an outcome.

   Called straight from peakNext() since 2026-10-15, when the end screens (and their סיימתי button)
   were removed. The unit has no documented host-exit contract — 60-devbridge.js's postMessage is the
   dev wrapper's jump bar, not a production channel — so this is a seam, deliberately small. It runs
   once, disables סעיף ד's שנמשיך? so a second press cannot double-fire, and announces the finish to
   a framing host that may or may not be listening. Drop the real handshake in here once the platform
   partner confirms it; nothing else in the unit needs to change. */
var unitFinished = false;   // var, not let: peakPaint() reads it and may run first
function unitFinish() {
  if (unitFinished) return;
  unitFinished = true;
  const btn = document.getElementById('s' + PEAK_PARTS + '-continue');
  if (btn) btn.disabled = true;
  if (window.parent !== window) {
    try { window.parent.postMessage({ type: '720:unit-finished' }, '*'); } catch (e) {}
  }
}

function peakScore() { let n = 0; for (let i = 1; i <= PEAK_PARTS; i++) { const s = peakState[i]; if (s && s.done && s.sel === PEAK_CORRECT[i]) n++; } return n; }
/* מועד ב is the final attempt — no retake; both outcomes end the unit. */

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* Four sub-parts = q1..q4 of ONE item, so the item spans screens 1-4. */
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
  /* Same item and page as the intro: the scenario asks nothing, so opening or closing the item
     on it would report a screen that carries no answer. */
  5: ['01', 0]        // scenario
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-07';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* The single item. NOTE it shares the suffix '01' with part 06's item — the two are distinguished
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
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-07.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   The assessment. peakState is the whole of it, and restoring it is LAYER 1 of the re-answer guard:
   with the state back, a resolved סעיף repaints as resolved and peakCheck() cannot grade it again.
   Layer 2 is the doneQ ledger in unit-js/40-resume.js, which does not depend on this working.
   That matters here specifically because part 07 offers "חזרה" back into part 06 — see
   ROUTING-AND-RETAKE.md.
   ═══════════════════════════════════════════════════════════ */

/* peakState is an OBJECT of objects, so it cannot travel through RESUME_PLAIN_VARS' verbatim copy —
   that would store a live reference that mutates along with the original, and the snapshot goTo()
   takes before resetScreenState() would already contain the change it exists to undo. It is
   deep-cloned explicitly below instead. */
var RESUME_PLAIN_VARS = [];
var RESUME_INPUT_IDS  = [];
var RESUME_TEXT_IDS   = [];

function clonePeakState(src) { return JSON.parse(JSON.stringify(src || {})); }

function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    peakState: clonePeakState(peakState),
    vars: {}
  };
}

/* The parameter MUST stay named `st` — see unit-js/README.md.
   A document written before per-סעיף feedback (2026-10-14) carries peakAnswers/peakCommitted
   instead: a committed pick was its single, final attempt, so it maps to a resolved סעיף. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  if (st.peakState) { peakState = clonePeakState(st.peakState); return; }
  if (st.peakAnswers) {
    peakState = {};
    Object.keys(st.peakAnswers).forEach(function (k) {
      var done = !!(st.peakCommitted && st.peakCommitted[k]), sel = st.peakAnswers[k];
      peakState[k] = { sel: sel, attempts: done ? 1 : 0, done: done, lastWrong: null,
                       phase: done ? (sel === PEAK_CORRECT[k] ? 'correct' : 'wrong2') : null };
    });
  }
}

function applyResumeDom(st) {}

/* peakPaint() rebuilds a סעיף completely from peakState — marks, button, hint and feedback popup —
   and resetScreenState() calls it for screens 1-4. goTo() wipes every popup before resetScreenState
   runs, so repainting here (after the state is re-applied) is what brings the popup back. */
function restoreScreenUI(n) {
  if (n >= 1 && n <= PEAK_PARTS) peakPaint(n);
}


/* ── xAPI ready hook ──
   Loads the unit metadata but reports NO unit-scope 'initialized' — this component is not the one
   that opens the unit. Preserved from the pre-extraction code; see the note in component 01. */
function onXapiReady() {
  loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {});
}
