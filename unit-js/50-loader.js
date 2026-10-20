'use strict';
/* ═══════════════════ xAPI — loader / init ═══════════════════
   Shared by all seven components. DEFINITION-ONLY; 90-boot.js calls bootXAPI() LAST.
   (Until 2026-10-20 this was also the step that could navigate away — when the resume document
   pointed at another part it did window.location.replace(). That hop is gone: the platform launches
   a component, and the component launched is the component shown. See ROUTING-AND-RETAKE.md.)

   Per-part seams:
     XAPI_METADATA_FILE   required — '../metadata/<component>.json'
     onXapiReady()        optional — runs after the component 'initialized' and the landing
                          screen's item init. Parts use it to load the UNIT metadata, which feeds
                          the bug-report form (no unit-level statement is sent). */

function bootXAPI() {
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';

  /* ── Hold the boot cover BEFORE the CDN loads ──
     The flag is set here, not in Phase A, and that is the point: Phase A runs after two serial
     CDN scripts, which on a cold cache take more than 800 ms — so the markup's safety net would
     reveal screen 0 before anyone knew there was something to restore, reproducing the flash the
     cover exists to prevent. Here we run synchronously from 90-boot.js during the initial parse.
     An optimistic guess ("there is probably something to restore") that every exit path turns off:
     gate 1 below, the no-payload branch in Phase A, the catches, and dropBootCover itself. */
  if (typeof RESUME_ENABLED !== 'undefined' && RESUME_ENABLED) {
    try { window.__resumeInFlight = true; } catch (e) {}
  }

  /* ── Gate 1: the per-part seam must be defined ──
     Without XAPI_METADATA_FILE, getXAPIParameters gets undefined, cannot fetch metadata, and
     jsXAPI_MetadataReady never lights — pollMetadataReady would loop forever with no visible error. */
  if (typeof XAPI_METADATA_FILE === 'undefined' || !XAPI_METADATA_FILE) {
    console.warn('[xAPI] XAPI_METADATA_FILE is not defined in this component — reporting is off.');
    dropBootCover();
    return;
  }

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () { console.error('[xAPI] failed to load', src); cb(); };
    document.head.appendChild(s);
  }

  /* ── Gate 2: the poll is bounded ──
     If the metadata file is missing or returns 404 — a perfectly real deployment scenario — an
     unbounded poll is a silent timer loop for the whole session. 50 × 200 ms = 10 s, then an error
     that says what to check. */
  var METADATA_POLL_MAX = 50;
  function pollMetadataReady(cb, tries) {
    tries = tries || 0;
    if (window.jsXAPI_MetadataReady) { cb(); return; }
    if (tries >= METADATA_POLL_MAX) {
      console.error('[xAPI] metadata not loaded within ' + (METADATA_POLL_MAX * 200 / 1000) + 's — ' +
        'reporting is off in this component. Check that the file exists and is reachable: ' + XAPI_METADATA_FILE);
      dropBootCover();   // cb will never run — the cover must fall here
      return;
    }
    setTimeout(function () { pollMetadataReady(cb, tries + 1); }, 200);
  }

  /* window.METADATA can still be a PROMISE when the poll fires: the library assigns
     `window.METADATA = loadMetadata(file)` (a promise) and later overwrites it with the resolved
     object. When no ?slxapi is supplied, getXAPIParameters sets jsXAPI_MetadataReady EARLY, before
     loadMetadata has run, so the poll releases while METADATA is still the promise. If it looks
     thenable, wait for it — bounded, because a rejected or slow fetch must not block startup. */
  function settleMetadata(cb) {
    var m = window.METADATA;
    if (!m || typeof m.then !== 'function') { cb(); return; }
    var done = false;
    var finish = function () { if (!done) { done = true; cb(); } };
    m.then(function (v) { if (v) window.METADATA = v; finish(); }, finish);
    setTimeout(finish, 3000);
  }

  /* ── Which library ────────────────────────────────────────────────────
     -i is the statements-only build (720 guidelines v2.4), loaded while RESUME_ENABLED is false.
     -k is -i plus the State API transport (direct XHR to Kata, legible diagnostics) that resume
     uses, plus — since 2026-09-15, at MOE's request — the mandatory `helpType: "hint"` context
     extension on every 'requested' (v2.7 p.24). -j is the same code without that extension, so a
     unit on -j does not send helpType; this unit moved -j → -k on 2026-10-20 together with the
     per-component State document (v5). Every live 720 unit loads -k.

     xapi-720-f.js, which this unit originally shipped with, is DEPRECATED and must not be
     reinstated (no contextActivities.parent, no item-level objectId, no XAPI_DISABLED, no
     context.registration; see _test/baselines/stage-3-library-diff.md).

     window.XAPI_USING_G tells the components whether item-level statements are available. The regex
     must list every library letter that supports them — miss one and xapiOnScreen() and the video
     reporting go silent with NO error, because both early-return on that flag.
     ⚠️ Change LIB720 and the regex below IN THE SAME EDIT, every time (guide §3.5). */
  var LIB720 = CDN + (RESUME_ENABLED ? 'xapi-720-k.js' : 'xapi-720-i.js');

  /* On localhost only, ?xapiLib=<same-origin relative path> overrides it — this is how
     _test/xapi-720-k.js gets loaded for offline verification. Restricted to a relative path so the
     parameter cannot be used to inject a third-party script. */
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      var _ovr = new URLSearchParams(location.search).get('xapiLib');
      if (_ovr && /^(\.\.?\/|\/)[^:]*$/.test(_ovr)) LIB720 = _ovr;
    }
  } catch (e) {}

  window.XAPI_USING_G = /xapi-720-[ghijk]\.js/.test(LIB720);

  /* The library loads off-platform too: -i/-j/-k disable themselves (window.XAPI_DISABLED, set when
     ?slxapi is absent or malformed), so every send is a silent no-op and the State layer falls
     back to localStorage. Loading anyway buys a real local run: window.METADATA is fetched for
     real, so xapiQ() resolves against the catalogue and the bug-report form posts real ids. */

  loadScript(CDN + 'xapiwrapper.min.js', function () {
    loadScript(LIB720, function () {
      try {
        getXAPIParameters(XAPI_METADATA_FILE);

        /* ═══ Resume Phase A — read the document and adopt the character ═══
           Before the metadata poll on purpose: the cover (#boot-cover) hides screen 0 until it is
           known what to paint, so its lifetime is the learner's wait. The poll is bounded at 10 s,
           and a learner waiting 10 s in front of a cover is a worse regression than the flash the
           cover fixes. It is allowed to run early because getXAPIParameters sets window.slxapi,
           XAPI_REGISTRATION and XAPI_DISABLED SYNCHRONOUSLY before it touches the metadata, and
           loadState720 works over a raw XHR with slxapi.auth — not through ADL.XAPIWrapper, so it
           does not depend on changeConfig below. Nothing here depends on the metadata file.

           What is NOT brought forward: _resumeReady. It stays in Phase B. Setting it here would
           open a window in which every goTo() arms a save that overwrites doc.payload with a fresh
           one — a write before the restore, exactly what all the write paths are built to prevent.
           Phase A therefore READS ONLY: adoptUnitCharacter aligns memory and the cache; what it
           copies into the document waits in the queue and is persisted in Phase B. */
        var _saved   = null;
        var _payload = null;
        if (RESUME_ENABLED) {
          try {
            _saved = readUnitState();
            /* The document is this part's only (v5): no landing pointer and no hop to a saved part.
               The character — four steps (40-resume.js adoptUnitCharacter). Unconditional, not only
               when there is a payload: a learner entering a part for the first time never reaches
               applyExecutionState and would miss the alignment. Screen 0 was already painted by the
               part's init block with the previous colour; repaint here, behind the cover. */
            if (adoptUnitCharacter(_saved)) {
              try { resetScreenState(currentScreen); } catch (e) {}
            }
            _payload = _saved.payload;
            /* No payload → nothing to restore → no reason to hold the cover. A new learner gets
               an empty document, hence an empty payload, hence the cover falls here — at the
               earliest possible moment, without waiting for pollMetadataReady. With a payload the
               flag stays on and the cover is held until Phase B. */
            if (!_payload) dropBootCover();
          } catch (e) {
            console.error('[resume] read', e);
            dropBootCover();
          }
        } else {
          dropBootCover();   // resume off — nothing to restore, ever
        }

        pollMetadataReady(function () {
          settleMetadata(function () {
            try {
              try { ADL.XAPIWrapper.changeConfig({ endpoint: window.slxapi.endpoint, auth: window.slxapi.auth }); } catch (e) {}

              /* ── The id verification gate ──
                 XAPI_ID_PREFIX is the one value in the shared layer set by convention. Here it is
                 checked against the source of truth on every load of every part: window.METADATA.id
                 is this component's id as written in metadata/, XAPI_COMP_ID is what the code will
                 send. A mismatch — including one trailing slash or one capital letter — means every
                 statement this component sends points at an object that does not exist in the
                 catalogue. A warning, not a throw: wrong reporting beats a lomda that falls over. */
              try {
                var _metaId = window.METADATA && window.METADATA.id;
                if (_metaId && typeof XAPI_COMP_ID !== 'undefined' && _metaId !== XAPI_COMP_ID) {
                  console.error('[xAPI] ID MISMATCH — the code will send an id that does not exist in the catalogue.\n' +
                    '  metadata/ says: ' + _metaId + '\n' +
                    '  code sends:     ' + XAPI_COMP_ID + '\n' +
                    '  Fix XAPI_ID_PREFIX in unit-js/10-identity.js or XAPI_COMP_SLUG in this component.');
                }
              } catch (e) {}

              /* ═══ Resume Phase B — open the writes and restore ═══
                 Sits here on purpose: AFTER changeConfig and BEFORE the component 'initialized'.
                 All writes are blocked until _resumeReady is set, so it is set in the catch as
                 well: a failed read must not cancel saving for the rest of the session, and
                 certainly not silence the reporting. */
              if (RESUME_ENABLED) {
                try {
                  _resumeReady = true;
                  if (!_unitState) _unitState = emptyUnitState();
                  /* A choice made in the window between the phases waits in the queue. Drained
                     BEFORE the restore, because it is newer than what the document says. */
                  drainPendingUnitState();
                  /* The hash beats the document in choosing the SCREEN — '#screen=N' comes from a
                     dev "חזרה" between parts, i.e. an explicit intent now, while the document
                     describes where the learner once was. It does NOT beat the restore of the
                     STATE: we always restore and pass the screen as an override. parseInt, not the
                     raw capture: applyExecutionState checks `typeof === 'number'`. */
                  var _hm = /^#screen=(\d+)$/.exec(window.location.hash);
                  if (_payload) applyExecutionState(_payload, _hm ? parseInt(_hm[1], 10) : undefined);
                } catch (e) {
                  console.error('[resume] init', e);
                  _resumeReady = true;
                  if (!_unitState) _unitState = emptyUnitState();
                }
              }

              /* The regular path for removing the cover: by now it is known what paints — the
                 character was aligned in Phase A and the landing screen painted in Phase B. Called
                 also when resume is off and when there is no payload, so it sits in no branch. */
              dropBootCover();

              try { sendStatement720('initialized', 'onlinelesson'); } catch (e) {}
              try { xapiWireVideos(); } catch (e) {}

              /* Item-level init for the landing screen, resumed or not — ALWAYS after the component
                 'initialized' above, so the parent opens before its child. applyExecutionState()
                 deliberately does not emit this: it only clears the item latch its stubbed goTo()
                 set. Letting it emit produced item-then-component on a resumed load and
                 component-then-item on a normal one. */
              try { xapiOnScreen(currentScreen); } catch (e) {}

              if (typeof onXapiReady === 'function') {
                try { onXapiReady(); } catch (e) { console.error('[xAPI] ready hook', e); }
              }
            } catch (e) { console.error('[xAPI] init', e); dropBootCover(); }
          });
        });
      } catch (e) { console.error('[xAPI] load', e); dropBootCover(); }
    });
  });
}
