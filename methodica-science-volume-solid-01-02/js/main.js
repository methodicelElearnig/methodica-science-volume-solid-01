'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 02 (standard practice)
   Storyboard section "תרגול סטנדרטי 1", slides 50–75 (component 2 of 7 since the 2026-10-14
   restructure; these screens were part 01's s30–s35). A rules screen and five questions with
   progress dots; the score decides the route: ≥4/5 → Part 04 (class task), else Part 03 (basic).
   The SCQ / DnD engines, progress dots and resume painters are part 01's, carried over verbatim.
   ═══════════════════════════════════════════════════════════ */

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 6;   // S0 practice rules (sb50) · S1–S5 questions 1–5 (sb51–75)
                           // Must equal the live `.screen` count — index_dev.html derives its jump range from that,
                           // while goTo() rejects n >= TOTAL_SCREENS. The two silently disagree if only one is edited.

window.lomdaState = window.lomdaState || {
  selectedCharacter: null
};

/* ═══════════════════════════════════════════════════════════
   Pointer-based drag-and-drop helper (engine — reused by future
   DnD/matching screens). Ghost clone follows the pointer, scaled
   to the #app transform so it matches the source visually.
   `opts.moveSource: true` switches to a second mode where the REAL
   source element is translated to follow the pointer instead of a
   ghost, and is left there on drop (no snap-back) — for a plain
   "leave it wherever you dragged it" object like the aquarium ruler.
   The accumulated offset is kept on the element's own dataset so a
   second drag continues from the current position, not from zero.
   ═══════════════════════════════════════════════════════════ */
/* Current #app scale factor. Pointer events report SCREEN pixels; everything
   inside #app is expressed in DESIGN pixels, so any pointer delta used for
   layout must be divided by this. Shared by createPointerDnd and the comic
   slider drag. */
function getAppScale() {
  const app = document.getElementById('app');
  const m = app && app.style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function createPointerDnd(opts) {
  const targets = new Map();
  let active = null;
  function attachSource(elem, dragId) {
    if (!elem || elem.dataset.pdragAttached === '1') {
      if (elem) elem.dataset.pdragId = dragId;
      return;
    }
    elem.dataset.pdragId = dragId;
    elem.dataset.pdragAttached = '1';
    elem.style.touchAction = 'none';
    elem.addEventListener('pointerdown', onSourceDown);
  }
  function attachTarget(elem, targetId) {
    if (!elem) return;
    targets.set(elem, targetId);
  }
  function onSourceDown(e) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const src    = e.currentTarget;
    const dragId = src.dataset.pdragId;
    if (!dragId) return;
    if (opts.canDrag && !opts.canDrag(dragId, src)) return;
    e.preventDefault();
    const scale = getAppScale();

    if (opts.moveSource) {
      /* No ghost: the real element is translated directly, so it's what's
         left behind on drop. pointer-events are dropped for the duration so
         findTargetUnder() (elementFromPoint) sees what's UNDER it, not itself —
         the ghost path gets this for free via ghost.pointerEvents:'none'. */
      const baseX = parseFloat(src.dataset.pdragOffX || '0');
      const baseY = parseFloat(src.dataset.pdragOffY || '0');
      src.style.pointerEvents = 'none';
      active = {
        dragId, srcElem: src, moveSource: true, scale,
        pointerId: e.pointerId,
        startClientX: e.clientX, startClientY: e.clientY,
        baseX, baseY,
        currentTarget: null,
      };
      src.classList.add('dragging');
      if (opts.onPick) opts.onPick(dragId, src);
      document.addEventListener('pointermove',   onMove,   { passive: false });
      document.addEventListener('pointerup',     onUp);
      document.addEventListener('pointercancel', onUp);
      return;
    }

    const rect  = src.getBoundingClientRect();
    const ghost = src.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    ghost.style.position       = 'fixed';
    ghost.style.left           = rect.left + 'px';
    ghost.style.top            = rect.top  + 'px';
    ghost.style.width          = (rect.width  / scale) + 'px';
    ghost.style.height         = (rect.height / scale) + 'px';
    ghost.style.boxSizing      = 'border-box';
    ghost.style.margin         = '0';
    ghost.style.pointerEvents  = 'none';
    ghost.style.zIndex         = '9999';
    ghost.style.opacity        = '0.92';
    ghost.style.transform      = `scale(${scale})`;
    ghost.style.transformOrigin = 'top left';
    ghost.classList.remove('dragging');
    ghost.classList.add('pointer-drag-ghost');
    document.body.appendChild(ghost);
    active = {
      dragId, srcElem: src, ghost,
      pointerId: e.pointerId,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      currentTarget: null,
    };
    src.classList.add('dragging');
    if (opts.onPick) opts.onPick(dragId, src);
    document.addEventListener('pointermove',   onMove,   { passive: false });
    document.addEventListener('pointerup',     onUp);
    document.addEventListener('pointercancel', onUp);
  }
  function findTargetUnder(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    for (const [tElem, tId] of targets) {
      if (tElem === el || tElem.contains(el)) return { elem: tElem, id: tId };
    }
    return null;
  }
  function onMove(e) {
    if (!active) return;
    if (active.pointerId !== undefined && e.pointerId !== active.pointerId) return;
    e.preventDefault();
    if (active.moveSource) {
      const dx = (e.clientX - active.startClientX) / active.scale;
      const dy = (e.clientY - active.startClientY) / active.scale;
      active.srcElem.style.transform = `translate(${(active.baseX + dx).toFixed(2)}px, ${(active.baseY + dy).toFixed(2)}px)`;
    } else {
      active.ghost.style.left = (e.clientX - active.offX) + 'px';
      active.ghost.style.top  = (e.clientY - active.offY) + 'px';
    }
    const hit = findTargetUnder(e.clientX, e.clientY);
    if (hit && hit.elem !== active.currentTarget) {
      if (active.currentTarget) active.currentTarget.classList.remove('drop-hover');
      hit.elem.classList.add('drop-hover');
      active.currentTarget = hit.elem;
    } else if (!hit && active.currentTarget) {
      active.currentTarget.classList.remove('drop-hover');
      active.currentTarget = null;
    }
  }
  function onUp(e) {
    if (!active) return;
    if (active.pointerId !== undefined && e.pointerId !== active.pointerId) return;
    const hit = findTargetUnder(e.clientX, e.clientY);
    if (active.moveSource) {
      const dx = (e.clientX - active.startClientX) / active.scale;
      const dy = (e.clientY - active.startClientY) / active.scale;
      active.srcElem.dataset.pdragOffX = String(active.baseX + dx);
      active.srcElem.dataset.pdragOffY = String(active.baseY + dy);
      active.srcElem.style.pointerEvents = '';
    } else {
      active.ghost.remove();
    }
    active.srcElem.classList.remove('dragging');
    if (active.currentTarget) active.currentTarget.classList.remove('drop-hover');
    const dragId = active.dragId;
    const activeRef = active;
    active = null;
    document.removeEventListener('pointermove',   onMove);
    document.removeEventListener('pointerup',     onUp);
    document.removeEventListener('pointercancel', onUp);
    if (hit) { if (opts.onDrop) opts.onDrop(dragId, hit.id, activeRef.srcElem); }
    else     { if (opts.onCancel) opts.onCancel(dragId, activeRef.srcElem); }
  }
  return { attachSource, attachTarget };
}
/* ═══════════════════════════════════════════════════════════
   COMPONENT — Companion character
   The learner picks a mascot on part-01 S0; localStorage is the only
   carrier across parts, so a missing value must never blank the mascot.
   Slots are per-screen records injected by renderCompanion() rather than
   authored markup: ~20 slots across six index.html files would have to be
   kept in sync with every position tweak, and injecting lets the pose
   resolver run at render time. The exception is a mascot who SPEAKS: there
   the sprite is authored in a .companion-say group next to its bubble (see
   CHARACTER_SLOTS below), so the pair cannot drift apart.
   Offsets are storyboard positions mapped onto this 1280x710 canvas
   (bottom = 710 - (y + h)), anchored to the nearer PHYSICAL edge so the
   mascot stays on its intended side when the canvas grows wider than 1280.
   Where the storyboard centred the mascot under a block of text, the unit
   centres that text vertically instead, so those slots are moved to the
   free edge rather than dropped on top of the copy.
   ═══════════════════════════════════════════════════════════ */
function getCharacter() {
  try { return localStorage.getItem('lomda_selectedCharacter') || 'orange'; }
  catch (e) { return 'orange'; }
}
/* Which pose files exist on disk, and in which format. A manifest, not an
   <img onerror> fallback: onerror would fire a real 404 on nearly every
   screen and this unit's QA gate checks the network log for zero 404s.
   Landing a produced GIF is one line here plus the file. */
const CHARACTER_ASSETS = {
  selection: 'png',
  /* 2026-10-12: the practice-rules screen (S0) — hand on the headband (orange_headband / blue_headband). */
  headband: 'mp4'
};
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  /* ?v= is a CACHE-BUSTER, not decoration: the sprite files were re-encoded in place
     (their near-white matte lifted to pure #FFFFFF) under their existing names, so a
     browser holding the old copy would keep showing the grey box on the white canvas.
     Bump it whenever a character asset is re-exported. Over file:// the query is ignored
     rather than breaking the load, so it is safe there too.
     ?v=3 on 2026-08-27: `stretch` changed extension, .png -> .mp4, and `towel` was retired onto it.
     The extension change alone would defeat a stale cache, but s27's slot and s6's markup both
     resolve through here and the tag differs now, so the bump keeps the pair unambiguous.
     ?v=4 on 2026-08-29: `ask` was cropped to its content (960 -> 514).
     ⚠️ THIS is the token that matters, not the ones in index.html: renderCompanion() rewrites an
     authored sprite's src through characterAsset() on every entry, so the markup's ?v= is only
     ever seen on the first paint. Bump BOTH, but if only one, bump this one. */
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png') + '?v=4';
}
/* Restarts a freshly-sourced <video> companion; no-op for <img> ones. */
function startCompanionMedia(el) {
  if (el.tagName !== 'VIDEO') return;
  el.load();
  const p = el.play();
  if (p && p.catch) p.catch(function () {});
}
/* Empty: the one mascot here (S0, the rules screen) is AUTHORED in the markup inside a
   .companion-say group; renderCompanion() adopts it and refreshes only which character it shows.
   The injection path stays live for any screen that later wants a free-standing sprite. */
