'use strict';
/* ═══════════════════════════════════════════════════════════════════
   RESUME — save / restore execution state to Kata (xAPI State API)
   Shared by all seven components. DEFINITION-ONLY; 90-boot.js calls initResumeResetHatch() and
   initResumeLeaveHandlers(), and 50-loader.js drives the restore. Full design: ../docs-and-tools/RESUME.md.
   Procedure: 2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md §8.
   Ported 2026-10-20 from methodica-science-body-matter-01/unit-js/40-resume.js (verified live
   against Kata on 2026-10-20), with this unit's keys and character list.

   ── ONE document per {learner, component} — Kata's model ──
   Kata addresses a State document by ?registration ALONE, and a registration represents a
   {user, component} pair: the platform launches every component on its own URL with its own
   registration (POST /launcher/context takes one componentId, returns one registrationId), reads
   our 'completed' and routes by the catalogue. Since 2026-09-16 no part navigates to another part
   or copies its query string along (DEV_NAV only — 10-identity.js), so every part reads and writes
   ITS OWN document and nothing else.

   The platform may clear a component's State on re-entry (a re-take of an assessment). A missing
   document (404) is therefore "a new attempt": empty payload, empty `done` ledger (the 'completed'
   goes out again — intended), and an empty `results` that beats the localStorage cache of the
   previous attempt (see the read precedence in the getters).

   window.XAPI_UNIT_ID and RESUME_STATE_ID only key the library's localStorage fallback, used when
   there is no valid ?slxapi. RESUME_STATE_ID carries the part slug so that fallback is one document
   per part too — without it a ?dev=1 walk from 01 to 02 read 01's document in 02.

   Per-part seams, all read at CALL time:
     capturePartPayload()   this component's payload, including currentScreen (must deep-clone)
     applyResumeVars(st)    restores answer variables (parameter must be named `st` — eval)
     applyResumeDom(st)     restores DOM-only answers
     restoreScreenUI(n)     repaints an answered screen
     applyExecutionState()  replays a payload onto this component (lives in 30-nav.js)
   ═══════════════════════════════════════════════════════════════════ */

/* v5 (2026-10-20 in this unit): one document per component — `component` + `payload` instead of
   the v3 `part` / `parts{}` / `prev{}` this unit carried while it still routed itself. There is
   deliberately NO migration from v3: no learner ever had a v3 document (the unit has never run
   live), and both the storage key (XAPI_UNIT_ID: prefix → slug) and the state id (now per slug)
   changed with it, so a v3 document is unreachable by this code anyway. Any other version is
   discarded. Version number aligned with the family (body-matter-01, mass-measure, scale) so the
   shared guide and harness apply verbatim.

   ⚠️ Bump every ?v= of unit-js/*.js and js/main.js in all seven index.html in the SAME commit as
   any document-shape change — a stale cached 40-resume.js that reads a newer document discards it,
   and a new main.js against a stale 40-resume.js calls setters that do not exist. */
var RESUME_STATE_VERSION = 5;
/* Includes the slug: the localStorage fallback key (and the library's debounce map) per part.
   currentPartSlug is a function declaration below — hoisted. */
var RESUME_STATE_ID      = 'execution-state::' + currentPartSlug();

/* Not set until the first successful read (or its catch). Every write path checks it, so nothing
   is written before what the document already holds is known. */
var _resumeReady       = false;
/* True only inside applyExecutionState. Suppresses writes and the ledger — see there. */
var _restoring         = false;
/* Stops the leave handlers overwriting the save written right before a dev navigation. */
var _leavingToNextPart = false;

/* The whole document, as last read or written. Never left null after readUnitState(): both
   sendCompletedOnce and captureUnitState derive from it, and every one of their call sites sits
   inside a swallowing try/catch — a throw there would drop a real statement in silence. */
var _unitState = null;

/* Set by initResumeResetHatch. Needed because the hatch strips ?resetState from the URL at the
   start of boot, while readUnitState runs later (after the library loads) — by then a check on the
   query string would find nothing. */
var _resetRequested = false;

