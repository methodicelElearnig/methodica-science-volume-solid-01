'use strict';
/* ═══════════════════ xAPI (720) — item scope, question ids, answers, hints, completion ═══════════════════
   Shared by all seven components. DEFINITION-ONLY; 90-boot.js drives startup via bootXAPI().
   See docs-and-tools/REPORT-XAPI.md for what each statement means and RESUME.md for the ledgers.
   Ported 2026-10-20 from methodica-science-body-matter-01/unit-js/20-xapi.js (verified live
   against Kata on 2026-10-20), keeping this unit's xapiAnswerText and its loader ordering.

   Per-part seams, every one read at CALL time (each component's own js/main.js declares them):
     SCREEN_TO_SUBCONTENT   screen -> [item suffix, page-in-item]; null = no catalogue item
     XAPI_COMP_SLUG         e.g. 'methodica-science-volume-solid-01-02'
     XAPI_COMP_ID           XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/'
     XAPI_EVAL_ITEMS        items that carry a graded question IN CODE
     XAPI_ITEM_RESULT       optional; item suffix -> function returning an explicit result
     XAPI_END_BTN           id of the part's finish button (D-8, restoreEndedButton)

   Every read is guarded with typeof, so a component that omits an optional one degrades to the
   neutral value instead of throwing inside a statement path — where the surrounding try/catch
   would swallow it and the statement would vanish silently. */

/* Item ids nest inside the component, matching metadata/*.json:
     <prefix><comp-slug>/<comp-slug>-NN/
   Both segments are required. */
function xapiItemId(suffix) { return XAPI_COMP_ID + XAPI_COMP_SLUG + '-' + suffix + '/'; }

function _xapiTrim(u) { return String(u == null ? '' : u).replace(/\/+$/, ''); }

/* Visible answer text of an option element — the UI-side input to the response layer below,
   which resolves it to the metadata string. Clones first so the live DOM is untouched, and drops
   any tooltip/info/zoom nodes that textContent would otherwise splice into the middle of a label. */