const CHARACTER_SLOTS = {};
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  const slot = CHARACTER_SLOTS['s' + n];
  /* NOT `:scope > .companion`: a sprite authored inside a .companion-say group is nested,
     and missing it would leave the orange src baked into the markup in front of a learner
     who chose turquoise. */
  let el = screen.querySelector('.companion');
  /* An AUTHORED sprite (data-pose in the markup, no slot) must survive this function —
     only which character it shows is refreshed. An INJECTED one is still cleaned up when
     its slot goes away. */
  if (!slot) {
    if (el && el.dataset.injected === '1') { el.remove(); el = null; }
    else if (el) { el.src = characterAsset(el.dataset.pose || 'selection'); startCompanionMedia(el); }
    screen.classList.toggle('has-companion', !!el);
    return;
  }
  const host = slot.into ? (document.getElementById(slot.into) || screen) : screen;
  const tag = CHARACTER_ASSETS[slot.pose] === 'mp4' ? 'video' : 'img';
  if (el && el.dataset.injected === '1' && el.tagName.toLowerCase() !== tag) { el.remove(); el = null; }
  if (!el) {
    el = document.createElement(tag);
    el.className = 'companion';
    el.alt = '';                                   // decorative, carries no information
    el.setAttribute('aria-hidden', 'true');
    el.draggable = false;
    el.dataset.injected = '1';
    if (tag === 'video') { el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true; }
  }
  /* `into` hands the sprite to a container in the markup instead of floating it over the screen,
     so it can be laid out WITH the copy rather than positioned against it (same seam as parts
     05/06). Falls back to the screen if the id is missing, so a typo degrades to the old
     behaviour instead of dropping the mascot. */
  if (el.parentElement !== host) host.appendChild(el);
  // Lets a template reserve room for the sprite instead of being drawn over —
  // the storyboard's narration column is narrower on exactly these screens.
  screen.classList.add('has-companion');
  el.src = characterAsset(slot.pose);
  startCompanionMedia(el);
  el.style.setProperty('--cw', slot.w + 'px');
  /* Square is the CSS default; a 16:9 pose declares its own so the box is right from
     first paint instead of after the mp4 header lands. (Every pose in this component
     is square today — the line is here so a wide one can be slotted without surprise.) */
  el.style.setProperty('--ca', slot.ca || '');
  el.classList.toggle('companion--center', slot.center === true);
  /* A grouped sprite is positioned BY the group, so writing slot offsets onto it would be
     a second, conflicting source of truth. (Reachable only if a screen ever has both.) */
  if (!slot.into && !el.closest('.companion-say')) {
    ['left', 'right', 'top', 'bottom'].forEach(function (k) {
      el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
    });
  }
}
function resetScreenState(n) {
  renderCompanion(n);
  if (n === 1) { practiceEnter(0, 's1'); }
  if (n === 2) { practiceEnter(1, 's2'); }
  if (n === 3) { practiceEnter(2, 's3'); }
  if (n === 4) { practiceEnterDnD(3, 's4'); }   // Q4 — matching (DnD)
  if (n === 5) { practiceEnter(4, 's5'); }
}

