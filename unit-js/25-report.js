'use strict';
/* ═══════════════════ "מצאתם בעיה?" — learner problem reports ═══════════════════
   Shared by all six components. DEFINITION-ONLY; 90-boot.js calls initReportModal().

   Independent of xAPI — this posts to a Google Form, not the LRS — but it shares window.METADATA,
   which the xAPI library publishes after the metadata load. Before that arrives, meta is {} and the
   id fields go out empty rather than throwing.

   ── What the six copies disagreed about ──────────────────────────────────────
   Reconciled per the "take the superset and prove the difference inert" rule. Two real differences
   and one interface split; everything else was `var`/`const` and optional-chaining style.

   1. backToReportForm — part 01 alone re-focused #report-type after returning from the confirm
      dialog. Kept: it is the a11y-correct behaviour, and #report-type exists in all six modals
      (verified — the modal markup is uniform across the unit), so it cannot throw anywhere.
   2. submitReport's fetch failure — parts 01/02/03 logged console.error, parts 04/05/06 swallowed
      it silently. Kept the log: a silently-dropped problem report is indistinguishable from one
      nobody filed, and the only effect on 04/05/06 is a console message that was already there in
      half the unit.
   3. How the reported ITEM is derived — four different mechanisms. See _reportItemInfo below. */

var REPORT_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfFq5XFtH1pPpLgV5RWT4m3NanYPW5GKremqTvkp6zKjEGqcw/formResponse';

/* Which catalog item, and which page within it, the learner is looking at.

   ⚠️ TRANSITIONAL. The six parts currently express this four different ways, and this function
   reproduces each of them EXACTLY so the extraction changes no report payload:

     part 01     SCREEN_TO_SUBCONTENT[n] -> [suffix, page]   (3-digit '001' values; only 4 of 33
                                                              screens mapped — both wrong, and both
                                                              fixed in Stage 4, not here)
     part 02     SCREEN_TO_SUBCONTENT[n] -> [suffix, page]   (2-digit; the shape to standardise on)
     part 04     SCREEN_TO_SUB[n]        -> 'suffix'         (string, different name, page = screen)
     03 / 05 / 06   no map at all        -> item '-01'       (single-item components)

   Stage 4 authors a real SCREEN_TO_SUBCONTENT for all six in the [suffix, page] shape — which is
   also what xapiOnScreen() in 20-xapi.js requires — after which the SCREEN_TO_SUB and no-map
   branches below are dead and should be deleted. Kept for now so that any change in the report
   payload during the extraction is a bug rather than an intended normalisation. */
function _reportItemInfo(screen) {
  if (typeof SCREEN_TO_SUBCONTENT !== 'undefined') {
    var m = SCREEN_TO_SUBCONTENT[screen];
    return m ? { suffix: m[0], page: String(m[1]) } : { suffix: null, page: String(screen) };
  }
  if (typeof SCREEN_TO_SUB !== 'undefined') {           // part 04's string-valued map
    var s = SCREEN_TO_SUB[screen];
    return s ? { suffix: s, page: String(screen) } : { suffix: null, page: String(screen) };
  }
  /* Single-item components. Part 03 reported page '1' because it has exactly one screen; parts 05
     and 06 reported the live screen number. Preserved as-is. */
  var single = (typeof TOTAL_SCREENS !== 'undefined' && TOTAL_SCREENS === 1);
  return { suffix: '01', page: single ? '1' : String(screen) };
}

function openReportModal() {
  document.getElementById('report-modal').removeAttribute('hidden');
  /* Deferred: focus() on a just-unhidden element is dropped in some browsers. */
  setTimeout(function () {
    var el = document.getElementById('report-type');
    if (el) el.focus();
  }, 40);
}

/* Closing with anything typed asks for confirmation first, so a stray Escape cannot discard a
   half-written report. An untouched form closes immediately. */
function tryCloseReportModal() {
  var typeVal = document.getElementById('report-type').value;
  var textVal = document.getElementById('report-text').value.trim();
  if (typeVal || textVal) {
    document.getElementById('report-modal').setAttribute('hidden', '');
    document.getElementById('report-confirm-modal').removeAttribute('hidden');
  } else {
    forceCloseReportModal();
  }
}