function xapiAnswerText(el) {
  if (!el) return '';
  var c = el.cloneNode(true);
  var drop = c.querySelectorAll('.scq-info, .scq-tooltip, .opt-tooltip, .peak-opt-info, .img-zoom-btn, .help-popup, [class*="tooltip"], [class*="info-bubble"], [class*="badge"], button, svg');
  for (var i = 0; i < drop.length; i++) { drop[i].remove(); }
  var t = c.textContent.replace(/\s+/g, ' ').trim();
  /* An option drawn as an AREA (an image hotspot, 03 s6) has no text of its own; its explicit label
     is its aria-label, the same name a screen reader announces. Only consulted when there is no
     text, so every text option reports exactly what it did before. */
  if (!t && el.getAttribute) t = (el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  return t;
}

/* Question context: the question's own id plus the id of the ITEM containing it.
   metadata/<component>.json is the single source of truth: subContent[<suffix>].questions[<qKey>],
   returned as-is when it is already absolute (the 2.7 metadata stores absolute question IRIs; the
   bare 'qN' form is still accepted). Item matching is by '-NN' suffix with trailing slashes
   normalised away. parentId satisfies v2.4 §2 / v2.7 p.24: context.contextActivities.parent is
   MANDATORY on answered — the item, repeated when the question IS the item. */
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

/* Per-question outcome, keyed '<item>/<q>'. Written by xapiAnswered OUTSIDE its try/catch, so a
   reporting failure cannot corrupt the score — and read when a component or item 'completed' is
   assembled. The library's own aggregate is an all-correct AND, which would report success:false
   for any partial pass, so anything needing a partial score supplies it explicitly. */
var XAPI_Q_RESULTS = {};
function xapiCorrectCount() {
  return Object.keys(XAPI_Q_RESULTS).filter(function (k) { return XAPI_Q_RESULTS[k]; }).length;
}

var xapiCurrentItem = null;

/* An explicit result for an item's 'completed', when the library's all-correct AND is wrong for it.
   Returns null where a component does not define the map. */
function xapiItemResult(item) {
  var map = (typeof XAPI_ITEM_RESULT !== 'undefined') ? XAPI_ITEM_RESULT : null;
  var f = map && map[item];
  return f ? f() : null;
}

function _xapiIsEval(item) {
  return (typeof XAPI_EVAL_ITEMS !== 'undefined') && !!XAPI_EVAL_ITEMS[item];
}

/* ── Re-arm the library's 'answered' memory after a restore ──
   xapi-720-k.js blocks an item's 'completed' on xapiItemAnswered[itemId] — a map it fills only from
   an 'answered' that passed through it in the same page load ("deferring" is a drop: no queue, no
   retry). A restore deliberately does not re-send the answers it restores, so without this seed the
   library treats every previously answered item as unanswered and drops its 'completed' — while
   sendStatementOnce, having called the sender, marks the ledger as sent. Lost forever. Verified
   live against Kata on 2026-09-07 in the reference family.
   Seeds only items with a recorded answer, so an unanswered item is still deferred and the
   goBack protection holds. Must run after applyResumeVars (which refills XAPI_Q_RESULTS) and
   before an item boundary can be crossed — applyExecutionState (30-nav.js) calls it last. */
function xapiSeedAnsweredFromResume() {
  if (!window.XAPI_USING_G) return;
  if (!window.xapiItemAnswered) {
    console.warn('[xAPI] xapiItemAnswered unreachable - item "completed" will be dropped after a resume');
    return;
  }
  Object.keys(XAPI_Q_RESULTS).forEach(function (k) {
    var item = k.split('/')[0];
    if (item) window.xapiItemAnswered[xapiItemId(item)] = true;
  });
}

/* ── B-1 ── The library DROPS an evaluated item's 'completed' when that item has no 'answered' in
   this page load. sendStatementOnce cannot see that: it marks the ledger anyway, and the real,
   scored 'completed' — after the learner comes back and answers — is then suppressed forever. So
   the close asks the library's own question first and, when the library would drop the statement,
   sends nothing and leaves the ledger untouched. Fallback when the map is unreachable: an answer
   recorded in XAPI_Q_RESULTS (restored by resume, same predicate as the seed). */
function _xapiLibWouldDrop(item) {
  if (!_xapiIsEval(item)) return false;
  var m = window.xapiItemAnswered;
  if (m) return !m[xapiItemId(item)];
  return !Object.keys(XAPI_Q_RESULTS).some(function (k) { return k.split('/')[0] === item; });
}
function _xapiCloseItem(item) {
  if (_xapiLibWouldDrop(item)) return;
  try { sendCompletedOnce('doneItems', itemLedgerKey(item), 'question', xapiItemResult(item), { objectId: xapiItemId(item), expectsAnswer: _xapiIsEval(item) }); } catch (e) {}
}

/* Are this component's id seams declared? xapiItemId() reads XAPI_COMP_ID and XAPI_COMP_SLUG as
   bare globals, and EVERY call to it sits inside a try/catch — so a component that forgets them
   does not fail loudly; the item layer is simply silent. Warned about once per page load. */
var _xapiSeamsWarned = false;
function _xapiSeamsReady() {
  var ok = (typeof XAPI_COMP_ID !== 'undefined') && (typeof XAPI_COMP_SLUG !== 'undefined');
  if (!ok && !_xapiSeamsWarned) {
    _xapiSeamsWarned = true;
    console.warn('[xAPI] item layer inactive: XAPI_COMP_ID / XAPI_COMP_SLUG not declared in this component.');
  }
  return ok;
}

/* Item-level initialized/completed pairs, driven from goTo(). Paging inside one item emits
   nothing; the item closes when the learner enters a screen belonging to a DIFFERENT item.
   'initialized' is deliberately NOT deduped: the spec requires it again on every re-entry. */
function xapiOnScreen(screen) {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  if (!_xapiSeamsReady()) return;
  var map = (typeof SCREEN_TO_SUBCONTENT !== 'undefined') ? SCREEN_TO_SUBCONTENT[screen] : null;
  var item = map ? map[0] : null;
  if (item === xapiCurrentItem) return;
  if (xapiCurrentItem) _xapiCloseItem(xapiCurrentItem);
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
    _xapiCloseItem(xapiCurrentItem);
    /* Cleared whether or not the statement was suppressed: a latch left set would make the next
       xapiOnScreen try to close the same item all over again. */
    xapiCurrentItem = null;
  }
}

