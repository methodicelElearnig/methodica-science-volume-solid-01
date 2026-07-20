/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 04 (advanced)
   S0 intro + 8 questions (7 SingleChoice + 1 numeric ValueInput) with
   progress dots. On completion → Part 05 (peak א). Engine + SCQ + VIQ +
   progress + report + xAPI.
   ═══════════════════════════════════════════════════════════ */
var XAPI_ID_PREFIX = "https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/";
function shortId(u){ return String(u || "").split("/").pop(); }
'use strict';

const TOTAL_SCREENS = 9;   // S0 intro + S1–S8
const PART_05_URL = '../methodica-science-volume-solid-01-05/index.html';
window.lomdaState = window.lomdaState || {};
let currentScreen = 0;

function scaleApp() {
  const app = document.getElementById('app');
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  app.style.width = (window.innerWidth / scale) + 'px'; app.style.height = (window.innerHeight / scale) + 'px';
  app.style.transform = 'scale(' + scale + ')'; app.style.left = '0px'; app.style.top = '0px';
}
window.addEventListener('resize', scaleApp); scaleApp();

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

function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  const prev = document.querySelector('.screen.active'); if (prev) prev.classList.remove('active');
  currentScreen = n;
  const next = document.getElementById('s' + n); if (next) next.classList.add('active');
  resetScreenState(n);
}
function resetScreenState(n) {
  if (n >= 1 && n <= 8) {
    const idx = n - 1;
    if (n === 7) practiceEnterVIQ(idx, 's7'); else practiceEnter(idx, 's' + n);
  }
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
  if (practiceProgress.questions.some(q => q.screen === currentScreen)) return;
  goTo(currentScreen + 1);
}

/* ═══ Shared feedback popup renderer (used by SCQ + VIQ) ═══ */
function renderFeedbackPopup(screen, type, popups) {
  const popup = document.getElementById(screen + '-scq-popup'); if (!popup) return;
  const cfg = popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  document.getElementById(screen + '-scq-popup-title').textContent = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}
function scqClosePopup(screen) { document.getElementById(screen + '-scq-popup')?.classList.add('hidden'); }
function attachPopupDrag(popup) {
  if (!popup || popup._dragWired) return; popup._dragWired = true;
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  const header = popup.querySelector('.scq-popup-header') || popup;
  function scale() { const app = document.getElementById('app'); const m = app && app.style.transform.match(/scale\(([^)]+)\)/); return m ? parseFloat(m[1]) : 1; }
  header.addEventListener('pointerdown', e => { if (e.target.closest('.scq-popup-close')) return; dragging = true; sx = e.clientX; sy = e.clientY; const r = popup.getBoundingClientRect(), sc = scale(); ox = r.left / sc; oy = r.top / sc; popup.style.bottom = 'auto'; header.setPointerCapture(e.pointerId); e.preventDefault(); });
  header.addEventListener('pointermove', e => { if (!dragging) return; const sc = scale(); popup.style.left = (ox + (e.clientX - sx) / sc) + 'px'; popup.style.top = (oy + (e.clientY - sy) / sc) + 'px'; });
  header.addEventListener('pointerup', () => { dragging = false; }); header.addEventListener('pointercancel', () => { dragging = false; });
}

