'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 04 (advanced)
   S0 intro + 8 SingleChoice questions with progress dots, two scenario
   screens, and one combined result for the last three. On completion →
   Part 05 (peak א). Engine + SCQ + progress + report + xAPI.
   ═══════════════════════════════════════════════════════════ */

const TOTAL_SCREENS = 12;  // S0 intro + S1–S8 + scenarios S9/S10 + result S11

/* ── The סעיפים that run WITHOUT per-question feedback ────────────────────
   Storyboard 141 has the companion promise "נענה בלי רמזים ונדע אם צדקנו רק בסוף",
   and the deck backs that up: 141/142/143 carry no hint button and no feedback
   slides of their own, and 144/145 give one verdict covering all three. So these
   three grade silently — no popup, no right/wrong marking on the options — and
   RESULT_SCREEN reports them together.
   The progress dots must not leak the verdict either. Each answer is recorded the
   moment it is given (so the result screen and xAPI both have it); only the
   correct/incorrect *rendering* is withheld, and revealed on the result screen. */
const SILENT_SCREENS = [6, 7, 8];
const RESULT_SCREEN = 11;
let resultRevealed = false;
const isSilent = n => SILENT_SCREENS.indexOf(n) !== -1;

/* Scenario screens: storyboard pages that set up a question but ask nothing. They take
   the next free ids so no existing screen / popup / hint-overlay id and no progress-nav
   index had to shift; the flow order lives in this table instead of in the numbering.
   `after`/`before` are the question screens they sit between. */
const SCENARIOS = [
  { screen: 9,  after: 3, before: 4 },   // slide 129 — Liyan's slime, before סעיף א
  { screen: 10, after: 5, before: 6 },   // slide 140 — Gili's marbles, before סעיף א
];
const scenarioAt     = n => SCENARIOS.find(s => s.screen === n);
const scenarioBefore = n => SCENARIOS.find(s => s.before === n);
const PART_05_URL = '../methodica-science-volume-solid-01-05/index.html';
window.lomdaState = window.lomdaState || {};

/* Build the empty progress navs from data-count (avoids repeating markup). */
function buildProgressNav() {
  document.querySelectorAll('.progress-question[data-count]').forEach(function (nav) {
    const count = parseInt(nav.dataset.count, 10) || 0; let h = '';
    for (let i = 1; i <= count; i++) {
      h += '<div class="progress-question__item" data-question="' + i + '"><div class="progress-question__icon"></div><span class="progress-question__label">שאלה ' + i + '</span></div>';
      if (i < count) h += '<div class="progress-question__connector" data-connector="' + i + '"></div>';
    }
    nav.innerHTML = h;
  });
}
buildProgressNav();

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
const CHARACTER_ASSETS = { selection: 'png', dumbbells: 'mp4', ask: 'mp4' };
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
/* s7 and s11 are NOT here: they author their sprite in index.html inside a .companion-say
   group, because the position only makes sense next to a bubble that also lives in the
   markup. Keeping a slot for them too would mean two sources of truth for the same
   offsets — and now the group, not a number, is what holds the pair together. */
/* The intro sprite is the screen's only illustration, so it carries it rather than decorating a
   corner: 600px wide (3× the old 200) and centred under the text instead of tucked bottom-right.
   `center: true` is the shared slot flag — see part 01's s12. At 16:9 that is 337px tall, so the
   text moves up to make room; `#s0 .transition-content` in this part's stylesheet holds the pair
   balanced in the 646px above the nav bar. */