/* ═══════════════════ result.response — per the xAPI interaction-type formats ═══════════════════
   MOE (mail 19.10.26, Documentation/MOE/דיוק ביישום תקן XAPI.docx) found that the family's
   `response` strings did not match the metadata (DOM ids and ad-hoc joins) and asked for the
   xAPI-Data.md §4.1.6.1 / Appendix C formats. Kata's QuestionType enum IS the xAPI interactionType
   vocabulary and Kata compares `response` to the metadata's answers / correctAnswers, so:

     • the METADATA TEXT is the identifier. Every builder resolves what the UI hands it to the
       metadata entry (normalised comparison) and emits the metadata string byte-for-byte, in
       metadata order, with the xAPI delimiters. Never a DOM id, never click order.
     • choice      → 'A' or 'A[,]B'           pieces from answers[], in answers order
       matching    → 'S1[.]T1[,]S2[.]T2'       one pair per answers.source, in source order ('S[.]' if unplaced)
       performance → 'step1[.]v1[,]step2[.]v2' one per steps[], in steps order (learner text)
       fill-in / numeric / true-false / sequencing / other → plain / '12.5' / 'true' / 'A[,]B' / free text
     • '[,]' '[.]' '[:]' are reserved: metadata strings must never contain them (check-metadata.py
       enforces it); learner-typed free text has them blanked; metadata-sourced pieces are never
       altered.
     • lookup normalisation only: NFC, collapsed whitespace, ׳ ’ ʼ → ' . An unresolvable UI text is
       warned about and emitted normalised — the statement still carries information, and the
       harness turns the warning into a failure.

   The library (xapi-720-k.js, answered block) passes sttmResult.response through verbatim, so the
   whole layer is unit-side. object.definition stays {id}-only (MOE examples, v2.7 p.22). */

/* The metadata question object for (item suffix, qKey) — or null. Same matching as xapiQ. */
function _xapiFindQuestion(suffix, qKey) {
  try {
    var sc = (window.METADATA && window.METADATA.subContent) || [];
    for (var i = 0; i < sc.length; i++) {
      if (_xapiTrim(sc[i].id).slice(-(suffix.length + 1)) !== '-' + suffix) continue;
      var qs = sc[i].questions || [];
      for (var j = 0; j < qs.length; j++) {
        var v = _xapiTrim(qs[j].questionId);
        if (v === qKey || v.slice(-(qKey.length + 1)) === '/' + qKey) return qs[j];
      }
      var n = parseInt(String(qKey).replace(/\D/g, ''), 10);
      return (n >= 1 && n <= qs.length) ? qs[n - 1] : null;
    }
  } catch (e) {}
  return null;
}

/* {questionId, parentId, questionType, answers, correctAnswers, steps} — one lookup. */
function xapiQMeta(suffix, qKey) {
  var ids = xapiQ(suffix, qKey), q = _xapiFindQuestion(suffix, qKey) || {};
  return { questionId: ids.questionId, parentId: ids.parentId,
           questionType: q.questionType || null,
           answers: q.answers == null ? null : q.answers,
           correctAnswers: q.correctAnswers || null,
           steps: q.steps || null };
}

var XAPI_SEP_LIST = '[,]', XAPI_SEP_PAIR = '[.]';
var _XAPI_DELIMS = /\[,\]|\[\.\]|\[:\]/g;