/* The current part's slug, derived from the folder path. Folder names are the source of truth
   for this internal slug, and they are all lowercase — like the ids in metadata/.
   ⚠️ toLowerCase() is not cosmetic: the slug comes from location.pathname, i.e. from how the
   learner ARRIVED. A URL differing only in case would produce a second key for the same part — a
   document whose `component` "does not match" and is discarded, and another ledger key — and from
   there lost progress, a `done` ledger that misses, and a duplicate 'completed'. */
function currentPartSlug() {
  var p = window.location.pathname.replace(/\/index\.html.*$/, '').replace(/\/+$/, '');
  return (p.split('/').pop() || '').toLowerCase();
}

/* Namespaced by part slug, and that is NOT cosmetic here: parts 06 and 07 both hold a single item
   with suffix '01', distinguished only by XAPI_COMP_ID. Without the slug, מועד א and מועד ב would
   share one ledger key and the second one's item 'completed' would be silently suppressed. */
function itemLedgerKey(item) { return currentPartSlug() + '#' + item; }

/* ═══════════════════ The document ═══════════════════ */

function emptyUnitState() {
  return {
    v: RESUME_STATE_VERSION,
    component: currentPartSlug(),  // whose document this is — checked on every read; a foreign one is discarded
    payload: null,                 // capturePartPayload() of THIS part (incl. currentScreen)
    done:  {},                     // component slug → its 'completed' has been sent
    doneItems: {},                 // '<slug>#<itemSuffix>' → that item's 'completed' has been sent
    hints: {},                     // '<itemSuffix>/<qKey>' → that hint's 'requested.1' has been sent
    picks: {},                     // one-off learner choices whose 'selected' has been sent
    /* `ui` and `results` — this part's copy. The character is chosen in part 01 and reaches the
       later parts through the localStorage cache (adoptUnitCharacter copies it into the part's own
       document on first entry). Results are written and read by the same part. */
    ui:      { character: null },
    results: {}
  };
}

/* localStorage keys that are a synchronous CACHE of the document, never the source of truth.
   One list because two sites need it: the getters (fallback when there is no document yet) and
   initResumeResetHatch (a reset must clear the cache too). */
/* Namespaced per unit (QA D-6): the origin-wide 'lomda_selectedCharacter' this unit used until
   2026-10-20 was shared by several units with incompatible values, and adoptUnitCharacter would
   copy a foreign value into each component's Kata document. */
var UI_CHARACTER_KEY = 'methodica_science_volume_solid_01_selectedCharacter';
/* The only values this unit's part 01 offers (#s0 .option-card[data-value]). Anything else found
   in the cache (another unit's leftover, a hand-edited key) is ignored rather than adopted. */
var UNIT_CHARACTERS = ['orange', 'turquoise'];
function _validChar(c) { return !!c && UNIT_CHARACTERS.indexOf(c) >= 0; }
/* ⚠️ Exactly the keys this unit's parts write. A key missing here never reaches the document's
   `results`, so its reader falls back to localStorage only — i.e. a second device reads null.
   volume-solid-01_moedAPassed: written by part 06 (מועד א) when its verdict resolves
   ('true'/'false'). Nothing reads it across parts — the platform routes on recommendedAfterFail —
   but it is the part's own verdict, so it goes into the document and ?resetState clears it. */
var RESULT_KEYS = [
  'volume-solid-01_moedAPassed'
];

/* Shape gate, discard-only (see the version note above): the current version passes through,
   anything else is dropped. Kept as a function so a future one-step migration lands here. */
function migrateState(old) {
  if (!old) return null;
  if (old.v === RESUME_STATE_VERSION) return old;
  return null;
}

/* Always returns a usable document. A document of another component is discarded with a
   warning — one registration shared by two components is a platform fault, and a foreign payload
   is never applied; 404/null = a new attempt (see the header). */
