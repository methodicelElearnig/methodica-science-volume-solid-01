'use strict';
/* ═══════════════════ BOOT ═══════════════════
   The ONLY file in unit-js/ with top-level side effects, and the LAST script tag on every page —
   after the component's own js/main.js, so every per-part hook it calls already exists.

   Before the extraction each main.js interleaved definitions with side effects and the startup order
   was whatever the file happened to be in. It is now explicit, and the order below is load-bearing:

     1. scaleApp() first. Nothing else here reads the canvas transform, but appScale() — which every
        popup drag divides by — parses #app.style.transform, and that attribute does not exist until
        scaleApp() has written it. Cheap insurance against an ordering change later.
     2. initDevBridge() before bootXAPI(). The bridge answers DEV_READY as soon as it is installed;
        bootXAPI() may (from Stage 5) window.location.replace() to another component, and nothing
        after it would run.
     3. bootXAPI() LAST, exactly as every main.js used to end.

   No DOMContentLoaded wrapper is needed: this file sits immediately before </body>, so the DOM is
   already complete — the same position the report wiring and the dev bridge ran from before.

   ── Why there is no partBoot() ──
   The sibling unit routes each component's own startup through a partBoot() hook called from here.
   This unit does not need one: every per-part side effect (the scq/ddq/practice registrations, the
   keydown listeners, the dropdown-close delegation, part 03's first resetScreenState) still runs at
   main.js top level, and main.js is loaded BEFORE this file. So the ordering guarantee partBoot
   exists to provide — a component's wiring in place before a resume can replay onto it — already
   holds. The hook is still called if a component ever defines one, so adding it later needs no
   change here. */
(function boot() {
  window.addEventListener('resize', scaleApp);
  scaleApp();
  /* Re-measure once the real viewport is known (responsiveness pattern 9; figma-lomda-builder
     patterns → Viewport scaling): a mobile/tablet browser can report the content's width during
     the call above and settle later WITHOUT firing resize; and a page restored from the
     back/forward cache may come back to a different window. Both go through the resize path
     rather than calling scaleApp() directly, so every resize subscriber re-fits with it — part
     01's comic zoom (comicZoomApply) is one, and would otherwise keep the old canvas size.
     `persisted` keeps an ordinary load from re-measuring twice. */
  function remeasure() { window.dispatchEvent(new Event('resize')); }
  window.addEventListener('load', remeasure);
  window.addEventListener('pageshow', function (e) { if (e.persisted) remeasure(); });

  injectMascotKey();
  initImgZoom();
  initReportModal();
  initDevBridge();

  /* Optional per-part hook. Unused today — see the note above. */
  if (typeof partBoot === 'function') {
    try { partBoot(); } catch (e) { console.error('[boot] partBoot', e); }
  }

  /* Stage 5a. beforeunload / pagehide / visibilitychange, registered before bootXAPI() so a
     component that hops away during resume has already armed its save handlers. */
  if (typeof initResumeLeaveHandlers === 'function') {
    try { initResumeLeaveHandlers(); } catch (e) { console.error('[boot] resume handlers', e); }
  }

  bootXAPI();
})();