function _xapiNorm(s) {
  s = String(s == null ? '' : s);
  if (s.normalize) s = s.normalize('NFC');
  return s.replace(/[׳’ʼ]/g, "'").replace(/\s+/g, ' ').trim();
}
/* learner-typed text: the delimiters cannot be escaped in xAPI, so they are blanked */
function _xapiFree(s) { return _xapiNorm(s).replace(_XAPI_DELIMS, ' ').replace(/\s+/g, ' ').trim(); }

/* Resolve one UI value to the metadata entry it names. pool = array of metadata strings.
   value: a string (matched by _xapiNorm) or a number (index into the pool).
   Returns {text, idx} — text is the METADATA string, byte for byte, when found. */
function _xapiPick(value, pool, item, qKey, where) {
  pool = pool || [];
  if (typeof value === 'number') {
    if (pool[value] != null) return { text: String(pool[value]), idx: value };
    console.warn('[xAPI] response: index ' + value + ' outside metadata ' + where, item, qKey);
    return { text: '', idx: 1e9 };
  }
  var n = _xapiNorm(value);
  for (var i = 0; i < pool.length; i++) if (_xapiNorm(pool[i]) === n) return { text: String(pool[i]), idx: i };
  if (n !== '') console.warn('[xAPI] response: "' + n + '" not in metadata ' + where, item, qKey);
  return { text: n, idx: 1e9 };
}

/* choice: selected → [text | index]; emitted in answers order, whatever the click order */
function xapiChoiceResponse(item, qKey, selected) {
  var m = xapiQMeta(item, qKey), pool = Array.isArray(m.answers) ? m.answers : [];
  var picks = (selected || []).map(function (v) { return _xapiPick(v, pool, item, qKey, 'answers'); });
  picks.sort(function (a, b) { return a.idx - b.idx; });
  var texts = picks.map(function (p) { return p.text; }).filter(function (t) { return t !== ''; });
  return { response: texts.join(XAPI_SEP_LIST), readable: texts.join(', ') };
}

/* matching: pairs → [{source, target}] (strings or indexes). One pair per answers.source, in
   answers.source order; a source the learner left unmatched → 'S[.]'. */
function xapiMatchingResponse(item, qKey, pairs) {
  var m = xapiQMeta(item, qKey);
  var src = (m.answers && m.answers.source) || [], tgt = (m.answers && m.answers.target) || [];
  var bySource = {};
  (pairs || []).forEach(function (p) {
    var s = _xapiPick(p.source, src, item, qKey, 'answers.source');
    var t = _xapiPick(p.target, tgt, item, qKey, 'answers.target');
    /* direction guard: the call site handed us the pair target-first */
    if (s.idx === 1e9 && t.idx === 1e9) {
      var s2 = _xapiPick(p.target, src, item, qKey, 'answers.source'), t2 = _xapiPick(p.source, tgt, item, qKey, 'answers.target');
      if (s2.idx !== 1e9 && t2.idx !== 1e9) { console.warn('[xAPI] matching pair reversed — swapped', item, qKey); s = s2; t = t2; }
    }
    bySource[s.text] = t.text;
  });
  var out = [], readable = [];
  for (var i = 0; i < src.length; i++) {
    var s0 = String(src[i]), t0 = bySource[s0] == null ? '' : bySource[s0];
    out.push(s0 + XAPI_SEP_PAIR + t0); readable.push(s0 + ' → ' + (t0 || '—'));
  }
  /* pairs whose source is not in the metadata are appended, so nothing the learner did is lost */
  Object.keys(bySource).forEach(function (s) { if (src.indexOf(s) < 0 && s !== '') out.push(s + XAPI_SEP_PAIR + bySource[s]); });
  return { response: out.join(XAPI_SEP_LIST), readable: readable.join(' | ') };
}