function readUnitState() {
  var doc = null;
  try {
    if (_resetRequested) {
      _unitState = emptyUnitState();
      persistUnitState(_unitState);
      console.log('[resume] state reset');
      return _unitState;
    }
    doc = (typeof window.loadState720 === 'function') ? window.loadState720(RESUME_STATE_ID) : null;
  } catch (e) { console.error('[resume] read', e); doc = null; }
  doc = migrateState(doc);
  if (doc && doc.component && doc.component !== currentPartSlug()) {
    console.warn('[resume] document belongs to "' + doc.component + '", not "' + currentPartSlug() + '" — discarded');
    doc = null;
  }
  if (!doc) doc = emptyUnitState();
  doc.component = currentPartSlug();
  doc.payload   = doc.payload   || null;
  doc.done      = doc.done      || {};
  doc.doneItems = doc.doneItems || {};
  doc.hints     = doc.hints     || {};
  doc.picks     = doc.picks     || {};
  /* Must be existing objects, not undefined: their EXISTENCE is what tells the getters "the
     document is the authority, do not fall back to localStorage". Without it a reset document (or
     one the platform cleared for a re-take) would return the character and results from the stale
     cache — a reset that is not a reset. */
  doc.ui        = doc.ui        || { character: null };
  doc.results   = doc.results   || {};
  _unitState = doc;
  return doc;
}

/* REPLACES the payload rather than merging into it — a merge would leave stale keys alive. */
function captureUnitState() {
  var doc = _unitState || emptyUnitState();
  doc.v = RESUME_STATE_VERSION;
  doc.component = currentPartSlug();
  doc.payload = capturePartPayload();
  _unitState = doc;
  return doc;
}

/* Re-arming the debounce BEFORE the synchronous write is what makes a dev handoff stick: the page
   stays alive while the next document loads, long enough for a stale timer to fire and clobber the
   write. Returns whether the synchronous write landed. */
function persistUnitState(doc) {
  var ok = false;
  try {
    if (typeof window.saveState720Debounced === 'function') window.saveState720Debounced(RESUME_STATE_ID, doc);
    /* !== false, not truthiness: the library returns an explicit true/false on every path
       (verified against 720-common-lib/xapi-720-k.js), never undefined. */
    if (typeof window.saveState720 === 'function') ok = (window.saveState720(RESUME_STATE_ID, doc) !== false);
    /* Diagnostics: under -j a write failure was one bit, so a run failing against the platform could
       not be interpreted — 412 vs 413 (document over 1 MB) vs 401 vs CORS all looked alike. -k adds
       stateLastResult720(); guarded by typeof so the unit still runs against a library without it. */
    if (!ok && typeof window.stateLastResult720 === 'function') {
      console.error('[resume] persist failed —', window.stateLastResult720());
    }
  } catch (e) { console.error('[resume] persist', e); ok = false; }
  return ok;
}

/* If the navigation never happens (offline, 404, a cancelled unload) the page stays alive, so
   release it rather than leaving this part unable to save for the rest of the session. */
function armLeaving() {
  _leavingToNextPart = true;
  try { setTimeout(function () { _leavingToNextPart = false; }, 5000); } catch (e) {}
}

/* ═══════════════════ Unit-level state — character and verdicts ═══════════════════
   Read precedence: (1) the document, when `ui` / `results` EXIST in it — existence, not value: a
   reset document holds {character:null} and {}, and that must beat a stale cache or ?resetState is
   not a reset; (2) localStorage, when there is no document at all — i.e. before the resume has been
   read (the synchronous path at the top of every main.js) or when resume is off entirely.
   localStorage is still written because it is the synchronously readable cache that lets the first
   paint show the right character while the document is still two CDN scripts away. */

/* A choice/result made before _resumeReady. A real window, not a theoretical one: the character
   screen is screen 0 of part 01, and the document arrives only after two CDN scripts. Without this
   queue the choice would never reach the document — nothing after it would write it. */
var _pendingProfile = null;
var _pendingResults = null;

/* localStorage throws SecurityError on an opaque origin (file://). Every access goes through here. */
function _lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
function _lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
function _lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }

function getUnitCharacter() {
  var c;
  if (_unitState && _unitState.ui) c = _unitState.ui.character || null;
  else c = _lsGet(UI_CHARACTER_KEY);
  return _validChar(c) ? c : null;
}

