/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 02 (remediation)
   Reached from Part 01's score branch (<4/5). 6 SingleChoiceQuestions
   with progress dots; on completion → Part 03. Engine + SCQ template +
   progress-dots + report modal + xAPI, ported from Part 01.
   ═══════════════════════════════════════════════════════════ */

var XAPI_ID_PREFIX = "https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/";
function shortId(u){ return String(u || "").split("/").pop(); }

'use strict';

const TOTAL_SCREENS = 7;          // S0 intro + S1–S6 practice
const PART_03_URL = '../methodica-science-volume-solid-01-03/index.html';

window.lomdaState = window.lomdaState || {};
let currentScreen = 0;

/* ─── Scale App (1280×710 canvas) ─────────────────────────── */
function scaleApp() {
  const app = document.getElementById('app');
  const scale   = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  app.style.width     = (window.innerWidth / scale) + 'px';
  app.style.height    = (window.innerHeight / scale) + 'px';
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = '0px'; app.style.top = '0px';
}
window.addEventListener('resize', scaleApp);
scaleApp();

/* ─── Navigation ─────────────────────────────────────────── */
function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  const prev = document.querySelector('.screen.active');
  if (prev) prev.classList.remove('active');
  currentScreen = n;
  const next = document.getElementById('s' + n);
  if (next) next.classList.add('active');
  resetScreenState(n);
}
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
  s0: { pose: 'start-line', w: 200, right: 40, bottom: 100 }   /* sb77 */
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
  const pIdx = practiceProgress.questions.findIndex(q => q.screen === currentScreen);
  if (pIdx !== -1) { goTo(pIdx > 0 ? practiceProgress.questions[pIdx - 1].screen : 0); return; }
  goTo(currentScreen - 1);
}
function advanceScreen() {
  if (currentScreen === 0) { goTo(1); return; }
  if (practiceProgress.questions.some(q => q.screen === currentScreen)) return;   // via check button
  goTo(currentScreen + 1);
}

/* ═══ SingleChoiceQuestion (generic, reusable) — see Part 01 for the contract ═══ */
const SCQ_REG = {};
function scqRegister(cfg) { cfg.maxAttempts = cfg.maxAttempts || 2; SCQ_REG[cfg.screen] = { cfg: cfg, sel: null, attempts: 0, answered: false, done: false }; }
function scqOpts(screen) { return document.querySelectorAll('#' + screen + ' .scq-opt'); }
function scqSelect(screen, id) {
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  s.sel = id;
  if (s.attempts > 0) { scqClosePopup(screen); scqOpts(screen).forEach(o => o.classList.remove('wrong', 'correct')); }
  scqOpts(screen).forEach(o => { const sel = o.dataset.id === id; o.classList.toggle('selected', sel); o.setAttribute('aria-checked', sel ? 'true' : 'false'); });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) chk.disabled = false;
}
/* Fire-and-forget xAPI — defer the (possibly synchronous) send to a macrotask so it
   never blocks a click's visual feedback (the browser only paints after the handler
   returns). Pre-navigation 'completed' sends and init stay synchronous. */
function xapiSend() {
  const args = arguments;
  setTimeout(function () { try { sendStatement720.apply(null, args); } catch (e) {} }, 0);
}
function scqCheck(screen) {
  const s = SCQ_REG[screen], cfg = s.cfg;
  if (s.answered) { if (cfg.onContinue) cfg.onContinue(); else advanceScreen(); return; }
  if (!s.sel) return;
  s.attempts++;
  const correct = s.sel === cfg.correctId;
  xapiSend(correct || s.attempts >= cfg.maxAttempts ? 'answered.last' : 'answered', 'question', { success: !!correct, score: { scaled: correct ? 1 : 0 } }, { questionId: cfg.questionId });
  if (correct) { scqMark(screen, cfg.correctId, 'correct'); scqShowPopup(screen, 'correct'); scqFinish(screen, true); }
  else if (s.attempts >= cfg.maxAttempts) { scqMark(screen, cfg.correctId, 'correct'); scqMark(screen, s.sel, 'wrong'); scqShowPopup(screen, 'wrong2'); scqFinish(screen, false); }
  else { scqMark(screen, s.sel, 'wrong'); scqShowPopup(screen, 'retry'); }
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
  document.getElementById(screen + '-scq-popup-title').textContent = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}