function forceCloseReportModal() {
  document.getElementById('report-modal').setAttribute('hidden', '');
  document.getElementById('report-confirm-modal').setAttribute('hidden', '');
  resetReportForm();
}

function backToReportForm() {
  document.getElementById('report-confirm-modal').setAttribute('hidden', '');
  document.getElementById('report-modal').removeAttribute('hidden');
  /* Superset from part 01: return focus to the form the learner is being sent back to. */
  setTimeout(function () {
    var el = document.getElementById('report-type');
    if (el) el.focus();
  }, 40);
}

/* Google Forms field ids. The form is shared with the sibling math unit, so these are fixed by
   that form's definition and must not be renumbered. */
function submitReport() {
  var typeSel = document.getElementById('report-type');
  var textVal = document.getElementById('report-text').value.trim();
  var errEl   = document.getElementById('report-error');

  /* Both fields are required. Focus whichever one is missing. */
  if (!typeSel.value || !textVal) {
    if (errEl) errEl.removeAttribute('hidden');
    (typeSel.value ? document.getElementById('report-text') : typeSel).focus();
    return;
  }
  if (errEl) errEl.setAttribute('hidden', '');

  var now  = new Date();
  var meta = window.METADATA || {};
  var body = new URLSearchParams();

  /* Google Forms splits date and time into per-component fields. */
  body.append('entry.301404029_year',   now.getFullYear());
  body.append('entry.301404029_month',  now.getMonth() + 1);
  body.append('entry.301404029_day',    now.getDate());
  body.append('entry.2066097581_hour',  now.getHours());
  body.append('entry.2066097581_minute', now.getMinutes());

  body.append('entry.1933069481', shortId(meta.learningUnitId));   // unit
  body.append('entry.2070680092', shortId(meta.id));               // component

  var info = _reportItemInfo(currentScreen);
  body.append('entry.1555704258', info.suffix ? shortId(meta.id) + '-' + info.suffix : '');
  body.append('entry.1671046914', info.page);

  body.append('entry.1179822443', typeSel.options[typeSel.selectedIndex].text);   // problem type
  body.append('entry.806447525',  textVal);                                       // description

  /* no-cors: the response is opaque and cannot be inspected, so a resolved promise means "sent",
     not "accepted". The learner sees the thank-you either way — there is nothing useful they could
     do about a transport failure — but it is logged so QA can tell an unfiled report from a lost
     one. */
  fetch(REPORT_FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body })
    .catch(function (e) { console.error('[Report] send failed', e); });

  showReportThanks();
}

function showReportThanks() {
  document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body')
    .forEach(function (el) { el.setAttribute('hidden', ''); });
  var t = document.getElementById('report-thanks');
  if (t) t.removeAttribute('hidden');
}

/* Restores the form to its pristine state, including un-hiding everything showReportThanks() hid —
   otherwise reopening the modal after a successful report shows only the thank-you. */
function resetReportForm() {
  document.getElementById('report-type').value = '';
  document.getElementById('report-text').value = '';
  document.getElementById('report-char-count').textContent = '0 / 250';
  var errEl = document.getElementById('report-error');
  if (errEl) errEl.setAttribute('hidden', '');
  var t = document.getElementById('report-thanks');
  if (t) t.setAttribute('hidden', '');
  document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body')
    .forEach(function (el) { el.removeAttribute('hidden'); });
}

/* Registered from 90-boot.js. Escape closes the confirm dialog outright but routes the form itself
   through tryCloseReportModal, so it cannot silently discard typed text. */
function initReportModal() {
  var flagBtn = document.getElementById('flag-btn');
  if (flagBtn) flagBtn.addEventListener('click', openReportModal);

  var ta = document.getElementById('report-text');
  var cc = document.getElementById('report-char-count');
  if (ta && cc) {
    ta.addEventListener('input', function () { cc.textContent = ta.value.length + ' / 250'; });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var confirmModal = document.getElementById('report-confirm-modal');
    var reportModal  = document.getElementById('report-modal');
    if (confirmModal && !confirmModal.hasAttribute('hidden')) { forceCloseReportModal(); return; }
    if (reportModal  && !reportModal.hasAttribute('hidden'))  { tryCloseReportModal();   return; }
  });
}