function setUnitCharacter(c) {
  if (!_validChar(c)) c = null;
  if (window.lomdaState) window.lomdaState.selectedCharacter = c;
  if (c) _lsSet(UI_CHARACTER_KEY, c); else _lsDel(UI_CHARACTER_KEY);
  if (!RESUME_ENABLED) return;
  if (!_resumeReady || !_unitState) { _pendingProfile = { character: c }; return; }
  _unitState.ui = _unitState.ui || {};
  _unitState.ui.character = c;
  /* Synchronous, not debounced: the learner clicks "המשך" right after choosing, and a deferred
     write could fire after the page is left — the same reasoning as flushResumeSave. */
  try { persistUnitState(captureUnitState()); } catch (e) { console.error('[resume] character', e); }
}

function getUnitResult(key) {
  if (_unitState && _unitState.results) return _unitState.results[key] || null;
  return _lsGet(key);
}

function setUnitResult(key, val) {
  _lsSet(key, val);
  if (!RESUME_ENABLED) return;
  if (!_resumeReady || !_unitState) {
    _pendingResults = _pendingResults || {};
    _pendingResults[key] = val;
    return;
  }
  _unitState.results = _unitState.results || {};
  _unitState.results[key] = val;
  try { persistUnitState(captureUnitState()); } catch (e) { console.error('[resume] result', e); }
}

/* Called from 50-loader.js right after _resumeReady is set and BEFORE the restore. The order is
   what implements the precedence rule: a choice made in this session is newer than what the
   document says, so it wins. */
function drainPendingUnitState() {
  if (!_unitState) return;
  var dirty = false;
  if (_pendingProfile) {
    _unitState.ui = _unitState.ui || {};
    _unitState.ui.character = _pendingProfile.character;
    _pendingProfile = null;
    dirty = true;
  }
  if (_pendingResults) {
    _unitState.results = _unitState.results || {};
    Object.keys(_pendingResults).forEach(function (k) {
      _unitState.results[k] = _pendingResults[k];
    });
    _pendingResults = null;
    dirty = true;
  }
  if (dirty) {
    try { persistUnitState(captureUnitState()); } catch (e) { console.error('[resume] drain', e); }
  }
}

/* The character on entering a part — four steps (decision 2026-09-16, guide §8.13):
   (1) this part's document; (2) if null — the localStorage cache (the choice from part 01 in the
   same browser); (3) if found — copied into this part's document: onto `doc` directly, so
   getUnitCharacter returns it between Phase A and Phase B, and into the _pendingProfile queue, so
   drainPendingUnitState persists it in Phase B (Phase A does not write yet); (4) if neither — the
   caller keeps the default.
   NEVER deletes the cache. Under one document per part every part ≥ 02 opens with null, so a
   deleting reader lost the character on every Kata launch, and with the cache gone, for every part
   after it. A ?resetState boot adopts nothing. A value outside UNIT_CHARACTERS is ignored.
   Returns whether anything changed — a screen already painted in the previous colour must be
   repainted before the boot cover drops. */
function adoptUnitCharacter(doc) {
  var c = (doc && doc.ui && _validChar(doc.ui.character)) ? doc.ui.character : null;
  if (!c && !_resetRequested) {
    c = _lsGet(UI_CHARACTER_KEY);
    if (!_validChar(c)) c = null;
    if (c && doc) {
      doc.ui = doc.ui || {};
      doc.ui.character = c;
      _pendingProfile = { character: c };
    }
  }
  var cur = window.lomdaState ? (window.lomdaState.selectedCharacter || null) : null;
  if (c) {
    if (window.lomdaState) window.lomdaState.selectedCharacter = c;
    _lsSet(UI_CHARACTER_KEY, c);
  }
  return c !== cur;
}

/* ═══════════════════ The boot cover ═══════════════════
   #boot-cover sits in the markup of all seven index.html (a SIBLING of #app, not a child — #app is
   translated and scaled by scaleApp) painted in the page background, so it paints in the first
   frame. It hides the window in which screen 0 is already visible but the document has not been
   read. This is the only way this change can leave a learner facing a blank screen, so the removal
   is centralised here, idempotent, and called from every exit path of 50-loader.js. Above it is a
   safety net that depends on no JS file: a small inline script in the markup removes the cover
   after 800 ms — unless 50-loader.js set window.__resumeInFlight, in which case it waits for the
   restore up to a hard 6 s. Clearing the flag here keeps "cover dropped" and "restore not in
   flight" together. */
function dropBootCover() {
  try { window.__resumeInFlight = false; } catch (e) {}
  try {
    var c = document.getElementById('boot-cover');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  } catch (e) {}
}