/* ─── Keyboard Navigation ────────────────────────────────── */
document.addEventListener('keydown', e => {
  /* Escape closes any open hint overlay as well as the zoom, matching the other parts. The
     close must happen BEFORE the return, or the overlays would never see the key. */
  if (e.key === 'Escape') {
    document.querySelectorAll('[id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
    closeImageZoom();
    return;
  }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (e.key === 'ArrowLeft') advanceScreen(); else goBack();
});

/* Linear: S0 rules → Q1 … Q5. The questions advance through their own check buttons
   (registerPractice / registerPracticeDnD → onContinue); Q5's continue leaves the part. */
function goBack() {
  if (currentScreen === 0) return;   // the first screen leaves the part through #back-to-prev-part, not the arrow key
  goTo(currentScreen - 1);
}
function advanceScreen() {
  if (currentScreen === 0) { goTo(1); return; }
  if (practiceProgress.questions.some(q => q.screen === currentScreen)) return;   // questions advance via their own check button
  goTo(currentScreen + 1);
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestion (generic, reusable)
   One controller, many instances keyed by screen id. Single
   selection, N attempts, hint overlay, correct/incorrect feedback
   popup (draggable, resets to default on open). HTML contract per
   screen S:
     options       #S .scq-opt[data-id]  (button, span.scq-opt-text + span.scq-radio)
     check button  #S-scq-check          hint button  #S-scq-hint
     popup         #S-scq-popup (id ends -popup) + -title / -body
     hint overlay  #S-scq-hint-overlay (id ends -hint-overlay)
     lock note     #S-scq-locknote (optional; shown while options are locked)
   Register with scqRegister({screen, correctId, popups, hint, questionId,
     startLocked?, onFinish?, onContinue?}). goTo() auto-closes popups/overlays.
   ═══════════════════════════════════════════════════════════ */
const SCQ_REG = {};
/* `phase` records WHAT THE LEARNER WAS LAST SHOWN — one of the three keys in cfg.popups, or null
   for a screen that has never been checked (or whose marks were cleared by a re-pick). It is the
   single source for both halves of the answered look: which options carry which mark, and which
   feedback popup is open. Deriving either from `attempts` instead is what produced the defect where
   a re-picked, never-checked option came back marked wrong. */
function scqRegister(cfg) {
  cfg.maxAttempts = cfg.maxAttempts || 2;
  SCQ_REG[cfg.screen] = { cfg: cfg, sel: null, attempts: 0, answered: false, done: false,
                          phase: null, locked: !!cfg.startLocked, lastWrong: null };
}
function scqOpts(screen) { return document.querySelectorAll('#' + screen + ' .scq-opt'); }
function scqSetLocked(screen, locked) {
  const s = SCQ_REG[screen]; if (!s) return;
  s.locked = locked;
  scqOpts(screen).forEach(o => { if (!s.answered) o.disabled = locked; });
  const note = document.getElementById(screen + '-scq-locknote');
  if (note) note.classList.toggle('hidden', !locked);
}
function scqSelect(screen, id) {
  const s = SCQ_REG[screen]; if (!s || s.answered || s.locked) return;
  /* Retry gate (720-templates "Retry gate", QA 2026-10-11): after a non-final wrong check the option
     just judged wrong cannot be submitted again. Clicking it again changes nothing — marks, popup and
     the locked button stay — and צדקתי? opens only for a different option. */
  if (s.phase === 'retry' && id === s.sel) return;
  s.sel = id;
  /* A re-pick after a wrong attempt wipes the marks and the popup, so the screen is back to
     "chosen but unchecked" — and `phase` has to say so, or the painter would repaint the retry
     verdict over an answer the learner never submitted. `attempts` deliberately stays put: it is
     the attempt LEDGER, not the display state. */
  if (s.attempts > 0) { s.phase = null; scqClosePopup(screen); scqOpts(screen).forEach(o => o.classList.remove('wrong', 'correct')); }
  scqOpts(screen).forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) chk.disabled = (id === s.lastWrong);
}
/* The element whose text IS the answer. An image-hotspot option is two controls sharing a data-id —
   a ring over the photo (aria-hidden, no text) and the readable bubble, the real role="radio" — and
   the ring comes first in the DOM, so a plain querySelector reported "" for every s3 answer
   (2026-10-11). Prefer the role="radio" control; a one-element option is found either way. */
function scqAnswerEl(screen, id) {
  return document.querySelector('#' + screen + ' .scq-opt[data-id="' + id + '"][role="radio"]') ||
         document.querySelector('#' + screen + ' .scq-opt[data-id="' + id + '"]');
}
function scqCheck(screen) {
  const s = SCQ_REG[screen], cfg = s.cfg;
  if (s.answered) { if (cfg.onContinue) cfg.onContinue(); else advanceScreen(); return; }
  if (!s.sel || s.sel === s.lastWrong) return;   // the retry gate, also against a programmatic or keyboard submit
  s.attempts++;
  const correct = s.sel === cfg.correctId;
  /* xAPI: resolved at send time — xapiQ() reads window.METADATA, which the library fetches
     asynchronously while these registrations run during parse. parentId is the containing item
     (v2.4 §2, mandatory); `response` is the option's visible text and was missing entirely. */
  const q = xapiQ(cfg.item, cfg.qKey || 'q1');
  xapiSend(correct || s.attempts >= cfg.maxAttempts ? 'answered.last' : 'answered', 'question',
    { response: xapiAnswerText(scqAnswerEl(screen, s.sel)),
      success: !!correct,
      score: { scaled: correct ? 1 : 0 } },
    { questionId: q.questionId, parentId: q.parentId });
  if (correct || s.attempts >= cfg.maxAttempts) {
    XAPI_Q_RESULTS[cfg.item + '/' + (cfg.qKey || 'q1')] = !!correct;
  }
  if (correct) { s.phase = 'correct'; scqMark(screen, cfg.correctId, 'correct'); scqShowPopup(screen, 'correct'); scqFinish(screen, true); }
  else if (s.attempts >= cfg.maxAttempts) {
    s.phase = 'wrong2';
    scqMark(screen, cfg.correctId, 'correct'); scqMark(screen, s.sel, 'wrong');
    scqShowPopup(screen, 'wrong2'); scqFinish(screen, false);
  } else { s.phase = 'retry'; s.lastWrong = s.sel; const gate = document.getElementById(screen + '-scq-check'); if (gate) gate.disabled = true; scqMark(screen, s.sel, 'wrong'); scqShowPopup(screen, 'retry'); scqSyncHint(screen); }

  /* Synchronous, at the tail so it runs after every branch and after all painting. An answer given
     and then abandoned without navigating would otherwise rest entirely on the page-leave handlers,
     which Chrome may drop. The three branches above return nothing, so no commitment escapes it. */
  try { flushResumeSave(); } catch (e) {}
}
function scqMark(screen, id, cls) {
  // querySelectorAll, not querySelector: an image-hotspot option is two elements
  // sharing one data-id (the readable bubble + the ring over the photo) and both
  // must take the correct/wrong state. Single-element options are unaffected.
  document.querySelectorAll('#' + screen + ' .scq-opt[data-id="' + id + '"]')
    .forEach(o => { o.classList.remove('selected'); o.classList.add(cls); });
}
function scqFinish(screen, isCorrect) {
  const s = SCQ_REG[screen];
  s.answered = true; s.done = true;
  scqOpts(screen).forEach(o => { o.disabled = true; });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; }
  scqSyncHint(screen);
  if (s.cfg.onFinish) s.cfg.onFinish(isCorrect);
}
function scqShowPopup(screen, type) {
  const popup = document.getElementById(screen + '-scq-popup'); if (!popup) return;
  const cfg = SCQ_REG[screen].cfg.popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';  // reset to default on every open
  document.getElementById(screen + '-scq-popup-title').innerHTML = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}
function scqClosePopup(screen) { document.getElementById(screen + '-scq-popup')?.classList.add('hidden'); }
function scqHint(screen) {
  const s = SCQ_REG[screen]; if (!s || s.answered || (s.cfg.hintAfterWrong && s.attempts < 1)) return;
  xapiSend('requested.1', 'question', null, { questionId: xapiQ(s.cfg.item, s.cfg.qKey || 'q1').questionId });
  document.getElementById(screen + '-scq-hint-overlay')?.classList.remove('hidden');
}
function scqCloseHint(screen) { document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden'); }
/* Hint availability, in one place (720-templates "Hint policy": hidden, not disabled, while
   unavailable). Hidden once the question resolves; on a `hintAfterWrong` question also until the
   first wrong check — the practice SCQs s1, s2, s3 and s5, whose hint slides (53/58/63/73) all say
   "רמז זמין אחרי מענה שגוי 1" (2026-10-11). Reads `attempts`, which resume already carries. */
function scqSyncHint(screen) {
  const s = SCQ_REG[screen]; const hint = document.getElementById(screen + '-scq-hint');
  if (!s || !hint) return;
  hint.style.visibility = (s.answered || (s.cfg.hintAfterWrong && s.attempts < 1)) ? 'hidden' : '';
}
function scqEnter(screen) {
  const s = SCQ_REG[screen]; if (!s) return;
  document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden');
  scqClosePopup(screen);
  if (s.done) {
    scqOpts(screen).forEach(o => { o.disabled = true; });   // marks already painted persist
    const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; }
    scqSyncHint(screen);
  } else {
    scqReset(screen);
  }
}
function scqReset(screen) {
  const s = SCQ_REG[screen];
  s.sel = null; s.attempts = 0; s.answered = false; s.phase = null; s.lastWrong = null;
  scqOpts(screen).forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.setAttribute('aria-checked', 'false');
    o.disabled = !!s.locked;
  });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'צדקתי?'; chk.disabled = true; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.disabled = false;
  scqSyncHint(screen);
}
/* Shared draggable feedback popup — resets to default position on each open
   (handled in scqShowPopup). Drag is app-scale aware. Attached once per popup. */