/* ═══ SingleChoiceQuestion ═══ */
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
  if (correct) { scqMark(screen, cfg.correctId, 'correct'); renderFeedbackPopup(screen, 'correct', cfg.popups); scqFinish(screen, true); }
  else if (s.attempts >= cfg.maxAttempts) { scqMark(screen, cfg.correctId, 'correct'); scqMark(screen, s.sel, 'wrong'); renderFeedbackPopup(screen, 'wrong2', cfg.popups); scqFinish(screen, false); }
  else { scqMark(screen, s.sel, 'wrong'); renderFeedbackPopup(screen, 'retry', cfg.popups); }
}
function scqMark(screen, id, cls) { const o = document.querySelector('#' + screen + ' .scq-opt[data-id="' + id + '"]'); if (o) { o.classList.remove('selected'); o.classList.add(cls); } }
function scqFinish(screen, ok) {
  const s = SCQ_REG[screen]; s.answered = true; s.done = true;
  scqOpts(screen).forEach(o => { o.disabled = true; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden';
  if (s.cfg.onFinish) s.cfg.onFinish(ok);
}
function scqHint(screen) {
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  xapiSend('requested.1', 'question', null, { questionId: s.cfg.questionId });
  document.getElementById(screen + '-scq-hint-overlay')?.classList.remove('hidden');
}
function scqCloseHint(screen) { document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden'); }
function scqEnter(screen) {
  const s = SCQ_REG[screen]; if (!s) return;
  document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden'); scqClosePopup(screen);
  if (s.done) { scqOpts(screen).forEach(o => { o.disabled = true; }); const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; } const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden'; }
  else { scqReset(screen); }
}
function scqReset(screen) {
  const s = SCQ_REG[screen]; s.sel = null; s.attempts = 0; s.answered = false;
  scqOpts(screen).forEach(o => { o.classList.remove('selected', 'correct', 'wrong'); o.setAttribute('aria-checked', 'false'); o.disabled = false; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'צדקתי?'; chk.disabled = true; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) { hint.disabled = false; hint.style.visibility = ''; }
}

/* ═══ ValueInputQuestion (numeric) — mirrors SCQ, shares the feedback popup ═══ */
const VIQ_REG = {};
function viqRegister(cfg) { cfg.maxAttempts = cfg.maxAttempts || 2; cfg.tolerance = cfg.tolerance || 0; VIQ_REG[cfg.screen] = { cfg: cfg, attempts: 0, answered: false, done: false }; }
function viqInput(screen) { const inp = document.getElementById(screen + '-viq-input'); document.getElementById(screen + '-scq-check').disabled = inp.value.trim() === ''; }
function viqCheck(screen) {
  const s = VIQ_REG[screen], cfg = s.cfg;
  if (s.answered) { if (cfg.onContinue) cfg.onContinue(); else advanceScreen(); return; }
  const inp = document.getElementById(screen + '-viq-input'); if (inp.value.trim() === '') return;
  s.attempts++;
  const val = parseFloat(String(inp.value).replace(',', '.'));
  const correct = !isNaN(val) && Math.abs(val - cfg.correct) <= cfg.tolerance;
  xapiSend(correct || s.attempts >= cfg.maxAttempts ? 'answered.last' : 'answered', 'question', { success: !!correct, score: { scaled: correct ? 1 : 0 }, response: inp.value }, { questionId: cfg.questionId });
  inp.classList.remove('correct', 'wrong');
  if (correct) { inp.classList.add('correct'); renderFeedbackPopup(screen, 'correct', cfg.popups); viqFinish(screen, true); }
  else if (s.attempts >= cfg.maxAttempts) { inp.classList.add('wrong'); renderFeedbackPopup(screen, 'wrong2', cfg.popups); viqFinish(screen, false); }
  else { inp.classList.add('wrong'); renderFeedbackPopup(screen, 'retry', cfg.popups); }
}
function viqFinish(screen, ok) {
  const s = VIQ_REG[screen]; s.answered = true; s.done = true;
  document.getElementById(screen + '-viq-input').disabled = true;
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; }
  if (s.cfg.onFinish) s.cfg.onFinish(ok);
}
function viqEnter(screen) {
  const s = VIQ_REG[screen]; if (!s) return; scqClosePopup(screen);
  const inp = document.getElementById(screen + '-viq-input');
  if (s.done) { inp.disabled = true; const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; } }
  else { s.attempts = 0; s.answered = false; inp.disabled = false; inp.classList.remove('correct', 'wrong'); const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'צדקתי?'; chk.disabled = inp.value.trim() === ''; } }
}

/* ═══ Progress dots + practice wiring (8 questions → Part 05) ═══ */
var practiceProgress = { questions: [] };
for (let i = 1; i <= 8; i++) practiceProgress.questions.push({ number: i, visited: i === 1, state: i === 1 ? 'current' : 'not-answered', screen: i });
function goToNextPart() { try { sendStatement720('completed', 'onlinelesson'); } catch (e) {} window.location.href = PART_05_URL + window.location.search; }
function updateProgressQuestion(container, state) {
  if (!container) return; const qs = state.questions;
  qs.forEach((q, i) => {
    const n = i + 1; const item = container.querySelector('[data-question="' + n + '"]'); if (!item) return;
    const icon = item.querySelector('.progress-question__icon'), label = item.querySelector('.progress-question__label');
    icon.classList.remove('progress-question__icon--current', 'progress-question__icon--correct', 'progress-question__icon--incorrect');
    if (q.state !== 'not-answered') icon.classList.add('progress-question__icon--' + q.state);
    label.classList.toggle('progress-question__label--visited', q.visited);
    const nav = q.visited && q.screen != null && q.screen !== currentScreen;
    item.style.cursor = nav ? 'pointer' : ''; item.onclick = nav ? (function (s) { return function () { goTo(s); }; })(q.screen) : null;
  });
  for (let n = 1; n < qs.length; n++) { const conn = container.querySelector('[data-connector="' + n + '"]'); if (!conn) continue; const st = qs[n - 1].state; conn.classList.toggle('progress-question__connector--visited', st === 'correct' || st === 'incorrect'); }
}
function syncPracticeNav(screen) { updateProgressQuestion(document.querySelector('#' + screen + ' .progress-question'), practiceProgress); }
function practiceEnter(idx, screen) { const q = practiceProgress.questions[idx]; q.visited = true; if (q.state === 'not-answered') q.state = 'current'; syncPracticeNav(screen); scqEnter(screen); }
function practiceEnterVIQ(idx, screen) { const q = practiceProgress.questions[idx]; q.visited = true; if (q.state === 'not-answered') q.state = 'current'; syncPracticeNav(screen); viqEnter(screen); }
function _practiceOnFinish(idx, screen) { return function (ok) { const q = practiceProgress.questions[idx]; q.state = ok ? 'correct' : 'incorrect'; q.visited = true; syncPracticeNav(screen); }; }
function _practiceOnContinue(idx) { return function () { const nx = idx + 1; if (nx < practiceProgress.questions.length) { practiceProgress.questions[nx].visited = true; goTo(practiceProgress.questions[nx].screen); } else goToNextPart(); }; }
function registerPractice(idx, cfg) { cfg.screen = 's' + practiceProgress.questions[idx].screen; cfg.onFinish = _practiceOnFinish(idx, cfg.screen); cfg.onContinue = _practiceOnContinue(idx); scqRegister(cfg); attachPopupDrag(document.getElementById(cfg.screen + '-scq-popup')); }
function registerPracticeVIQ(idx, cfg) { cfg.screen = 's' + practiceProgress.questions[idx].screen; cfg.onFinish = _practiceOnFinish(idx, cfg.screen); cfg.onContinue = _practiceOnContinue(idx); viqRegister(cfg); attachPopupDrag(document.getElementById(cfg.screen + '-scq-popup')); }

const QID = XAPI_ID_PREFIX;
const P = 'methodica-science-volume-solid-01-04-';
registerPractice(0, { correctId: 'a', questionId: QID + P + '01/q1', popups: {
  retry:   { title: 'התשובה אינה נכונה.', body: ['מה מייצגים המים שעלו?', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['המים שעלו הם ראיה ישירה שהטבעת תופסת מקום; ההפרש 85−60 = 25 מ"ל הוא נפח הטבעת.'] },
  wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'דחיקת המים היא ראיה אמפירית ישירה לנפח — לא נדרשת נוסחה.'] } } });