/* ═══════════════════ The ledgers ═══════════════════
   One 'completed' per component and per item per attempt, one 'requested' per hint — the
   library's own dedupe only spans a single page load, and a reload or a re-entry would repeat.
   'initialized' is deliberately NOT guarded: the spec asks for it on every entry.

   Three orderings here are load-bearing:
   1. Absolute exit while _restoring — neither send nor mark. applyExecutionState stubs the sender,
      so a mark taken there would permanently suppress a statement that never actually left.
   2. Fail open, never closed. The ledger is obeyed only when it positively says "already sent"; if
      the document is unavailable we send anyway — every call site swallows exceptions, and a silent
      drop is far worse than a duplicate.
   3. The mark is persisted synchronously right here: the finish buttons send without navigating
      afterwards, so nothing else would ever write it. */
function alreadySent(ledger, key) {
  return !!(_unitState && _unitState[ledger] && _unitState[ledger][key]);
}

function markSent(ledger, key) {
  if (!_unitState) return;
  _unitState[ledger] = _unitState[ledger] || {};
  _unitState[ledger][key] = true;
  try { persistUnitState(captureUnitState()); } catch (e) { console.error('[resume] ledger', e); }
}

/* Any verb, same three invariants. Returns whether the key is SETTLED — sent just now or already
   in the ledger. false means suppressed because a restore is in flight, so the caller must not
   latch anything of its own either. */
function sendStatementOnce(ledger, key, verb, objectType, result, opts) {
  if (_restoring) return false;
  if (alreadySent(ledger, key)) return true;
  sendStatement720(verb, objectType, result || null, opts);
  markSent(ledger, key);
  return true;
}

function sendCompletedOnce(ledger, key, objectType, result, opts) {
  sendStatementOnce(ledger, key, 'completed', objectType, result, opts);
}

/* TEMPORARY shim (Phase 2 → Phase 3 of the 2026-10-20 upgrade): parts 06/07 still call this for
   their closing peak answers until their call sites move to xapiAnswered(). The `doneQ` ledger it
   used is gone — under platform routing nothing re-enters מועד א after its 'completed'. Delete with
   the last caller. */
function sendAnsweredOnce(item, qKey, result, opts) {
  if (_restoring) return;
  sendStatement720('answered.last', 'question', result || null, opts);
}

/* ═══════════════════ Cross-part back edges — DEV ONLY ═══════════════════
   Part 04 is reachable from both 02 (pass) and 03 (remediation), so a fixed "חזרה" would send
   whoever skipped 03 back into content they never saw. The solution is a map of edges, not a
   stack: forward navigation writes the edge, back navigation only reads it. The edge also carries
   the hash of the screen to return to. sessionStorage, not localStorage: the edge belongs to the
   current attempt. Since 2026-09-16 (platform owns routing) all of this runs only under DEV_NAV
   (10-identity.js); in production the platform launches each component on its own. */
/* ⚠️ Carries the unit slug on purpose: two units sharing this key would share a map. */
var NAV_EDGE_KEY = 'lomda_nav_edges::methodica-science-volume-solid-01';

