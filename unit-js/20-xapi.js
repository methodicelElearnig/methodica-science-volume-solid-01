'use strict';
/* ═══════════════════ xAPI (720) — item scope + question ids ═══════════════════
   Shared by all six components. DEFINITION-ONLY; 90-boot.js drives startup via bootXAPI().
   See REPORT-XAPI.md for what each statement means and RESUME.md for the 'completed' ledger.

   Per-part seams, every one read at CALL time (each component's own js/main.js declares them):
     SCREEN_TO_SUBCONTENT   screen -> [item suffix, page-in-item]; null = no catalog item
     XAPI_COMP_SLUG         e.g. 'methodica-science-volume-solid-01-02'
     XAPI_COMP_ID           XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/'
     XAPI_EVAL_ITEMS        items that carry a graded question IN CODE
     XAPI_ITEM_RESULT       optional; item suffix -> function returning an explicit result

   Every read is guarded with typeof, so a component that omits an optional one degrades to the
   neutral value instead of throwing inside a statement path — where the surrounding try/catch
   would swallow it and the statement would vanish silently.

   ⚠️ NOTE ON THIS STAGE: XAPI_COMP_ID / XAPI_COMP_SLUG / XAPI_EVAL_ITEMS are authored per part in
   Stage 4 and do not all exist yet. The library is now -i, so window.XAPI_USING_G is true and the
   item layer is awake — but _xapiSeamsReady() below refuses to emit anything (and says so, once)
   until a component declares its ids. Off-platform there is the additional backstop that the
   library sets window.XAPI_DISABLED and every send is a no-op. */

/* Item ids nest inside the component, matching metadata/*.json:
     <prefix><comp-slug>/<comp-slug>-NN/
   Both segments are required. The pre-extraction code built '<prefix><comp-slug>-NN/' — omitting
   the component segment — which is why no 'answered' in this unit currently matches the catalog. */
function xapiItemId(suffix) { return XAPI_COMP_ID + XAPI_COMP_SLUG + '-' + suffix + '/'; }

function _xapiTrim(u) { return String(u == null ? '' : u).replace(/\/+$/, ''); }

/* Visible answer text for result.response. Clones first so the live DOM is untouched, and drops
   any tooltip/info nodes that textContent would otherwise splice into the middle of a label.

   This unit currently has no such nodes — the selector list is inherited from the sibling unit and
   is inert here — but it is kept because the cost is nil and the failure it prevents (a response
   string with a tooltip's worth of prose wedged into it) is silent.

   Load-bearing for Stage 4: 720 v2.4 requires result.response on every 'answered', and NO SCQ or
   DDQ answer in this unit sends one today. This is where that text comes from. */
function xapiAnswerText(el) {
  if (!el) return '';
  var c = el.cloneNode(true);
  var drop = c.querySelectorAll('.scq-info, .scq-tooltip, .opt-tooltip, .peak-opt-info, .img-zoom-btn');
  for (var i = 0; i < drop.length; i++) { drop[i].remove(); }
  return c.textContent.replace(/\s+/g, ' ').trim();
}

/* Question context: the question's own id plus the id of the ITEM containing it.

   metadata/<component>.json is the single source of truth. Look up
   subContent[<suffix>].questions[<qKey>] and return that questionId as-is when it is already
   absolute; this unit's metadata stores bare keys ('q1'), so the common path is itemId + 'q1'.

   Item matching is by '-NN' suffix with trailing slashes normalised away, so re-syncing metadata
   from Kata can change the URL prefix without touching code.

   parentId is what satisfies 720 v2.4 §2, which made context.contextActivities.parent MANDATORY on
   answered/evaluated. Where the question IS the whole item, the same id correctly appears in both
   object and parent — the spec says so explicitly. */