function scqClosePopup(screen) { document.getElementById(screen + '-scq-popup')?.classList.add('hidden'); }
function scqHint(screen) {
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  xapiSend('requested.1', 'question', null, { questionId: s.cfg.questionId });
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
  const s = SCQ_REG[screen]; s.sel = null; s.attempts = 0; s.answered = false;
  scqOpts(screen).forEach(o => { o.classList.remove('selected', 'correct', 'wrong'); o.setAttribute('aria-checked', 'false'); o.disabled = false; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'צדקתי?'; chk.disabled = true; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) { hint.disabled = false; hint.style.visibility = ''; }
}
function attachPopupDrag(popup) {
  if (!popup || popup._dragWired) return;
  popup._dragWired = true;
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  const header = popup.querySelector('.scq-popup-header') || popup;
  function scale() { const app = document.getElementById('app'); const m = app && app.style.transform.match(/scale\(([^)]+)\)/); return m ? parseFloat(m[1]) : 1; }
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('.scq-popup-close')) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = popup.getBoundingClientRect(), sc = scale(); ox = r.left / sc; oy = r.top / sc;
    popup.style.bottom = 'auto'; header.setPointerCapture(e.pointerId); e.preventDefault();
  });
  header.addEventListener('pointermove', e => { if (!dragging) return; const sc = scale(); popup.style.left = (ox + (e.clientX - sx) / sc) + 'px'; popup.style.top = (oy + (e.clientY - sy) / sc) + 'px'; });
  header.addEventListener('pointerup', () => { dragging = false; });
  header.addEventListener('pointercancel', () => { dragging = false; });
}

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
function goToNextPart() {
  try { sendStatement720('completed', 'onlinelesson'); } catch (e) {}
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
  syncPracticeNav(screen); scqEnter(screen);
}
function registerPractice(idx, cfg) {
  cfg.screen = 's' + practiceProgress.questions[idx].screen;
  cfg.onFinish = function (ok) { const q = practiceProgress.questions[idx]; q.state = ok ? 'correct' : 'incorrect'; q.visited = true; syncPracticeNav(cfg.screen); };
  cfg.onContinue = function () {
    const next = idx + 1;
    if (next < practiceProgress.questions.length) { practiceProgress.questions[next].visited = true; goTo(practiceProgress.questions[next].screen); }
    else goToNextPart();
  };
  scqRegister(cfg);
  attachPopupDrag(document.getElementById(cfg.screen + '-scq-popup'));
}

const QID = XAPI_ID_PREFIX;
registerPractice(0, {  // Basic 1 — non-geometric body
  correctId: 'b', questionId: QID + 'methodica-science-volume-solid-01-02-01/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['גוף הנדסי בנוי מקווים ישרים או מעגלים.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['מפלצת הפלסטלינה היא גוף בעל צורה לא־סדירה, שאי אפשר לחשב את נפחו בנוסחה.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'לבנה, קופסה וקובייה הן צורות הנדסיות; מפלצת הפלסטלינה אינה.'] }
  }
});
registerPractice(1, {  // Basic 2 — who is right
  correctId: 'b', questionId: QID + 'methodica-science-volume-solid-01-02-02/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['מה מודדים מאזניים וסרגל?', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['שירלי צודקת: לגוף לא־הנדסי מודדים נפח בשיטת דחיקת המים.', 'מאזניים מודדים מסה וסרגל מודד אורך — לא נפח.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'שירלי צודקת — דחיקת מים מתאימה לגוף לא־הנדסי.'] }
  }
});
registerPractice(2, {  // Basic 3 — which tool
  correctId: 'b', questionId: QID + 'methodica-science-volume-solid-01-02-03/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['צריך כלי עם שנתות נפח.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['במשורה יש סימוני נפח שמאפשרים לקרוא את מפלס המים לפני ואחרי.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'המשורה היא הכלי בעל שנתות הנפח.'] }
  }
});
registerPractice(3, {  // Basic 4 — flooding 760
  correctId: 'b', questionId: QID + 'methodica-science-volume-solid-01-02-04/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['הכלי היה מלא עד הקצה.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['נפח הגליל = 760 מ"ל — בדיוק כמות המים שגלשה, כי הכלי היה מלא עד הקצה.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'בשיטת ההצפה נפח המים שגלשו = נפח הגוף = 760 מ"ל.'] }
  }
});
registerPractice(4, {  // Standard-ב 1 — rise area
  correctId: 'b', questionId: QID + 'methodica-science-volume-solid-01-02-05/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['הבובה דחקה את המים כלפי מעלה.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['התוספת שמעל המפלס המקורי היא נפח המים שנדחק — כלומר נפח הבובה.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'האזור שנוסף מעל המפלס המקורי מייצג את עליית המים.'] }
  }
});
registerPractice(5, {  // Standard-ב 2 — single bead = 10
  correctId: 'a', questionId: QID + 'methodica-science-volume-solid-01-02-06/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['חשבו: 130 − 100 = הנפח של 3 חרוזים.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['3 חרוזים העלו את המים ב-30 מ"ל, ולכן חרוז אחד = 30 ÷ 3 = 10 סמ"ק.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'ההפרש 30 סמ"ק הוא נפח 3 החרוזים; חרוז אחד = 30 ÷ 3 = 10 סמ"ק.'] }
  }
});