function _readEdges() {
  try {
    var raw = window.sessionStorage.getItem(NAV_EDGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

/* Called by every forward router, right before the hop. writeForwardState calls it itself, so the
   two cannot drift apart.
     destSlug    the destination folder name
     returnHash  the hash that brings the learner back to the screen they left, e.g. '#screen=19' */
function recordForwardEdge(destSlug, returnHash) {
  try {
    var edges = _readEdges();
    edges[destSlug] = { from: currentPartSlug(), hash: returnHash || '' };
    window.sessionStorage.setItem(NAV_EDGE_KEY, JSON.stringify(edges));
  } catch (e) { /* storage blocked — the button's fallback handles it */ }
}

function _incomingEdge() {
  return _readEdges()[currentPartSlug()] || null;
}

/* The edge resolved to a URL. Separated from the navigation itself on purpose, so the decision is
   testable without navigating (location.href cannot be stubbed in jsdom). */
function previousPartHref(fallbackSlug, fallbackHash) {
  var edge = _incomingEdge();
  var slug = (edge && edge.from) || fallbackSlug;
  var hash = edge ? (edge.hash || '') : (fallbackHash || '');
  return '../' + slug + '/index.html' + window.location.search + hash;
}

/* Back navigation — dev only. Saves this part synchronously (so a ?dev=1 walk returns to where it
   stood) and navigates. In production it does nothing: the button that calls it is hidden by
   90-boot.js, and this guard is the backstop in case it is reached anyway (keyboard, old DOM). */
function goBackToPreviousPart(fallbackSlug, fallbackHash) {
  if (!DEV_NAV) return;
  var href = previousPartHref(fallbackSlug, fallbackHash);
  if (RESUME_ENABLED && _resumeReady) {
    flushResumeSave();
    armLeaving();
  }
  /* replace(), not href: the browser's own Back should not land on the part just left. */
  window.location.replace(href);
}

/* Records the back edge and saves the part being left — dev only (callers run under DEV_NAV).
   No landing pointer and no payload seeding for the destination any more: the destination's
   document is another document, that part's own. */
function writeForwardState(destSlug, returnHash) {
  recordForwardEdge(destSlug, returnHash);   // always, even with resume off — part code relies on it
  if (!RESUME_ENABLED || !_resumeReady) return;
  flushResumeSave();
  armLeaving();
}

/* ═══════════════════ When state is written ═══════════════════
   All of them exit if resume is off, if there has not yet been a successful read, or inside a
   restore — so nothing is written during a replay and nothing before the read. */

/* Screen change — the choke point. Debounced: bounds the loss to one screen. */
function scheduleResumeSave() {
  if (!RESUME_ENABLED || !_resumeReady || _restoring) return;
  if (typeof window.saveState720Debounced !== 'function') return;
  try { window.saveState720Debounced(RESUME_STATE_ID, captureUnitState()); } catch (e) {}
}

/* Answer commit / finish — synchronous. goTo(n) arms a debounced save; the learner clicks
   "המשך" 200 ms later; a deferred write could then land after the page is left. */
function flushResumeSave() {
  if (!RESUME_ENABLED || !_resumeReady || _restoring) return;
  if (typeof window.saveState720 !== 'function') return;
  try { window.saveState720(RESUME_STATE_ID, captureUnitState()); } catch (e) {}
}

/* beforeunload alone is not enough: it never fires when a mobile tab is backgrounded and then
   killed, which is exactly how a learner leaves mid-lesson. pagehide and a hidden visibilitychange
   cover that. */
function flushResumeSaveOnLeave() {
  if (_leavingToNextPart) return;
  flushResumeSave();
}

/* Registered from 90-boot.js. */
function initResumeLeaveHandlers() {
  window.addEventListener('beforeunload', flushResumeSaveOnLeave);
  window.addEventListener('pagehide', flushResumeSaveOnLeave);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushResumeSaveOnLeave();
  });
}

/* ═══════════════════ QA escape hatch ═══════════════════
   Off-platform there is no ?registration, so the localStorage fallback keys every local run to the
   SAME document — after one pass the ledger is full and no 'completed' is ever emitted again, which
   reads as a catastrophic regression to whoever tests next. ?resetState starts from a clean
   document. It strips itself from the URL (otherwise every reload would reset again and resume
   would never work), and that must happen before anyone reads the query — hence 90-boot.js calls
   this first; _resetRequested carries the intent to readUnitState, which runs later. */
function initResumeResetHatch() {
  if (!/[?&]resetState(=|&|$)/.test(window.location.search)) return;
  _resetRequested = true;
  try { window.sessionStorage.removeItem(NAV_EDGE_KEY); } catch (e) {}
  /* The cache too, not only the document: the getters fall back to localStorage when there is no
     document — exactly the synchronous path at the top of every main.js, before readUnitState. */
  _lsDel(UI_CHARACTER_KEY);
  RESULT_KEYS.forEach(_lsDel);
  try {
    var q = window.location.search
      .replace(/([?&])resetState(=[^&]*)?(&|$)/, '$1')
      .replace(/[?&]$/, '');
    history.replaceState(null, '', window.location.pathname + q + window.location.hash);
  } catch (e) {}
  console.log('[resume] reset requested');
}
