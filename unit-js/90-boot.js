'use strict';
/* ═══════════════════ BOOT ═══════════════════
   The ONLY file in unit-js/ with top-level side effects, and the LAST script tag on every page —
   after the component's own js/main.js, so every per-part hook it calls already exists.

   The order below is load-bearing:

     1. initResumeResetHatch() FIRST. It rewrites the URL (strips ?resetState) and sets the reset
        flag, so it must run before anything reads the query string or touches the state document.
     2. scaleApp(). Nothing else here reads the canvas transform, but appScale() — which every
        popup drag divides by — parses #app.style.transform, and that attribute does not exist
        until scaleApp() has written it.
     3. initDevBridge(), then syncDevBackButton(): the first screen's cross-part "חזרה" belongs to
        the platform (2026-09-16) — hidden unless DEV_NAV (10-identity.js). goBackToPreviousPart
        itself also stops without the flag, so the hidden button is the convenience and the
        function is the backstop.
     4. initResumeLeaveHandlers() — beforeunload / pagehide / visibilitychange, registered before
        bootXAPI() so a learner who leaves early is already covered.
     5. bootXAPI() LAST. It loads two CDN scripts and reports the component 'initialized'. (The
        resume hop to another part that used to live in it was removed on 2026-10-20 — the
        component launched is the component shown.)

   No DOMContentLoaded wrapper is needed: this file sits immediately before </body>, so the DOM is
   already complete.

   ── Why there is no partBoot() ──
   Every per-part side effect (the scq/ddq/practice registrations, the keydown listeners, the
   dropdown-close delegation, part 04's first resetScreenState) still runs at main.js top level, and
   main.js is loaded BEFORE this file. The hook is still called if a component ever defines one. */

/* The first screen's cross-part back button (#back-to-prev-part, parts 02–07). Inline display:none
   as well as the attribute: the button's own rule (.btn-back) is an author rule and beats the UA's
   [hidden] { display:none } — seen live in the sibling units, the button stayed on screen with
   hidden === true. */
function syncDevBackButton() {
  var b = document.getElementById('back-to-prev-part');
  if (!b) return;
  if (DEV_NAV) { b.hidden = false; b.style.display = ''; b.removeAttribute('aria-hidden'); return; }
  b.hidden = true; b.style.display = 'none'; b.setAttribute('aria-hidden', 'true');
}

(function boot() {
  try { initResumeResetHatch(); } catch (e) { console.error('[boot] initResumeResetHatch', e); }

  window.addEventListener('resize', scaleApp);
  scaleApp();
  /* Re-measure once the real viewport is known: a mobile/tablet browser can report the content's
     width during the call above and settle later WITHOUT firing resize; and a page restored from
     the back/forward cache may come back to a different window. Both go through the resize path so
     every resize subscriber re-fits with it — part 01's comic zoom (comicZoomApply) is one. */
  function remeasure() { window.dispatchEvent(new Event('resize')); }
  window.addEventListener('load', remeasure);
  window.addEventListener('pageshow', function (e) { if (e.persisted) remeasure(); });

  injectMascotKey();
  initImgZoom();
  initReportModal();
  initDevBridge();
  try { syncDevBackButton(); } catch (e) { console.error('[boot] syncDevBackButton', e); }

  /* Optional per-part hook. Unused today — see the note above. */
  if (typeof partBoot === 'function') {
    try { partBoot(); } catch (e) { console.error('[boot] partBoot', e); }
  }

  if (typeof initResumeLeaveHandlers === 'function') {
    try { initResumeLeaveHandlers(); } catch (e) { console.error('[boot] resume handlers', e); }
  }

  bootXAPI();
})();