/* performance: values → { <step name>: text } or [text, …] in steps order */
function xapiPerformanceResponse(item, qKey, values) {
  var m = xapiQMeta(item, qKey), steps = m.steps || [];
  if (!steps.length) console.warn('[xAPI] performance: no steps[] in metadata', item, qKey);
  var out = [], readable = [];
  steps.forEach(function (st, i) {
    var name = String(st.name == null ? i + 1 : st.name);
    var v = values == null ? '' : (Array.isArray(values) ? values[i] : (values[name] != null ? values[name] : values[i]));
    out.push(name + XAPI_SEP_PAIR + _xapiFree(v)); readable.push(name + ': ' + (_xapiFree(v) || '—'));
  });
  return { response: out.join(XAPI_SEP_LIST), readable: readable.join(' | ') };
}

function xapiFillInResponse(item, qKey, values) {
  var vs = (Array.isArray(values) ? values : [values]).map(_xapiFree);
  return { response: vs.join(XAPI_SEP_LIST), readable: vs.join(' | ') };
}
function xapiNumericResponse(item, qKey, value) {
  var n = Number(String(value == null ? '' : value).replace(',', '.'));
  var s = isNaN(n) ? _xapiFree(value) : String(n);
  return { response: s, readable: s };
}
function xapiTrueFalseResponse(item, qKey, value) {
  var s = (value === true || value === 'true') ? 'true' : 'false';
  return { response: s, readable: s };
}
function xapiSequencingResponse(item, qKey, ordered) {
  var m = xapiQMeta(item, qKey), pool = Array.isArray(m.answers) ? m.answers : [];
  var texts = (ordered || []).map(function (v) { return _xapiPick(v, pool, item, qKey, 'answers').text; });
  return { response: texts.join(XAPI_SEP_LIST), readable: texts.join(' > ') };
}
function xapiOtherResponse(item, qKey, text) {
  var s = _xapiFree(text);
  return { response: s, readable: s };
}
function _xapiNoShape(item, qKey, want) {
  console.warn('[xAPI] response: metadata type needs "' + want + '" but the call site passed none', item, qKey);
  return [];
}

/* Dispatcher. spec = string | { type?, choices | pairs | steps | values | value | order | text }.
   The METADATA type governs (Kata reads the metadata); spec.type is only a cross-check. */
function xapiResponse(item, qKey, spec) {
  var m = xapiQMeta(item, qKey), type = m.questionType;
  if (typeof spec === 'string' || spec == null) spec = { text: spec == null ? '' : spec };
  if (spec.type && type && spec.type !== type)
    console.warn('[xAPI] response: call site says "' + spec.type + '", metadata says "' + type + '"', item, qKey);
  if (!type) { type = spec.type || 'other'; console.warn('[xAPI] response: no questionType in metadata, using "' + type + '"', item, qKey); }
  try {
    switch (type) {
      case 'choice':      return xapiChoiceResponse(item, qKey, spec.choices != null ? spec.choices : [spec.text]);
      case 'matching':    return xapiMatchingResponse(item, qKey, spec.pairs || _xapiNoShape(item, qKey, 'pairs'));
      case 'performance': return xapiPerformanceResponse(item, qKey, spec.steps != null ? spec.steps : spec.values);
      case 'fill-in':     return xapiFillInResponse(item, qKey, spec.values != null ? spec.values : spec.text);
      case 'numeric':     return xapiNumericResponse(item, qKey, spec.value != null ? spec.value : spec.text);
      case 'true-false':  return xapiTrueFalseResponse(item, qKey, spec.value != null ? spec.value : spec.text);
      case 'sequencing':  return xapiSequencingResponse(item, qKey, spec.order || spec.choices);
      default:            return xapiOtherResponse(item, qKey, spec.text != null ? spec.text : JSON.stringify(spec));
    }
  } catch (e) {
    console.error('[xAPI] response formatting failed', item, qKey, e);
    return { response: _xapiFree(spec.text), readable: _xapiFree(spec.text) };
  }
}

/* ═══════════════════ The helpers every call site uses ═══════════════════ */