/* ═══ Feedback copy — the storyboard's, per docs-and-tools/TEXT-FIDELITY.md §Agreed policy ═══
   The deck gives each question its own retry / correct / wrong-final slides, and the correct
   and wrong-final slides carry the SAME explanation — so it is written once per question and
   fbPopups() hands it to both. Same shape as part 04, which was ported first.
   Departures, all under §Deck defects:
     - the wrong-final line "התשובה הנכונה מסומנת." is uniform. Slides 23 and 55 omit it where
       their siblings carry it, and the unit marks the correct option on every wrong-final.
     - slide 60 writes "מוצגת" where 65 and 75 write "מסומנת" for the same marked-option screen.
     - slides 74/75 explain the answer in terms of "נפח הספינה" — a ship, left over from an
       earlier revision; the question asks about a crystal, so the subject follows the question.
     - deck expressions are wrapped in .section-result-expr: digits and operators are
       bidi-neutral and reorder inside an RTL paragraph without it. */
const FB_RETRY  = { title: 'התשובה אינה נכונה.', body: ['שננסה שוב?'] };
const FB_WRONG2 = 'התשובה אינה נכונה.<br />התשובה הנכונה מסומנת.';
/* `wrong2Extra`: a line the deck adds to the wrong-final popup only. Slide 55 (s1) closes with the
   encouragement "לא נורא אם טעית…", which its note gives to the mascot's GIF and bubble; that pose
   (`encourage`) was never produced, so the line sits in the popup until it is (ASSETS-TODO.md). */
const fbPopups = (correctTitle, explanation, wrong2Extra) => ({
  retry:   FB_RETRY,
  correct: { title: correctTitle, body: explanation },
  wrong2:  { title: FB_WRONG2,    body: wrong2Extra ? explanation.concat(wrong2Extra) : explanation }
});
/* ═══════════════════════════════════════════════════════════
   COMPONENT — Standard-practice progress dots + score branch
   Shared across the practice question screens (S1–S5). One state
   object + one generic renderer.
   ═══════════════════════════════════════════════════════════ */
const PART_03_SLUG = 'methodica-science-volume-solid-01-03';   // basic practice (remediation)
const PART_04_SLUG = 'methodica-science-volume-solid-01-04';   // class task
const PART_03_URL = '../' + PART_03_SLUG + '/index.html';
const PART_04_URL = '../' + PART_04_SLUG + '/index.html';
// Standard practice = 5 questions (metadata items 01–05), Q1–Q5 on S1–S5.
var practiceProgress = {
  questions: [
    { number: 1, visited: true,  state: 'current',      screen: 1 },  // item 01 — SCQ
    { number: 2, visited: false, state: 'not-answered', screen: 2 },  // item 02 — SCQ
    { number: 3, visited: false, state: 'not-answered', screen: 3 },  // item 03 — SCQ
    { number: 4, visited: false, state: 'not-answered', screen: 4 },  // item 04 — DnD matching
    { number: 5, visited: false, state: 'not-answered', screen: 5 }   // item 05 — SCQ
  ]
};
function practiceScore() {
  return practiceProgress.questions.filter(q => q.state === 'correct').length;
}
function goToNextPart() {
  /* Closes the practice item the learner is standing on (item 05, or 04 if they came via S4) before
     the component is reported, so the two arrive in order. */
  try { xapiFinishItems(); } catch (e) {}

  const passed = practiceScore() >= 4;

  /* xAPI: the component 'completed', with an explicit result — the library's aggregate is an
     all-correct AND, which would report failure for any partial pass.

     DENOMINATOR 5: the five questions the progress dots count, and the routing threshold is stated
     to the learner as 4 מתוך 5.

     SUCCESS IS THE REAL THRESHOLD HERE, unlike parts 01, 03 and 05, which have no gate and always
     advance. This part has one: ≥4/5 routes past remediation. It is a gate that exists in the
     content, so it is reported rather than invented, and the metadata backs it up —
     recommendedAfterFail names Part 03. (Until the 2026-10-14 split this gate ended part 01.) */
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson',
      { success: passed, score: { scaled: practiceScore() / 5 } });
  } catch (e) { console.error('[xAPI] completed component 02', e); }

  // ≥80% correct (4/5) → skip remediation, on to the class task (Part 04); else Part 03 (basic practice).
  /* Resume: point the document at the branch actually taken, and record the back-edge so that
     component's first screen knows where "חזרה" leads. Part 04 is reachable from BOTH 02 and 03, and
     resolves correctly because whichever router navigated is the one that wrote the edge. */
  if (RESUME_ENABLED) writeForwardState(passed ? PART_04_SLUG : PART_03_SLUG);
  window.location.href = (passed ? PART_04_URL : PART_03_URL) + window.location.search;
}
function updateProgressQuestion(container, state) {
  if (!container) return;
  const qs = state.questions;
  qs.forEach((q, i) => {
    const n = i + 1;
    const item = container.querySelector('[data-question="' + n + '"]');
    if (!item) return;
    const icon = item.querySelector('.progress-question__icon');
    const label = item.querySelector('.progress-question__label');
    icon.classList.remove('progress-question__icon--current', 'progress-question__icon--correct', 'progress-question__icon--incorrect');
    if (q.state !== 'not-answered') icon.classList.add('progress-question__icon--' + q.state);
    label.classList.toggle('progress-question__label--visited', q.visited);
    const navigable = q.visited && q.screen != null && q.screen !== currentScreen;
    item.style.cursor = navigable ? 'pointer' : '';
    item.onclick = navigable ? (function (s) { return function () { goTo(s); }; })(q.screen) : null;
  });
  for (let n = 1; n < qs.length; n++) {
    const conn = container.querySelector('[data-connector="' + n + '"]');
    if (!conn) continue;
    const st = qs[n - 1].state;
    conn.classList.toggle('progress-question__connector--visited', st === 'correct' || st === 'incorrect');
  }
}
function syncPracticeNav(screen) {
  updateProgressQuestion(document.querySelector('#' + screen + ' .progress-question'), practiceProgress);
}

function practiceEnter(idx, screen) {
  const q = practiceProgress.questions[idx];
  q.visited = true;
  if (q.state === 'not-answered') q.state = 'current';
  syncPracticeNav(screen);
  scqEnter(screen);
}
/* Register one standard-practice SingleChoiceQuestion (idx = 0-based position). */
function registerPractice(idx, cfg) {
  cfg.screen = 's' + practiceProgress.questions[idx].screen;
  /* Slides 53/58/63/73: "רמז זמין אחרי מענה שגוי 1" — all four practice SCQs. */
  cfg.hintAfterWrong = true;
  cfg.onFinish = function (isCorrect) {
    const q = practiceProgress.questions[idx];
    q.state = isCorrect ? 'correct' : 'incorrect';
    q.visited = true;
    syncPracticeNav(cfg.screen);
  };
  cfg.onContinue = function () {
    const next = idx + 1;
    if (next < practiceProgress.questions.length) {
      practiceProgress.questions[next].visited = true;
      goTo(practiceProgress.questions[next].screen);
    } else {
      goToNextPart();
    }
  };
  scqRegister(cfg);
  attachPopupDrag(document.getElementById(cfg.screen + '-scq-popup'));
}