const CHARACTER_SLOTS = {
  s0: { pose: 'dumbbells', w: 600, center: true, bottom: 174, ca: '16 / 9' }     /* sb113 */
};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  const slot = CHARACTER_SLOTS['s' + n];
  /* NOT `:scope > .companion`: a sprite authored inside a .companion-say group is nested,
     and missing it would leave the orange src baked into the markup in front of a learner
     who chose turquoise. */
  let el = screen.querySelector('.companion');
  /* An AUTHORED sprite (data-pose in the markup, no slot) must survive this function —
     only which character it shows is refreshed. Removing every sprite on a slot-less
     screen deleted s11's. An INJECTED one is still cleaned up when its slot goes away. */
  if (!slot) {
    if (el && el.dataset.injected === '1') { el.remove(); el = null; }
    else if (el) { el.src = characterAsset(el.dataset.pose || 'selection'); startCompanionMedia(el); }
    screen.classList.toggle('has-companion', !!el);
    return;
  }
  const tag = CHARACTER_ASSETS[slot.pose] === 'mp4' ? 'video' : 'img';
  if (el && el.dataset.injected === '1' && el.tagName.toLowerCase() !== tag) { el.remove(); el = null; }
  if (!el) {
    el = document.createElement(tag);
    el.className = 'companion';
    el.alt = '';                                   // decorative, carries no information
    el.setAttribute('aria-hidden', 'true');
    el.draggable = false;
    el.dataset.injected = '1';
    if (tag === 'video') { el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true; }
    screen.appendChild(el);
  }
  // Lets a template reserve room for the sprite instead of being drawn over.
  screen.classList.add('has-companion');
  el.src = characterAsset(slot.pose);
  startCompanionMedia(el);
  el.style.setProperty('--cw', slot.w + 'px');
  /* Square is the CSS default; a 16:9 pose declares its own so the box is right from
     first paint instead of after the mp4 header lands. */
  el.style.setProperty('--ca', slot.ca || '');
  el.classList.toggle('companion--center', slot.center === true);
  /* A grouped sprite is positioned BY the group, so writing slot offsets onto it would be
     a second, conflicting source of truth. (Reachable only if a screen ever has both.) */
  if (!el.closest('.companion-say')) {
    ['left', 'right', 'top', 'bottom'].forEach(function (k) {
      el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
    });
  }
}

function resetScreenState(n) {
  renderCompanion(n);
  /* Reaching the result screen is what unseals the three withheld verdicts. Set the
     flag before syncing any nav so this screen's own dots render revealed. */
  if (n === RESULT_SCREEN) { resultRevealed = true; renderSectionResult(); syncPracticeNav('s' + n); }
  if (n >= 1 && n <= 8) {
    const idx = n - 1;
    practiceEnter(idx, 's' + n);
  }
  /* The scenario screen carries the same progress nav as the question screens.
     buildProgressNav() fills in its dots from data-count, but without this the nav
     renders with no state at all — nothing answered, nothing current. Mark the question
     it introduces (סעיף א) as current, since this is that question's opening screen, and
     sync. No answer state is touched: practiceEnter() re-runs on the question itself. */
  const sc = scenarioAt(n);
  if (sc) {
    const q = practiceProgress.questions[sc.before - 1];
    q.visited = true;
    if (q.state === 'not-answered') q.state = 'current';
    syncPracticeNav('s' + n);
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  advanceScreen();
  if (e.key === 'ArrowRight') goBack();
  if (e.key === 'Escape') document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
});
function goBack() {
  /* The result screen follows the last question, not screen 10. */
  if (currentScreen === RESULT_SCREEN) { goTo(practiceProgress.questions[practiceProgress.questions.length - 1].screen); return; }
  const sc = scenarioAt(currentScreen);
  if (sc) { goTo(sc.after); return; }
  const pIdx = practiceProgress.questions.findIndex(q => q.screen === currentScreen);
  if (pIdx !== -1) {
    const pre = scenarioBefore(currentScreen);   // step back through the scenario, not past it
    if (pre) { goTo(pre.screen); return; }
    goTo(pIdx > 0 ? practiceProgress.questions[pIdx - 1].screen : 0); return;
  }
  goTo(currentScreen - 1);
}
function advanceScreen() {
  if (currentScreen === 0) { goTo(1); return; }
  if (currentScreen === RESULT_SCREEN) { goToNextPart(); return; }   // last screen of the part
  const sc = scenarioAt(currentScreen);
  if (sc) { goTo(sc.before); return; }
  if (practiceProgress.questions.some(q => q.screen === currentScreen)) return;
  goTo(currentScreen + 1);
}

