/* Local stand-in for the CDN xapi-720-j.js, for verifying reporting and resume offline.
   NOT shipped — loaded only via ?xapiLib=../_test/xapi-720-j.js, which the parts honour on
   localhost alone. The filename must keep the "xapi-720-j.js" ending: 50-loader.js sets
   window.XAPI_USING_G from a regex on it, and item-level statements go silent when it fails.

   Adapted from methodica-math-scale-01/_test/xapi-720-j.js. Two additions this unit needs:
   the log records questionId/parentId (Stage 4 has to prove every 'answered' carries the
   mandatory v2.4 parent), and __dupes() covers 'answered.last' as well as 'completed' —
   part 06's back edge into the failed מועד א makes a re-sent graded answer a real hazard here,
   which it was not in the reference. See ROUTING-AND-RETAKE.md.

   State and the statement log live in sessionStorage, so both survive the cross-part navigations
   this harness exists to exercise. saveState720Debounced really does defer, so the stale-timer
   race that the handoff guards against is reproducible here. */
(function () {
  'use strict';

  var STATE_KEY = '__test_state';
  var LOG_KEY   = '__test_statements';
  var FAIL_KEY  = '__test_fail_writes';

  function readLog() {
    try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeLog(a) { sessionStorage.setItem(LOG_KEY, JSON.stringify(a)); }

  function partSlug() {
    return window.location.pathname.split('/').filter(Boolean).slice(-2)[0] || '';
  }

  window.sendStatement720 = function (verb, objectType, result, opts) {
    var log = readLog();
    log.push({
      verb: verb,
      objectType: objectType,
      part: partSlug(),
      /* The three id channels the 720 spec distinguishes. objectId targets an ITEM;
         questionId targets a question and is what object.id becomes for 'answered';
         parentId is the v2.4 §2 mandatory containing-item pointer. */
      objectId:   (opts && opts.objectId)   || null,
      questionId: (opts && opts.questionId) || null,
      parentId:   (opts && opts.parentId)   || null,
      scope:      (opts && opts.scope)      || null,
      category:   (opts && opts.category)   || null,
      isEvaluationItem: !!(opts && opts.isEvaluationItem),
      result: result || null
    });
    writeLog(log);
    console.log('[stub] ' + verb + ' ' + objectType +
      (opts && opts.objectId   ? ' obj='  + opts.objectId   : '') +
      (opts && opts.questionId ? ' q='    + opts.questionId : '') +
      (opts && opts.parentId   ? ' par='  + opts.parentId   : '') +
      (opts && opts.scope      ? ' scope='+ opts.scope      : ''));
  };

  window.loadState720 = function () {
    try {
      var raw = sessionStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  /* Returns false on a simulated failure, which is what persistUnitState checks. */
  window.saveState720 = function (id, doc) {
    if (sessionStorage.getItem(FAIL_KEY) === '1') { console.warn('[stub] save FORCED FAIL'); return false; }
    sessionStorage.setItem(STATE_KEY, JSON.stringify(doc));
    return true;
  };

  var _t = null;
  window.saveState720Debounced = function (id, doc) {
    /* ⚠️ Holds the REFERENCE and serialises at FIRE time, matching the real library:
           _stateSaveTimers720[stateId] = setTimeout(function () { saveState720(stateId, obj); })
       Corrected 2026-08-17. This stub used to do `var snapshot = JSON.stringify(doc)` at ARM
       time, with a comment claiming that was what the real one did — it is the opposite. That is
       not a cosmetic difference: it invents a clobber race that does not exist. A timer armed on
       navigation would appear to overwrite a later synchronous write with pre-answer state, and
       in the sibling unit mass-measure-02 that fiction produced a false "resume is broken"
       diagnosis before the stub was checked against the library source. Because captureUnitState
       returns the same object every time, the real deferred write lands the UPDATED state. */
    if (_t) clearTimeout(_t);
    _t = setTimeout(function () {
      if (sessionStorage.getItem(FAIL_KEY) === '1') return;
      sessionStorage.setItem(STATE_KEY, JSON.stringify(doc));
      console.log('[stub] debounced write landed');
    }, 800);
  };

  /* Loads the component metadata for real, because window.METADATA is what xapiQ() resolves
     question ids from and what the bug-report form takes its unit/component/item ids from. A stub
     that only flipped the ready flag left both untestable off-platform — the exact gap ?xapiLib
     exists to close.

     Deliberately mirrors the real library's shape, including its quirk: the assignment
     `window.METADATA = <async fn>(...)` stores a PROMISE, and the resolved object replaces it a
     tick later. 50-loader.js's settleMetadata() is what waits for that, so reproducing it here is
     what keeps that code path exercised locally. */
  async function _loadMetadata(file) {
    try {
      const r = await fetch(file);
      if (r.ok) {
        const m = await r.json();
        window.METADATA = m;
        if (m && m.title) document.title = m.title;
        console.log('[stub] METADATA loaded', file);
        return m;
      }
      console.warn('[stub] METADATA fetch failed', r.status, file);
    } catch (e) { console.warn('[stub] METADATA error', e); }
    return null;
  }

  window.getXAPIParameters = function (file) {
    window.jsXAPI_MetadataReady = true;          // as the real library does when ?slxapi is absent
    window.METADATA = _loadMetadata(file || 'metadata.json');
  };

  window.loadUnitMetadata = function (file, cb) {
    fetch(file)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) { if (m) window.UNIT_METADATA = m; })
      .catch(function () {})
      .then(function () { if (typeof cb === 'function') cb(); });
  };

  window.ADL = window.ADL || { XAPIWrapper: { changeConfig: function () {} } };
  window.slxapi = window.slxapi || { endpoint: 'stub', auth: 'stub', actor: {} };

  /* ── Console helpers for the harness ─────────────────────────────────── */
  window.__stmts = readLog;
  window.__state = function () { return window.loadState720(); };
  window.__reset = function () {
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(LOG_KEY);
    sessionStorage.removeItem(FAIL_KEY);
    return 'cleared';
  };
  window.__failWrites = function (on) {
    sessionStorage.setItem(FAIL_KEY, on ? '1' : '0');
    return 'failWrites=' + !!on;
  };

  /* Duplicates of the two verbs that must never repeat within one attempt:
     'completed' (720 v2.4 Completed row — no second send on a viewing revisit) and
     'answered.last' (a graded answer re-sent after a back-navigation). 'initialized' is
     deliberately absent: v2.4 §1 REQUIRES it again on every re-entry. */
  window.__dupes = function () {
    var seen = {}, dupes = [];
    readLog().forEach(function (s) {
      if (s.verb !== 'completed' && s.verb !== 'answered.last') return;
      var k = s.verb + '|' + s.part + '|' + s.objectType + '|' +
              (s.objectId || s.questionId || '') + '|' + (s.scope || '');
      if (seen[k]) dupes.push(k); else seen[k] = 1;
    });
    return dupes;
  };

  /* ── The sweep oracle ────────────────────────────────────────────────────
     Drives goTo() over every data-screen value PRESENT IN THE MARKUP — not
     0..TOTAL_SCREENS-1 — because this unit's screen ids are neither DOM order nor
     flow order (part 01's practice runs 13,14,15,17,16) and a positional loop would
     both miss screens and visit ones that do not exist.

     Returns a normalised, diffable log. Used as the acceptance gate for the shared-layer
     extraction: the log must be byte-identical before and after a pure move. */
  window.__screenIds = function () {
    return Array.prototype.map.call(
      document.querySelectorAll('.screen[data-screen]'),
      function (el) { return parseInt(el.getAttribute('data-screen'), 10); }
    ).sort(function (a, b) { return a - b; });
  };

  /* ⚠️ ASYNC, and it must stay async. Parts 05 and 06 emit their terminal 'completed' through
     xapiSend(), which is setTimeout(…, 0) — so a synchronous sweep reads the log BEFORE those
     macrotasks run and reports zero statements for the very screens most likely to over-report.
     That is the same deferral that defeats the resume stub (see RESUME.md / risk R1); here it
     merely made the oracle lie, which is how it was found. Each goTo is followed by a macrotask
     turn, and a final settle pass drains anything queued by the last screen. */
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  window.__sweep = async function () {
    var ids = window.__screenIds();
    window.__reset();
    var visited = [];
    for (var i = 0; i < ids.length; i++) {
      var n = ids[i];
      try { goTo(n); }
      catch (e) { visited.push({ screen: n, error: String(e) }); await tick(); continue; }
      visited.push({ screen: n, landed: (typeof currentScreen === 'number') ? currentScreen : null,
                     active: (document.querySelector('.screen.active') || {}).id || null });
      await tick();                       // let this screen's deferred sends land
    }
    await tick(); await tick();           // settle
    return {
      part: partSlug(),
      screenIds: ids,
      total: (typeof TOTAL_SCREENS === 'number') ? TOTAL_SCREENS : null,
      visited: visited,
      statements: readLog()
    };
  };
})();
