'use strict';
/* ═══════════════════ xAPI — loader / init ═══════════════════
   Shared by all six components. DEFINITION-ONLY; 90-boot.js calls bootXAPI() LAST, because from
   Stage 5 this is the step that may window.location.replace() to another component.

   Per-part seams:
     XAPI_METADATA_FILE   required — '../metadata/<component>.json'
     onXapiReady()        optional — runs after the component 'initialized' and the landing screen's
                          item init. Components 01 and 02 use it to open the unit; 03–06 do not
                          define it. (Whether that split is CORRECT is a Stage 4 question — see
                          REPORT-XAPI.md. This stage only preserves it.) */

function bootXAPI() {
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () { console.error('[xAPI] failed to load', src); cb(); };
    document.head.appendChild(s);
  }

  function pollMetadataReady(cb) {
    if (window.jsXAPI_MetadataReady) { cb(); }
    else { setTimeout(function () { pollMetadataReady(cb); }, 200); }
  }

  /* window.METADATA can still be a PROMISE when the poll fires.

     In the library, loadMetadata() is async and assigns window.METADATA twice: the caller does
     `window.METADATA = loadMetadata(file)` — which stores the promise — and the function itself
     later overwrites it with the resolved object and sets jsXAPI_MetadataReady. Normally the flag
     is set by that second assignment, so the poll cannot observe the promise.

     But when no ?slxapi is supplied, getXAPIParameters sets jsXAPI_MetadataReady = true EARLY (so
     the poll cannot hang on a fetch that may never resolve) — before loadMetadata has run. On that
     path the poll releases immediately and window.METADATA is a promise. Anything reading
     .subContent then sees undefined: xapiQ() falls back and warns, and the bug-report form posts
     empty ids. That is precisely the local/param-free case we now want to be able to test.

     So: if it looks thenable, wait for it. Bounded, because a rejected or slow fetch must not
     block startup forever. */
  function settleMetadata(cb) {
    var m = window.METADATA;
    if (!m || typeof m.then !== 'function') { cb(); return; }
    var done = false;
    var finish = function () { if (!done) { done = true; cb(); } };
    m.then(function (v) { if (v) window.METADATA = v; finish(); }, finish);
    setTimeout(finish, 3000);
  }

  /* ── Which library ────────────────────────────────────────────────────
     -i is the production build (720 guidelines v2.4). -j is -i plus the State API transport that
     only resume uses, so -i is loaded while RESUME_ENABLED is false.

     xapi-720-f.js, which this unit shipped with, is DEPRECATED and must not be reinstated. It
     predates v2.4: no contextActivities.parent, no item-level objectId, no XAPI_DISABLED, no
     context.registration, and pre-spec adlnet verb IRIs for selected/requested. It also has no
     master in 720-common-lib/ — only a deployed copy. The full -f→-i comparison, including the
     proof that no id changes shape, is in _test/baselines/stage-3-library-diff.md.

     window.XAPI_USING_G tells the components whether item-level statements are available. The regex
     must list every library letter that supports them — miss one and xapiOnScreen() and the video
     reporting go silent with NO error, because both early-return on that flag. */
  var LIB720 = CDN + (RESUME_ENABLED ? 'xapi-720-j.js' : 'xapi-720-i.js');

  /* On localhost only, ?xapiLib=<same-origin relative path> overrides it — this is how
     _test/xapi-720-j.js gets loaded for offline verification. Restricted to a relative path so the
     parameter cannot be used to inject a third-party script. */
  var override = null;
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  try {
    if (isLocal) {
      var v = new URLSearchParams(location.search).get('xapiLib');
      if (v && /^(\.\.?\/|\/)[^:]*$/.test(v)) override = v;
    }
  } catch (e) {}
  if (override) LIB720 = override;

  window.XAPI_USING_G = /xapi-720-[ghij]\.js/.test(LIB720);

  /* The library now loads off-platform too — deliberately, and only because the letter changed.

     All six parts used to carry a blanket `if (localhost) return;`. That guard was correct for -f,
     which has no XAPI_DISABLED path: with no valid ?slxapi it fell back to a placeholder endpoint
     and retried every statement against it, a request storm that starves the renderer.

     -i and -j disable themselves instead (window.XAPI_DISABLED, set when ?slxapi is absent or
     malformed), so every send is a silent no-op and the hazard is gone. Loading anyway buys a real
     local run: window.METADATA is fetched for real, so xapiQ() resolves against the catalog and the
     bug-report form posts real ids — none of which was observable on a dev server before.

     Offline, loadScript's onerror still calls back, the following getXAPIParameters reference fails
     into the surrounding try, and it logs '[xAPI] load' once. Degraded but visible, and the lomda
     itself is unaffected.

     ?xapiLib is still how _test/xapi-720-j.js gets loaded, for the statement log and the State API
     stub. */

  loadScript(CDN + 'xapiwrapper.min.js', function () {
    loadScript(LIB720, function () {
      try {
        getXAPIParameters(XAPI_METADATA_FILE);
        pollMetadataReady(function () {
          settleMetadata(function () {
            try {
              try {
                ADL.XAPIWrapper.changeConfig({ endpoint: window.slxapi.endpoint, auth: window.slxapi.auth });
              } catch (e) {}

              /* ── Stage 5 seam: resume ──────────────────────────────────
                 Resume runs BEFORE the component 'initialized': a session that turns out to belong
                 to another component hops away, and must not leave a statement behind for the part
                 it merely passed through. For component 01 — the entry component every launch
                 passes through — that is also why the unit is opened in onXapiReady() below, after
                 the hop can no longer happen.

                 Guarded by typeof rather than stubbed locally: a local no-op definition here plus
                 the real one in 40-resume.js would be a silent last-wins collision resolved only by
                 load order. */
              if (RESUME_ENABLED && typeof readUnitState === 'function') {
                try {
                  var saved = readUnitState();
                  if (saved.part && saved.part !== currentPartSlug()) {
                    window.location.replace('../' + saved.part + '/index.html' + window.location.search);
                    return;
                  }
                  _resumeReady = true;
                  var payload = saved.parts[currentPartSlug()];
                  if (payload) applyExecutionState(payload);
                  syncBackButton();
                } catch (e) {
                  console.error('[resume] init', e);
                  _resumeReady = true;
                  if (!_unitState) _unitState = emptyUnitState();
                }
              }

              try { sendStatement720('initialized', 'onlinelesson'); } catch (e) {}
              try { xapiWireVideos(); } catch (e) {}

              /* Item-level init for the landing screen, resumed or not — ALWAYS after the component
                 'initialized' above, so the parent opens before its child.

                 applyExecutionState() deliberately does not emit this: it only clears the item latch
                 that its stubbed goTo() set. Letting it emit produced item-then-component on a resumed
                 load and component-then-item on a normal one — the same session reporting the two in
                 opposite orders depending on how the learner arrived. This is also why the old
                 `_resumed` flag is gone: there is no longer a case to branch on. */
              try { xapiOnScreen(currentScreen); } catch (e) {}

              if (typeof onXapiReady === 'function') {
                try { onXapiReady(); } catch (e) { console.error('[xAPI] ready hook', e); }
              }
            } catch (e) { console.error('[xAPI] init', e); }
          });
        });
      } catch (e) { console.error('[xAPI] load', e); }
    });
  });
}