/* ═══ Feedback popup renderer ═══ */
function renderFeedbackPopup(screen, type, popups) {
  const popup = document.getElementById(screen + '-scq-popup'); if (!popup) return;
  const cfg = popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  /* innerHTML, not textContent: the deck's wrong-final title is two bold lines.
     Every title is a literal in this file, same as s11-result-title. */
  document.getElementById(screen + '-scq-popup-title').innerHTML = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}
function scqClosePopup(screen) { document.getElementById(screen + '-scq-popup')?.classList.add('hidden'); }

/* ═══ SingleChoiceQuestion ═══ */
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

  /* xAPI: ids resolved HERE, not at registration — xapiQ() reads window.METADATA, which the library
     fetches asynchronously while registerPractice() runs during parse. parentId is the containing
     item, mandatory per v2.4 §2. `response` is the option's visible text, which was missing entirely.
     A silent question (maxAttempts 1) always closes on its single attempt. */
  const q = xapiQ(cfg.item, cfg.qKey);
  xapiSend(correct || s.attempts >= cfg.maxAttempts ? 'answered.last' : 'answered', 'question',
    { response: xapiAnswerText(document.querySelector('#' + screen + ' .scq-opt[data-id="' + s.sel + '"]')),
      success: !!correct,
      score: { scaled: correct ? 1 : 0 } },
    { questionId: q.questionId, parentId: q.parentId });

  /* Outside the send: xapiSend swallows exceptions and the score must not depend on reporting.
     Recorded only on the closing attempt. */
  if (correct || s.attempts >= cfg.maxAttempts) {
    XAPI_Q_RESULTS[cfg.item + '/' + cfg.qKey] = !!correct;
  }
  /* Silent question (cfg.silent, maxAttempts 1): record the answer and move on without
     revealing anything — no popup, no correct/wrong marking on the options. The verdict
     surfaces once, on RESULT_SCREEN. */
  if (cfg.silent) {
    scqFinish(screen, correct);
    /* This branch returns before the tail flush, so it carries its own — and it has to come BEFORE
       the navigation, which only arms a debounced save. */
    try { flushResumeSave(); } catch (e) {}
    if (cfg.onContinue) cfg.onContinue(); else advanceScreen();
    return;
  }
  if (correct) { s.phase = 'correct'; scqMark(screen, cfg.correctId, 'correct'); renderFeedbackPopup(screen, 'correct', cfg.popups); scqFinish(screen, true); }
  else if (s.attempts >= cfg.maxAttempts) { s.phase = 'wrong2'; scqMark(screen, cfg.correctId, 'correct'); scqMark(screen, s.sel, 'wrong'); renderFeedbackPopup(screen, 'wrong2', cfg.popups); scqFinish(screen, false); }
  else { s.phase = 'retry'; scqMark(screen, s.sel, 'wrong'); renderFeedbackPopup(screen, 'retry', cfg.popups); }

  /* Synchronous, after all painting. An answer given and then abandoned without navigating would
     otherwise rest entirely on the page-leave handlers, which Chrome may drop. */
  try { flushResumeSave(); } catch (e) {}
}
/* A silent question never shows a verdict, so "צדקתי?" ("was I right?") would promise
   one it does not deliver — those screens just continue. */