/* One graded answer.
     item      the item suffix, e.g. '03'
     qKey      the question key, e.g. 'q1'
     correct   whether the answer is right
     isLast    whether this is the closing answer on the question (right, or out of attempts).
               Only 'answered.last' enters the component score's denominator in the library.
     answer    spec object for xapiResponse ({choices} | {pairs} | {steps} | {text} …), or a plain
               string for a single-value type.
   Synchronous, never deferred: a deferred send would outlive applyExecutionState()'s sender stub.
   ⚠️ The write to XAPI_Q_RESULTS happens BEFORE and OUTSIDE the try/catch: a reporting failure
   cannot corrupt the score. */
function xapiAnswered(item, qKey, correct, isLast, answer) {
  XAPI_Q_RESULTS[item + '/' + qKey] = !!correct;
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try {
    var r = xapiResponse(item, qKey, answer);
    sendStatement720(isLast ? 'answered.last' : 'answered', 'question',
      { success: !!correct,
        score: { scaled: correct ? 1 : 0 },
        response: r.response,
        extensions: { student_answer: [r.readable] } },   /* fallback for library letters < k */
      xapiQ(item, qKey));
  } catch (e) { console.error('[xAPI] answered ' + item + '/' + qKey, e); }
}

/* An UNGRADED question (part 04's class-task fill-in, open text) sends NO 'answered': the spec's
   answered is an evaluable response carrying success/score (v2.7 p.24), and inventing a verdict is
   worse. Its item reports initialized/completed only and stays out of XAPI_EVAL_ITEMS. */

/* (item/qKey) keys whose 'requested.1' already went out in this page load — the in-memory fast
   path in front of the `hints` ledger. */
var XAPI_HINTS_SENT = {};

/* A hint request. ⚠️ Place only in the "the hint is opening now" branch — the hint overlays close
   three ways (button, backdrop, Escape) and all leave the hint button live, so a learner who opens
   a hint twice must not report twice. Deduped here, not at the call sites, once per question per
   attempt: the key also lives in the state document under `hints` through the same
   sendStatementOnce the 'completed' ledger uses, so a hint reported once stays reported across a
   reload. The memory latch is set only when sendStatementOnce reports the key SETTLED (false =
   suppressed during a restore — latching there would swallow the learner's first real hint).
   The -k library adds the mandatory context extension helpType: "hint" (v2.7 p.24). */
function xapiRequestedHint(item, qKey) {
  var _k = item + '/' + qKey;
  if (XAPI_HINTS_SENT[_k]) return;
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try {
    if (typeof sendStatementOnce === 'function') {
      if (sendStatementOnce('hints', _k, 'requested.1', 'question', null, xapiQ(item, qKey))) {
        XAPI_HINTS_SENT[_k] = true;
      }
      return;
    }
    sendStatement720('requested.1', 'question', null, xapiQ(item, qKey));
    XAPI_HINTS_SENT[_k] = true;
  } catch (e) { console.error('[xAPI] requested ' + _k, e); }
}

/* The component's 'completed'. Closes the open item first, then reports through the ledger.
   ⚠️ Call it on failure paths too: a component the learner did not pass must still be reported,
   or the whole attempt goes unrecorded — routing a failed learner is the platform's job, via the
   component's recommendedAfterFail. */
function xapiCompleteComponent(result) {
  try { xapiFinishItems(); } catch (e) {}
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', result || null);
  } catch (e) { console.error('[xAPI] completed component', e); }
}

/* Finishing the component from its last button: report, then STOP. Kata removes the component
   from the screen when 'completed' arrives (v2.7 p.23), so 'completed' must be the learner's LAST
   action in the component, after every feedback and summary screen. Outside Kata (QA on the CDN, a
   local run) nothing removes the component, and the disabled button is the only sign the click was
   recorded. Nothing else happens here: no navigation, no window.close, no postMessage, no alert
   (rule of 2026-10-14). The hop to the next part lives only under DEV_NAV in the part's own code.
   There is no unit-level 'completed': v2.5/v2.7 define the object as an item or a component only,
   and the platform derives the unit outcome itself. */