registerPractice(0, {
  correctId: 'c',
  item: '01',
  popups: fbPopups('נכון מאוד!', [   /* sb52/54/55 */
    'נפח הגוף שווה לכמות המים שדחק — כלומר ההפרש בין הנפח הסופי לנפח ההתחלתי.',
    '<span class="section-result-expr">73 − 50 = 23</span>',
    'נפח האבן = 23\u00A0סמ"ק'],
    ['לא נורא אם טעית, כל טעות היא צעד קדימה בדרך\u00A0הנכונה!']   /* sb55, not bold on the slide */)
});
registerPractice(1, {
  correctId: 'a',
  item: '02',
  popups: fbPopups('תשובה נכונה!', [   /* sb57/59/60 */
    'נפח המים שישפכו מהכלי שווה בדיוק לנפח הכדור, כך ניתן למדוד נפח של גוף שלא נכנס במשורה — זוהי שיטת\u00A0ההצפה.'])
});
registerPractice(2, {
  correctId: 'd',
  item: '03',
  popups: fbPopups('תשובה נכונה!', [   /* sb62/64/65 */
    'הילד מימין השתמש בנתון מדעי שנמדד בפועל על ידי שיטת דחיקת המים.',
    'שאר הילדים הסתמכו על השערות או על מדידות שאינן מתאימות למדידת נפח של גוף בעל צורה שאינה הנדסית.'])
});
registerPractice(4, {
  correctId: 'd',
  item: '05',
  popups: fbPopups('תשובה נכונה!', [   /* sb72/74/75 */
    'בשיטת ההצפה נפח המים שנשפכו מהכלי שווה לנפח הגוף שהוכנס אליו. לכן, אם מודדים את נפח המים שנאספו במשורה, אפשר לדעת מה נפח הקריסטל.'])
});
/* ═══════════════════════════════════════════════════════════
   TEMPLATE — DragAndDropQuestion (generic matching, reusable)
   Config-driven: renders its own source pills + labeled target
   slots. Drag a pill into a target (scale-safe via createPointerDnd);
   drop onto an occupied target bumps the previous pill back to source;
   dropping outside returns to source. Check → strict 1-to-1 compare;
   on error the correct layout is revealed. One shared popup per screen.
   Register: ddqRegister({screen, items:[{id,label}], targets:[{id,label}],
     correctMap:{targetId:itemId}, popups:{correct,incorrect}, questionId,
     onFinish?, onContinue?}). HTML per screen S: #S-ddq-targets, #S-ddq-source,
     #S-ddq-check, #S-ddq-popup (+ -title/-body).
   ═══════════════════════════════════════════════════════════ */
const DDQ_REG = {};
/* Two attempts (opt-in, `maxAttempts: 2` — s4 here, per storyboard slides 66-70; part 01's s28 keeps one, per
   42-45). A wrong non-final check is not a resolution: the board stays live, every slot still holding
   the item it was judged with shows that verdict, and `lastWrong` (the judged board) both drives those
   marks and gates בדיקה until the board differs from it (720-templates: "Retry gate", "Per-answer
   verdict after a non-final wrong attempt"). `phase` is only which popup is open — 'retry' until the
   first change after the check, as SCQ's re-pick clears it. `hintAfterWrong` hides the hint until
   that first wrong check (slide 68). */
function ddqRegister(cfg) {
  cfg.placement = {};
  cfg.items.forEach(it => { cfg.placement[it.id] = 'source'; });
  cfg.maxAttempts = cfg.maxAttempts || 1;
  DDQ_REG[cfg.screen] = { cfg: cfg, checked: false, done: false, dnd: null,
                          attempts: 0, phase: null, lastWrong: null };
}
function ddqInit(screen) {
  const s = DDQ_REG[screen];
  if (s.dnd) return;
  s.dnd = createPointerDnd({
    canDrag: function () { return !s.checked; },
    onDrop:  function (itemId, targetId) { ddqPlace(screen, itemId, targetId); },
    onCancel: function (itemId) { ddqPlace(screen, itemId, 'source'); },
  });
}
function ddqPlace(screen, itemId, dest) {
  const s = DDQ_REG[screen]; if (s.checked) return;
  const p = s.cfg.placement;
  if (dest !== 'source') {
    Object.keys(p).forEach(k => { if (k !== itemId && p[k] === dest) p[k] = 'source'; });
  }
  p[itemId] = dest;
  if (s.phase === 'retry') { s.phase = null; ddqClosePopup(screen); }
  ddqRender(screen);
}
function ddqMakePill(screen, itemId) {
  const s = DDQ_REG[screen];
  const it = s.cfg.items.find(i => i.id === itemId);
  const pill = document.createElement(s.checked ? 'div' : 'button');
  if (!s.checked) pill.type = 'button';
  pill.className = 'dnd-pill';
  pill.dataset.item = itemId;
  // An item may carry storyboard art: {img, alt, w?}. The photo stacks above the
  // label and travels with the pill into the drop target, so the learner keeps
  // seeing what they placed. Text-only items are unaffected.
  if (it.img) {
    pill.classList.add('dnd-pill--img');
    const im = document.createElement('img');
    im.className = 'dnd-pill-img';
    im.src = it.img;
    im.alt = '';                       // the label right below carries the meaning
    if (it.w) im.style.setProperty('--pw', it.w + 'px');
    const cap = document.createElement('span');
    cap.textContent = it.label;
    pill.appendChild(im); pill.appendChild(cap);
  } else {
    pill.textContent = it.label;
  }
  if (!s.checked) s.dnd.attachSource(pill, itemId);
  return pill;
}
function ddqRender(screen) {
  const s = DDQ_REG[screen], cfg = s.cfg;
  ddqInit(screen);
  const tc = document.getElementById(screen + '-ddq-targets');
  const sc = document.getElementById(screen + '-ddq-source');
  if (!tc || !sc) return;
  tc.innerHTML = '';
  cfg.targets.forEach(t => {
    const wrap = document.createElement('div'); wrap.className = 'dnd-target';
    const lab = document.createElement('div'); lab.className = 'dnd-target-label'; lab.textContent = t.label;
    const slot = document.createElement('div'); slot.className = 'dnd-slot'; slot.dataset.target = t.id;
    const placed = Object.keys(cfg.placement).find(k => cfg.placement[k] === t.id);
    if (placed) { slot.appendChild(ddqMakePill(screen, placed)); slot.classList.add('occupied'); }
    if (s.checked) slot.classList.add(cfg.placement[cfg.correctMap[t.id]] === t.id ? 'correct' : 'wrong');
    /* After a non-final wrong check: a slot keeps its verdict only while it still holds the item it
       was judged with, so the board shows what is left to fix, not the judged board. */
    else if (s.lastWrong && placed && s.lastWrong[placed] === t.id) slot.classList.add(cfg.correctMap[t.id] === placed ? 'correct' : 'wrong');
    wrap.appendChild(lab); wrap.appendChild(slot);
    tc.appendChild(wrap);
    s.dnd.attachTarget(slot, t.id);
  });
  sc.innerHTML = '';
  cfg.items.forEach(it => { if (cfg.placement[it.id] === 'source') sc.appendChild(ddqMakePill(screen, it.id)); });
  ddqUpdateCheck(screen);
}
function ddqUpdateCheck(screen) {
  const s = DDQ_REG[screen]; if (s.checked) return;
  const allFilled = s.cfg.targets.every(t => Object.keys(s.cfg.placement).some(k => s.cfg.placement[k] === t.id));
  const same = !!s.lastWrong && s.cfg.items.every(it => s.cfg.placement[it.id] === s.lastWrong[it.id]);
  const btn = document.getElementById(screen + '-ddq-check'); if (btn) btn.disabled = !allFilled || same;
}
/* The hint is hidden, not disabled, while unavailable (720-templates "Hint policy"): after the
   question resolves, and — on a `hintAfterWrong` board — before the first wrong check. */
