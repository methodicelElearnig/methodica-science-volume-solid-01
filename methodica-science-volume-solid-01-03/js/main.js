/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 03 (class task)
   Single offline-synthesis task screen. "חזרתי" → Part 04.
   ═══════════════════════════════════════════════════════════ */
var XAPI_ID_PREFIX = "https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/";
function shortId(u){ return String(u || "").split("/").pop(); }
'use strict';

const PART_04_URL = '../methodica-science-volume-solid-01-04/index.html';
let currentScreen = 0;

function scaleApp() {
  const app = document.getElementById('app');
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  app.style.width = (window.innerWidth / scale) + 'px';
  app.style.height = (window.innerHeight / scale) + 'px';
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = '0px'; app.style.top = '0px';
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

window.addEventListener('resize', scaleApp);
renderCompanion(0);
scaleApp();

function classTaskDone() {
  try { sendStatement720('completed', 'onlinelesson'); } catch (e) {}
  window.location.href = PART_04_URL + window.location.search;
}

/* ═══ Report modal ═══ */
function openReportModal() { document.getElementById('report-modal').removeAttribute('hidden'); setTimeout(function () { document.getElementById('report-type')?.focus(); }, 40); }
function tryCloseReportModal() {
  const t = document.getElementById('report-type').value, x = document.getElementById('report-text').value.trim();
  if (t || x) { document.getElementById('report-modal').setAttribute('hidden', ''); document.getElementById('report-confirm-modal').removeAttribute('hidden'); } else forceCloseReportModal();
}
function forceCloseReportModal() { document.getElementById('report-modal').setAttribute('hidden', ''); document.getElementById('report-confirm-modal').setAttribute('hidden', ''); resetReportForm(); }
function backToReportForm() { document.getElementById('report-confirm-modal').setAttribute('hidden', ''); document.getElementById('report-modal').removeAttribute('hidden'); }
var REPORT_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfFq5XFtH1pPpLgV5RWT4m3NanYPW5GKremqTvkp6zKjEGqcw/formResponse';
function submitReport() {
  const typeSel = document.getElementById('report-type'), textVal = document.getElementById('report-text').value.trim(), errEl = document.getElementById('report-error');
  if (!typeSel.value || !textVal) { if (errEl) errEl.removeAttribute('hidden'); (typeSel.value ? document.getElementById('report-text') : typeSel).focus(); return; }
  if (errEl) errEl.setAttribute('hidden', '');
  const now = new Date(), meta = window.METADATA || {}, body = new URLSearchParams();
  body.append('entry.301404029_year', now.getFullYear()); body.append('entry.301404029_month', now.getMonth() + 1); body.append('entry.301404029_day', now.getDate());
  body.append('entry.2066097581_hour', now.getHours()); body.append('entry.2066097581_minute', now.getMinutes());
  body.append('entry.1933069481', shortId(meta.learningUnitId)); body.append('entry.2070680092', shortId(meta.id));
  body.append('entry.1555704258', meta.id ? shortId(meta.id) + '-01' : ''); body.append('entry.1671046914', '1');
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

/* ═══ xAPI (720 LMS host; skipped on localhost) ═══ */
(function initXAPI() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') { return; }
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';
  function loadScript(src, cb) { var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function () { cb(); }; document.head.appendChild(s); }
  function poll(cb) { if (window.jsXAPI_MetadataReady) cb(); else setTimeout(function () { poll(cb); }, 200); }
  loadScript(CDN + 'xapiwrapper.min.js', function () {
    loadScript(CDN + 'xapi-720-f.js', function () {
      try {
        getXAPIParameters('../metadata/methodica-science-volume-solid-01-03.json');
        poll(function () {
          try {
            ADL.XAPIWrapper.changeConfig({ endpoint: window.slxapi.endpoint, auth: window.slxapi.auth });
            sendStatement720('initialized', 'onlinelesson');
            loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {});
          } catch (e) {}
        });
      } catch (e) {}
    });
  });
})();
