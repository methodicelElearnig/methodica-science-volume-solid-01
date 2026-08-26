'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 02 (remediation)
   Reached from Part 01's score branch (<4/5). 6 SingleChoiceQuestions
   with progress dots; on completion → Part 03. Engine + SCQ template +
   progress-dots + report modal + xAPI, ported from Part 01.
   ═══════════════════════════════════════════════════════════ */

const TOTAL_SCREENS = 8;          // S0 intro + S1–S6 practice + S7 mid transition (sb98, sits between Q4 and Q5)
const PART_03_URL = '../methodica-science-volume-solid-01-03/index.html';

window.lomdaState = window.lomdaState || {};

/* ─── Scale App (1280×710 canvas) ─────────────────────────── */

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
const CHARACTER_ASSETS = { selection: 'png', 'start-line': 'mp4' };
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
const CHARACTER_SLOTS = {
  s0: { pose: 'start-line', w: 200, right: 40, bottom: 100, ca: '16 / 9' }   /* sb77 */
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
  /* Square is the CSS default; a 16:9 pose declares its own so the box is right from
     first paint instead of after the mp4 header lands. */
  el.style.setProperty('--ca', slot.ca || '');
  el.classList.toggle('companion--center', slot.center === true);
  ['left', 'right', 'top', 'bottom'].forEach(function (k) {
    el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
  });
}

function resetScreenState(n) {
  renderCompanion(n);
  if (n === 1) practiceEnter(0, 's1');
  if (n === 2) practiceEnter(1, 's2');
  if (n === 3) practiceEnter(2, 's3');
  if (n === 4) practiceEnter(3, 's4');
  if (n === 5) practiceEnter(4, 's5');
  if (n === 6) practiceEnter(5, 's6');
}
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  advanceScreen();
  if (e.key === 'ArrowRight') goBack();
  if (e.key === 'Escape') document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
});
function goBack() {
  if (currentScreen === 7) { goTo(4); return; }                                   // mid transition → back to Q4
  if (currentScreen === 5) { goTo(7); return; }                                   // Q5 → back to the mid transition
  const pIdx = practiceProgress.questions.findIndex(q => q.screen === currentScreen);
  if (pIdx !== -1) { goTo(pIdx > 0 ? practiceProgress.questions[pIdx - 1].screen : 0); return; }
  goTo(currentScreen - 1);
}
function advanceScreen() {
  if (currentScreen === 0) { goTo(1); return; }
  if (currentScreen === 7) { goTo(5); return; }                                   // mid transition → Q5
  if (practiceProgress.questions.some(q => q.screen === currentScreen)) return;   // via check button
  goTo(currentScreen + 1);
}

/* ═══ SingleChoiceQuestion (generic, reusable) — see Part 01 for the contract ═══ */
const SCQ_REG = {};
/* `phase` records WHAT THE LEARNER WAS LAST SHOWN — one of the three keys in cfg.popups, or null
   for a screen never checked (or whose marks a re-pick cleared). Single source for both halves of
   the answered look: which marks, and which feedback popup. Same field as part 01's. */