/* ═══ Report modal ═══ */
function openReportModal() { document.getElementById('report-modal').removeAttribute('hidden'); setTimeout(function () { document.getElementById('report-type')?.focus(); }, 40); }
function tryCloseReportModal() {
  const t = document.getElementById('report-type').value, x = document.getElementById('report-text').value.trim();
  if (t || x) { document.getElementById('report-modal').setAttribute('hidden', ''); document.getElementById('report-confirm-modal').removeAttribute('hidden'); } else forceCloseReportModal();
}
function forceCloseReportModal() { document.getElementById('report-modal').setAttribute('hidden', ''); document.getElementById('report-confirm-modal').setAttribute('hidden', ''); resetReportForm(); }
function backToReportForm() { document.getElementById('report-confirm-modal').setAttribute('hidden', ''); document.getElementById('report-modal').removeAttribute('hidden'); }
var REPORT_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfFq5XFtH1pPpLgV5RWT4m3NanYPW5GKremqTvkp6zKjEGqcw/formResponse';
var SCREEN_TO_SUBCONTENT = { 1:['01',1], 2:['02',1], 3:['03',1], 4:['04',1], 5:['05',1], 6:['06',1] };
function submitReport() {
  const typeSel = document.getElementById('report-type'), textVal = document.getElementById('report-text').value.trim(), errEl = document.getElementById('report-error');
  if (!typeSel.value || !textVal) { if (errEl) errEl.removeAttribute('hidden'); (typeSel.value ? document.getElementById('report-text') : typeSel).focus(); return; }
  if (errEl) errEl.setAttribute('hidden', '');
  const now = new Date(), meta = window.METADATA || {}, body = new URLSearchParams();
  body.append('entry.301404029_year', now.getFullYear()); body.append('entry.301404029_month', now.getMonth() + 1); body.append('entry.301404029_day', now.getDate());
  body.append('entry.2066097581_hour', now.getHours()); body.append('entry.2066097581_minute', now.getMinutes());
  body.append('entry.1933069481', shortId(meta.learningUnitId)); body.append('entry.2070680092', shortId(meta.id));
  const m = SCREEN_TO_SUBCONTENT[currentScreen];
  body.append('entry.1555704258', m ? shortId(meta.id) + '-' + m[0] : ''); body.append('entry.1671046914', m ? String(m[1]) : String(currentScreen));
  body.append('entry.1179822443', typeSel.options[typeSel.selectedIndex].text); body.append('entry.806447525', textVal);
  fetch(REPORT_FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body }).catch(function (e) { console.error('[Report] send failed', e); });
  showReportThanks();
}
function showReportThanks() { document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body').forEach(el => el.setAttribute('hidden', '')); document.getElementById('report-thanks')?.removeAttribute('hidden'); }
function resetReportForm() {
  document.getElementById('report-type').value = ''; document.getElementById('report-text').value = ''; document.getElementById('report-char-count').textContent = '0 / 250';
  document.getElementById('report-error')?.setAttribute('hidden', ''); document.getElementById('report-thanks')?.setAttribute('hidden', '');
  document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body').forEach(el => el.removeAttribute('hidden'));
}
(function wireReport() {
  document.getElementById('flag-btn')?.addEventListener('click', openReportModal);
  const ta = document.getElementById('report-text'), cc = document.getElementById('report-char-count');
  if (ta && cc) ta.addEventListener('input', function () { cc.textContent = ta.value.length + ' / 250'; });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    const cm = document.getElementById('report-confirm-modal'), rm = document.getElementById('report-modal');
    if (cm && !cm.hasAttribute('hidden')) { forceCloseReportModal(); return; }
    if (rm && !rm.hasAttribute('hidden')) { tryCloseReportModal(); return; }
  });
})();

/* ═══ Dev bridge ═══ */
window.addEventListener('message', e => { if (!e.data || e.data.type !== 'DEV_GOTO') return; const n = parseInt(e.data.screen, 10); if (!isNaN(n)) goTo(n); });
if (window.parent !== window) { window.parent.postMessage({ type: 'DEV_READY', total: document.querySelectorAll('.screen').length }, '*'); }

/* ═══ xAPI (720 LMS host; skipped on localhost) ═══ */
(function initXAPI() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') { console.log('[xAPI] skipped on localhost (dev)'); return; }
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';
  var METADATA_FILE = '../metadata/methodica-science-volume-solid-01-02.json';
  function loadScript(src, cb) { var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function () { console.error('[xAPI] failed to load', src); cb(); }; document.head.appendChild(s); }
  function poll(cb) { if (window.jsXAPI_MetadataReady) cb(); else setTimeout(function () { poll(cb); }, 200); }
  loadScript(CDN + 'xapiwrapper.min.js', function () {
    loadScript(CDN + 'xapi-720-f.js', function () {
      try {
        getXAPIParameters(METADATA_FILE);
        poll(function () {
          try {
            ADL.XAPIWrapper.changeConfig({ endpoint: window.slxapi.endpoint, auth: window.slxapi.auth });
            sendStatement720('initialized', 'onlinelesson');
            loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () { try { sendStatement720('initialized', 'onlinelesson', null, { scope: 'unit' }); } catch (e) {} });
          } catch (e) { console.error('[xAPI] init', e); }
        });
      } catch (e) { console.error('[xAPI] load', e); }
    });
  });
})();