registerPractice(1, { correctId: 'b', questionId: QID + P + '02/q1', popups: {
  retry:   { title: 'התשובה אינה נכונה.', body: ['עדשים = מוצק גרגרי המקבל את צורת הכלי.', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['מוצק גרגרי ממלא את הכלי, ולכן קוראים את נפחו בכוס מדידה. מאזניים מודדים מסה.'] },
  wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'ממלאים כוס מדידה בעדשים וקוראים נפח לפי השנתות.'] } } });
registerPractice(2, { correctId: 'a', questionId: QID + P + '03/q1', popups: {
  retry:   { title: 'התשובה אינה נכונה.', body: ['בדקו כמה הערכים קרובים.', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['הערכים קרובים מאוד (23,22,24,23,23) — לכן המדידות עקביות ומהימנות.'] },
  wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'מהימנות = עקביות; הפרש של 2 סמ"ק הוא קטן.'] } } });
registerPractice(3, { correctId: 'b', questionId: QID + P + '04/q1', popups: {
  retry:   { title: 'התשובה אינה נכונה.', body: ['צריך "עוגן" ששוקע.', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['עוטפים משקולת קטנה עם הסליים כדי שהמערכת תשקע במים.'] },
  wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'משקולת קטנה מטביעה את הסליים בלי לשבש את המדידה.'] } } });