function xapiQ(suffix, qKey) {
  var itemId = xapiItemId(suffix);
  var qid = null;
  try {
    var sc = (window.METADATA && window.METADATA.subContent) || [];
    for (var i = 0; i < sc.length; i++) {
      if (_xapiTrim(sc[i].id).slice(-(suffix.length + 1)) !== '-' + suffix) continue;
      var qs = sc[i].questions || [];
      for (var j = 0; j < qs.length; j++) {            // match the key, bare or in URL form
        var v = _xapiTrim(qs[j].questionId);
        if (v === qKey || v.slice(-(qKey.length + 1)) === '/' + qKey) { qid = qs[j].questionId; break; }
      }
      if (qid == null) {                               // fallback: positional, 'q3' -> index 2
        var n = parseInt(String(qKey).replace(/\D/g, ''), 10);
        if (n >= 1 && n <= qs.length) qid = qs[n - 1].questionId;
      }
      break;
    }
  } catch (e) {}
  if (qid == null) { console.warn('[xAPI] no metadata question', suffix, qKey); qid = qKey; }
  return { questionId: /^https?:\/\//.test(qid) ? qid : itemId + qid, parentId: itemId };
}

/* Per-question outcome, keyed '<item>/<q>'. Written by every answered site — OUTSIDE its
   try/catch, so a reporting failure cannot corrupt the score — and read when a component or item
   'completed' is assembled. The library's own aggregate is an all-correct AND, which would report
   success:false for any partial pass, so anything needing a partial score supplies it explicitly
   via XAPI_ITEM_RESULT. */
var XAPI_Q_RESULTS = {};
function xapiCorrectCount() {
  return Object.keys(XAPI_Q_RESULTS).filter(function (k) { return XAPI_Q_RESULTS[k]; }).length;
}

var xapiCurrentItem = null;

/* An explicit result for an item's 'completed', when the library's all-correct AND is wrong for it.
   Returns null where a component does not define the map, which is exactly what those components
   passed literally before. */
function xapiItemResult(item) {
  var map = (typeof XAPI_ITEM_RESULT !== 'undefined') ? XAPI_ITEM_RESULT : null;
  var f = map && map[item];
  return f ? f() : null;
}

function _xapiIsEval(item) {
  return (typeof XAPI_EVAL_ITEMS !== 'undefined') && !!XAPI_EVAL_ITEMS[item];
}

/* Close an item, through the resume ledger when it exists.

   The ledger (40-resume.js) lands in Stage 5a; until then this sends directly. The guard is a
   typeof check rather than a local fallback definition on purpose: defining a stub `sendCompletedOnce`
   here and the real one in 40-resume.js would be a silent var/function last-wins collision resolved
   only by load order — the exact hazard unit-js/README.md and _test/checks.mjs exist to prevent.

   Note the library itself also dedupes 'completed' per object id for the lifetime of one page load.
   The ledger is what extends that across page loads and back-navigation. */
function _xapiCloseItem(item) {
  var result = xapiItemResult(item);
  var opts = { objectId: xapiItemId(item), expectsAnswer: _xapiIsEval(item) };
  if (typeof sendCompletedOnce === 'function') {
    sendCompletedOnce('doneItems', itemLedgerKey(item), 'question', result, opts);
  } else {
    sendStatement720('completed', 'question', result, opts);
  }
}

/* Are this component's id seams declared? xapiItemId() reads XAPI_COMP_ID and XAPI_COMP_SLUG as
   bare globals, and EVERY call to it sits inside a try/catch that exists to stop a reporting fault
   reaching the learner. So a component that forgets to declare them does not fail loudly — every
   item statement throws a ReferenceError, gets swallowed, and the item layer is simply silent.

   That is how it behaved when this file first landed (the seams arrive in Stage 4), and finding it
   took a puzzled look at an empty statement log. Warned about once per page load instead. */
var _xapiSeamsWarned = false;
function _xapiSeamsReady() {
  var ok = (typeof XAPI_COMP_ID !== 'undefined') && (typeof XAPI_COMP_SLUG !== 'undefined');
  if (!ok && !_xapiSeamsWarned) {
    _xapiSeamsWarned = true;
    console.warn('[xAPI] item layer inactive: XAPI_COMP_ID / XAPI_COMP_SLUG not declared in this component. ' +
                 'Item-level initialized/completed will not be sent. (Authored in Stage 4.)');
  }
  return ok;
}

/* Item-level initialized/completed pairs, driven from goTo(). Paging inside one item emits
   nothing; the item closes when the learner enters a screen belonging to a DIFFERENT item.

   'initialized' is deliberately NOT deduped: 720 v2.4 §1 requires it again on every re-entry
   (v2.3 said the opposite — the change was a single deleted word). Only 'completed' is guarded. */
function xapiOnScreen(screen) {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  if (!_xapiSeamsReady()) return;
  var map = (typeof SCREEN_TO_SUBCONTENT !== 'undefined') ? SCREEN_TO_SUBCONTENT[screen] : null;
  var item = map ? map[0] : null;
  if (item === xapiCurrentItem) return;
  if (xapiCurrentItem) {
    try { _xapiCloseItem(xapiCurrentItem); } catch (e) {}
  }
  xapiCurrentItem = item;
  if (item) {
    try {
      sendStatement720('initialized', 'question', null,
        { objectId: xapiItemId(item), isEvaluationItem: _xapiIsEval(item) });
    } catch (e) {}
  }
}

/* Close the last open item — called immediately before every component 'completed'. */
function xapiFinishItems() {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  if (!_xapiSeamsReady()) return;
  if (xapiCurrentItem) {
    try { _xapiCloseItem(xapiCurrentItem); } catch (e) {}
    /* Cleared whether or not the statement was suppressed: a latch left set would make the next
       xapiOnScreen try to close the same item all over again. */
    xapiCurrentItem = null;
  }
}

/* HTML5 <video> played/paused, with the time extension the spec asks for (seconds into the media).

   ⚠️ DECORATIVE VIDEO MUST NEVER BE WIRED, and `querySelectorAll('video')` wired all of it. The
   unit is full of <video> that is artwork, not media: every .companion sprite and s7's two path
   cards. They are `autoplay loop muted` with no controls, so nothing about them is a learner
   action — yet goTo() pauses every video when leaving a screen, and a LOOPING sprite is mid-clip
   at that moment, so `currentTime` is not 0 and the guard below let it through. Measured on
   2026-08-27 before this fix: walking 8 screens of part 01 emitted 8 'paused' statements, each
   carrying a time extension and typed as 'question'. 17 videos were wired in part 01 alone —
   14 companions, 2 path cards, and only ONE real player.

   The filter is `aria-hidden`, not `controls`: an element hidden from assistive technology is
   decorative by definition, so it cannot be something the learner operates. That also keeps a
   future content video with a custom player (no `controls` attribute) reporting correctly, and it
   covers sprites injected later by renderCompanion(), which sets aria-hidden when it builds them.

   'paused' fires only for a genuine learner pause — not for the pause at natural end, and not for
   the programmatic pause goTo() performs when leaving a screen (that lands with currentTime 0 only
   after a reset, hence both guards). 'played' fires only after such a pause, so an autoplaying
   video does not report a play the learner did not initiate. */
function xapiWireVideos() {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  document.querySelectorAll('video:not([aria-hidden="true"])').forEach(function (v) {
    if (v.__xapiWired) return;
    v.__xapiWired = true;
    var pausedOnce = false;
    v.addEventListener('pause', function () {
      if (v.ended || v.currentTime === 0) return;
      pausedOnce = true;
      try { sendStatement720('paused', 'question', null, { time: v.currentTime }); } catch (e) {}
    });
    v.addEventListener('play', function () {
      if (!pausedOnce) return;
      try { sendStatement720('played', 'question', null, { time: v.currentTime }); } catch (e) {}
    });
  });
}

/* Fire-and-forget wrapper: defers a statement by one macrotask so reporting never sits on the
   interaction path, and swallows anything thrown. All five parts that had it were byte-identical.

   ⚠️ NEVER use this for 'completed'. The deferral outlives applyExecutionState()'s sender stub and
   the _restoring flag, so a deferred 'completed' escapes BOTH resume guards and is re-reported on
   every resume onto a finished screen. Parts 05 and 06 do exactly that today (via resetScreenState)
   and Stage 4 makes those sends synchronous. It is also what made the sweep oracle under-report
   until it was made async. See RESUME.md risk R1. */
function xapiSend() {
  const args = arguments;
  setTimeout(function () {
    try { sendStatement720.apply(null, args); } catch (e) {}
  }, 0);
}