function xapiEndComponent(result, btn) {
  xapiCompleteComponent(result);
  if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
}

/* ── A finished component's button stays disabled (QA D-8) ──
   xapiEndComponent disables the button once; after a reload, or a step back and forward, the
   screen's own enter code shows / re-enables it again. The click then sends nothing (the ledger
   suppresses it) but the screen tells the learner the work was not recorded. The authority is the
   LEDGER, never the screen position: a learner who answered but never clicked keeps a live button.
   XAPI_END_BTN (per-part config) names the part's last button. Called at the end of every goTo and
   after the restore in applyExecutionState (30-nav.js); enter code that re-enables the button asks
   xapiComponentEnded() instead of writing `false`. */
function xapiComponentEnded() {
  try { return typeof alreadySent === 'function' && alreadySent('done', currentPartSlug()); }
  catch (e) { return false; }
}
function restoreEndedButton() {
  if (typeof XAPI_END_BTN === 'undefined' || !xapiComponentEnded()) return;
  var btn = document.getElementById(XAPI_END_BTN);
  if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
}

/* played/paused for HTML5 <video> — ONLY content video, by explicit opt-in.
   ── Why an allowlist and not every <video> ──
   The unit is full of <video> that is artwork, not media: every .companion sprite and the path
   cards are `autoplay loop muted` with no controls, and goTo() pauses every video when leaving a
   screen — so a looping sprite reported a 'paused' on every navigation (measured 2026-08-27: 17
   videos wired in part 01, one real player). Only elements carrying data-xapi-report are wired,
   and its value is the ITEM SUFFIX the video belongs to (e.g. data-xapi-report="01" on #s1-video).
   ── objectId: the item, not the question ──
   The library builds object.id from sttmContext.objectId, otherwise from questionId but only for
   answered/selected/requested, otherwise from window.METADATA.id. played/paused are in neither
   list, so without objectId the component id went out. objectId: xapiItemId(item) — the same
   helper that anchors item initialized/completed.
   ── State machine, not a latch ──
   One flag per player: `playing` == "a 'played' is open, not yet closed by a 'paused'". played is
   sent only when the flag is off, paused only when it is on. So the first 'played' of every viewing
   is sent (a pausedOnce latch swallowed it — MOE, 17.09.26), an orphan 'paused' is structurally
   impossible, and the pause that load()/a src swap fires is not the learner's. NEVER opt in a
   `loop` video: every iteration would report a 'played'. */
function xapiWireVideos() {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  document.querySelectorAll('video[data-xapi-report]').forEach(function (v) {
    if (v.__xapiWired) return; v.__xapiWired = true;
    var item = v.getAttribute('data-xapi-report');
    var ctx  = { objectId: xapiItemId(item) };
    var playing   = false;
    var reloading = false;
    function send(verb) {
      try { sendStatement720(verb, 'question', null, Object.assign({ time: v.currentTime }, ctx)); } catch (e) {}
    }
    v.addEventListener('emptied', function () { reloading = true; });
    v.addEventListener('play', function () {
      reloading = false;
      if (playing) return;
      playing = true;
      send('played');
    });
    v.addEventListener('pause', function () {
      if (!playing) return;
      playing = false;
      if (v.ended) return;                           // end of clip, not a learner pause
      if (reloading || v.readyState === 0) return;   // load()/src swap, not a learner pause
      send('paused');
    });
    v.addEventListener('ended', function () { playing = false; });
  });
}

/* TEMPORARY (Phase 2 → Phase 3 of the 2026-10-20 upgrade): the deferred fire-and-forget wrapper
   the parts still call for 'answered' / 'requested' / 'selected' until their call sites move to
   xapiAnswered / xapiRequestedHint / direct sendStatement720. ⚠️ Never for 'completed' — the
   deferral outlives applyExecutionState()'s sender stub. Deleted with the last caller. */
function xapiSend() {
  var args = arguments;
  setTimeout(function () {
    try { sendStatement720.apply(null, args); } catch (e) {}
  }, 0);
}
