'use strict';
/* ═══════════════════ Dev bridge ═══════════════════
   Shared by all six components. DEFINITION-ONLY; 90-boot.js calls initDevBridge().

   Lets each part's index_dev.html — an iframe wrapper with a screen-jump bar — drive navigation
   without touching the shipped index.html. Five parts carried byte-identical copies; part 03 had
   none, and gains one (it has an index_dev.html, whose jump bar simply did nothing before).

   ⚠️ Unlike the sibling unit, where this file is described as "not deployed", it IS deployed here:
   it lives in the same main.js the platform serves. Two consequences worth stating rather than
   discovering:

     - The DEV_GOTO listener is always active. It only ever calls goTo() with a parsed integer, and
       goTo() rejects anything out of range or without markup, so the worst a hostile parent frame
       can do is move the learner between screens of the lomda they already have open.
     - DEV_READY is posted to the parent whenever the page is framed — which includes the real
       platform, since it hosts the lomda in an iframe. It carries only a screen count, and an
       unrecognised message type is ignored. Preserved as-is; changing the target origin from '*'
       would be a behaviour change with no security gain worth the risk here, because the payload
       carries nothing about the learner. */

function initDevBridge() {
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'DEV_GOTO') return;
    var n = parseInt(e.data.screen, 10);
    if (!isNaN(n)) goTo(n);
  });

  /* Announce the real screen count so the wrapper's jump bar matches the markup rather than a
     hard-coded range. Counted from the DOM, not TOTAL_SCREENS, so a mismatch between the two shows
     up as a jump bar that disagrees with the constant — which is what _test/checks.mjs gate 3
     exists to prevent in the first place. */
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'DEV_READY',
      total: document.querySelectorAll('.screen').length
    }, '*');
  }
}