function ddqSyncHint(screen) {
  const s = DDQ_REG[screen];
  const hint = document.getElementById(screen + '-ddq-hint'); if (!s || !hint) return;
  hint.style.visibility = (s.done || (s.cfg.hintAfterWrong && s.attempts < 1)) ? 'hidden' : '';
}
function ddqCheck(screen) {
  const s = DDQ_REG[screen], cfg = s.cfg;
  if (s.checked) { if (cfg.onContinue) cfg.onContinue(); else advanceScreen(); return; }
  const allCorrect = cfg.targets.every(t => cfg.placement[cfg.correctMap[t.id]] === t.id);
  s.attempts++;
  const final = allCorrect || s.attempts >= cfg.maxAttempts;
  /* One matching board = one question, closed by a single 'answered.last'. A wrong non-final check
     is an interim 'answered', the same split as scqCheck. `response` lists the learner's pairings in
     a readable form, since there is no single option element to read. */
  const q = xapiQ(cfg.item, cfg.qKey || 'q1');
  xapiSend(final ? 'answered.last' : 'answered', 'question',
    { response: Object.keys(cfg.placement).map(function (id) { return id + '->' + cfg.placement[id]; }).join(', '),
      success: !!allCorrect,
      score: { scaled: allCorrect ? 1 : 0 } },
    { questionId: q.questionId, parentId: q.parentId });
  if (!final) {
    /* Retry: nothing is resolved — no result, no onFinish, the board stays draggable. */
    s.phase = 'retry';
    s.lastWrong = Object.assign({}, cfg.placement);
    ddqRender(screen);                              // marks + the gate (בדיקה disabled: same board)
    ddqShowPopup(screen, 'retry');
    ddqSyncHint(screen);
    try { flushResumeSave(); } catch (e) {}
    return;
  }
  XAPI_Q_RESULTS[cfg.item + '/' + (cfg.qKey || 'q1')] = !!allCorrect;
  s.checked = true; s.done = true; s.phase = null; s.lastWrong = null;
  /* The learner's own placement used to be overwritten here and lost. QA 2026-08-25 (slide 29)
     asks for a toggle between "התשובה שלי" and "תשובה נכונה" inside the wrong-answer feedback,
     so both boards have to survive. ddqRender() already marks each slot correct/wrong against
     correctMap, so switching cfg.placement between the two is the whole mechanism: the model
     answer shows every slot green, the learner's shows which of theirs actually landed. */
  if (!allCorrect) {
    s.learnerPlacement = Object.assign({}, cfg.placement);
    const model = {};
    cfg.items.forEach(it => { model[it.id] = 'source'; });
    Object.keys(cfg.correctMap).forEach(tId => { model[cfg.correctMap[tId]] = tId; });
    s.correctPlacement = model;
    s.answerView = 'correct';
    cfg.placement = Object.assign({}, model);
  }
  ddqRender(screen);
  ddqShowPopup(screen, allCorrect ? 'correct' : 'incorrect');
  const btn = document.getElementById(screen + '-ddq-check'); if (btn) { btn.textContent = 'שנמשיך?'; btn.disabled = false; }
  ddqSyncHint(screen);
  if (cfg.onFinish) cfg.onFinish(allCorrect);

  /* Synchronous, at the tail and after all painting — same rule as scqCheck's. */
  try { flushResumeSave(); } catch (e) {}
}
/* Hint for a matching question. The scq* hint machinery is keyed on SCQ_REG,
   which the DnD screens do not use, so they get their own thin pair. Overlay
   ids end in -hint-overlay, so goTo() closes them on navigation. */
function ddqHint(screen) {
  const s = DDQ_REG[screen]; if (!s || s.checked || (s.cfg.hintAfterWrong && s.attempts < 1)) return;
  xapiSend('requested.1', 'question', null, { questionId: xapiQ(s.cfg.item, s.cfg.qKey || 'q1').questionId });
  document.getElementById(screen + '-ddq-hint-overlay')?.classList.remove('hidden');
}
function ddqCloseHint(screen) { document.getElementById(screen + '-ddq-hint-overlay')?.classList.add('hidden'); }
function ddqShowPopup(screen, type) {
  const popup = document.getElementById(screen + '-ddq-popup'); if (!popup) return;
  const cfg = DDQ_REG[screen].cfg.popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  /* The retry title follows the same partly-right rule as the final one, judged on the board just
     checked; slide 67's second line is the body, as FB_RETRY has it on the SCQ screens. */
  if (type === 'retry') document.getElementById(screen + '-ddq-popup-title').textContent = ddqIsPartial(screen, DDQ_REG[screen].lastWrong) ? DDQ_PARTIAL_TITLE : cfg.title;
  else document.getElementById(screen + '-ddq-popup-title').textContent = cfg.title;
  const body = document.getElementById(screen + '-ddq-popup-body');
  body.innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  /* Only a wrong answer has two boards to switch between. Same button shape as the hint
     overlay's, which is what the note asks for. */
  const st = DDQ_REG[screen];
  if (type === 'incorrect' && st.learnerPlacement) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scq-hint-close ddq-answer-toggle';
    b.id = screen + '-ddq-answer-toggle';
    b.onclick = function () { ddqToggleAnswer(screen); };
    body.appendChild(b);
    ddqSyncAnswerToggle(screen);   // writes the two-line title for the board on screen
  }
  popup.classList.remove('hidden');
}
/* Wrong-answer title, decided from the learner's SNAPSHOT (never the board on screen, which may be
   the model answer) every time the popup renders — so a reload or a toggle keeps the same first line.
   720-templates (_question-template-defaults, "partly right", 2026-10-05): on a multi-pair board an
   answer with at least one pair right is titled 'התשובה אינה נכונה במלואה.'; none right keeps the
   authored 'התשובה אינה נכונה.'. Title only — scoring and the single attempt are unchanged.
   Second line, bold, part of the title (slide 70 sets it as a second title line): `answerNote` on
   the model board; on the learner's own board the template's View My Answer line, with the same
   explanation body under both. */
function ddqIsPartial(screen, board) {
  const s = DDQ_REG[screen], lp = board || (s && s.learnerPlacement);
  if (!lp) return false;
  return Object.keys(s.cfg.correctMap).some(t => lp[s.cfg.correctMap[t]] === t);
}
const DDQ_PARTIAL_TITLE = 'התשובה אינה נכונה במלואה.';
const DDQ_ANSWER_VIEW_LINE = 'אפשר לצפות שוב בפתרון הנכון.';
function ddqWrongTitle(screen) {
  const s = DDQ_REG[screen];
  const first = ddqIsPartial(screen) ? DDQ_PARTIAL_TITLE : s.cfg.popups.incorrect.title;
  const second = (s.answerView === 'correct') ? s.cfg.answerNote : DDQ_ANSWER_VIEW_LINE;
  return second ? first + '<br>' + second : first;
}
/* Swap the board between the model answer and what the learner actually did. */
function ddqToggleAnswer(screen) {
  const s = DDQ_REG[screen];
  if (!s || !s.learnerPlacement) return;
  s.answerView = (s.answerView === 'correct') ? 'learner' : 'correct';
  s.cfg.placement = Object.assign({},
    s.answerView === 'correct' ? s.correctPlacement : s.learnerPlacement);
  ddqRender(screen);
  ddqSyncAnswerToggle(screen);
}
/* The label names what the button will SHOW next, not what is on screen now. The title's second
   line names what IS on screen, so it is rewritten with it. */
function ddqSyncAnswerToggle(screen) {
  const s = DDQ_REG[screen];
  const b = document.getElementById(screen + '-ddq-answer-toggle');
  if (!s || !b) return;
  b.textContent = (s.answerView === 'correct') ? 'התשובה שלי' : 'תשובה נכונה';
  const t = document.getElementById(screen + '-ddq-popup-title');
  if (t) t.innerHTML = ddqWrongTitle(screen);
}
function ddqClosePopup(screen) { document.getElementById(screen + '-ddq-popup')?.classList.add('hidden'); }
function ddqEnter(screen) {
  const s = DDQ_REG[screen]; if (!s) return;
  ddqClosePopup(screen);
  if (!s.done) {
    s.checked = false; s.attempts = 0; s.phase = null; s.lastWrong = null;
    s.cfg.items.forEach(it => { s.cfg.placement[it.id] = 'source'; });
    const btn = document.getElementById(screen + '-ddq-check'); if (btn) { btn.textContent = 'בדיקה'; btn.disabled = true; }
  }
  /* The "revisited wrong answer opens on the model board" rule used to live here. It cannot: this
     runs BEFORE applyResumeVars() restores the two board snapshots, so on a reload there is nothing
     yet to open onto — and the restore that follows would overwrite whatever it decided. It is now
     ddqRestoreUI()'s, which runs LAST. */
  ddqRender(screen);
  if (s.done) { const btn = document.getElementById(screen + '-ddq-check'); if (btn) { btn.textContent = 'שנמשיך?'; btn.disabled = false; } }
  // An answered question keeps its hint hidden on return, as the SCQ screens do.
  ddqSyncHint(screen);
}

