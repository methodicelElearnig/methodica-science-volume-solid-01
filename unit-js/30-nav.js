'use strict';
/* ═══════════════════ Navigation ═══════════════════
   Shared by all six components. DEFINITION-ONLY.

   currentScreen lives HERE, not in each main.js: goTo() writes it, and the report modal, the xAPI
   item scope and (from Stage 5) the resume payload all read it. A shared function writing a
   part-declared `let` across files is exactly the coupling this layer exists to remove.

   Per-part seams, all read at CALL time:
     TOTAL_SCREENS          number of screens in this component
     resetScreenState(n)    dispatches to the screen's sNNEnter(); the per-screen re-entry hook

   All five parts that had goTo() had the same one, modulo whitespace, except that part 01 also
   paused video. Taken as the superset — see the notes on each line below. */

var currentScreen = 0;

function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;

  /* Close every feedback popup / hint overlay before the swap, so a popup opened on the screen
     being left cannot bleed onto the next one. Also the reason a resume must NOT reopen a popup:
     arriving on a screen with its feedback showing would be new UI, not a restore. */
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]')
    .forEach(el => el.classList.add('hidden'));

  /* Pause any playing media before leaving. Only part 01 has a <video>; inert elsewhere.
     NOTE this is why xapiWireVideos()'s 'paused' handler checks currentTime — a programmatic pause
     from here must not be reported as a learner pause. */
  document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (e) {} });

  /* Resolve the destination BEFORE committing currentScreen. Every part previously assigned
     currentScreen first and then looked the element up, so a goTo() to a screen the markup does not
     have left currentScreen pointing at a screen that is not `.active`. Harmless while nothing read
     it — but resume writes currentScreen into the state document, and the next launch would restore
     onto a screen with no markup. Guard first, commit second. */
  const next = document.getElementById('s' + n);
  if (!next) return;

  document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
  next.classList.add('active');
  currentScreen = n;

  /* Item-level initialized/completed. Dark until the loader requests a library the
     XAPI_USING_G regex matches (Stage 3). */
  try { xapiOnScreen(n); } catch (e) {}

  /* ── Keep an answered screen answered when the learner returns to it ──────────────
     resetScreenState() is an INITIALISER: it zeroes this screen's answer variables and wipes its
     DOM. Snapshot before it runs, re-apply after, then let the existing painter rebuild the answered
     look. Those are the same three steps applyExecutionState() performs for the landing screen,
     applied here to every navigation — which is what makes a REVISITED screen keep its final state,
     and what rebuilds it after a reload, when the DOM is pristine markup and only the restored
     variables know the answer.

     Some sNNEnter()s already early-return on a solved flag, so for those the re-apply is a no-op and
     only the painter matters; the ones without such a guard rely on both halves. A never-answered
     screen snapshots falsy values, so re-applying is a no-op and every painter early-returns —
     pristine screens are unaffected.

     Suppressed while _restoring, because applyExecutionState() is already driving exactly this
     sequence and would otherwise capture the half-reset state mid-replay. */
  var _keep = null;
  if (typeof _restoring !== 'undefined' && !_restoring && typeof capturePartPayload === 'function') {
    try { _keep = capturePartPayload(); } catch (e) { _keep = null; }
  }

  resetScreenState(n);

  if (_keep) {
    try {
      applyResumeVars(_keep);
      if (typeof applyResumeDom === 'function') applyResumeDom(_keep);
      if (typeof restoreScreenUI === 'function') restoreScreenUI(n);
    } catch (e) { console.error('[resume] repaint on nav', e); }
  }

  /* Inert today by design: announce() early-returns unless #sr-announcer exists, and no part has
     that region. It activates the moment an accessibility pass adds one. The reference also calls
     next.focus() here; omitted because this unit's screens carry no tabindex, which makes it a
     guaranteed no-op — it belongs with the tabindex, in that same pass, not as dead code here. */
  const heading = next.querySelector('h1, h2');
  if (heading) announce(heading.textContent.trim());

  /* Resume: the screen change is the choke point that bounds how much a learner can lose.
     Debounced, and suppressed while restoring. Guarded by typeof rather than defined locally — a
     local stub here plus the real one in 40-resume.js would be a silent last-wins collision
     resolved only by load order. */
  if (typeof scheduleResumeSave === 'function') scheduleResumeSave();
}

/* Replay a saved payload onto this component. Called by 50-loader.js on launch.

   The two-pass shape is load-bearing: goTo() runs the landing screen's sNNEnter(), which resets
   exactly what was just restored, so the variables are assigned AGAIN afterwards and only then
   painted. (goTo's own capture/re-apply block is suppressed while _restoring, so it does not fight
   this.) */
function applyExecutionState(st) {
  if (!st) return;
  _restoring = true;

  /* Replaying answers must not re-report them. The stub is held across goTo() too, which is what
     keeps a finale screen from re-emitting the item, component and unit 'completed' when the learner
     resumes onto it — the library's one-per-page-load rule cannot help across a page load.

     This works only because sendStatement720 is a writable window property, verified empirically in
     Stage 3. Re-check that on every library bump: if it ever becomes const/let, this swap fails
     silently and resume re-reports everything. */
  var _origSend = window.sendStatement720;
  window.sendStatement720 = function () {};
  try {
    applyResumeVars(st);
    goTo((typeof st.currentScreen === 'number') ? st.currentScreen : 0);
    applyResumeVars(st);                                             // undo this screen's sNNEnter()
    if (typeof applyResumeDom === 'function') applyResumeDom(st);     // before the painter locks inputs
    if (typeof restoreScreenUI === 'function') restoreScreenUI(currentScreen);
  } catch (e) {
    console.error('[resume] apply', e);
  } finally {
    window.sendStatement720 = _origSend;
    _restoring = false;
  }

  /* xapiOnScreen() latched xapiCurrentItem during the stubbed goTo without emitting anything.
     Clearing the latch is what lets the landing screen report its item 'initialized' exactly once.
     There is no prior item to close, because this is a fresh page load.

     The item statement itself is deliberately NOT emitted here — 50-loader.js calls xapiOnScreen()
     after the COMPONENT 'initialized', so that a resumed load reports component-then-item in the same
     order a normal load does. Emitting it here produced the reverse, which had the child opening
     before its parent. */
  xapiCurrentItem = null;
}