function scqRegister(cfg) { cfg.maxAttempts = cfg.maxAttempts || 2; SCQ_REG[cfg.screen] = { cfg: cfg, sel: null, attempts: 0, answered: false, done: false, phase: null }; }
function scqOpts(screen) { return document.querySelectorAll('#' + screen + ' .scq-opt'); }
function scqSelect(screen, id) {
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  s.sel = id;
  /* A re-pick after a wrong attempt wipes the marks and the popup, so the screen is back to
     "chosen but unchecked" — and `phase` has to say so, or the painter would repaint the retry
     verdict over an answer the learner never submitted. `attempts` stays put: it is the
     attempt LEDGER, not the display state. */
  if (s.attempts > 0) { s.phase = null; scqClosePopup(screen); scqOpts(screen).forEach(o => o.classList.remove('wrong', 'correct')); }
  scqOpts(screen).forEach(o => { const sel = o.dataset.id === id; o.classList.toggle('selected', sel); o.setAttribute('aria-checked', sel ? 'true' : 'false'); });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) chk.disabled = false;
}
function scqCheck(screen) {
  const s = SCQ_REG[screen], cfg = s.cfg;
  if (s.answered) { if (cfg.onContinue) cfg.onContinue(); else advanceScreen(); return; }
  if (!s.sel) return;
  s.attempts++;
  const correct = s.sel === cfg.correctId;

  /* xAPI: two attempts allowed. A correct answer or the second wrong one closes the question with
     'answered.last'; a first wrong answer is an interim 'answered'. Only '.last' feeds the
     component score.

     The ids are resolved HERE and not at registration time: xapiQ() reads window.METADATA, which the
     library fetches asynchronously, and registerPractice() runs while the page is still parsing. It
     returns the question IRI and the id of the containing item, which 720 v2.4 §2 makes mandatory as
     context.contextActivities.parent. */
  const q = xapiQ(cfg.item, cfg.qKey || 'q1');
  xapiSend(correct || s.attempts >= cfg.maxAttempts ? 'answered.last' : 'answered', 'question',
    { response: xapiAnswerText(document.querySelector('#' + screen + ' .scq-opt[data-id="' + s.sel + '"]')),
      success: !!correct,
      score: { scaled: correct ? 1 : 0 } },
    { questionId: q.questionId, parentId: q.parentId });

  /* Outside the send: xapiSend swallows exceptions, and the component score must not depend on
     whether reporting succeeded. Recorded only on the attempt that closes the question, so a first
     wrong answer followed by a correct one counts as correct. */
  if (correct || s.attempts >= cfg.maxAttempts) {
    XAPI_Q_RESULTS[cfg.item + '/' + (cfg.qKey || 'q1')] = !!correct;
  }

  if (correct) { s.phase = 'correct'; scqMark(screen, cfg.correctId, 'correct'); scqShowPopup(screen, 'correct'); scqFinish(screen, true); }
  else if (s.attempts >= cfg.maxAttempts) { s.phase = 'wrong2'; scqMark(screen, cfg.correctId, 'correct'); scqMark(screen, s.sel, 'wrong'); scqShowPopup(screen, 'wrong2'); scqFinish(screen, false); }
  else { s.phase = 'retry'; scqMark(screen, s.sel, 'wrong'); scqShowPopup(screen, 'retry'); }

  /* Synchronous, at the tail so it runs after every branch and after all painting. An answer given
     and then abandoned without navigating would otherwise rest entirely on the page-leave handlers,
     which Chrome may drop. No branch above returns, so no commitment escapes it. */
  try { flushResumeSave(); } catch (e) {}
}
// querySelectorAll, not querySelector: an image-hotspot option is two elements
// sharing one data-id (the readable text option + the band drawn over the photo)
// and both must take the correct/wrong state. Single-element options unaffected.
function scqMark(screen, id, cls) { document.querySelectorAll('#' + screen + ' .scq-opt[data-id="' + id + '"]').forEach(o => { o.classList.remove('selected'); o.classList.add(cls); }); }
function scqFinish(screen, isCorrect) {
  const s = SCQ_REG[screen]; s.answered = true; s.done = true;
  scqOpts(screen).forEach(o => { o.disabled = true; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden';
  if (s.cfg.onFinish) s.cfg.onFinish(isCorrect);
}
function scqShowPopup(screen, type) {
  const popup = document.getElementById(screen + '-scq-popup'); if (!popup) return;
  const cfg = SCQ_REG[screen].cfg.popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  document.getElementById(screen + '-scq-popup-title').innerHTML = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}
function scqClosePopup(screen) { document.getElementById(screen + '-scq-popup')?.classList.add('hidden'); }
function scqHint(screen) {
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  /* Reported on OPEN only. This overlay has no toggle — closing goes through scqCloseHint — so a
     learner reopening the hint legitimately reports a second request.
     No parentId: v2.4 mandates it for answered/evaluated only. */
  const q = xapiQ(s.cfg.item, s.cfg.qKey || 'q1');
  xapiSend('requested.1', 'question', null, { questionId: q.questionId });
  document.getElementById(screen + '-scq-hint-overlay')?.classList.remove('hidden');
}
function scqCloseHint(screen) { document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden'); }
function scqEnter(screen) {
  const s = SCQ_REG[screen]; if (!s) return;
  document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden');
  scqClosePopup(screen);
  if (s.done) {
    scqOpts(screen).forEach(o => { o.disabled = true; });
    const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; }
    const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden';
  } else { scqReset(screen); }
}
function scqReset(screen) {
  const s = SCQ_REG[screen]; s.sel = null; s.attempts = 0; s.answered = false; s.phase = null;
  scqOpts(screen).forEach(o => { o.classList.remove('selected', 'correct', 'wrong'); o.setAttribute('aria-checked', 'false'); o.disabled = false; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'צדקתי?'; chk.disabled = true; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) { hint.disabled = false; hint.style.visibility = ''; }
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — DropdownQuestion (thin UI over the SCQ controller)
   The word-menu options are .scq-opt (dqPick → scqSelect); the SCQ
   controller drives check/feedback; the trigger reflects the result.
   ═══════════════════════════════════════════════════════════ */
function dqToggle(screen) {
  const s = SCQ_REG[screen]; if (s && s.answered) return;
  document.getElementById(screen + '-answers').classList.toggle('hidden');
}
function dqPick(screen, id, label) {
  scqSelect(screen, id);
  const tr = document.querySelector('#' + screen + '-dropdown-trigger .dropdown-trigger-text');
  if (tr) tr.textContent = label;
  document.getElementById(screen + '-answers').classList.add('hidden');
}
function dqEnter(screen) {
  const s = SCQ_REG[screen];
  const trigger = document.getElementById(screen + '-dropdown-trigger');
  const list = document.getElementById(screen + '-answers');
  if (trigger && list) {
    // The trigger box must be exactly as wide as the option list. list.offsetWidth
    // ignores the canvas-wide scale() transform (unlike getBoundingClientRect), so
    // this stays correct at any zoom. Briefly un-hide to measure — .hidden is
    // display:none, which can't be measured — then restore, all before paint.
    const wasHidden = list.classList.contains('hidden');
    if (wasHidden) list.classList.remove('hidden');
    trigger.style.width = list.offsetWidth + 'px';
    if (wasHidden) list.classList.add('hidden');
  }
  if (trigger && s && !s.done) {
    trigger.classList.remove('correct', 'wrong');
    const tr = trigger.querySelector('.dropdown-trigger-text');
    if (tr) tr.textContent = '';
  }
  list?.classList.add('hidden');
  scqEnter(screen);
}
/* Close any open dropdown when clicking outside it. */
document.addEventListener('click', function (e) {
  if (e.target.closest('.dropdown')) return;
  document.querySelectorAll('.dropdown-list:not(.hidden)').forEach(l => l.classList.add('hidden'));
});

/* ═══ Progress dots + practice wiring (6 questions, no score branch → Part 03) ═══ */
var practiceProgress = {
  questions: [
    { number: 1, visited: true,  state: 'current',      screen: 1 },
    { number: 2, visited: false, state: 'not-answered', screen: 2 },
    { number: 3, visited: false, state: 'not-answered', screen: 3 },
    { number: 4, visited: false, state: 'not-answered', screen: 4 },
    { number: 5, visited: false, state: 'not-answered', screen: 5 },
    { number: 6, visited: false, state: 'not-answered', screen: 6 }
  ]
};
/* How many of the six the learner got right. Counted from XAPI_Q_RESULTS rather than from
   practiceProgress, so the number reported and the number scored cannot drift apart. */
function practiceScore() {
  return xapiCorrectCount();
}

function goToNextPart() {
  /* Close the item the learner is standing in before reporting the component: an item 'completed'
     that arrived after its component's would be out of order. */
  try { xapiFinishItems(); } catch (e) {}

  /* xAPI: the component 'completed', with an EXPLICIT result. The library's own aggregate is an
     all-correct AND, which would report success:false for any partial pass.

     Denominator is 6 — the six exercises the learner was promised (and the six progress dots),
     not the metadata question count, which happens to agree here but does not in part 04.

     ⚠️ success:true unconditionally, and that is a deliberate reading rather than an oversight.
     This component is remediation: it has NO pass threshold anywhere in the code and always
     proceeds to Part 03, whatever the learner scores. v2.4 leaves `success` to the content
     provider's own definition, so with no gate to clear, completing the component IS the success
     condition and `score.scaled` carries the performance. If the content owner wants a threshold
     here (part 01 uses 4/5), this is the one line to change — see REPORT-XAPI.md open items. */
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson',
      { success: true, score: { scaled: practiceScore() / 6 } });
  } catch (e) { console.error('[xAPI] completed component 02', e); }

  if (RESUME_ENABLED) writeForwardState('methodica-science-volume-solid-01-03');
  window.location.href = PART_03_URL + window.location.search;   // remediation always proceeds to Part 03
}
function updateProgressQuestion(container, state) {
  if (!container) return;
  const qs = state.questions;
  qs.forEach((q, i) => {
    const n = i + 1;
    const item = container.querySelector('[data-question="' + n + '"]'); if (!item) return;
    const icon = item.querySelector('.progress-question__icon'), label = item.querySelector('.progress-question__label');
    icon.classList.remove('progress-question__icon--current', 'progress-question__icon--correct', 'progress-question__icon--incorrect');
    if (q.state !== 'not-answered') icon.classList.add('progress-question__icon--' + q.state);
    label.classList.toggle('progress-question__label--visited', q.visited);
    const navigable = q.visited && q.screen != null && q.screen !== currentScreen;
    item.style.cursor = navigable ? 'pointer' : '';
    item.onclick = navigable ? (function (s) { return function () { goTo(s); }; })(q.screen) : null;
  });
  for (let n = 1; n < qs.length; n++) {
    const conn = container.querySelector('[data-connector="' + n + '"]'); if (!conn) continue;
    const st = qs[n - 1].state;
    conn.classList.toggle('progress-question__connector--visited', st === 'correct' || st === 'incorrect');
  }
}
function syncPracticeNav(screen) { updateProgressQuestion(document.querySelector('#' + screen + ' .progress-question'), practiceProgress); }
function practiceEnter(idx, screen) {
  const q = practiceProgress.questions[idx];
  q.visited = true; if (q.state === 'not-answered') q.state = 'current';
  syncPracticeNav(screen);
  // A DropdownQuestion screen also needs its trigger text/state reset on
  // (re-)entry, which scqEnter alone doesn't do.
  document.getElementById(screen + '-dropdown-trigger') ? dqEnter(screen) : scqEnter(screen);
}
function registerPractice(idx, cfg) {
  cfg.screen = 's' + practiceProgress.questions[idx].screen;
  cfg.onFinish = function (ok) {
    const q = practiceProgress.questions[idx]; q.state = ok ? 'correct' : 'incorrect'; q.visited = true; syncPracticeNav(cfg.screen);
    const trigger = document.getElementById(cfg.screen + '-dropdown-trigger');   // reflect result on the trigger, if this is a DropdownQuestion
    if (trigger) { trigger.classList.remove('correct', 'wrong'); trigger.classList.add(ok ? 'correct' : 'wrong'); }
  };
  cfg.onContinue = function () {
    const next = idx + 1;
    if (next >= practiceProgress.questions.length) { goToNextPart(); return; }
    practiceProgress.questions[next].visited = true;
    // Q4 → the sb98 transition, which then hands on to Q5.
    goTo(idx === 3 ? 7 : practiceProgress.questions[next].screen);
  };
  scqRegister(cfg);
  attachPopupDrag(document.getElementById(cfg.screen + '-scq-popup'));
}

/* ═══ Feedback copy — the storyboard's, per QA/TEXT-FIDELITY.md §Agreed policy ═══
   The deck gives each question its own retry / correct / wrong-final slides, and the correct
   and wrong-final slides carry the SAME explanation — so it is written once per question and
   fbPopups() hands it to both. Same shape as part 04, which was ported first.
   Departures, all under §Deck defects:
     - the wrong-final line "התשובה הנכונה מסומנת." is uniform. Slides 82 and 97 omit it where
       their siblings carry it, and the unit marks the correct option on every wrong-final.
     - slide 107 leaves the correct-answer title as the placeholder "טקסט משוב"; it takes the
       deck's usual "נכון מאוד!".
     - deck expressions are wrapped in .section-result-expr: digits and operators are
       bidi-neutral and reorder inside an RTL paragraph without it. */
const FB_RETRY  = { title: 'התשובה אינה נכונה.', body: ['<b>שננסה שוב?</b>'] };
const FB_WRONG2 = 'התשובה אינה נכונה.<br />התשובה הנכונה מסומנת.';
const fbPopups = (correctTitle, explanation) => ({
  retry:   FB_RETRY,
  correct: { title: correctTitle, body: explanation },
  wrong2:  { title: FB_WRONG2,    body: explanation }
});

registerPractice(0, {  // Basic 1 — non-geometric body
  correctId: 'b', item: '01',
  popups: fbPopups('נכון מאוד!', [   /* sb79/81/82 */
    'למפלצת יש צורה הנדסית שאינה מוגדרת: הצורה שלה לא אחידה, לא בנויה מקווים ישרים או מעגלים, ואי-אפשר לחשב את נפחה בעזרת נוסחה.'])
});
registerPractice(1, {  // Basic 2 — who is right
  correctId: 'b', item: '02',
  popups: fbPopups('נכון מאוד!', [   /* sb85/86 */
    'לגוף שאינו הנדסי מודדים את הנפח בעזרת דחיקת מים – מכניסים אותו למשורה ובודקים בכמה המים עלו. ההפרש בין כמות המים המקורית לכמות החדשה = נפח הגוף!'])
});
registerPractice(2, {  // Basic 3 — which tool
  correctId: 'b', item: '03',
  popups: fbPopups('נכון מאוד!', [   /* sb88/90/91 */
    'ניתן להכניס גוף מסוים למשורה עם מים ולמדוד את הנפח שלו לפי כמות המים שעלתה.'])
});
registerPractice(3, {  // Basic 4 — flooding 760
  correctId: 'b', item: '04',
  popups: fbPopups('נכון מאוד!', [   /* sb93/95/96 */
    'גוף שנכנס למים גורם להצפת מים בכמות זהה לנפח שלו בדיוק. לכן נפח הגליל הוא בדיוק 760 מ"ל.'])
});
registerPractice(4, {  // Standard-ב 1 — rise area
  correctId: 'b', item: '05',
  popups: fbPopups('תשובה נכונה!', [   /* sb100/102/103 */
    'האזור שבו רואים את כמות המים שעלתה במשורה הוא זה שמייצג את נפח המפלצת.'])
});
registerPractice(5, {  // Standard-ב 2 — single bead = 10
  correctId: 'a', item: '06',
  popups: fbPopups('נכון מאוד!', [   /* sb105/107/108 */
    'שלושת החרוזים יחד העלו את מפלס המים ב־30 מ"ל <span class="section-result-expr">(130−100)</span>.',
    'לכן נפחם הכולל הוא 30 סמ"ק.',
    'מכיוון שכל החרוזים זהים, נחלק את הנפח הכולל ב-3 ונגלה שנפחו של כל חרוז הוא 10 סמ"ק.'])
});

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   Read at CALL time by unit-js/20-xapi.js, /25-report.js and /50-loader.js.
   ═══════════════════════════════════════════════════════════ */

/* Screen (data-screen index) -> [subContent suffix, page-in-item]; null = no catalog item.
   Read by xapiOnScreen() (element 0, to open/close items) and by submitReport() (both).

   MUST have exactly TOTAL_SCREENS entries — _test/checks.mjs gate 3 pairs the constant with the
   markup, and an unlisted screen silently reports no item at all. Screens 0 and 7 were missing
   before: a problem report filed from the intro or the mid-transition went out with an empty item. */
var SCREEN_TO_SUBCONTENT = {
  0: null,            // intro (sb77)
  1: ['01', 1],       // basic 1 — non-geometric body
  2: ['02', 1],       // basic 2 — who is right
  3: ['03', 1],       // basic 3 — which tool
  4: ['04', 1],       // basic 4 — flooding 760
  7: null,            // sb98 mid transition — sits between Q4 and Q5, belongs to no item
  5: ['05', 1],       // standard-ב 1 — rise area
  6: ['06', 1]        // standard-ב 2 — single bead
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-02';
/* Component and item ids must match metadata/*.json byte-for-byte — this unit's convention keeps a
   TRAILING SLASH on unit, component and item ids (but not on question ids). */
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* Items carrying a graded question IN CODE. All six here; drives the 'evaluation-item' context
   category on the item 'initialized', and expectsAnswer on its 'completed'. */
var XAPI_EVAL_ITEMS = { '01': 1, '02': 1, '03': 1, '04': 1, '05': 1, '06': 1 };

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-02.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   All six questions are SCQ, so every answer lives in SCQ_REG rather than in top-level variables —
   which is why RESUME_PLAIN_VARS is empty here and the work is in the scq/practice reducers.
   ═══════════════════════════════════════════════════════════ */

var RESUME_PLAIN_VARS = [];      // nothing at file scope holds answer state in this component
var RESUME_INPUT_IDS  = [];      // no typed answers

/* A dropdown keeps its machine value in SCQ_REG.sel but the LABEL only in the DOM, and dqEnter()
   blanks it while the question is unsolved — so a selection made but not yet checked would lose its
   text. Collected from the document rather than from a hard-coded id list: the list would go stale
   the moment a screen gains or loses a dropdown, silently and with no error. */
function captureDropdownTexts() {
  var out = {};
  document.querySelectorAll('[id$="-dropdown-trigger"] .dropdown-trigger-text').forEach(function (el) {
    var trigger = el.closest('[id$="-dropdown-trigger"]');
    if (trigger) out[trigger.id] = el.textContent;
  });
  return out;
}

function applyDropdownTexts(texts) {
  if (!texts) return;
  Object.keys(texts).forEach(function (id) {
    var t = document.querySelector('#' + id + ' .dropdown-trigger-text');
    if (t) t.textContent = texts[id];
  });
}

/* Only the MUTABLE half of each SCQ_REG entry. cfg holds functions and popup copy — restoring it
   would overwrite live config with a JSON round-trip of itself. */
function captureScqState() {
  return Object.keys(SCQ_REG).reduce(function (o, k) {
    var s = SCQ_REG[k];
    o[k] = { sel: s.sel, attempts: s.attempts, answered: !!s.answered, done: !!s.done,
             phase: s.phase || null };
    return o;
  }, {});
}

function applyScqState(scq) {
  if (!scq) return;
  Object.keys(scq).forEach(function (k) {
    var s = SCQ_REG[k];
    if (!s) return;
    s.sel = scq[k].sel; s.attempts = scq[k].attempts;
    s.answered = !!scq[k].answered; s.done = !!scq[k].done;
    s.phase = scq[k].phase || null;
  });
}

/* Positional, and deliberately WITHOUT `screen`: that is a static table entry, and a stale document
   must not be able to override a later screen renumber. */
function capturePracticeState() {
  return practiceProgress.questions.map(function (q) {
    return { visited: !!q.visited, state: q.state };
  });
}

function applyPracticeState(practice) {
  if (!practice) return;
  practice.forEach(function (p, i) {
    var q = practiceProgress.questions[i];
    if (!q) return;
    q.visited = !!p.visited; q.state = p.state;
  });
}

/* This part's payload only. `v`, `part` and the ledgers live on the enclosing document.
   Every object is COPIED, never referenced: practiceEnter() mutates practiceProgress, so a payload
   holding a live reference would mutate along with it and the snapshot taken before
   resetScreenState() would already contain the change it exists to undo. */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    scq: captureScqState(),
    practice: capturePracticeState(),
    texts: captureDropdownTexts(),
    vars: {}
  };
}

/* The parameter MUST stay named `st` — see unit-js/README.md. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  applyScqState(st.scq);
  applyPracticeState(st.practice);
}

function applyResumeDom(st) {
  applyDropdownTexts(st.texts);
}

/* Repaints the answered look. Mirrors the DOM writes of scqCheck's branches and NOTHING else — no
   state mutation, no statements, no progress bookkeeping: all of that happened when the answer was
   first given, and repeating it here would report a second answer.

   scqEnter()'s `done` branch disables the options and relabels the button; the marks, a mid-attempt
   selection and the FEEDBACK POPUP are what this adds. The popup used to be excluded on the grounds
   that reopening one is "new UI, not a restore" — but it carries the explanation, so a returning
   learner was left with marks and no reason for them. `phase` says which popup scqCheck last opened;
   painting from `attempts` instead is what marked a re-picked, never-checked option wrong. */
function restoreScreenUI(n) {
  try {
    var screen = 's' + n;
    var s = SCQ_REG[screen];
    if (!s) return;
    if (!s.done && !s.phase && !s.sel) return;      // pristine — do not touch it

    if (s.phase === 'correct' || s.phase === 'wrong2') {
      scqMark(screen, s.cfg.correctId, 'correct');
      /* A wrong final answer leaves both marks on screen: the learner's pick and the right one. */
      if (s.phase === 'wrong2' && s.sel && s.sel !== s.cfg.correctId) scqMark(screen, s.sel, 'wrong');
    } else if (s.phase === 'retry') {
      if (s.sel) scqMark(screen, s.sel, 'wrong');
    } else if (s.sel) {
      document.querySelectorAll('#' + screen + ' .scq-opt[data-id="' + s.sel + '"]').forEach(function (o) {
        o.classList.add('selected');
        o.setAttribute('aria-checked', 'true');
      });
    }

    if (s.done) {
      var trig = document.getElementById(screen + '-dropdown-trigger');
      if (trig) {
        trig.classList.remove('correct', 'wrong');
        trig.classList.add(s.sel === s.cfg.correctId ? 'correct' : 'wrong');
      }
    }

    if (s.phase) scqShowPopup(screen, s.phase);

    /* Mirror the live enablement predicate rather than assuming. An answered screen already carries
       the enabled 'שנמשיך?' button from scqEnter, so only the unsolved case is computed here — a
       painter that leaves a full screen with a dead button strands the learner. */
    if (!s.done) {
      var chk = document.getElementById(screen + '-scq-check');
      if (chk) chk.disabled = !s.sel;
    }
  } catch (e) { console.error('[resume] restoreScreenUI', e); }
}

/* ── xAPI ready hook ──
   Called by unit-js/50-loader.js after this component's 'initialized' and the landing screen's item
   init. Opens the UNIT: loads the unit metadata into window.UNIT_METADATA, then reports the
   unit-scope 'initialized'.

   Only components 01 and 02 did this before the extraction, and that split is preserved verbatim
   here rather than "fixed" — whether the unit should be opened by exactly one component (01 is the
   entry every launch passes through) is a reporting-semantics question for Stage 4, not a
   refactoring one. See REPORT-XAPI.md. */
function onXapiReady() {
  loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {
    try { sendStatement720('initialized', 'onlinelesson', null, { scope: 'unit' }); } catch (e) {}
  });
}