registerPractice(4, { correctId: 'd', questionId: QID + P + '04/q2', popups: {
  retry:   { title: 'התשובה אינה נכונה.', body: ['הנפח כולל מים + סליים + משקולת.', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['נפח הסליים = הנפח החדש − נפח המים ההתחלתי − נפח המשקולת.'] },
  wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'מחסירים גם את המים ההתחלתיים וגם את המשקולת.'] } } });
registerPractice(5, { correctId: 'a', questionId: QID + P + '05/q1', popups: {
  retry:   { title: 'התשובה אינה נכונה.', body: ['מתי חלוקה שווה מייצגת גולה אחת?', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['מדידה קבוצתית וחלוקה עובדת רק אם כל הגולות זהות.'] },
  wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'רק אם הגולות זהות אפשר לחלק את הנפח הכולל במספרן.'] } } });
registerPracticeVIQ(6, { correct: 10, questionId: QID + P + '05/q2', popups: {
  retry:   { title: 'לא מדויק.', body: ['50 ÷ 5 = ?', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['נפח גולה אחת = 50 ÷ 5 = 10 סמ"ק.'] },
  wrong2:  { title: 'לא מדויק.', body: ['התשובה הנכונה: 10 סמ"ק (50 ÷ 5).'] } } });
registerPractice(7, { correctId: 'b', questionId: QID + P + '05/q3', popups: {
  retry:   { title: 'התשובה אינה נכונה.', body: ['אם הגולות שונות — מה החלוקה נותנת?', 'נסו שוב!'] },
  correct: { title: 'נכון!', body: ['בגולות שונות נדע רק את הנפח הכולל, לא את נפח הגולה הבודדת.'] },
  wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'חלוקה נותנת ממוצע — לא נפח אמיתי של גולה מסוימת כשהן שונות.'] } } });