function scqLabel(cfg, done) { return cfg.silent ? 'המשך' : (done ? 'שנמשיך?' : 'צדקתי?'); }
function scqMark(screen, id, cls) { const o = document.querySelector('#' + screen + ' .scq-opt[data-id="' + id + '"]'); if (o) { o.classList.remove('selected'); o.classList.add(cls); } }
function scqFinish(screen, ok) {
  const s = SCQ_REG[screen]; s.answered = true; s.done = true;
  scqOpts(screen).forEach(o => { o.disabled = true; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = scqLabel(s.cfg, true); chk.disabled = false; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden';
  if (s.cfg.onFinish) s.cfg.onFinish(ok);
}
function scqHint(screen) {
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  /* Reported on open. No parentId: v2.4 mandates it for answered/evaluated only. */
  xapiSend('requested.1', 'question', null, { questionId: xapiQ(s.cfg.item, s.cfg.qKey).questionId });
  document.getElementById(screen + '-scq-hint-overlay')?.classList.remove('hidden');
}
function scqCloseHint(screen) { document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden'); }
function scqEnter(screen) {
  const s = SCQ_REG[screen]; if (!s) return;
  document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden'); scqClosePopup(screen);
  if (s.done) { scqOpts(screen).forEach(o => { o.disabled = true; }); const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = scqLabel(s.cfg, true); chk.disabled = false; } const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden'; }
  else { scqReset(screen); }
}
function scqReset(screen) {
  const s = SCQ_REG[screen]; s.sel = null; s.attempts = 0; s.answered = false; s.phase = null;
  scqOpts(screen).forEach(o => { o.classList.remove('selected', 'correct', 'wrong'); o.setAttribute('aria-checked', 'false'); o.disabled = false; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = scqLabel(s.cfg, false); chk.disabled = true; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) { hint.disabled = false; hint.style.visibility = ''; }
}

/* ═══ Progress dots + practice wiring (8 questions → Part 05) ═══ */
var practiceProgress = { questions: [] };
for (let i = 1; i <= 8; i++) practiceProgress.questions.push({ number: i, visited: i === 1, state: i === 1 ? 'current' : 'not-answered', screen: i });
/* Correct answers out of the eight, read from XAPI_Q_RESULTS so the number reported and the number
   scored cannot drift from each other. */
function practiceScore() {
  return xapiCorrectCount();
}

function goToNextPart() {
  /* Closes item 05 — the last one open, since the result screen still belongs to it. */
  try { xapiFinishItems(); } catch (e) {}

  /* Explicit result: the library's aggregate is an all-correct AND, which would report failure for
     any partial pass. Denominator is 8 — the eight questions the learner was promised (and the eight
     progress dots), which here also matches the metadata count.

     success:true unconditionally, on the same reading confirmed for part 02: this component has no
     pass threshold anywhere in its code and always proceeds to Part 05, so completing it IS the
     success condition and score.scaled carries the performance. */
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson',
      { success: true, score: { scaled: practiceScore() / 8 } });
  } catch (e) { console.error('[xAPI] completed component 04', e); }

  if (RESUME_ENABLED) writeForwardState('methodica-science-volume-solid-01-05');
  window.location.href = PART_05_URL + window.location.search;
}
/* What the nav is allowed to SHOW, as opposed to what has been recorded. A silent
   question that has been answered still reads as 'current' — visited, verdict withheld —
   until the result screen unseals it. */
function visibleState(q) {
  if (!resultRevealed && isSilent(q.screen) && (q.state === 'correct' || q.state === 'incorrect')) return 'current';
  return q.state;
}
function updateProgressQuestion(container, state) {
  if (!container) return; const qs = state.questions;
  qs.forEach((q, i) => {
    const n = i + 1; const item = container.querySelector('[data-question="' + n + '"]'); if (!item) return;
    const icon = item.querySelector('.progress-question__icon'), label = item.querySelector('.progress-question__label');
    const vs = visibleState(q);
    icon.classList.remove('progress-question__icon--current', 'progress-question__icon--correct', 'progress-question__icon--incorrect');
    if (vs !== 'not-answered') icon.classList.add('progress-question__icon--' + vs);
    label.classList.toggle('progress-question__label--visited', q.visited);
    const nav = q.visited && q.screen != null && q.screen !== currentScreen;
    item.style.cursor = nav ? 'pointer' : ''; item.onclick = nav ? (function (s) { return function () { goTo(s); }; })(q.screen) : null;
  });
  for (let n = 1; n < qs.length; n++) { const conn = container.querySelector('[data-connector="' + n + '"]'); if (!conn) continue; const st = visibleState(qs[n - 1]); conn.classList.toggle('progress-question__connector--visited', st === 'correct' || st === 'incorrect'); }
}
function syncPracticeNav(screen) { updateProgressQuestion(document.querySelector('#' + screen + ' .progress-question'), practiceProgress); }
function practiceEnter(idx, screen) { const q = practiceProgress.questions[idx]; q.visited = true; if (q.state === 'not-answered') q.state = 'current'; syncPracticeNav(screen); scqEnter(screen); }
function _practiceOnFinish(idx, screen) { return function (ok) { const q = practiceProgress.questions[idx]; q.state = ok ? 'correct' : 'incorrect'; q.visited = true; syncPracticeNav(screen); }; }
function _practiceOnContinue(idx) {
  return function () {
    const nx = idx + 1;
    if (nx >= practiceProgress.questions.length) { goTo(RESULT_SCREEN); return; }
    practiceProgress.questions[nx].visited = true;
    const target = practiceProgress.questions[nx].screen;
    const pre = scenarioBefore(target);          // a question with a scenario page opens on it
    goTo(pre ? pre.screen : target);
  };
}
function registerPractice(idx, cfg) { cfg.screen = 's' + practiceProgress.questions[idx].screen; cfg.onFinish = _practiceOnFinish(idx, cfg.screen); cfg.onContinue = _practiceOnContinue(idx); scqRegister(cfg); attachPopupDrag(document.getElementById(cfg.screen + '-scq-popup')); }

/* ═══ Feedback copy — storyboard slides 115-139 ═══
   The deck gives every question a five-slide block: question, retry, hint, correct,
   wrong-final. Three things follow from that and were wrong before:
     - RETRY says nothing about the content. It is the same two bold lines on every
       retry slide (115/120/125/131/136); the deck puts the thinking prompt on the HINT
       slide, which is where the unit's invented nudges have moved to.
     - the WRONG-FINAL body is the SAME text as correct, differing only in the bold
       prefix. Each question declares its explanation once and both variants share the
       array, so they cannot drift apart.
     - the correct title is `נכון מאוד!`, not `נכון!`.
   Slides 128 and 134 write `התשובה הנכונה מוצגת.` where 118/123/139 write `מסומנת.`;
   the unit marks the correct option, so FB_WRONG2 keeps `מסומנת` everywhere
   (QA/TEXT-FIDELITY.md §Deck defects). */
const FB_RETRY  = { title: 'התשובה אינה נכונה.', body: ['<b>שננסה שוב?</b>'] };
const FB_WRONG2 = 'התשובה אינה נכונה.<br />התשובה הנכונה מסומנת.';
const fbPopups = explanation => ({
  retry:   FB_RETRY,
  correct: { title: 'נכון מאוד!', body: explanation },
  wrong2:  { title: FB_WRONG2,    body: explanation }
});

registerPractice(0, { correctId: 'a', item: '01', qKey: 'q1', popups: fbPopups([   /* sb117/118 */
  'הטבעת העלתה את מפלס המים במשורה.',
  'העלייה בגובה המים היא הרמז שאפשר למדוד באמצעותו את נפח הטבעת, משום שנפח המים שנדחקו שווה לנפח החלק השקוע של הטבעת.']) });
registerPractice(1, { correctId: 'b', item: '02', qKey: 'q1', popups: fbPopups([   /* sb122/123 */
  'עדשים הם מוצק גרגרי וניתן למדוד את נפחם באמצעות כוס מדידה:',
  'ממלאים את הכוס בעדשים וקוראים את הנפח לפי השנתות שעליה.']) });
registerPractice(2, { correctId: 'a', item: '03', qKey: 'q1', popups: fbPopups([   /* sb127/128 */
  'המדידות מהימנות משום שהתוצאות החוזרות קרובות מאוד זו לזו.']) });
registerPractice(3, { correctId: 'b', item: '04', qKey: 'q1', popups: fbPopups([   /* sb133/134 */
  'אם ליאן תעטוף משקולת קטנה בסליים ותכניס למשורה – הסליים ישקע והיא תוכל למדוד את הנפח שלו.']) });
registerPractice(4, { correctId: 'd', item: '04', qKey: 'q2', popups: fbPopups([   /* sb138/139 */
  'נפח המים הסופי במשורה = נפח מים התחלתי + נפח משקולת + נפח סליים.',
  'צריך להוריד מהנפח שהתקבל את הנפח ההתחלתי ואת נפח המשקולת כדי לקבל את נפח הסליים.']) });

/* סעיפים א-ג of the marbles question run silent: one attempt, no popup, no marking.
   See SILENT_SCREENS at the top — storyboard 141 promises results only at the end and
   144/145 deliver them for all three at once, so there is nothing to show per question. */
registerPractice(5, { correctId: 'a', silent: true, maxAttempts: 1, item: '05', qKey: 'q1' });
registerPractice(6, { correctId: 'a', silent: true, maxAttempts: 1, item: '05', qKey: 'q2' });
registerPractice(7, { correctId: 'b', silent: true, maxAttempts: 1, item: '05', qKey: 'q3' });

/* ═══ Combined result for סעיפים א-ג — storyboard 144/145 ═══
   Both slides carry the SAME body (the correct answer for each סעיף); only the title and
   the companion's reflective prompt differ, so the body is written once. Bold runs follow
   the deck run for run, with two deliberate departures:
     - the deck writes `כל הגלות` (missing vav) — kept as `הגולות`, per the agreed policy
       in QA/TEXT-FIDELITY.md §Deck defects
     - the division is wrapped in .section-result-expr; its colon and equals sign are
       bidi-neutral and would otherwise be reordered inside this RTL paragraph */
const SECTION_RESULT = {
  correct: { title: 'צדקת בכל הסעיפים! כל הכבוד!',
             bubble: 'איזה סעיף דרש ממך הכי הרבה מחשבה?' },
  partial: { title: 'התשובה אינה נכונה במלואה.<br />הנה התשובות הנכונות.',
             bubble: 'מה הפתיע אתכם בפתרון הנכון לעומת מה שחשבתם בהתחלה?' },
  body: [
    '<b>א. גילי צודק רק אם כל הגולות זהות.</b><br />אם הגולות זהות אז הנפח הכולל שלהן חלקי מספר הגולות שווה לנפח של גולה אחת.',
    '<b>ב. כל הגולות זהות ולכן ניתן לחלק את הנפח הכולל ב – 5</b><br /><span class="section-result-expr">50 : 5 = 10</span>',
    'ג. עבור גולות בגדלים שונים <b>השיטה של גילי לא תעבוד</b>. אם הגולות שונות, נדע את הנפח הכולל אבל לא נפח של גולה ספציפית.'
  ]
};
function renderSectionResult() {
  const allRight = SILENT_SCREENS.every(n => practiceProgress.questions[n - 1].state === 'correct');
  const v = allRight ? SECTION_RESULT.correct : SECTION_RESULT.partial;
  document.getElementById('s11-result').classList.toggle('section-result--retry', !allRight);
  document.getElementById('s11-result-title').innerHTML = v.title;
  document.getElementById('s11-result-body').innerHTML =
    SECTION_RESULT.body.map(x => '<p>' + x + '</p>').join('');
  document.getElementById('s11-result-bubble').textContent = v.bubble;
}

/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* Replaces the legacy SCREEN_TO_SUB, which was string-valued (no page number), under a name nothing
   shared reads, and covered only screens 1–8 — so a problem report filed from the intro, either
   scenario screen or the result screen went out with an EMPTY item.

   Flow order here is not screen order: 0 → 1 → 2 → 3 → 9 → 4 → 5 → 10 → 6 → 7 → 8 → 11. The two
   scenario screens set up a question without asking one, so each belongs INSIDE the item it
   introduces — screen 9 is page 1 of item 04, screen 10 page 1 of item 05. Keeping them inside is
   what makes the item lifecycle come out right: item 03 closes and item 04 opens when the learner
   reaches screen 9, item 04 closes and 05 opens at screen 10 (by which point both of item 04's
   questions are answered), and item 05 stays open across its three silent questions AND the combined
   result screen, closing only in goToNextPart(). */
var SCREEN_TO_SUBCONTENT = {
  0:  null,           // intro
  1:  ['01', 1],      // Q1 — the ring
  2:  ['02', 1],      // Q2 — lentils
  3:  ['03', 1],      // Q3 — reliability
  9:  ['04', 1],      // sb129 Liyan's slime — narrative opening of item 04
  4:  ['04', 2],      // Q4 = item 04 / q1
  5:  ['04', 3],      // Q5 = item 04 / q2
  10: ['05', 1],      // sb140 Gili's marbles — narrative opening of item 05
  6:  ['05', 2],      // Q6 = item 05 / q1   (silent)
  7:  ['05', 3],      // Q7 = item 05 / q2   (silent)
  8:  ['05', 4],      // Q8 = item 05 / q3   (silent)
  11: ['05', 5]       // sb144/145 combined verdict for סעיפים א-ג
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-04';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

var XAPI_EVAL_ITEMS = { '01': 1, '02': 1, '03': 1, '04': 1, '05': 1 };

/* Items 04 and 05 span several questions (2 and 3), so their own 'completed' needs an explicit
   result — the library's all-correct AND would report success:false for a partial pass without
   saying how partial. Items 01–03 hold one question each, where the AND is already exactly right,
   so they are deliberately absent from this map.

   Item 05's all-or-nothing success mirrors what the learner is actually shown: SECTION_RESULT has
   exactly two states, 'צדקת בכל הסעיפים' and 'התשובה אינה נכונה במלואה'. */
function _itemScore(item, qKeys) {
  const n = qKeys.filter(k => XAPI_Q_RESULTS[item + '/' + k]).length;
  return { success: n === qKeys.length, score: { scaled: n / qKeys.length } };
}
var XAPI_ITEM_RESULT = {
  '04': function () { return _itemScore('04', ['q1', 'q2']); },
  '05': function () { return _itemScore('05', ['q1', 'q2', 'q3']); }
};

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-04.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   Eight SCQ questions, three of which grade SILENTLY, plus one revealed-once result screen. The
   silent trio is what makes this part's restore distinctive: their verdicts are recorded but
   deliberately not shown until screen 11, so the payload must carry BOTH the answer and whether the
   reveal has happened, or a resumed learner sees the wrong one of the two.
   ═══════════════════════════════════════════════════════════ */

/* resultRevealed is a plain boolean at file scope, so it travels verbatim. It has to travel: it is
   the difference between "answered, verdict withheld" and "answered, verdict shown", and
   visibleState() reads it for every dot. Restoring the answers without it would leak the three
   withheld verdicts to a learner who has not reached the result screen yet. */
var RESUME_PLAIN_VARS = ['resultRevealed'];
var RESUME_INPUT_IDS  = [];
var RESUME_TEXT_IDS   = [];

/* Mutable half of SCQ_REG only — cfg holds functions and popup copy. */
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

/* Positional, WITHOUT `screen` — that is a static table entry and a stale document must not override
   a later renumber. `number` is likewise static. */
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

/* ⚠️ Every object here is COPIED, never referenced. practiceEnter() mutates practiceProgress
   (`q.visited = true`, `q.state = 'current'`), so a payload holding a live reference would mutate
   along with it — and the snapshot the shared goTo() takes BEFORE resetScreenState() would already
   contain the change it exists to undo. That failure is silent and total. */
function capturePartPayload() {
  var st = {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    scq: captureScqState(),
    practice: capturePracticeState(),
    vars: {}
  };
  /* eval keeps this list-driven: these are file-scope let/var bindings, so they are not reachable as
     window properties. */
  RESUME_PLAIN_VARS.forEach(function (k) {
    try { st.vars[k] = eval(k); } catch (e) {}
  });
  return st;
}

/* The parameter MUST stay named `st` — the eval below assigns through that name, and renaming it
   fails SILENTLY: the assignment throws, the caller's try/catch swallows it, and the learner's
   answers vanish with nothing in the console. See unit-js/README.md. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  applyScqState(st.scq);
  applyPracticeState(st.practice);
  if (st.vars) {
    Object.keys(st.vars).forEach(function (k) {
      if (RESUME_PLAIN_VARS.indexOf(k) === -1) return;   // never assign an unlisted name
      try { eval(k + ' = st.vars[k];'); } catch (e) {}
    });
  }
}

function applyResumeDom(st) {}

/* Repaints the answered look. Mirrors scqCheck's DOM writes and nothing else — no state mutation, no
   statements, no progress bookkeeping: all of that happened when the answer was first given, and
   repeating it here would report a second answer.

   The FEEDBACK POPUP is one of those DOM writes. It used to be excluded on the grounds that
   reopening one is "new UI, not a restore" — but it carries the explanation, so a returning learner
   was left with marks and no reason for them. `phase` says which popup scqCheck last opened.

   A SILENT question keeps its contract: no verdict, no marks, no popup until the result screen. What
   it DOES get back is the learner's own pick, as a plain selection — withholding the verdict is the
   contract; withholding the fact that they answered at all just made the screen look untouched. */
function restoreScreenUI(n) {
  try {
    if (n === RESULT_SCREEN) {
      /* Rebuilt from the restored practice states, and only reachable once resultRevealed is true —
         which resetScreenState() sets on entry anyway. */
      renderSectionResult();
      syncPracticeNav('s' + n);
      return;
    }

    var screen = 's' + n;
    var s = SCQ_REG[screen];
    if (!s) return;
    if (!s.done && !s.phase && !s.sel) return;      // pristine — do not touch it

    var markSel = function () {
      if (!s.sel) return;
      var o = document.querySelector('#' + screen + ' .scq-opt[data-id="' + s.sel + '"]');
      if (o) { o.classList.add('selected'); o.setAttribute('aria-checked', 'true'); }
    };

    if (isSilent(n)) { markSel(); return; }         // the pick, never the verdict

    if (s.phase === 'correct' || s.phase === 'wrong2') {
      scqMark(screen, s.cfg.correctId, 'correct');
      if (s.phase === 'wrong2' && s.sel && s.sel !== s.cfg.correctId) scqMark(screen, s.sel, 'wrong');
    } else if (s.phase === 'retry') {
      if (s.sel) scqMark(screen, s.sel, 'wrong');
    } else {
      markSel();
    }

    if (s.phase) renderFeedbackPopup(screen, s.phase, s.cfg.popups);

    /* An answered screen already carries the enabled button scqEnter relabelled, so only the unsolved
       case is computed here — a painter that leaves a full screen with a dead button strands the
       learner. */
    if (!s.done) {
      var chk = document.getElementById(screen + '-scq-check');
      if (chk) chk.disabled = !s.sel;
    }
  } catch (e) { console.error('[resume] restoreScreenUI', e); }
}

/* ── xAPI ready hook ──
   Loads the unit metadata but reports NO unit-scope 'initialized' — this component is not the one
   that opens the unit. Preserved from the pre-extraction code; see the note in component 01. */
function onXapiReady() {
  loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {});
}