/* Register a standard-practice DragAndDropQuestion at practice index idx. */
function registerPracticeDnD(idx, cfg) {
  cfg.screen = 's' + practiceProgress.questions[idx].screen;
  cfg.onFinish = function (ok) {
    const q = practiceProgress.questions[idx];
    q.state = ok ? 'correct' : 'incorrect'; q.visited = true;
    syncPracticeNav(cfg.screen);
  };
  cfg.onContinue = function () {
    const next = idx + 1;
    if (next < practiceProgress.questions.length) { practiceProgress.questions[next].visited = true; goTo(practiceProgress.questions[next].screen); }
    else goToNextPart();
  };
  ddqRegister(cfg);
  attachPopupDrag(document.getElementById(cfg.screen + '-ddq-popup'));
}
function practiceEnterDnD(idx, screen) {
  const q = practiceProgress.questions[idx];
  q.visited = true;
  if (q.state === 'not-answered') q.state = 'current';
  syncPracticeNav(screen);
  ddqEnter(screen);
}

/* Standard practice Q4 (item 04) — match each body to its measurement method */
registerPracticeDnD(3, {
  item: '04',
  /* ⚠️ The three PNGs were rotated against their own filenames — s4-metal-cube.png held the
     trophy, s4-shell.png the cube, s4-trophy.png the shell — so every pill on this board, and
     the שדף pill on part 01's s28 that borrows the same shell photo, drew the wrong object beside a correct label.
     Fixed by renaming the FILES to match their contents (2026-08-26), not by remapping these
     paths: a path that points at a lying filename only moves the trap. The mapping below is the
     obvious one and should stay obvious — check the picture, not the name, if it ever looks off. */
  /* QA 2026-08-29: DELIBERATELY out of order, for the same reason part 01's s28 bank is (see its note there).
     These three used to sit in `targets` order, so the nth pill was always the answer to the nth
     target and the board could be solved by position without reading a word. Rotated one step —
     shell, goblet, cube — which is the order asked for and, checked against correctMap, leaves no
     pill at the index of its own target. */
  items: [
    { id: 'shell',      label: 'צדפה',        img: 'assets/img/s4-shell.png',      w: 92 },
    { id: 'goblet',     label: 'גביע גדול',   img: 'assets/img/s4-trophy.png',     w: 86 },
    { id: 'metal-cube', label: 'קוביית מתכת', img: 'assets/img/s4-metal-cube.png', w: 96 }
  ],
  targets: [
    { id: 't-ruler',    label: 'מדידה הנדסית בעזרת סרגל' },
    { id: 't-displace', label: 'שיטת דחיקת המים' },
    { id: 't-flood',    label: 'שיטת ההצפה' }
  ],
  correctMap: { 't-ruler': 'metal-cube', 't-displace': 'shell', 't-flood': 'goblet' },
  /* Copy verbatim from storyboard slides 69 (correct) and 70 (wrong). Slide 70's second title line,
     'התשובה הנכונה מוצגת.', is `answerNote` — see ddqWrongTitle. */
  answerNote: 'התשובה הנכונה מוצגת.',
  /* Two attempts, slides 66-70: 67 is "מענה שגוי 1" (retry), 70 "מענה שגוי 2" (the model board).
     Slide 68's note: the hint is available only after that first wrong answer. Approved 2026-10-11. */
  maxAttempts: 2,
  hintAfterWrong: true,
  popups: {
    retry:     FB_RETRY,
    correct:   { title: 'תשובה נכונה!', body: ['קוביית המתכת היא גוף הנדסי ולכן נבצע מדידה הנדסית.', 'צדפה היא גוף שאינו הנדסי וקטן מספיק להיכנס למשורה ולכן נבצע דחיקת מים.', 'גביע הוא גוף שאינו הנדסי ולא נכנס במשורה ולכן נבצע את שיטת ההצפה.'] },
    incorrect: { title: 'התשובה אינה נכונה.', body: ['קוביית המתכת היא גוף הנדסי ולכן נבצע מדידה הנדסית.', 'צדפה היא גוף שאינו הנדסי וקטן מספיק להיכנס למשורה ולכן נבצע דחיקת מים.', 'גביע הוא גוף שאינו הנדסי ולא נכנס במשורה ולכן נבצע את שיטת ההצפה.'] }
  }
});
/* ═══════════════════════════════════════════════════════════
   Catalog map — screen -> [item suffix, page-in-item]
   MUST have exactly TOTAL_SCREENS entries (_test/checks.mjs gate 5).
   ═══════════════════════════════════════════════════════════ */
var SCREEN_TO_SUBCONTENT = {
  0: null,            // אפשר להתחיל! — practice rules (sb50); belongs to no catalog item
  1: ['01', 1],       // סטנדרטי 1
  2: ['02', 1],       // סטנדרטי 2
  3: ['03', 1],       // סטנדרטי 3
  4: ['04', 1],       // סטנדרטי 4 — matching
  5: ['05', 1]        // סטנדרטי 5
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-02';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* Items carrying a graded question IN CODE — all five. */
var XAPI_EVAL_ITEMS = { '01': 1, '02': 1, '03': 1, '04': 1, '05': 1 };

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-02.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   Every answer lives in SCQ_REG / DDQ_REG and practiceProgress, so there are no plain variables or
   typed inputs to carry.
   ═══════════════════════════════════════════════════════════ */
var RESUME_PLAIN_VARS = [];
var RESUME_INPUT_IDS  = [];
var RESUME_TEXT_IDS   = [];

/* SCQ: mutable subset. `locked` is carried for parity with part 01 (where an applet can lock a
   question); nothing in this part locks one. */
function captureScqState() {
  return Object.keys(SCQ_REG).reduce(function (o, k) {
    var s = SCQ_REG[k];
    o[k] = { sel: s.sel, attempts: s.attempts, answered: !!s.answered, done: !!s.done,
             phase: s.phase || null, lastWrong: s.lastWrong || null, locked: !!s.locked };
    return o;
  }, {});
}

function applyScqState(scq) {
  if (!scq) return;
  Object.keys(scq).forEach(function (k) {
    var s = SCQ_REG[k];
    if (!s) return;
    s.sel = scq[k].sel; s.attempts = scq[k].attempts;
    s.answered = !!scq[k].answered; s.done = !!scq[k].done; s.locked = !!scq[k].locked;
    s.phase = scq[k].phase || null;
    /* Retry gate (2026-10-11). A document written before it has no lastWrong: in the retry phase the
       judged option is still `sel`; otherwise the gate starts open. No version bump. */
    s.lastWrong = scq[k].lastWrong !== undefined ? scq[k].lastWrong : (s.phase === 'retry' ? s.sel : null);
  });
}

/* DDQ: the board layout lives in cfg.placement, which registration seeds and dragging mutates — so
   it is learner state stored on the config object, and it has to be cloned out and back.

   BOTH boards of the answer toggle travel with it, not just the visible one. A wrong answer holds
   two at once — the model answer and what the learner actually did — and carrying only `placement`
   lost the other two on reload, leaving a learner who had switched to their own answer looking at
   five red slots with the model answer unreachable.

   `answerView` is deliberately NOT carried. Which board a learner ARRIVES on is not learner state,
   it is a didactic rule — a revisited wrong answer opens on the model answer — and ddqRestoreUI()
   applies it on every arrival. Persisting it would only mean restoring a value that is immediately
   overwritten, and a field written and never read is the kind that quietly drifts out of step. */
function captureDdqState() {
  return Object.keys(DDQ_REG).reduce(function (o, k) {
    var s = DDQ_REG[k];
    o[k] = { checked: !!s.checked, done: !!s.done, placement: Object.assign({}, s.cfg.placement),
             learnerPlacement: s.learnerPlacement ? Object.assign({}, s.learnerPlacement) : null,
             correctPlacement: s.correctPlacement ? Object.assign({}, s.correctPlacement) : null,
             attempts: s.attempts || 0, phase: s.phase || null,
             lastWrong: s.lastWrong ? Object.assign({}, s.lastWrong) : null };
    return o;
  }, {});
}

function applyDdqState(ddq) {
  if (!ddq) return;
  Object.keys(ddq).forEach(function (k) {
    var s = DDQ_REG[k];
    if (!s) return;
    s.checked = !!ddq[k].checked;
    s.done = !!ddq[k].done;
    s.cfg.placement = Object.assign({}, ddq[k].placement);
    s.learnerPlacement = ddq[k].learnerPlacement ? Object.assign({}, ddq[k].learnerPlacement) : null;
    s.correctPlacement = ddq[k].correctPlacement ? Object.assign({}, ddq[k].correctPlacement) : null;
    /* Two-attempt fields (2026-10-11). A document written before them reads as 0/null — a fresh
       first attempt, or a resolved board that never looks at them — so no version bump. */
    s.attempts = ddq[k].attempts || 0;
    s.phase = ddq[k].phase || null;
    s.lastWrong = ddq[k].lastWrong ? Object.assign({}, ddq[k].lastWrong) : null;
  });
}

/* Positional, WITHOUT `screen` — static table data. practiceScore() reads `state`, and it decides
   whether this component routes to part 02 or part 03, so losing it would change the learner's route
   through the unit after a reload. */
function capturePracticeState() {
  return practiceProgress.questions.map(function (q) {
    return { visited: !!q.visited, state: q.state };
  });
}

function applyPracticeState(practice) {
  if (!practice) return;
  practice.forEach(function (p, i) {
    var q = practiceProgress.questions[i];
    if (!q) return;
    q.visited = !!p.visited; q.state = p.state;
  });
}
/* ⚠️ Everything nested is COPIED, never referenced — see the note in part 05. */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    scq: captureScqState(),
    ddq: captureDdqState(),
    practice: capturePracticeState(),
    vars: {}
  };
}