/* ═══ Report modal ═══ */
function openReportModal() { document.getElementById('report-modal').removeAttribute('hidden'); setTimeout(function () { document.getElementById('report-type')?.focus(); }, 40); }
function tryCloseReportModal() { const t = document.getElementById('report-type').value, x = document.getElementById('report-text').value.trim(); if (t || x) { document.getElementById('report-modal').setAttribute('hidden', ''); document.getElementById('report-confirm-modal').removeAttribute('hidden'); } else forceCloseReportModal(); }
function forceCloseReportModal() { document.getElementById('report-modal').setAttribute('hidden', ''); document.getElementById('report-confirm-modal').setAttribute('hidden', ''); resetReportForm(); }
function backToReportForm() { document.getElementById('report-confirm-modal').setAttribute('hidden', ''); document.getElementById('report-modal').removeAttribute('hidden'); }
var REPORT_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfFq5XFtH1pPpLgV5RWT4m3NanYPW5GKremqTvkp6zKjEGqcw/formResponse';
var SCREEN_TO_SUB = { 1:'01', 2:'02', 3:'03', 4:'04', 5:'04', 6:'05', 7:'05', 8:'05' };
function submitReport() {
  const typeSel = document.getElementById('report-type'), textVal = document.getElementById('report-text').value.trim(), errEl = document.getElementById('report-error');
  if (!typeSel.value || !textVal) { if (errEl) errEl.removeAttribute('hidden'); (typeSel.value ? document.getElementById('report-text') : typeSel).focus(); return; }
  if (errEl) errEl.setAttribute('hidden', '');
  const now = new Date(), meta = window.METADATA || {}, body = new URLSearchParams();
  body.append('entry.301404029_year', now.getFullYear()); body.append('entry.301404029_month', now.getMonth() + 1); body.append('entry.301404029_day', now.getDate());
  body.append('entry.2066097581_hour', now.getHours()); body.append('entry.2066097581_minute', now.getMinutes());
  body.append('entry.1933069481', shortId(meta.learningUnitId)); body.append('entry.2070680092', shortId(meta.id));
  const sub = SCREEN_TO_SUB[currentScreen];
  body.append('entry.1555704258', sub ? shortId(meta.id) + '-' + sub : ''); body.append('entry.1671046914', String(currentScreen));
  body.append('entry.1179822443', typeSel.options[typeSel.selectedIndex].text); body.append('entry.806447525', textVal);
  fetch(REPORT_FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body }).catch(function (e) {});
  showReportThanks();
}
function showReportThanks() { document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body').forEach(el => el.setAttribute('hidden', '')); document.getElementById('report-thanks')?.removeAttribute('hidden'); }
function resetReportForm() { document.getElementById('report-type').value = ''; document.getElementById('report-text').value = ''; document.getElementById('report-char-count').textContent = '0 / 250'; document.getElementById('report-error')?.setAttribute('hidden', ''); document.getElementById('report-thanks')?.setAttribute('hidden', ''); document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body').forEach(el => el.removeAttribute('hidden')); }
(function wireReport() {
  document.getElementById('flag-btn')?.addEventListener('click', openReportModal);
  const ta = document.getElementById('report-text'), cc = document.getElementById('report-char-count');
  if (ta && cc) ta.addEventListener('input', function () { cc.textContent = ta.value.length + ' / 250'; });
  document.addEventListener('keydown', function (ev) { if (ev.key !== 'Escape') return; const cm = document.getElementById('report-confirm-modal'), rm = document.getElementById('report-modal'); if (cm && !cm.hasAttribute('hidden')) { forceCloseReportModal(); return; } if (rm && !rm.hasAttribute('hidden')) { tryCloseReportModal(); return; } });
})();

/* ═══ Dev bridge ═══ */
window.addEventListener('message', e => { if (!e.data || e.data.type !== 'DEV_GOTO') return; const n = parseInt(e.data.screen, 10); if (!isNaN(n)) goTo(n); });
if (window.parent !== window) { window.parent.postMessage({ type: 'DEV_READY', total: document.querySelectorAll('.screen').length }, '*'); }

/* ═══ xAPI ═══ */
(function initXAPI() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') { console.log('[xAPI] skipped on localhost (dev)'); return; }
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';
  function loadScript(src, cb) { var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function () { cb(); }; document.head.appendChild(s); }
  function poll(cb) { if (window.jsXAPI_MetadataReady) cb(); else setTimeout(function () { poll(cb); }, 200); }
  loadScript(CDN + 'xapiwrapper.min.js', function () { loadScript(CDN + 'xapi-720-f.js', function () { try { getXAPIParameters('../metadata/methodica-science-volume-solid-01-04.json'); poll(function () { try { ADL.XAPIWrapper.changeConfig({ endpoint: window.slxapi.endpoint, auth: window.slxapi.auth }); sendStatement720('initialized', 'onlinelesson'); loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {}); } catch (e) {} }); } catch (e) {} }); });
})();