/* The parameter MUST stay named `st` — see unit-js/README.md. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  applyScqState(st.scq);
  applyDdqState(st.ddq);
  applyPracticeState(st.practice);
}

function applyResumeDom(st) {}

var SCQ_RESTORE_SCREENS = [1, 2, 3, 5];
var DDQ_RESTORE_SCREENS = [4];

function restoreScreenUI(n) {
  try {
    if (SCQ_RESTORE_SCREENS.indexOf(n) !== -1) scqRestoreUI('s' + n);
    if (DDQ_RESTORE_SCREENS.indexOf(n) !== -1) ddqRestoreUI('s' + n);
  } catch (e) { console.error('[resume] restoreScreenUI', e); }
}

/* Mirrors scqCheck's DOM writes and NOTHING else — no state mutation, no statements, no progress
   bookkeeping. All of that happened when the answer was first given; repeating it here would report
   a second answer.

   The feedback popup IS part of those DOM writes. It used to be excluded on the grounds that
   reopening one is "new UI, not a restore" — but the popup carries the explanation and, on the
   matching screens, the only route back to the model answer, so a returning learner was left with
   marks and no reason for them. `phase` says which popup scqCheck last opened; painting anything
   from `attempts` instead is what marked a re-picked, never-checked option wrong. */
function scqRestoreUI(screen) {
  var s = SCQ_REG[screen];
  if (!s) return;
  if (!s.done && !s.phase && !s.sel) return;        // pristine — do not touch it

  if (s.phase === 'correct' || s.phase === 'wrong2') {
    scqMark(screen, s.cfg.correctId, 'correct');
    if (s.phase === 'wrong2' && s.sel && s.sel !== s.cfg.correctId) scqMark(screen, s.sel, 'wrong');
  } else if (s.phase === 'retry') {
    if (s.sel) scqMark(screen, s.sel, 'wrong');
  } else if (s.sel) {
    document.querySelectorAll('#' + screen + ' .scq-opt[data-id="' + s.sel + '"]').forEach(function (o) {
      o.classList.add('selected');
      o.setAttribute('aria-checked', 'true');
    });
  }

  if (s.phase) scqShowPopup(screen, s.phase);

  /* Mirror the live enablement predicate. An answered screen's button is the
     'שנמשיך?' one scqEnter already relabelled and enabled, so only the unsolved case is computed
     here — a painter that leaves a full screen with a dead button strands the learner. */
  if (!s.done) {
    var chk = document.getElementById(screen + '-scq-check');
    if (chk) chk.disabled = !s.sel || !!s.locked || s.sel === s.lastWrong;
  }
  scqSyncHint(screen);
}

/* Mirrors ddqCheck's DOM writes, on the same terms as scqRestoreUI.

   Runs LAST in goTo()'s repaint sequence, which is what lets it be the single place the displayed
   board is decided: ddqEnter() renders, applyResumeVars() restores the two snapshots, and only then
   is cfg.placement derived and re-rendered. `learnerPlacement` — not the board's appearance — is
   what says the answer was wrong: a revealed model board LOOKS right while the learner's own answer
   survives only in that snapshot. */
function ddqRestoreUI(screen) {
  var s = DDQ_REG[screen];
  if (!s) return;
  /* Repaint for an UNSUBMITTED board too, not only an answered one: ddqEnter()'s `!done` branch
     resets every item to the source bank and renders that, and applyResumeVars() then restores the
     learner's drags into cfg.placement with nothing left to draw them. Without this the board came
     back empty while memory still held the pills — and the check button, computed from placement,
     sat enabled over it. */
  var anyPlaced = s.cfg.items.some(function (it) { return s.cfg.placement[it.id] !== 'source'; });
  if (!s.checked && !anyPlaced) { ddqSyncHint(screen); return; }   // empty board — ddqEnter already drew it; a retry still owes the hint

  /* The arrival rule, applied on EVERY arrival and in one place: a revisited wrong answer opens on
     the model board, whatever the learner had toggled to before they left. Setting answerView and
     deriving the board from it in the same breath is what keeps state and DOM from drifting — the
     divergence that used to persist the learner's red board under an answerView saying otherwise. */
  if (s.done && s.correctPlacement) {
    s.answerView = 'correct';
    s.cfg.placement = Object.assign({}, s.correctPlacement);
  }
  ddqRender(screen);                                // also re-derives the check button from placement
  if (s.checked) ddqShowPopup(screen, s.learnerPlacement ? 'incorrect' : 'correct');
  else if (s.phase === 'retry') ddqShowPopup(screen, 'retry');
  ddqSyncHint(screen);
}
/* ── xAPI ready hook ──
   Called by unit-js/50-loader.js after this component's 'initialized' and the landing screen's item
   init. Opens the UNIT: loads the unit metadata into window.UNIT_METADATA, then reports the
   unit-scope 'initialized'.

   Only components 01 and 02 did this before the extraction, and that split is preserved verbatim
   here rather than "fixed" — whether the unit should be opened by exactly one component (01 is the
   entry every launch passes through) is a reporting-semantics question for Stage 4, not a
   refactoring one. See REPORT-XAPI.md. */
function onXapiReady() {
  loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function () {
    try { sendStatement720('initialized', 'onlinelesson', null, { scope: 'unit' }); } catch (e) {}
  });
}
