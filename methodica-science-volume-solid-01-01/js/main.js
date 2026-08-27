'use strict';
/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 01
   Engine ported verbatim from methodica-science-mass-measure-01.
   Screens built so far: S0 character-select, S1–S3 Roni hook.
   (More screens are appended as the storyboard is implemented.)
   ═══════════════════════════════════════════════════════════ */

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 35;  // …S9 disp, S21 guess-Q, S11 flooding, S20 flip-cards, S22 measurement applet, S12 transition, warm-ups, practice, S23–S28 comic slides 13–18, S29 guess-Q (sb24), S30/S31 overflow can (sb39/40), S32 practice rules (sb50), S33 flooding result (sb29), S34 measurement steps 3-4 (sb36-38). Bump as screens are added.
                           // Must equal the live `.screen` count — index_dev.html derives its jump range from that,
                           // while goTo() rejects n >= TOTAL_SCREENS. The two silently disagree if only one is edited.

/* ─── Global lomda state ────────────────────────────────────
   Single source of truth persisting across every screen. Screens
   read window.lomdaState.selectedCharacter. JS-global for now. */
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
  selection: 'png', examine: 'mp4', 'cylinder-pendant': 'mp4', toga: 'mp4',
  comic: 'mp4', experiments: 'mp4', pingpong: 'mp4', soap: 'mp4',
  /* `towel` is gone and its two screens now use `stretch`. They were never two poses: both PNGs
     were the same headband artwork under different names, framed slightly differently, so keeping
     both would have meant shipping one 960x960 clip twice. `stretch` wins the name because that is
     what the delivery folder calls it (Orange_Stretching.mp4 / turquoise_streach.mp4). */
  stretch: 'mp4', ask: 'mp4', 'wet-object': 'mp4'
};
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  /* ?v= is a CACHE-BUSTER, not decoration: the sprite files were re-encoded in place
     (their near-white matte lifted to pure #FFFFFF) under their existing names, so a
     browser holding the old copy would keep showing the grey box on the white canvas.
     Bump it whenever a character asset is re-exported. Over file:// the query is ignored
     rather than breaking the load, so it is safe there too.
     ?v=3 on 2026-08-27: `stretch` changed extension, .png -> .mp4, and `towel` was retired onto it.
     The extension change alone would defeat a stale cache, but s12's slot and s6's markup both
     resolve through here and the tag differs now, so the bump keeps the pair unambiguous. */
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png') + '?v=3';
}
/* Restarts a freshly-sourced <video> companion; no-op for <img> ones. */
function startCompanionMedia(el) {
  if (el.tagName !== 'VIDEO') return;
  el.load();
  const p = el.play();
  if (p && p.catch) p.catch(function () {});
}
/* Screens where the mascot SPEAKS are not here: s1, s3, s5, s6, s21, s22, s23, s26 and s29
   author their sprite in index.html inside a .companion-say group, because its position
   only makes sense next to a bubble that also lives in the markup — a slot as well would
   be two sources of truth for one offset. renderCompanion() adopts those sprites and
   refreshes only which character they show. */
/* The prop the mascot holds is the caveat's illustration, so it must match the bubble beside
   it: sb26 (S9) warns about bodies that DISSOLVE — he holds a bar of soap; sb29 (S11) warns
   about bodies that FLOAT — he holds a ping-pong ball. These two were transposed until
   2026-08-24, which put each prop on the screen arguing the other case. */
const CHARACTER_SLOTS = {
  /* s9 has no slot any more: slide 26 gives its mascot a LINE (the caveat about bodies that do
     not dissolve), so he is authored in the markup inside a .companion-say group and revealed
     with the explanation — a silent CHARACTER_SLOTS sprite cannot carry a bubble. */
  /* s11 has no slot: its slide-29 companion (the ping-pong ball) moved to s33 with the
     rest of that slide, and is authored there inside a .companion-say group. */
  /* QA 2026-08-25 (slide 20): bigger, and centred under the two lines of text rather than
     tucked into the right corner. `center` swaps the right offset for a 50% + translate,
     so `right` must go — leaving both would write two conflicting anchors. */
  s12: { pose: 'stretch',          w: 260, bottom:  89, center: true }   /* sb41 */
};
/* S7's two path cards are the mascot in two poses. Not a CHARACTER_SLOTS entry:
   these sit inside the option cards as content, not as a floating sprite. */
function renderPathCharacters() {
  const c = document.getElementById('s7-img-comic');
  const e = document.getElementById('s7-img-experiments');
  if (c) { c.src = characterAsset('comic'); startCompanionMedia(c); }
  if (e) { e.src = characterAsset('experiments'); startCompanionMedia(e); }
}
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
    screen.appendChild(el);
  }
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
  if (!el.closest('.companion-say')) {
    ['left', 'right', 'top', 'bottom'].forEach(function (k) {
      el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
    });
  }
}

function resetScreenState(n) {
  renderCompanion(n);
  if (n === 7) renderPathCharacters();
  if (n === 0) {
    // TwoOptionSelection — restore the saved choice on return.
    const saved = window.lomdaState.selectedCharacter;
    document.querySelectorAll('#s0 .option-card').forEach(card => {
      const isSel = !!saved && card.dataset.value === saved;
      card.classList.toggle('selected', isSel);
      card.setAttribute('aria-checked', isSel ? 'true' : 'false');
    });
    const cont = document.getElementById('s0-continue');
    if (cont) cont.disabled = !saved;
  }
  if (n === 1) {
    // Roni hook — restart the autoplaying video from the beginning on entry.
    const v = document.getElementById('s1-video');
    if (v) {
      try { v.currentTime = 0; } catch (e) {}
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
  }
  if (n === 2) {
    // hookOpenQuestion — restore typed text / hint-button state on return.
    hookOpenInput();
  }
  if (n === 4) {
    // SingleChoiceQuestionImage — restore any revealed feedback on return.
    imgqEnter();
  }
  if (n === 7) {
    // TwoOptionSelection (learning path) — restore saved choice.
    const p = window.lomdaState.learningPath;
    document.querySelectorAll('#s7 .option-card').forEach(card => {
      const isSel = !!p && card.dataset.value === p;
      card.classList.toggle('selected', isSel);
      card.setAttribute('aria-checked', isSel ? 'true' : 'false');
    });
    const cont = document.getElementById('s7-continue');
    if (cont) cont.disabled = !p;
  }
  if (COMIC_SCREENS.indexOf(n) !== -1) {
    // Comic path (storyboard slides 12–18) — one screen per slide.
    const cid = 's' + n;
    if (COMIC_DATA[cid].kind === 'guess') guessEnter(cid);   // guessEnter() calls syncPathToggle() itself
    else                                  comicSliderEnter(cid);
  }
  if (n === 9) {
    // Displacement applet.
    dispEnter();
  }
  if (n === 10) {
    // Aquarium ruler applet + SingleChoiceQuestion.
    aqEnter();
  }
  if (n === 33) { syncPathToggle(); }
  if (n === 11) {
    // Flooding / overflow applet.
    floodEnter();
  }
  if (n === 20) { flipEnter('s20'); }              // real-world uses (flip cards)
  if (n === 21) { guessEnter('s21'); }             // guess-question (no feedback)
  if (n === 29) { guessEnter('s29'); }             // guess-question sb24 (no feedback)
  if (n === 30 || n === 31) { syncPathToggle(); }  // overflow-can info screens
  if (n === 22 || n === 34) { measEnter(); }                   // multi-step measurement applet
  if (n === 18) { warmupEnter(0, 's18', ddqEnter); }   // warm-up 1 (matching)
  if (n === 19) { warmupEnter(1, 's19', dqEnter); }    // warm-up 2 (dropdown)
  if (n === 13) { practiceEnter(0, 's13'); }
  if (n === 14) { practiceEnter(1, 's14'); }
  if (n === 15) { practiceEnter(2, 's15'); }
  if (n === 17) { practiceEnterDnD(3, 's17'); }   // Q4 — matching (DnD)
  if (n === 16) { practiceEnter(4, 's16'); }       // Q5 — SCQ (item 09)
}

/* ─── Keyboard Navigation ──────────────────────────────────
   Inside a comic slider the arrows page PANELS; at the edges they fall through
   to screen navigation (RTL: ArrowLeft = forward). Panel paging deliberately
   lives here and not in advanceScreen(), because #sN-continue's
   onclick="advanceScreen()" must always mean "leave this screen" — otherwise a
   learner who has seen every panel and paged back would get a page-turn. */
document.addEventListener('keydown', e => {
  /* Escape closes any open hint overlay as well as the zoom, matching parts 02/04. The
     close must happen BEFORE the return, or the overlays would never see the key. */
  if (e.key === 'Escape') {
    document.querySelectorAll('[id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
    closeImageZoom();
    return;
  }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  // Don't hijack the arrow keys while the learner is typing (#s2-open-text, #meas-input…).
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;

  const cid = 's' + currentScreen;
  if (comicHasSlider(cid)) {
    const st = comicState[cid], last = COMIC_DATA[cid].panels.length - 1;
    if (e.key === 'ArrowLeft'  && st && st.i < last) { comicSliderNext(cid); return; }
    if (e.key === 'ArrowRight' && st && st.i > 0)    { comicSliderPrev(cid); return; }
  }
  if (e.key === 'ArrowLeft') advanceScreen(); else goBack();
});

function goBack() {
  // Comic path — purely screen-level; in-slider back-paging is the arrows' job.
  const cb = COMIC_SCREENS.indexOf(currentScreen);
  if (cb !== -1) { goTo(cb === 0 ? 7 : COMIC_SCREENS[cb - 1]); return; }
  if (currentScreen === 29) { goTo(10); return; }       // guess-Q (sb24) → back to aquarium
  if (currentScreen === 9)  { goTo(29); return; }       // displacement → back to guess-Q (sb24)
  if (currentScreen === 10) { goTo(7); return; }        // aquarium (experiments entry) → back to path choice
  if (currentScreen === 21) { goTo(9); return; }        // guess-Q → back to displacement
  if (currentScreen === 11) { goTo(21); return; }       // flooding → back to guess-Q
  if (currentScreen === 33) { goTo(11); return; }       // flooding result → back to the applet
  if (currentScreen === 20) { goTo(33); return; }       // flip-cards → back to the flooding result
  if (currentScreen === 22) { goTo(20); return; }       // measurement applet → back to flip-cards
  if (currentScreen === 34) { goTo(22); return; }       // steps 3-4 → back to steps 1-2
  if (currentScreen === 30) { goTo(34); return; }       // overflow can → back to measurement applet
  if (currentScreen === 31) { goTo(30); return; }       // overflow can (how) → back to the question
  if (currentScreen === 12) { goTo(7); return; }        // practice transition → back to path choice
  if (currentScreen === 18) { goTo(12); return; }       // warm-up 1 → transition
  if (currentScreen === 19) { goTo(18); return; }       // warm-up 2 → warm-up 1
  if (currentScreen === 32) { goTo(19); return; }       // practice rules → back to warm-up 2
  const pIdx = practiceProgress.questions.findIndex(q => q.screen === currentScreen);
  if (pIdx !== -1) { goTo(pIdx > 0 ? practiceProgress.questions[pIdx - 1].screen : 32); return; }  // Q1 back → practice rules
  goTo(currentScreen - 1);
}

function advanceScreen() {
  // Screen gates / flow exceptions.
  if (currentScreen === 0 && !window.lomdaState.selectedCharacter) return; // must pick a character
  if (currentScreen === 2) { hookOpenReveal(); return; }                   // hook: reveal is the advance
  if (currentScreen === 7) { advanceFromPathChoice(); return; }            // path choice routes itself
  const ci = COMIC_SCREENS.indexOf(currentScreen);                         // comic path — gated, then next comic screen
  if (ci !== -1) {
    const cid = 's' + currentScreen;
    if (!comicCanAdvance(cid)) return;                                     // slider: every panel seen · guess: an option picked
    if (ci === COMIC_SCREENS.length - 1) {                                 // last comic screen → merge point
      goTo(MERGE_SCREEN); return;
    }
    goTo(COMIC_SCREENS[ci + 1]); return;
  }
  if (currentScreen === 10) return;                                        // aquarium advances via its check button
  if (currentScreen === 29) { if (!guessPicked['s29']) return; goTo(9); return; }        // guess-Q (sb24) → displacement
  if (currentScreen === 9)  { if (!dispPlaced) return; goTo(21); return; } // displacement → guess-Q
  if (currentScreen === 21) { if (!guessPicked['s21']) return; goTo(11); return; }       // guess-Q → flooding
  if (currentScreen === 11) { if (!floodPlaced) return; goTo(33); return; }             // flooding → its result (sb29)
  if (currentScreen === 33) { goTo(20); return; }                                       // flooding result → flip-cards
  if (currentScreen === 20) { const c = document.getElementById('s20-continue'); if (c && c.disabled) return; goTo(22); return; } // flip-cards → measurement applet
  if (currentScreen === 22) { if (measStep <= 2) return; goTo(34); return; }   // steps 1-2 done → steps 3-4
  if (currentScreen === 34) { if (!measDone) return; goTo(30); return; }       // applet complete → overflow can                 // measurement applet → overflow can
  if (currentScreen === 30) { goTo(31); return; }                                        // overflow can: question → how it works
  if (currentScreen === 31) { goTo(MERGE_SCREEN); return; }                              // overflow can → merge
  if (currentScreen === 12) { goTo(18); return; }                                       // transition → warm-up 1
  if (currentScreen === 18 || currentScreen === 19) return;                             // warm-ups advance via their own check button
  if (currentScreen === 32) { goTo(13); return; }                                        // practice rules → practice Q1
  if (practiceProgress.questions.some(q => q.screen === currentScreen)) return;         // practice Qs advance via their own check button
  goTo(currentScreen + 1);
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TwoOptionSelection (S0, character select)
   Single selection stores the choice globally and enables בחרתי.
   ═══════════════════════════════════════════════════════════ */
function selectOption(cardEl) {
  document.querySelectorAll('#s0 .option-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');
  window.lomdaState.selectedCharacter = cardEl.dataset.value;
  try { localStorage.setItem('lomda_selectedCharacter', cardEl.dataset.value); } catch (e) {}
  const cont = document.getElementById('s0-continue');
  if (cont) cont.disabled = false;   // enable FIRST — instant visual feedback
  /* NOT 'selected'. v2.4 §4 defines a closed dictionary of choice categories — learning-type,
     practice-decision, is-understood, is-repeat, external-learning — and picking a companion mascot
     is none of them; REPORT-XAPI.md is explicit that an avatar picker is decoration, not a learning
     preference. Reporting it as a 'learning-type' selection would be false. Kept as 'interacted' so
     the datum survives without misrepresenting what it is. */
  xapiSend('interacted', 'question', { response: cardEl.dataset.value }, { category: 'companion-choice' });
}
function advanceFromS0() {
  if (!window.lomdaState.selectedCharacter) return;
  goTo(1);
}
/* Keyboard activation for the radio cards (Enter / Space) */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('#s0 .option-card');
  if (!card) return;
  e.preventDefault();
  selectOption(card);
});

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — hookOpenQuestion (S1–S3)
   Motivational hook: scenario (S1) → free-text + hint (S2) →
   reveal (S3). No scoring; the hint button unlocks after input.
   ═══════════════════════════════════════════════════════════ */
function hookOpenInput() {
  const ta  = document.getElementById('s2-open-text');
  const btn = document.getElementById('s2-hint-btn');
  if (!ta || !btn) return;
  btn.disabled = ta.value.trim().length === 0;
}
function hookOpenReveal() {
  const ta = document.getElementById('s2-open-text');
  if (ta && ta.value.trim().length === 0) return; // hint gated on input
  /* 'interacted', not 'answered'. v2.4 reserves 'answered' for a question the component measures,
     and requires context.contextActivities.parent = the containing ITEM on every one. This applet is
     not a catalog question — the metadata gives item 02 exactly one question (q1, on s10) — so there
     is no item question to parent to, and an 'answered' here would both be unmatchable and violate
     §2. Recording it as an interaction keeps the learning-analytics value honestly.
     See _test/baselines/stage-4-pattern.md for the open question about whether these SHOULD become
     catalog items. */
  xapiSend('interacted', 'question', { response: (ta ? ta.value.trim() : '') }, { category: 'hook-open-question' });
  goTo(3);
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestionImage (S4, mark-for-feedback)
   Motivational: tapping each image reveals its feedback. Correct
   images (volume-related) get a green check; the distractor gets
   an explanatory note. No hard gate — continue is always enabled.
   ═══════════════════════════════════════════════════════════ */
const IMGQ = {
  suitcase: { correct: true },
  planter:  { correct: true },
  apple:    { correct: false }
};
let imgqRevealed = {};
function imgqToggle(cardEl) {
  const id = cardEl.dataset.value;
  if (!IMGQ[id]) return;
  imgqRevealed[id] = true;
  cardEl.classList.add('revealed');
  cardEl.classList.add(IMGQ[id].correct ? 'correct' : 'incorrect');
  /* Also not a dictionary choice — the learner is revealing a reason, not stating a preference. */
  xapiSend('interacted', 'question', { response: id }, { category: 'why-measure-volume' });
}
function imgqEnter() {
  Object.keys(imgqRevealed).forEach(function (id) {
    if (!imgqRevealed[id]) return;
    const card = document.querySelector('#s4 .imgq-card[data-value="' + id + '"]');
    if (card) {
      card.classList.add('revealed');
      card.classList.add(IMGQ[id].correct ? 'correct' : 'incorrect');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TwoOptionSelection (S7, learning-path choice)
   Comic vs. experiments. Both paths teach the same content and
   merge afterward. Choice stored in window.lomdaState.learningPath.
   ═══════════════════════════════════════════════════════════ */
// Comic path (pedagogical order ≠ screen-number order, wired explicitly).
// One screen per storyboard slide: 12→S8, 13→S23, 14→S24, 15→S25, 16→S26, 17→S27, 18→S28.
// S23–S28 are appended rather than inserted so S9–S22 keep their ids, which
// index.html / style.css / every routing branch already reference.
const COMIC_ENTRY   = 8;
const COMIC_SCREEN  = COMIC_ENTRY;                     // alias kept for advanceFromPathChoice()
const COMIC_SCREENS = [8, 23, 24, 25, 26, 27, 28];
// Experiments path (pedagogical order ≠ screen-number order, wired explicitly):
//   entry = S10 aquarium (geometric) → S9 displacement → (flooding, tbd)
const EXPERIMENTS_ENTRY = 10;
const EXPERIMENTS_SCREENS = [9, 10, 11, 20, 21, 22, 29, 30, 31, 33, 34];   // membership list for the path toggle, NOT the order
                                                                    // (runtime order is 10 → 29 → 9 → 21 → 11 → 20 → 22 → 30 → 31)
const MERGE_SCREEN = 12;                       // both paths (comic end / flip-cards end) continue here
function selectPathOption(cardEl) {
  document.querySelectorAll('#s7 .option-card').forEach(c => {
    c.classList.remove('selected'); c.setAttribute('aria-checked', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');
  window.lomdaState.learningPath = cardEl.dataset.value;
  const cont = document.getElementById('s7-continue');
  if (cont) cont.disabled = false;   // enable FIRST — instant visual feedback
  /* The one genuine 'selected' in the unit: comic vs experiments IS a learning-format preference,
     which is exactly v2.4's `learning-type`. The category is kebab-case per the dictionary table in
     v2.4 §4 — the camelCase 'learningType' this used to send is not a dictionary value. */
  xapiSend('selected', 'question', { response: cardEl.dataset.value }, { category: 'learning-type' });
}
function advanceFromPathChoice() {
  const path = window.lomdaState.learningPath;
  if (!path) return;
  goTo(path === 'experiments' ? EXPERIMENTS_ENTRY : COMIC_SCREEN);
}
/* Learning-path toggle (inside the comic / experiments screens). Position-locked. */
function switchLearningPath(path) {
  window.lomdaState.learningPath = path;
  if (path === 'experiments' && EXPERIMENTS_SCREENS.indexOf(currentScreen) === -1) goTo(EXPERIMENTS_ENTRY);
  if (path === 'comic'       && COMIC_SCREENS.indexOf(currentScreen) === -1)       goTo(COMIC_ENTRY);
  syncPathToggle();
}
function syncPathToggle() {
  const active = (COMIC_SCREENS.indexOf(currentScreen) !== -1) ? 'comic' : 'experiments';
  const scope = document.querySelector('.screen.active');
  if (!scope) return;
  scope.querySelectorAll('.path-toggle-opt').forEach(btn => {
    const on = btn.dataset.path === active;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}
/* Keyboard activation for S7 cards */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('#s7 .option-card');
  if (!card) return;
  e.preventDefault();
  selectPathOption(card);
});

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Comic panels (comic learning path)
   One screen per storyboard slide: S8=12, S23=13(guess), S24=14,
   S25=15, S26=16(guess), S27=17, S28=18.

   Slides 12 and 14 were delivered as single composite frames (two
   scenes in one file) and show as one static panel. Slides 15/17/18
   were delivered per panel and show as a horizontal slider.

   ALL dialogue is live HTML (.speech-bubble) overlaid on the art —
   never baked into the image. Bubbles fade in ~800ms after the panel
   appears (storyboard: "הלומד רואה רק את התמונה, בועיות הדיבור עולות
   שנייה אחרי"), staggered in CSS off --k.

   Forward navigation on a slider screen is blocked until every panel
   has been seen at least once (canonical FlipCardsReveal unlock: the
   `seen` entries only ever turn true and `done` is sticky, so a
   learner returning to the screen is not re-gated).

   Bubble geometry: --r / --t are offsets from the panel's PHYSICAL
   right / top edge, --w is the width, all in % of the panel. Physical
   on purpose — the art has a fixed physical layout, so anchors must
   not flip with `direction`. Percentages are safe because .comic-frame
   is a constant design-pixel box; scaleApp() handles device scaling
   above it. If the frame is ever made responsive in design coords,
   these anchors have to be revisited.
   ═══════════════════════════════════════════════════════════ */
const COMIC_BUBBLE_DELAY = 800;
const COMIC_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const COMIC_DATA = {

  /* ── S8 · slide 12 · composite: (right) Archimedes addresses the learners,
        rectangular box on the bench · (left) he measures it with a ruler ── */
  s8: {
    slide: 12, kind: 'panels', ratio: 2,
    panels: [{
      src: 'assets/img/comic/12.jpg',
      alt: 'ארכימדס במעבדה עתיקה. מימין הוא עומד ליד תיבת מתכת על השולחן ופונה אל הלומדים, משמאל הוא מודד את התיבה בעזרת סרגל.',
      bubbles: [
        /* Slide 12's band belongs to the RIGHT scene (Archimedes addressing the learner), not to
           the whole composite — it ran under both halves until QA 2026-08-24. */
        { type: 'caption', half: 'right', text: 'ארכימדס הגיע עד לימינו כדי ללמד אותנו על השיטות לחישוב נפח שהוא המציא.' },
        { type: 'speech', tail: 'left', r: -3, t: 5, w: 21,
          text: 'בואו נתחיל בתזכורת! איך מודדים גוף בעל צורה הנדסית מוגדרת כמו גליל או תיבה?' },
        { type: 'speech', tail: 'left', r: 51, t: 38, w: 25,
          text: 'למדידת נפח של תיבה משתמשים בסרגל: מודדים את צלעות התיבה (אורך, רוחב, גובה) ומכפילים.' }
      ]
    }]
  },

  /* ── S23 · slide 13 · guess-question. No correct/incorrect feedback —
        picking any option is what lets the comic continue. ── */
  s23: { slide: 13, kind: 'guess' },

  /* ── S24 · slide 14 · composite: (right) he measures the box and works the
        volume out in his head · (left) key, acorn and marble on the bench ── */
  s24: {
    slide: 14, kind: 'panels',
    panels: [{
      src: 'assets/img/comic/14.jpg',
      alt: 'מימין ארכימדס מודד תיבה בעזרת סרגל ומחשב את נפחה, משמאל מונחים על השולחן מפתח, בלוט וגולה.',
      bubbles: [
        { type: 'narration', r: 27, t: 4, w: 22, text: 'ככה מודדים נפח של גוף הנדסי' },
        /* Side beak, not down-left: the bubble sits at the panel's right edge and Archimedes'
           head is to its LEFT, so trailing circles downward pointed them away from the thinker
           (QA 2026-08-24). Widened too — the thought frame's new padding needs the room. */
        /* r is NEGATIVE on purpose: the bubble overhangs the panel's right edge by 8% so it
           clears Archimedes' head. .comic-viewport does not clip it — the panel is inside a
           track that only clips horizontally between slides. */
        { type: 'thought', tail: 'left', r: -8, t: 20, w: 33,
          text: 'יש לנו קובייה שכל צלע\nשלה = 10 ס"מ.\n10·10·10 = 1,000.\nנפח הקובייה = 1,000 סמ"ק!' },
        { type: 'narration', r: 56, t: 6, w: 30,
          text: 'אבל מה לגבי גוף שאינו הנדסי, כמו מפתח, בלוט, או גולה?' }
      ]
    }]
  },

  /* ── S25 · slide 15 · שיטת דחיקת המים · slider, 5 panels (15a–15e) ── */
  s25: {
    slide: 15, kind: 'panels',
    panels: [
      { src: 'assets/img/comic/15a.jpg',
        alt: 'ארכימדס מחזיק משורה מלאה במים וגולה; עיגול הגדלה מראה שמפלס המים עומד על 50 מ"ל.',
        bubbles: [
          { type: 'caption', text: 'ארכימדס ממלא את המשורה ומתעד עד לאן המים מגיעים: 50 מ"ל.' },
          { type: 'speech', tail: 'down-left', r: 3, t: 5, w: 30,
            text: 'אם נכניס את הגולה למשורה – מפלס המים יעלה!' }
        ] },
      { src: 'assets/img/comic/15b.jpg',
        alt: 'ארכימדס מסתכל אל המשורה וחושב.',
        bubbles: [
          { type: 'caption', text: 'מפלס המים עלה ל-62 מ"ל.' },
          { type: 'thought', tail: 'down-left', r: 3, t: 5, w: 30,
            text: 'רגע... אז הנפח של הגולה הוא 62? אולי 50? מה צריך לחשב פה?' }
        ] },
      { src: 'assets/img/comic/15c.jpg',
        alt: 'ארכימדס מרים אצבע למעלה בסימן "הבנתי!".',
        bubbles: [
          /* Dropped from t:5 and flipped to a top beak: at the top of the frame the bubble sat
             across his face, and a down-beak pointed away from him. Sitting lower with the beak
             on the upper edge, it clears the face and still leads back to his head (QA
             2026-08-24, which suggested exactly this). */
          { type: 'speech', tail: 'up-left', r: 3, t: 30, w: 32,
            text: 'אה! כמות המים החדשה פחות כמות המים המקורית = נפח הגולה!' }
        ] },
      { src: 'assets/img/comic/15d.jpg',
        alt: 'זום על המשורה: הגולה בתוך המים ומפלס המים מגיע ל-62 מ"ל.',
        bubbles: [
          { type: 'caption', text: 'מה קרה כאן?' },
          { type: 'speech', tail: 'down-left', r: 5, t: 6, w: 32,
            text: 'כשמכניסים גוף מוצק למים, מפלס המים שעולה שווה לנפח הגוף בדיוק.' }
        ] },
      { src: 'assets/img/comic/15e.jpg',
        alt: 'ארכימדס מסתכל אל המצלמה.',
        bubbles: [
          { type: 'banner', t: 78, text: 'זוהי שיטת דחיקת המים!' },
          { type: 'speech', tail: 'down-left', r: 1, t: 1, w: 28,
            text: 'אם רוצים למדוד נפח של גוף שעלול להיפגע במים, אפשר לעטוף אותו בשכבת מגן דקה ואטומה למים.' }
        ] }
    ]
  },

  /* ── S26 · slide 16 · guess-question (no feedback) ── */
  s26: { slide: 16, kind: 'guess' },

  /* ── S27 · slide 17 · שיטת ההצפה · slider, 7 panels (17a–17g) ── */
  s27: {
    slide: 17, kind: 'panels',
    panels: [
      { src: 'assets/img/comic/17a.jpg',
        alt: 'ארכימדס מחזיק אבטיח.',
        bubbles: [
          { type: 'speech', tail: 'down-left', r: 2, t: 5, w: 28,
            text: 'או! אני שמח ששאלתם מה לגבי גופים שלא נכנסים במשורה.' }
        ] },
      { src: 'assets/img/comic/17b.jpg',
        alt: 'ארכימדס מכניס את האבטיח לקערה מלאה במים; מתחת לקערה מגש עמוק שאליו נשפכים המים.',
        bubbles: [
          { type: 'caption', text: 'ארכימדס מכין קערה גדולה עם מים מלאים ממש עד לקצה. מתחתיה יש כלי עמוק נוסף.' },
          { type: 'speech', tail: 'down-left', r: 2, t: 5, w: 29,
            text: 'אם אני אניח את האבטיח בתוך קערת המים, המים ישפכו, נכון?' }
        ] },
      { src: 'assets/img/comic/17c.jpg',
        alt: 'ארכימדס מסתכל על הקערה וחושב.',
        bubbles: [
          { type: 'thought', tail: 'down-left', r: 2, t: 5, w: 26,
            text: 'אוקי... המים נשפכו. מה עכשיו?' }
        ] },
      { src: 'assets/img/comic/17d.jpg',
        alt: 'ארכימדס מחזיק כלי מדידה גדול ומראה אותו לצופים.',
        bubbles: [
          { type: 'speech', tail: 'down-left', r: 5, t: 6, w: 28,
            text: 'רגע! יש לנו פה גם כלי מדידה!' }
        ] },
      { src: 'assets/img/comic/17e.jpg',
        alt: 'ארכימדס שופך את המים מהכלי העמוק לתוך כלי המדידה.',
        bubbles: [
          { type: 'caption', text: 'ארכימדס שופך את המים מהכלי העמוק לתוך כלי המדידה.' },
          { type: 'speech', tail: 'down-left', r: 2, t: 5, w: 28,
            text: 'רואים? המים שנשפכו החוצה מגיעים בדיוק ל 6.4 ליטר' }
        ] },
      { src: 'assets/img/comic/17f.jpg',
        alt: 'זום על כלי המדידה: המים מגיעים ל-6.4 ליטר.',
        bubbles: [
          { type: 'caption', text: 'מה קרה כאן?' },
          { type: 'speech', tail: 'down-left', r: 4, t: 5, w: 30,
            text: 'שכשמכניסים גוף מוצק לקערת מים, המים שנשפכים החוצה שווים לנפח הגוף במדויק!' },
          { type: 'note', r: 4, t: 42, w: 30,
            text: 'זה נכון רק אם הכלי מלא במים ממש עד הסוף.' }
        ] },
      { src: 'assets/img/comic/17g.jpg',
        alt: 'ארכימדס מחזיק משקולת קטנה.',
        bubbles: [
          { type: 'banner', t: 80, text: 'זוהי שיטת ההצפה!' },
          { type: 'speech', tail: 'down-left', r: 2, t: 5, w: 30,
            text: 'אם הגוף שמודדים צף במים, אפשר לחבר לו משקולת שישקע.' },
          { type: 'note', r: 2, t: 42, w: 30,
            text: 'כמובן שצריך להחסיר את נפח המשקולת מהתוצאה הסופית' }
        ] }
    ]
  },

  /* ── S28 · slide 18 · מוצק שמתנהג כמו נוזל · slider, 3 panels ── */
  s28: {
    slide: 18, kind: 'panels',
    panels: [
      { src: 'assets/img/comic/18a.jpg',
        alt: 'ארכימדס עומד ליד שולחן המעבדה ומפנה את ראשו הצידה כדי להקשיב לשאלה.',
        bubbles: [
          // The first line is an off-panel voice (storyboard: "הדיבור הזה מגיע
          // כאילו מחוץ לקומיקס") — the tail points off the right edge, the side
          // Archimedes is turned toward.
          { type: 'speech', tail: 'down-right', r: 2, t: 5, w: 29,
            text: 'ארכימדס! מה לגבי מוצק שמתנהג כמו נוזל?' },
          { type: 'thought', tail: 'down-right', r: 48, t: 6, w: 26,
            text: 'או! חיכיתי לשאלה הזאת!' }
        ] },
      { src: 'assets/img/comic/18b.jpg',
        alt: 'ארכימדס שופך אורז לתוך כלי מדידה ריק.',
        bubbles: [
          { type: 'caption', text: 'ארכימדס שופך אורז לתוך כלי מדידה' },
          { type: 'speech', tail: 'down-left', r: 2, t: 5, w: 30,
            text: 'מוצק בצורת גרגרים או אבקה מתנהג כמו נוזל! לכן ניתן למדוד את הנפח שלו בכלי למדידת נוזלים.' }
        ] },
      { src: 'assets/img/comic/18c.jpg',
        alt: 'ארכימדס באמבטיה מרים כתר וקורא "אאוריקה".',
        bubbles: [
          { type: 'thought', tail: 'down-left', r: 4, t: 6, w: 32,
            text: 'וכל זה בזכות האמבטיה שעשיתי לפני אלפי שנים... לא רע!' }
        ] }
    ]
  }
};

/* 's25' -> { i, seen[], done, built, timer, token, reported } */
const comicState = {};

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function comicHasSlider(screenId) {
  const cfg = COMIC_DATA[screenId];
  return !!(cfg && cfg.panels && cfg.panels.length > 1);
}

/* The image track and its unclipped bubble twin (.comic-bleed > .comic-track).
   Anything that moves, drags or freezes one MUST do the same to the other, or
   the bubbles desync from the art they belong to. */
function comicTracks(screenId) {
  return [screenId + '-track', screenId + '-bleed-track']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
}

function comicCanAdvance(screenId) {
  const cfg = COMIC_DATA[screenId];
  if (!cfg) return true;
  if (cfg.kind === 'guess') return !!guessPicked[screenId];
  const st = comicState[screenId];
  return !!(st && st.done);
}

/* One bubble → one .speech-bubble. Docked variants (caption/banner) ignore
   --r/--t/--w; positioned variants read them. --r/--t may be negative or >100:
   the bubbles are built into .comic-bleed, which does not clip.
   tail: down-right | down-left | up-right | up-left | right | left.
   tx aims an up/down beak along the horizontal edge (default 28px), ty aims a
   left/right beak along the vertical one (default 38px, measured to its centre);
   both sit outside the `docked` branch so a banner may carry a beak too. */
function comicBubbleHtml(b, k) {
  const type  = b.type || 'speech';
  const docked = (type === 'caption');   // banner is width-docked but honours --t
  let cls = 'speech-bubble speech-bubble--' + type;
  if (b.tail) cls += ' speech-bubble--tail-' + b.tail;
  /* A caption normally docks across the whole frame. On a COMPOSITE panel (two scenes side by
     side, e.g. s8 / storyboard slide 12) the deck gives each scene its own band, so `half` scopes
     one to the scene it belongs to instead of letting it run under both. */
  if (docked && b.half) cls += ' speech-bubble--caption-' + b.half;
  let style = '--k:' + k + ';';
  if (!docked) {
    style += '--r:' + (b.r != null ? b.r : 5) + '%;'
           + '--t:' + (b.t != null ? b.t : 5) + '%;'
           + '--w:' + (b.w != null ? b.w : 30) + '%;';
  }
  if (b.tx != null) style += '--tail-x:' + b.tx + 'px;';
  if (b.ty != null) style += '--tail-y:' + b.ty + 'px;';
  return '<div class="' + cls + '" style="' + style + '">'
       +   '<div class="speech-bubble__frame"><p class="speech-bubble__text">' + esc(b.text) + '</p></div>'
       +   (b.tail ? '<span class="speech-bubble__tail" aria-hidden="true"></span>' : '')
       + '</div>';
}

/* Idempotent DOM build from COMIC_DATA. Panels are laid out with the physical
   `right` offset (--i) and paged by translating the track. */
function comicBuild(screenId) {
  const cfg = COMIC_DATA[screenId];
  if (!cfg || cfg.kind === 'guess') return;
  let st = comicState[screenId];
  if (!st) {
    st = comicState[screenId] = {
      i: 0, seen: new Array(cfg.panels.length).fill(false),
      done: false, built: false, timer: null, token: 0, reported: false
    };
  }
  if (st.built) return;

  const n     = cfg.panels.length;
  const track = document.getElementById(screenId + '-track');
  const dots  = document.getElementById(screenId + '-dots');
  if (!track) return;

  track.innerHTML = cfg.panels.map(function (p, k) {
    const media = p.src
      ? '<img class="comic-panel-img" src="' + p.src + '" alt="' + esc(p.alt || '') + '" draggable="false" decoding="async">'
      : '<div class="comic-panel-ph">' + esc(p.placeholder || 'איור להפקה') + '</div>';
    return '<div class="comic-panel" id="' + screenId + '-panel-' + k + '" style="--i:' + k + '"'
         +      ' role="group" aria-roledescription="פאנל" aria-label="פאנל ' + (k + 1) + ' מתוך ' + n + '">'
         +   media
         + '</div>';
  }).join('');

  // The bubbles go into the twin track outside .comic-viewport's clip, in panels
  // that reuse .comic-panel so the --i layout, .is-revealed fade and the
  // reduced-motion rules all apply unchanged. The numbered a11y group stays on
  // the art panel above; every non-current panel in BOTH tracks is inert, so the
  // announced order is still "panel image, then that panel's dialogue".
  const bleedTrack = document.getElementById(screenId + '-bleed-track');
  if (bleedTrack) {
    bleedTrack.innerHTML = cfg.panels.map(function (p, k) {
      return '<div class="comic-panel" id="' + screenId + '-bleed-panel-' + k + '" style="--i:' + k + '">'
           +   (p.bubbles || []).map(comicBubbleHtml).join('')
           + '</div>';
    }).join('');
  }

  if (dots) {
    dots.innerHTML = n < 2 ? '' : cfg.panels.map(function (p, k) {
      return '<button class="comic-dot" type="button" role="tab" aria-selected="false"'
           +        ' aria-label="פאנל ' + (k + 1) + '"'
           +        ' onclick="comicSliderGo(\'' + screenId + '\', ' + k + ')"></button>';
    }).join('');
  }

  // Single-panel screens are static: no arrows, no dots, no drag.
  const nav = document.getElementById(screenId + '-nav');
  if (nav) nav.hidden = n < 2;
  ['-prev', '-next'].forEach(function (sfx) {
    const b = document.getElementById(screenId + sfx);
    if (b) b.hidden = n < 2;
  });
  const vp = document.getElementById(screenId + '-viewport');
  if (vp && n < 2) vp.classList.add('is-static');
  if (n > 1) comicAttachDrag(screenId);

  st.built = true;
}

/* resetScreenState() hook — restores the panel, the seen/gate state and the
   bubbles, without animating the restore. */
function comicSliderEnter(screenId) {
  syncPathToggle();
  comicBuild(screenId);
  const st = comicState[screenId];
  if (!st) return;
  comicSliderGo(screenId, st.i, { animate: false });
  // Warm the next panels so a swipe never lands on a blank frame.
  COMIC_DATA[screenId].panels.forEach(function (p) { if (p.src) { const im = new Image(); im.src = p.src; } });
}

function comicSliderGo(screenId, i, opts) {
  const cfg = COMIC_DATA[screenId], st = comicState[screenId];
  if (!cfg || !st) return;
  const n = cfg.panels.length;
  i = Math.max(0, Math.min(n - 1, i));

  comicTracks(screenId).forEach(function (track) {
    if (opts && opts.animate === false) {
      track.style.transition = 'none';
      track.style.transform  = 'translateX(' + (i * 100) + '%)';
      void track.offsetWidth;              // flush, then hand the transition back to CSS
      track.style.transition = '';
    } else {
      track.style.transform = 'translateX(' + (i * 100) + '%)';
    }
  });

  st.i = i;
  st.seen[i] = true;
  const justDone = !st.done && st.seen.every(Boolean);
  if (justDone) st.done = true;            // sticky — never re-gate on return

  // Keep inactive panels out of the a11y and focus trees. Focusing anything in
  // an off-screen panel would scroll the clipping box and permanently offset
  // the strip; scrollLeft = 0 is the belt-and-braces half of that fix.
  // Per track, not one flat query: with the bleed twin a flat `#sN .comic-panel`
  // returns 2n panels and the positional index would be wrong for the second set.
  comicTracks(screenId).forEach(function (t) {
    t.querySelectorAll('.comic-panel').forEach(function (p, k) {
      p.toggleAttribute('inert', k !== i);
      p.setAttribute('aria-hidden', k !== i ? 'true' : 'false');
    });
  });
  const vp = document.getElementById(screenId + '-viewport');
  if (vp) vp.scrollLeft = 0;

  comicRevealBubbles(screenId, i);
  comicUpdateNav(screenId);

  if (justDone && !st.reported) {
    st.reported = true;
    xapiSend('experienced', 'question', null, { category: 'comic-slide-' + cfg.slide });
  }
}

function comicSliderNext(screenId) { const st = comicState[screenId]; if (st) comicSliderGo(screenId, st.i + 1); }
function comicSliderPrev(screenId) { const st = comicState[screenId]; if (st) comicSliderGo(screenId, st.i - 1); }

/* Exactly one timer per panel — the per-bubble stagger is CSS. Triple-guarded,
   because the delay outlives a swipe, a goTo() and a path-toggle switch. */
function comicRevealBubbles(screenId, i) {
  const st = comicState[screenId];
  if (!st) return;
  clearTimeout(st.timer);
  const token = ++st.token;
  document.querySelectorAll('#' + screenId + ' .comic-panel.is-revealed')
          .forEach(function (p) { p.classList.remove('is-revealed'); });
  st.timer = setTimeout(function () {
    if (token !== st.token) return;                        // superseded by a newer panel
    if (currentScreen !== +screenId.slice(1)) return;      // learner navigated away
    if (st.i !== i) return;                                // learner paged away
    // The bubbles live in the bleed panel; the art panel is revealed too so the
    // class keeps meaning "this panel is on screen" for both layers.
    [screenId + '-panel-' + i, screenId + '-bleed-panel-' + i].forEach(function (id) {
      const p = document.getElementById(id);
      if (p) p.classList.add('is-revealed');
    });
  }, COMIC_REDUCED_MOTION.matches ? 200 : COMIC_BUBBLE_DELAY);
}

function comicUpdateNav(screenId) {
  const cfg = COMIC_DATA[screenId], st = comicState[screenId];
  if (!cfg || !st) return;
  const last = cfg.panels.length - 1;
  const prev = document.getElementById(screenId + '-prev');
  const next = document.getElementById(screenId + '-next');
  /* HIDDEN at the ends, not greyed: a disabled arrow still occupies its slot and reads as an
     affordance the learner has failed to use. Requested by QA 2026-08-24 for the first and last
     panel. `disabled` is kept in step so a hidden button can never be reached by keyboard.
     comicBuild() separately hides both for a single-panel screen (n < 2). */
  if (prev) { prev.disabled = st.i === 0;    prev.hidden = st.i === 0; }
  if (next) { next.disabled = st.i === last; next.hidden = st.i === last; }
  document.querySelectorAll('#' + screenId + '-dots .comic-dot').forEach(function (d, k) {
    d.classList.toggle('is-active', k === st.i);
    d.classList.toggle('is-seen', !!st.seen[k]);
    d.setAttribute('aria-selected', k === st.i ? 'true' : 'false');
  });
  const cont = document.getElementById(screenId + '-continue');
  if (cont) cont.disabled = !st.done;
}

/* Pointer drag / swipe. clientX is in SCREEN px while the track's transform is
   in DESIGN px, so every delta is divided by getAppScale(). */
function comicAttachDrag(screenId) {
  const vp = document.getElementById(screenId + '-viewport');
  const tracks = comicTracks(screenId);          // art track + its bubble twin
  if (!vp || !tracks.length || vp.dataset.dragAttached === '1') return;
  vp.dataset.dragAttached = '1';

  let on = false, pid = null, startX = 0, startT = 0, lastX = 0, vpW = 1, moved = false;

  vp.addEventListener('pointerdown', function (e) {
    if (!comicHasSlider(screenId)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    vpW = vp.getBoundingClientRect().width / getAppScale();   // screen px → design px
    on = true; moved = false; pid = e.pointerId;
    startX = lastX = e.clientX; startT = performance.now();
    try { vp.setPointerCapture(pid); } catch (err) {}
    tracks.forEach(function (t) { t.classList.add('is-dragging'); });
    vp.classList.add('is-dragging');
  });

  vp.addEventListener('pointermove', function (e) {
    if (!on || e.pointerId !== pid) return;
    const st = comicState[screenId];
    if (!st) return;
    const last = COMIC_DATA[screenId].panels.length - 1;
    let dx = (e.clientX - startX) / getAppScale();
    if ((st.i === 0 && dx < 0) || (st.i === last && dx > 0)) dx *= 0.32;   // rubber band
    if (Math.abs(dx) > 4) moved = true;
    tracks.forEach(function (t) { t.style.transform = 'translateX(' + (st.i * vpW + dx) + 'px)'; });
    lastX = e.clientX;
  });

  function settle(e) {
    if (!on || (e && e.pointerId !== pid)) return;
    on = false;
    tracks.forEach(function (t) { t.classList.remove('is-dragging'); });
    vp.classList.remove('is-dragging');
    const st = comicState[screenId];
    if (!st) return;
    const dx = ((e ? e.clientX : lastX) - startX) / getAppScale();
    const v  = dx / Math.max(1, performance.now() - startT);   // design px per ms
    // A flick counts only once it has actually travelled: without the distance
    // floor, a tap with a few px of jitter divides by a ~1ms elapsed time and
    // reads as a high-velocity swipe.
    const fling = Math.abs(dx) > 30 ? v : 0;
    let target = st.i;
    if      (dx >  vpW * 0.18 || fling >  0.45) target = st.i + 1;  // RTL: drag right → next
    else if (dx < -vpW * 0.18 || fling < -0.45) target = st.i - 1;
    comicSliderGo(screenId, target);        // clamps and restores the % transform
  }
  vp.addEventListener('pointerup', settle);
  vp.addEventListener('pointercancel', settle);
  // Swallow the synthetic click that ends a drag, so the global zoom/dropdown
  // click listeners can't fire mid-swipe.
  vp.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
}

/* ═══════════════════════════════════════════════════════════
   APPLET — Water displacement (S9, experiments path)
   Ported/extended from the App/ marble-in-cylinder prototype.
   Drag the marble into the cylinder (scale-safe via createPointerDnd)
   → water rises 50→62 mL, the marble sinks, explanation is revealed.
   ═══════════════════════════════════════════════════════════ */
let dispPlaced = false;
let dispDnd = null;
function dispInitDnd() {
  if (dispDnd) return;
  dispDnd = createPointerDnd({
    canDrag: function () { return !dispPlaced; },
    onDrop: function (dragId, targetId) { if (targetId === 'cylinder') dispDrop(); },
  });
  dispDnd.attachSource(document.getElementById('disp-marble'), 'marble');
  dispDnd.attachTarget(document.getElementById('disp-cylinder'), 'cylinder');
}
function dispDrop() {
  if (dispPlaced) return;
  dispPlaced = true;
  document.getElementById('disp-marble').classList.add('placed');
  document.getElementById('disp-drag-hint').textContent = '';
  document.getElementById('disp-cylinder').classList.add('risen');
  document.getElementById('disp-badge').textContent = '62 מ"ל';
  const inst = document.getElementById('disp-instruction');
  if (inst) inst.textContent = 'הגולה שקעה והמים עלו — בואו נבין למה.';
  setTimeout(function () {
    const ex = document.getElementById('disp-explain'); if (ex) ex.hidden = false;
    const say = document.getElementById('s9-say');       if (say) say.hidden = false;
    const rs = document.getElementById('disp-reset');    if (rs) rs.hidden = false;
    const cont = document.getElementById('s9-continue');  if (cont) cont.disabled = false;
  }, 900);
  xapiSend('interacted', 'question', { response: '62' }, { category: 'displacement-applet' });
}
function dispReset() {
  dispPlaced = false;
  const marble = document.getElementById('disp-marble');
  marble.classList.remove('placed'); marble.style.transform = '';
  document.getElementById('disp-drag-hint').textContent = 'גררו אותי למשורה';
  document.getElementById('disp-cylinder').classList.remove('risen');
  document.getElementById('disp-badge').textContent = '50 מ"ל';
  document.getElementById('disp-instruction').textContent = 'הכניסו את הגולה אל תוך המשורה.';
  document.getElementById('disp-explain').hidden = true;
  document.getElementById('s9-say').hidden = true;
  document.getElementById('disp-reset').hidden = true;
  document.getElementById('s9-continue').disabled = true;
}
function dispEnter() {
  dispInitDnd();
  syncPathToggle();
  // Restore or reset the visual to match dispPlaced (keeps a completed applet completed on return).
  if (dispPlaced) {
    document.getElementById('disp-marble').classList.add('placed');
    document.getElementById('disp-drag-hint').textContent = '';
    document.getElementById('disp-cylinder').classList.add('risen');
    document.getElementById('disp-badge').textContent = '62 מ"ל';
    document.getElementById('disp-explain').hidden = false;
    document.getElementById('s9-say').hidden = false;
    document.getElementById('disp-reset').hidden = false;
    document.getElementById('s9-continue').disabled = false;
  } else {
    dispReset();
  }
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
                          phase: null, locked: !!cfg.startLocked };
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
  const chk = document.getElementById(screen + '-scq-check'); if (chk) chk.disabled = false;
}
function scqCheck(screen) {
  const s = SCQ_REG[screen], cfg = s.cfg;
  if (s.answered) { if (cfg.onContinue) cfg.onContinue(); else advanceScreen(); return; }
  if (!s.sel) return;
  s.attempts++;
  const correct = s.sel === cfg.correctId;
  /* xAPI: resolved at send time — xapiQ() reads window.METADATA, which the library fetches
     asynchronously while these registrations run during parse. parentId is the containing item
     (v2.4 §2, mandatory); `response` is the option's visible text and was missing entirely. */
  const q = xapiQ(cfg.item, cfg.qKey || 'q1');
  xapiSend(correct || s.attempts >= cfg.maxAttempts ? 'answered.last' : 'answered', 'question',
    { response: xapiAnswerText(document.querySelector('#' + screen + ' .scq-opt[data-id="' + s.sel + '"]')),
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
  } else { s.phase = 'retry'; scqMark(screen, s.sel, 'wrong'); scqShowPopup(screen, 'retry'); }

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
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden';
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
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  xapiSend('requested.1', 'question', null, { questionId: xapiQ(s.cfg.item, s.cfg.qKey || 'q1').questionId });
  document.getElementById(screen + '-scq-hint-overlay')?.classList.remove('hidden');
}
function scqCloseHint(screen) { document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden'); }
function scqEnter(screen) {
  const s = SCQ_REG[screen]; if (!s) return;
  document.getElementById(screen + '-scq-hint-overlay')?.classList.add('hidden');
  scqClosePopup(screen);
  if (s.done) {
    scqOpts(screen).forEach(o => { o.disabled = true; });   // marks already painted persist
    const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'שנמשיך?'; chk.disabled = false; }
    const hint = document.getElementById(screen + '-scq-hint'); if (hint) hint.style.visibility = 'hidden';
  } else {
    scqReset(screen);
  }
}
function scqReset(screen) {
  const s = SCQ_REG[screen];
  s.sel = null; s.attempts = 0; s.answered = false; s.phase = null;
  scqOpts(screen).forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.setAttribute('aria-checked', 'false');
    o.disabled = !!s.locked;
  });
  const chk = document.getElementById(screen + '-scq-check'); if (chk) { chk.textContent = 'צדקתי?'; chk.disabled = true; }
  const hint = document.getElementById(screen + '-scq-hint'); if (hint) { hint.disabled = false; hint.style.visibility = ''; }
}
/* Shared draggable feedback popup — resets to default position on each open
   (handled in scqShowPopup). Drag is app-scale aware. Attached once per popup. */

/* ═══════════════════════════════════════════════════════════
   APPLET — Aquarium ruler measurement (S10, experiments path)
   Drag the ruler onto the cube's highlighted wall to unlock the volume
   question (10³ = 1,000).
   ═══════════════════════════════════════════════════════════ */
let aqMeasured = false;
let aqDnd = null;
function aqInitDnd() {
  if (aqDnd) return;
  aqDnd = createPointerDnd({
    /* No canDrag gate — the ruler stays draggable after it's already been
       measured once, with no attempt limit. aqMeasure() below is already
       idempotent, so re-dropping it on the cube is a harmless no-op.
       moveSource: the ruler itself follows the pointer and stays wherever
       it's released — no ghost, no snap-back to its starting slot. */
    moveSource: true,
    onDrop: function (dragId, targetId) { if (targetId === 'aq-cube') aqMeasure(); },
  });
  aqDnd.attachSource(document.getElementById('aq-ruler'), 'ruler');
  aqDnd.attachTarget(document.getElementById('aq-cube'), 'aq-cube');
}
/* Toggling visibility, never textContent — see the .aq-ruler-hint comment in unit-css/style.css.
   Clearing the text collapsed the hint's box and dragged the cube 51px sideways (QA 2026-08-25,
   slide 14), which invalidated the ruler alignment the learner had just made. */
function aqHintSpent(spent) {
  document.getElementById('aq-ruler-hint').classList.toggle('is-spent', !!spent);
}
function aqMeasure() {
  if (aqMeasured) return;
  aqMeasured = true;
  aqHintSpent(true);
  scqSetLocked('s10', false);   // unlock the volume question
  xapiSend('interacted', 'question', { response: '10cm' }, { category: 'aquarium-ruler' });
  /* Flushed, unlike the other applets': measuring here is what UNLOCKS s10's graded question, so
     losing it would leave a learner staring at a question they can no longer answer. The purely
     revealing flags — dispPlaced, floodPlaced, measPoured, measRevealed — stay on the debounce on
     purpose: losing one costs a drag, not an answer. */
  try { flushResumeSave(); } catch (e) {}
}
function aqReset() {
  aqMeasured = false;
  const ruler = document.getElementById('aq-ruler');
  ruler.style.transform = '';
  delete ruler.dataset.pdragOffX; delete ruler.dataset.pdragOffY;
  aqHintSpent(false);
}
function aqEnter() {
  aqInitDnd();
  syncPathToggle();
  if (aqMeasured) {
    aqHintSpent(true);
    scqSetLocked('s10', false);
  } else {
    aqReset();
    scqSetLocked('s10', !SCQ_REG['s10'].done);
  }
  scqEnter('s10');
}

/* ═══ Feedback copy — the storyboard's, per QA/TEXT-FIDELITY.md §Agreed policy ═══
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
const FB_RETRY  = { title: 'התשובה אינה נכונה.', body: ['<b>שננסה שוב?</b>'] };
const FB_WRONG2 = 'התשובה אינה נכונה.<br />התשובה הנכונה מסומנת.';
const fbPopups = (correctTitle, explanation) => ({
  retry:   FB_RETRY,
  correct: { title: correctTitle, body: explanation },
  wrong2:  { title: FB_WRONG2,    body: explanation }
});

/* Register the aquarium SCQ instance */
scqRegister({
  screen: 's10',
  correctId: 'd',
  startLocked: true,
  item: '02',
  popups: fbPopups('נכון מאוד!', [   /* sb20/22/23 */
    'למדידת נפח של תיבה משתמשים בסרגל: מודדים את אחת מצלעות הקובייה ומכפילים אותו בעצמו שלוש פעמים — פעם אחת לאורך, פעם אחת לרוחב ופעם אחת לגובה.',
    'אורך הצלע במקרה זה הוא 10 ס"מ וכיוון שכל הצלעות בקובייה זהות:',
    '<span class="section-result-expr">10·10·10=1,000</span>']),
  onContinue: function () { goTo(9); }   // aquarium → displacement applet
});
attachPopupDrag(document.getElementById('s10-scq-popup'));

/* ═══════════════════════════════════════════════════════════
   APPLET — Flooding / overflow (S11, experiments path)
   Drag the rock into the brim-full bowl → water overflows into the
   tray; spilled water = the rock's volume (qualitative demo).
   ═══════════════════════════════════════════════════════════ */
let floodPlaced = false;
let floodDnd = null;
function floodInitDnd() {
  if (floodDnd) return;
  floodDnd = createPointerDnd({
    canDrag: function () { return !floodPlaced; },
    onDrop: function (dragId, targetId) { if (targetId === 'flood-bowl') floodDrop(); },
  });
  floodDnd.attachSource(document.getElementById('flood-rock'), 'rock');
  floodDnd.attachTarget(document.getElementById('flood-bowl'), 'flood-bowl');
}
function floodDrop() {
  if (floodPlaced) return;
  floodPlaced = true;
  document.getElementById('flood-rock').classList.add('placed');
  document.getElementById('flood-hint').textContent = '';
  document.getElementById('flood-bowl').classList.add('flooded');
  const inst = document.getElementById('flood-instruction');
  if (inst) inst.textContent = 'האבן שקעה והמים גלשו לכלי האיסוף — בואו נבין למה.';
  /* The tray's fill is `height 0.6s ease 0.3s`, so it lands at 900ms — the same beat the
     explanation appears on. Marking the scene drained then stops the spill streams, because by
     that point every drop that was going to leave the bowl has arrived (QA 2026-08-24, slide 13:
     the lines should disappear once the flow stops). */
  setTimeout(function () {
    const rs = document.getElementById('flood-reset');    if (rs) rs.hidden = false;
    const cont = document.getElementById('s11-continue');  if (cont) cont.disabled = false;
    document.querySelector('#s11 .flood-scene')?.classList.add('drained');
  }, 900);
  xapiSend('interacted', 'question', { response: 'overflow' }, { category: 'flooding-applet' });
}
function floodReset() {
  floodPlaced = false;
  const rock = document.getElementById('flood-rock');
  rock.classList.remove('placed'); rock.style.transform = '';
  document.getElementById('flood-hint').textContent = 'גררו את האבן לקערה';
  document.getElementById('flood-bowl').classList.remove('flooded');
  document.querySelector('#s11 .flood-scene')?.classList.remove('drained');
  document.getElementById('flood-instruction').textContent = 'הכניסו את האבן לתוך הקערה הגדולה המלאה במים.';
  document.getElementById('flood-reset').hidden = true;
  document.getElementById('s11-continue').disabled = true;
}
function floodEnter() {
  floodInitDnd();
  syncPathToggle();
  if (floodPlaced) {
    document.getElementById('flood-rock').classList.add('placed');
    document.getElementById('flood-hint').textContent = '';
    document.getElementById('flood-bowl').classList.add('flooded');
    document.querySelector('#s11 .flood-scene')?.classList.add('drained');
    document.getElementById('flood-reset').hidden = false;
    document.getElementById('s11-continue').disabled = false;
  } else {
    floodReset();
  }
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Standard-practice progress dots + score branch
   Shared across the practice question screens (S13–S16). One state
   object + one generic renderer. (SP4 matching, metadata item 08,
   is a pending 5th slot — added when the DnD template is ported.)
   ═══════════════════════════════════════════════════════════ */
const PART_02_SLUG = 'methodica-science-volume-solid-01-02';
const PART_03_SLUG = 'methodica-science-volume-solid-01-03';
const PART_02_URL = '../' + PART_02_SLUG + '/index.html';
const PART_03_URL = '../' + PART_03_SLUG + '/index.html';
// Standard practice = 5 questions (metadata items 05,06,07,08,09).
// Screen order ≠ number order: Q4 (matching, item 08) lives on S17, Q5 (item 09) on S16.
var practiceProgress = {
  questions: [
    { number: 1, visited: true,  state: 'current',      screen: 13 },  // item 05 — SCQ
    { number: 2, visited: false, state: 'not-answered', screen: 14 },  // item 06 — SCQ
    { number: 3, visited: false, state: 'not-answered', screen: 15 },  // item 07 — SCQ
    { number: 4, visited: false, state: 'not-answered', screen: 17 },  // item 08 — DnD matching
    { number: 5, visited: false, state: 'not-answered', screen: 16 }   // item 09 — SCQ
  ]
};
function practiceScore() {
  return practiceProgress.questions.filter(q => q.state === 'correct').length;
}
function goToNextPart() {
  /* Closes the practice item the learner is standing on (item 09, or 08 if they came via S17) before
     the component is reported, so the two arrive in order. */
  try { xapiFinishItems(); } catch (e) {}

  const passed = practiceScore() >= 4;

  /* xAPI: the component 'completed', with an explicit result — the library's aggregate is an
     all-correct AND, which would report failure for any partial pass.

     DENOMINATOR 5, not 8. This component has eight graded questions in code (item 02's embedded
     check, the two warm-ups, and the five practice questions), but "what the learner was promised"
     is the practice block: the progress dots count five, and the routing threshold is stated to them
     as 4 מתוך 5. Reporting 8 would make the score mean something the learner was never shown.

     SUCCESS IS THE REAL THRESHOLD HERE, unlike parts 02 and 04. Those have no gate at all — they
     always advance, so completing them is the success condition. Part 01 does have one: ≥4/5 routes
     past remediation. That is a gate that exists in the content, so it is reported rather than
     invented, and the metadata backs it up — recommendedAfterFail names Part 02. */
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson',
      { success: passed, score: { scaled: practiceScore() / 5 } });
  } catch (e) { console.error('[xAPI] completed component 01', e); }

  // ≥80% correct (4/5) → skip remediation (Part 03); else Part 02 (basic practice).
  /* Resume: point the document at the branch actually taken, and record the back-edge so that
     component's first screen knows where "חזרה" leads. Part 03 is reachable from BOTH 01 and 02, and
     resolves correctly because whichever router navigated is the one that wrote the edge. */
  if (RESUME_ENABLED) writeForwardState(passed ? PART_03_SLUG : PART_02_SLUG);
  window.location.href = (passed ? PART_03_URL : PART_02_URL) + window.location.search;
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

/* The warm-up pair (s18 matching, s19 dropdown) gets its own bar. Storyboard slides 42 and 46 ask
   for it in as many words — "מקטע זה מלווה בסרגל שאלה, שאלה 1 מתוך 2" and "…2 מתוך 2" — and QA
   2026-08-24 (slide 20) asked for the same design and behaviour as the five-question bar.

   Nothing about the component needed changing: .progress-question bakes in no count and
   updateProgressQuestion() already takes any state object. Only the state was singular, so this is
   a second one beside practiceProgress rather than a second renderer. */
var warmupProgress = {
  questions: [
    { number: 1, visited: true,  state: 'current',      screen: 18 },  // item 03 — matching (DnD)
    { number: 2, visited: false, state: 'not-answered', screen: 19 }   // item 04 — dropdown
  ]
};
function syncWarmupNav(screen) {
  updateProgressQuestion(document.querySelector('#' + screen + ' .progress-question'), warmupProgress);
}
/* Mirrors practiceEnter: mark visited, promote to current, paint, then hand off to the template's
   own enter(). idx is the 0-based position in warmupProgress.questions. */
function warmupEnter(idx, screen, enterFn) {
  const q = warmupProgress.questions[idx];
  q.visited = true;
  if (q.state === 'not-answered') q.state = 'current';
  syncWarmupNav(screen);
  enterFn(screen);
}
function warmupFinish(idx, screen, isCorrect) {
  const q = warmupProgress.questions[idx];
  q.state = isCorrect ? 'correct' : 'incorrect';
  q.visited = true;
  syncWarmupNav(screen);
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
  item: '05',
  popups: fbPopups('נכון מאוד!', [   /* sb52/54/55 */
    'נפח הגוף שווה לכמות המים שדחק — כלומר ההפרש בין הנפח הסופי לנפח ההתחלתי.',
    '<span class="section-result-expr">73 – 50 = 23</span>',
    'נפח האבן = 23 סמ"ק'])
});
registerPractice(1, {
  correctId: 'a',
  item: '06',
  popups: fbPopups('תשובה נכונה!', [   /* sb57/59/60 */
    'נפח המים שישפכו מהכלי שווה בדיוק לנפח הכדור, כך ניתן למדוד נפח של גוף שלא נכנס במשורה — זוהי שיטת ההצפה.'])
});
registerPractice(2, {
  correctId: 'd',
  item: '07',
  popups: fbPopups('תשובה נכונה!', [   /* sb62/64/65 */
    'הילד מימין השתמש בנתון מדעי שנמדד בפועל על ידי שיטת דחיקת המים.',
    'שאר הילדים הסתמכו על השערות או על מדידות שאינן מתאימות למדידת נפח של גוף בעל צורה שאינה הנדסית.'])
});
registerPractice(4, {
  correctId: 'd',
  item: '09',
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
function ddqRegister(cfg) {
  cfg.placement = {};
  cfg.items.forEach(it => { cfg.placement[it.id] = 'source'; });
  DDQ_REG[cfg.screen] = { cfg: cfg, checked: false, done: false, dnd: null };
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
  const btn = document.getElementById(screen + '-ddq-check'); if (btn) btn.disabled = !allFilled;
}
function ddqCheck(screen) {
  const s = DDQ_REG[screen], cfg = s.cfg;
  if (s.checked) { if (cfg.onContinue) cfg.onContinue(); else advanceScreen(); return; }
  const allCorrect = cfg.targets.every(t => cfg.placement[cfg.correctMap[t.id]] === t.id);
  /* One matching board = one question; a single closing 'answered.last'. `response` lists the
     learner's pairings in a readable form, since there is no single option element to read. */
  const q = xapiQ(cfg.item, cfg.qKey || 'q1');
  xapiSend('answered.last', 'question',
    { response: Object.keys(cfg.placement).map(function (id) { return id + '->' + cfg.placement[id]; }).join(', '),
      success: !!allCorrect,
      score: { scaled: allCorrect ? 1 : 0 } },
    { questionId: q.questionId, parentId: q.parentId });
  XAPI_Q_RESULTS[cfg.item + '/' + (cfg.qKey || 'q1')] = !!allCorrect;
  s.checked = true; s.done = true;
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
  const hint = document.getElementById(screen + '-ddq-hint'); if (hint) hint.style.visibility = 'hidden';
  if (cfg.onFinish) cfg.onFinish(allCorrect);

  /* Synchronous, at the tail and after all painting — same rule as scqCheck's. */
  try { flushResumeSave(); } catch (e) {}
}
/* Hint for a matching question. The scq* hint machinery is keyed on SCQ_REG,
   which the DnD screens do not use, so they get their own thin pair. Overlay
   ids end in -hint-overlay, so goTo() closes them on navigation. */
function ddqHint(screen) {
  const s = DDQ_REG[screen]; if (!s || s.checked) return;
  xapiSend('requested.1', 'question', null, { questionId: xapiQ(s.cfg.item, s.cfg.qKey || 'q1').questionId });
  document.getElementById(screen + '-ddq-hint-overlay')?.classList.remove('hidden');
}
function ddqCloseHint(screen) { document.getElementById(screen + '-ddq-hint-overlay')?.classList.add('hidden'); }
function ddqShowPopup(screen, type) {
  const popup = document.getElementById(screen + '-ddq-popup'); if (!popup) return;
  const cfg = DDQ_REG[screen].cfg.popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  document.getElementById(screen + '-ddq-popup-title').textContent = cfg.title;
  const body = document.getElementById(screen + '-ddq-popup-body');
  body.innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  /* Only a wrong answer has two boards to switch between. Same button shape as the hint
     overlay's, which is what the note asks for. */
  const st = DDQ_REG[screen];
  if (type === 'incorrect' && st.learnerPlacement) {
    /* `answerNote` describes the BOARD, not the answer, so it is rendered here rather than
       written into the copy: ddqSyncAnswerToggle hides it the moment the learner switches to
       their own placement. Storyboard slide 70 puts it directly under the title. */
    if (st.cfg.answerNote) {
      const n = document.createElement('p');
      n.className = 'ddq-answer-note';
      n.id = screen + '-ddq-answer-note';
      n.textContent = st.cfg.answerNote;
      body.insertBefore(n, body.firstChild);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scq-hint-close ddq-answer-toggle';
    b.id = screen + '-ddq-answer-toggle';
    b.onclick = function () { ddqToggleAnswer(screen); };
    body.appendChild(b);
    ddqSyncAnswerToggle(screen);
  }
  popup.classList.remove('hidden');
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
/* The label names what the button will SHOW next, not what is on screen now. */
function ddqSyncAnswerToggle(screen) {
  const s = DDQ_REG[screen];
  const b = document.getElementById(screen + '-ddq-answer-toggle');
  if (!s || !b) return;
  b.textContent = (s.answerView === 'correct') ? 'התשובה שלי' : 'תשובה נכונה';  const n = document.getElementById(screen + '-ddq-answer-note');
  if (n) n.style.display = (s.answerView === 'correct') ? '' : 'none';
}
function ddqClosePopup(screen) { document.getElementById(screen + '-ddq-popup')?.classList.add('hidden'); }
function ddqEnter(screen) {
  const s = DDQ_REG[screen]; if (!s) return;
  ddqClosePopup(screen);
  if (!s.done) {
    s.checked = false;
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
  const hint = document.getElementById(screen + '-ddq-hint');
  if (hint) hint.style.visibility = s.done ? 'hidden' : '';
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

/* Standard practice Q4 (item 08) — match each body to its measurement method */
registerPracticeDnD(3, {
  item: '08',
  /* ⚠️ The three PNGs were rotated against their own filenames — s17-metal-cube.png held the
     trophy, s17-shell.png the cube, s17-trophy.png the shell — so every pill on this board, and
     the שדף pill on S18 that borrows s17-shell.png, drew the wrong object beside a correct label.
     Fixed by renaming the FILES to match their contents (2026-08-26), not by remapping these
     paths: a path that points at a lying filename only moves the trap. The mapping below is the
     obvious one and should stay obvious — check the picture, not the name, if it ever looks off. */
  items: [
    { id: 'metal-cube', label: 'קוביית מתכת', img: 'assets/img/s17-metal-cube.png', w: 96 },
    { id: 'shell',      label: 'צדפה',        img: 'assets/img/s17-shell.png',      w: 92 },
    { id: 'goblet',     label: 'גביע גדול',   img: 'assets/img/s17-trophy.png',     w: 86 }
  ],
  targets: [
    { id: 't-ruler',    label: 'מדידה הנדסית בעזרת סרגל' },
    { id: 't-displace', label: 'שיטת דחיקת המים' },
    { id: 't-flood',    label: 'שיטת ההצפה' }
  ],
  correctMap: { 't-ruler': 'metal-cube', 't-displace': 'shell', 't-flood': 'goblet' },
  /* Copy verbatim from storyboard slides 69 (correct) and 70 (wrong). Slide 70's second line,
     'התשובה הנכונה מוצגת.', is `answerNote` and not body copy — see ddqShowPopup. */
  answerNote: 'התשובה הנכונה מוצגת.',
  popups: {
    correct:   { title: 'תשובה נכונה!', body: ['קוביית המתכת היא גוף הנדסי ולכן נבצע מדידה הנדסית.', 'צדפה היא גוף שאינו הנדסי וקטן מספיק להיכנס למשורה ולכן נבצע דחיקת מים.', 'גביע הוא גוף שאינו הנדסי ולא נכנס במשורה ולכן נבצע את שיטת ההצפה.'] },
    incorrect: { title: 'התשובה אינה נכונה.', body: ['קוביית המתכת היא גוף הנדסי ולכן נבצע מדידה הנדסית.', 'צדפה היא גוף שאינו הנדסי וקטן מספיק להיכנס למשורה ולכן נבצע דחיקת מים.', 'גביע הוא גוף שאינו הנדסי ולא נכנס במשורה ולכן נבצע את שיטת ההצפה.'] }
  }
});

/* ═══════════════════════════════════════════════════════════
   WARM-UPS (metadata items 03–04) — precede standard practice.
   Standalone (no progress-dots). S18 matching (DnD), S19 choice (SCQ).
   ═══════════════════════════════════════════════════════════ */
ddqRegister({
  screen: 's18',
  item: '03',
  items: [
    // Storyboard slide 42 puts a small photo inside each task card. The שדף photo
    // is the one from S17 (slide 42 illustrates this task with a בלוט, which the
    // script later renamed to צדף — reusing S17's shell keeps art and copy agreed).
    /* QA 2026-08-25 (slide 21): DELIBERATELY out of order. These five used to sit in the same
       sequence as `targets` below, so the nth pill was always the answer to the nth target and the
       matching could be done by position without reading anything. The order asked for is melon
       first, cube second-to-last, cup last; the other two fill the middle. Checked against
       correctMap: no pill now sits at the index of its own target. */
    { id: 'wu-melon', label: 'מה המסה של האבטיח?',                  img: 'assets/img/s18-task-watermelon.jpg', w: 64 },
    { id: 'wu-doll',  label: 'מהו הנפח של בובת הפלסטיק הגדולה?',    img: 'assets/img/s18-task-doll.jpg',       w: 90 },
    { id: 'wu-shell', label: 'מהו הנפח של הצדף הקטן?',              img: 'assets/img/s17-shell.png',           w: 68 },
    { id: 'wu-cube',  label: 'מה אורך הצלע של הקובייה?',            img: 'assets/img/s18-task-rubik.jpg',      w: 66 },
    { id: 'wu-cup',   label: 'כמה מים יש בכוס?',                    img: 'assets/img/s18-task-water-cup.jpg',  w: 72 }
  ],
  targets: [
    { id: 'wt-pour',     label: 'מזיגה למשורה' },
    { id: 'wt-ruler',    label: 'מדידה בסרגל' },
    { id: 'wt-scale',    label: 'מדידה במאזניים דיגיטליים' },
    { id: 'wt-displace', label: 'שיטת דחיקת מים' },
    { id: 'wt-flood',    label: 'שיטת ההצפה' }
  ],
  correctMap: { 'wt-pour': 'wu-cup', 'wt-ruler': 'wu-cube', 'wt-scale': 'wu-melon', 'wt-displace': 'wu-shell', 'wt-flood': 'wu-doll' },
  /* Copy from storyboard slides 45 (correct) and 44 (wrong) — both slides carry the same two
     explanation lines. Slide 45 reads 'כל שיטת מדידה מתאימים'; that is a typo in the deck
     (slide 44 has the agreeing 'מתאימה'), so both use the agreeing form here. */
  answerNote: 'ההתאמה הנכונה מוצגת.',
  popups: {
    correct:   { title: 'התאמה מושלמת!', body: ['כל שיטת מדידה מתאימה למשימה אחרת.', 'כדי לבחור נכון, חשוב לזהות מה רוצים למדוד והאם מדובר בנוזל, בגוף בעל צורה הנדסית או בגוף בעל צורה מורכבת.'] },
    incorrect: { title: 'התשובה אינה נכונה.', body: ['כל שיטת מדידה מתאימה למשימה אחרת.', 'כדי לבחור נכון, חשוב לזהות מה רוצים למדוד והאם מדובר בנוזל, בגוף בעל צורה הנדסית או בגוף בעל צורה מורכבת.'] }
  },
  onFinish: function (ok) { warmupFinish(0, 's18', ok); },
  onContinue: function () { goTo(19); }
});
attachPopupDrag(document.getElementById('s18-ddq-popup'));

scqRegister({
  screen: 's19',
  correctId: 'a',
  item: '04',
  popups: fbPopups('נכון מאוד!', [   /* sb48/49 */
    'כשמכניסים גוף מוצק למים, הגוף תופס מקום בתוך המשורה ולכן מפלס המים עולה.',
    'ההפרש בין קריאת הנפח לפני הכנסת הגוף ולאחריה שווה לנפח הגוף.']),
  onFinish: function (ok) {   // reflect result on the dropdown trigger, and on the warm-up bar
    const t = document.getElementById('s19-dropdown-trigger');
    if (t) { t.classList.remove('correct', 'wrong'); t.classList.add(ok ? 'correct' : 'wrong'); }
    warmupFinish(1, 's19', ok);
  },
  onContinue: function () { goTo(32); }   // → practice rules (sb50) → Q1
});
attachPopupDrag(document.getElementById('s19-scq-popup'));

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — DropdownQuestion (thin UI over the SCQ controller)
   The word-menu options are .scq-opt (dqPick → scqSelect); the SCQ
   controller drives check/feedback; the trigger reflects the result.
   ═══════════════════════════════════════════════════════════ */
function dqToggle(screen) {
  const s = SCQ_REG[screen]; if (s && s.answered) return;
  document.getElementById(screen + '-answers').classList.toggle('hidden');
}
function dqPick(screen, id, label) {
  scqSelect(screen, id);
  const tr = document.querySelector('#' + screen + '-dropdown-trigger .dropdown-trigger-text');
  if (tr) tr.textContent = label;
  document.getElementById(screen + '-answers').classList.add('hidden');
}
/* Space reserved beside the longest option for the open-arrow. */
const DQ_CARET_ROOM = 50;
function dqEnter(screen) {
  const s = SCQ_REG[screen];
  const trigger = document.getElementById(screen + '-dropdown-trigger');
  const list = document.getElementById(screen + '-answers');
  if (trigger && list) {
    /* The trigger is sized to the longest word in the list PLUS room for the caret. The list is
       content-sized by its widest option, so list.offsetWidth is that longest word; the caret is
       absolutely positioned and so contributes nothing, which is why it needs adding explicitly —
       without it the arrow sat on top of the chosen word (QA 2026-08-24, slide 20, which suggested
       ~50px). list.offsetWidth ignores the canvas-wide scale() transform (unlike
       getBoundingClientRect), so this stays correct at any zoom. Briefly un-hide to measure —
       .hidden is display:none, which cannot be measured — then restore, all before paint. */
    const wasHidden = list.classList.contains('hidden');
    if (wasHidden) list.classList.remove('hidden');
    trigger.style.width = (list.offsetWidth + DQ_CARET_ROOM) + 'px';
    if (wasHidden) list.classList.add('hidden');
  }
  if (trigger && s && !s.done) {
    trigger.classList.remove('correct', 'wrong');
    const tr = trigger.querySelector('.dropdown-trigger-text');
    if (tr) tr.textContent = 'בחרו מילה';
  }
  list?.classList.add('hidden');
  scqEnter(screen);
}
/* Close any open dropdown when clicking outside it. */
document.addEventListener('click', function (e) {
  if (e.target.closest('.dropdown')) return;
  document.querySelectorAll('.dropdown-list:not(.hidden)').forEach(l => l.classList.add('hidden'));
});

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — FlipCardsReveal (S20)
   N cards; click each to flip (image front → fact back). Continue
   unlocks once every card has been revealed at least once.
   ═══════════════════════════════════════════════════════════ */
const flipState = {};
/* One card open at a time — opening one turns the others back over (QA 2026-08-24, slide 14).
   flipState is the SEEN ledger, not the open one: it keeps recording every card the learner has
   turned, because that is what unlocks Continue, and it must not be cleared when a card closes. */
function flipCard(screen, cardEl) {
  const wrap = cardEl.closest('.flip-grid') || document.getElementById(screen + '-flip');
  if (wrap) wrap.querySelectorAll('.flip-card.flipped').forEach(c => {
    if (c !== cardEl) c.classList.remove('flipped');
  });
  cardEl.classList.add('flipped');
  (flipState[screen] = flipState[screen] || {})[cardEl.dataset.card] = true;
  flipUpdateContinue(screen);
}
/* Gated on the SEEN ledger, not on what is currently face-up. Since only one card can be open at
   a time now, "every card is .flipped" is a state that can never occur — reading the DOM here
   would leave Continue disabled forever. */
function flipUpdateContinue(screen) {
  const cards = document.querySelectorAll('#' + screen + '-flip .flip-card');
  const seen = flipState[screen] || {};
  const all = cards.length > 0 && [...cards].every(c => !!seen[c.dataset.card]);
  const cont = document.getElementById(screen + '-continue');
  if (cont) cont.disabled = !all;
}
function flipEnter(screen) {
  syncPathToggle();
  /* Back to all-face-down on re-entry: with one card open at a time there is no "the cards were
     like this when I left" to restore, and re-flipping every seen card would put the screen in a
     state the learner can no longer reach by clicking. Continue still reflects the ledger. */
  document.querySelectorAll('#' + screen + '-flip .flip-card').forEach(c => c.classList.remove('flipped'));
  flipUpdateContinue(screen);
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Guess-question (no feedback). Pick any option →
   a companion bubble appears and Continue unlocks. No scoring.
   ═══════════════════════════════════════════════════════════ */
const guessPicked = {};
/* The mascot and his line arrive TOGETHER, on the pick — QA 2026-08-24 asked for this on every
   guess screen: he used to stand there from arrival with nothing to say, which reads as a loading
   glitch rather than a reaction. So the whole .companion-say group is what toggles, not the bubble
   alone; the bubble's own authored `hidden` is cleared at the same time so revealing the group
   reveals both. Screens are display:none until they are the current one, so nothing flashes. */
function guessSayToggle(screen, show) {
  const bubble = document.getElementById(screen + '-guess-bubble');
  if (!bubble) return;
  bubble.classList.toggle('hidden', !show);
  bubble.closest('.companion-say')?.classList.toggle('hidden', !show);
}
/* The options are template .scq-opt pills, so the picked state is `.selected` — the class
   .scq-opt.selected .scq-radio keys on to fill the radio — and aria-checked follows it. */
function guessPick(screen, btn) {
  document.querySelectorAll('#' + screen + '-guess .guess-opt').forEach(o => {
    o.classList.remove('selected');
    o.setAttribute('aria-checked', 'false');
  });
  btn.classList.add('selected');
  btn.setAttribute('aria-checked', 'true');
  guessPicked[screen] = btn.dataset.id;
  guessSayToggle(screen, true);
  const cont = document.getElementById(screen + '-continue'); if (cont) cont.disabled = false;
  xapiSend('interacted', 'question', { response: btn.dataset.id }, { category: 'guess' });
}
function guessEnter(screen) {
  syncPathToggle();
  const picked = guessPicked[screen];
  document.querySelectorAll('#' + screen + '-guess .guess-opt').forEach(o => {
    const sel = o.dataset.id === picked;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  guessSayToggle(screen, !!picked);
  const cont = document.getElementById(screen + '-continue'); if (cont) cont.disabled = !picked;
}

/* ═══════════════════════════════════════════════════════════
   APPLET — Multi-step measurement (S22, experiments path)
   4 steps: drag king→cylinder → type volume (reveal 15) → drag
   hammer→bowl → type volume (reveal 250). Wrong vessel bounces back.
   Numeric inputs have no feedback (any value proceeds).
   ═══════════════════════════════════════════════════════════ */
const MEAS = {
  1: { screen: 22, obj: true, objImg: 's22-chess-king.svg', objLabel: 'כלי שח-מט', correct: 'cyl',
       instruction: 'שלב 1: גררו את כלי השח-מט אל כלי המדידה המתאים.' },
  2: { screen: 22, input: true, instruction: 'שלב 2: מדדו את מפלס המים במשורה כעת והקלידו את נפחו של כלי השח-מט.',
       inputLabel: 'נפח כלי השח-מט (מ"ל):',
       reveal: 'נפח כלי השח-מט הוא 15 מ"ל. מפלס המים המקורי במשורה היה 50 מ"ל והוא עלה ל-65 מ"ל, ולכן: 65 − 50 = 15.' },
  /* Deck slide 36 states the instruction without explaining WHY the cylinder is wrong — naming
     "too big for the cylinder" here would hand over the judgement this step exists to test. */
  3: { screen: 34, obj: true, objImg: 's22-hammer.svg', objLabel: 'פטיש', correct: 'bowl',
       instruction: 'שלב 3: גררו את הפטיש אל כלי המדידה המתאים.' },
  /* `pour` gates the input behind a real action: slide 37 says the level reaches 250 מ"ל "לאחר
     שהלומד שופך את המים לתוך כלי המדידה" — after the LEARNER pours. The target is the graduated
     MEASURING VESSEL (`mv`), not the משורה: slide 36 is explicit that the משורה still reads 65,
     and slide 38 puts the 250 in "כלי המדידה". Those are two different vessels. */
  4: { screen: 34, input: true, last: true, pour: true, correct: 'mv',
       instruction: 'שלב 4: שפכו את המים מכלי האיסוף אל תוך כלי המדידה והקלידו את נפח הפטיש.',
       inputLabel: 'נפח הפטיש (מ"ל):',
       reveal: 'המים שנשפכו היו בנפח 250 מ"ל — כלומר נפח הפטיש הוא 250 מ"ל, כי הוא הציף החוצה כמות מים השווה לנפחו!' }
};
let measStep = 1, measDone = false, measRevealed = false, measPoured = false;
const measDnd = {};

/* The four steps run across TWO screens (QA 2026-08-24, slide 15): steps 1-2 on s22, steps 3-4 on
   s34. Each screen owns its own copy of the stage, so every element id is prefixed — `meas-` on
   s22, `meas2-` on s34 — and every lookup goes through mEl(). MEAS[step].screen is the single
   source of truth for which half a step belongs to. */
function measPrefix(step) { return MEAS[step || measStep].screen === 22 ? 'meas' : 'meas2'; }
function mEl(name, step) { return document.getElementById(measPrefix(step) + '-' + name); }
function measScreenId(step) { return 's' + MEAS[step || measStep].screen; }

function measInitDnd() {
  const pfx = measPrefix();
  if (measDnd[pfx]) return;
  const d = createPointerDnd({
    canDrag: function (dragId) {
      if (dragId === 'tray') return !!MEAS[measStep].pour && !measPoured;
      return !!MEAS[measStep].obj;
    },
    onDrop: function (id, vesselId) {
      if (id === 'tray') measPourInto(vesselId);
      else measDropVessel(vesselId);
    },
  });
  const src  = document.getElementById(pfx + '-object');
  const tray = document.getElementById(pfx + '-tray');
  if (src)  d.attachSource(src, 'obj');
  if (tray) d.attachSource(tray, 'tray');
  ['cyl', 'bowl', 'mv'].forEach(function (v) {
    const t = document.getElementById(pfx + '-' + v);
    if (t) d.attachTarget(t, v);
  });
  measDnd[pfx] = d;
}
function measShowError() {
  const err = mEl('error');
  if (!err) return;
  err.classList.remove('hidden');
  setTimeout(function () { err.classList.add('hidden'); }, 1800);
}
/* Pouring the collection tray into the graduated measuring vessel — step 4 only. */
function measPourInto(v) {
  const cfg = MEAS[measStep];
  if (!cfg.pour || measPoured) return;
  const tray = mEl('tray');
  if (tray) { tray.classList.remove('dragging'); tray.style.transform = ''; }
  if (v !== cfg.correct) { measShowError(); return; }
  measPoured = true;
  measRender();
  xapiSend('interacted', 'question', { response: 'poured' }, { category: 'measurement-applet' });
}
function measDropVessel(v) {
  const cfg = MEAS[measStep];
  if (!cfg.obj) return;
  if (v === cfg.correct) { measRevealed = false; measStep++; measRender(); }
  else measShowError();
}
function measInputChange() {
  const inp = mEl('input');
  mEl('confirm').disabled = inp.value.trim() === '';
}
function measConfirm() {
  const cfg = MEAS[measStep];
  if (!cfg.input) return;
  measRevealed = true;
  xapiSend('interacted', 'question', { response: mEl('input').value }, { category: 'measurement-applet' });
  if (cfg.last) measDone = true;
  measRender();
  /* Only on completion — the applet's own step-to-step moves navigate, which arms a save anyway. */
  if (cfg.last) { try { flushResumeSave(); } catch (e) {} }
}
/* Step 2 -> 3 crosses the screen boundary, so "המשך לשלב הבא" navigates rather than repainting. */
function measNext() {
  const wasScreen = MEAS[measStep].screen;
  const inp = mEl('input');
  if (inp) inp.value = '';
  measStep++; measRevealed = false;
  if (MEAS[measStep] && MEAS[measStep].screen !== wasScreen) { goTo(MEAS[measStep].screen); return; }
  measRender();
}
function measRender() {
  const step = measStep, cfg = MEAS[step];
  const el = function (n) { return mEl(n); };
  if (!el('instruction')) return;              // this half of the applet is not in the DOM
  el('instruction').textContent = cfg.instruction;
  const isDrag = !!cfg.obj, isInput = !!cfg.input;
  /* On a pour step the input waits for the pour; on every other input step it is immediate. */
  const inputReady = isInput && (!cfg.pour || measPoured);
  el('object-zone').classList.toggle('hidden', !isDrag);
  if (isDrag) {
    el('object-icon').innerHTML = '<img class="meas-obj-img" src="assets/img/' + cfg.objImg + '" alt="" draggable="false">';
    el('object-label').textContent = cfg.objLabel;
    const obj = el('object'); obj.classList.remove('dragging'); obj.style.transform = '';
  }
  el('input-row').classList.toggle('hidden', !(inputReady && !measRevealed));
  if (isInput) el('input-label').textContent = cfg.inputLabel;
  if (inputReady && !measRevealed) el('confirm').disabled = el('input').value.trim() === '';
  const reveal = el('reveal');
  reveal.classList.toggle('hidden', !measRevealed);
  if (measRevealed) reveal.textContent = cfg.reveal;
  el('next').classList.toggle('hidden', !(measRevealed && !cfg.last));
  el('error').classList.add('hidden');
  /* The tray is only grabbable while its pour is still pending. */
  if (el('tray')) el('tray').classList.toggle('is-pourable', awaitingPourFlag(cfg));
  if (el('pour-hint')) el('pour-hint').classList.toggle('hidden', !awaitingPourFlag(cfg));
  /* The משורה reads 50 before the king goes in and 65 after — and STAYS at 65 through steps 3-4
     (slide 36 says so). The 250 belongs to the measuring vessel, which only exists on s34. */
  el('cyl-badge').textContent = (step >= 2) ? '65 מ"ל' : '50 מ"ל';
  el('cyl').classList.toggle('has-king', step >= 2);
  if (el('mv')) {
    el('mv').classList.toggle('filled', measPoured);
    el('mv-badge').textContent = measPoured ? '250 מ"ל' : '0 מ"ל';
  }
  /* The tray holds the water the hammer displaced until the learner pours it across. */
  if (el('bowl')) el('bowl').classList.toggle('overflowed', step >= 4 && !measPoured);
  const cont = document.getElementById(measScreenId() + '-continue');
  if (cont) cont.disabled = (cfg.screen === 34) ? !measDone : !(step > 2 || measRevealed);
}
function awaitingPourFlag(cfg) { return !!cfg.pour && !measPoured; }
function measEnter() {
  measInitDnd();
  syncPathToggle();
  measRender();
}

// ============================================================
//  REPORT MODAL
// ============================================================

// screen -> [subContent suffix, page-in-item] ; null = no matching subContent
/* ═══════════════════════════════════════════════════════════
   xAPI (720) — per-part seams
   ═══════════════════════════════════════════════════════════ */

/* All 33 screens. The previous map had four entries and used THREE-digit suffixes ('001'), which
   match nothing in the catalog — metadata items are '-01'…'-09'. So 29 screens reported no item and
   the other four reported one that does not exist.

   Item boundaries come from the metadata titles, which describe the pedagogy:
     01  Motivational  "הוק: רוני מוצאת תליון על החוף"                         — the hook
     02  Instruction   "הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים)"  — the whole acquisition
     03  Practice      "חימום 1"                                              — warm-up 1
     04  Practice      "חימום 2"                                              — warm-up 2
     05-09 Practice    "סטנדרטי 1-5"                                          — the five practice Qs

   Item 02 is deliberately large: its title names the playlist, so BOTH branches of the path choice
   belong to it, and it closes only when the learner leaves the merge screen for warm-up 1. That is
   also why it holds exactly one catalog question (q1, on s10) despite spanning ~19 screens.

   Flow order is neither screen order nor DOM order:
     hook          0 → 1 → 2 → 3 → 4
     acquisition   5 → 6 → 7 ─┬─ comic:       8 → 23 → 24 → 25 → 26 → 27 → 28 ─┐
                              └─ experiments: 10 → 29 → 9 → 21 → 11 → 20 → 22 → 30 → 31 ─┤
                                                                          merge 12 ←──────┘
     practice      12 → 18 → 19 → 32 → 13 → 14 → 15 → 17 → 16 → (Part 02 or 03)

   Page numbers run in that flow order and are unique within an item, so a bug report identifies the
   screen even where two branches cover the same item. */
var SCREEN_TO_SUBCONTENT = {
  /* pre-content */
  0:  null,           // companion picker — decoration, not learning content

  /* item 01 — the hook */
  1:  ['01', 1],      // רוני מצאה אוצר?
  2:  ['01', 2],      // open question (free text)
  3:  ['01', 3],      // the pendant
  4:  ['01', 4],      // למה חשוב למדוד נפח של חפץ מוצק?

  /* item 02 — acquisition: the shared opening */
  5:  ['02', 1],      // Archimedes intro
  6:  ['02', 2],
  7:  ['02', 3],      // איך נמדוד נפח של מוצק? — the playlist choice

  /* item 02 — comic branch */
  8:  ['02', 4],
  23: ['02', 5],
  24: ['02', 6],
  25: ['02', 7],
  26: ['02', 8],
  27: ['02', 9],
  28: ['02', 10],

  /* item 02 — experiments branch, in flow order (10 → 29 → 9 → 21 → 11 → 33 → 20 → 22 → 30 → 31) */
  10: ['02', 11],     // aquarium ruler + the item's ONLY catalog question (q1)
  29: ['02', 12],     // guess (sb24)
  9:  ['02', 13],     // displacement applet
  21: ['02', 14],     // guess
  11: ['02', 15],     // flooding applet (sb28)
  33: ['02', 16],     // flooding result (sb29) — split out of the applet
  20: ['02', 17],     // flip cards — real-world uses
  22: ['02', 18],     // measurement applet — steps 1-2 (sb33-35)
  34: ['02', 19],     // measurement applet — steps 3-4 (sb36-38)
  30: ['02', 20],     // overflow can — the question
  31: ['02', 21],     // overflow can — how it works

  /* item 02 — where both branches merge and the item ends */
  12: ['02', 20],     // כל הכבוד! סיימתם את שלב הלימוד

  /* items 03, 04 — the warm-ups */
  18: ['03', 1],      // חימום 1 — matching (DnD)
  19: ['04', 1],      // חימום 2 — dropdown

  /* bridge */
  32: null,           // אפשר להתחיל! — practice rules; belongs to no catalog item

  /* items 05-09 — the five practice questions. NOTE screen order != question order:
     Q4 (item 08) is on s17 and Q5 (item 09) on s16. */
  13: ['05', 1],      // סטנדרטי 1
  14: ['06', 1],      // סטנדרטי 2
  15: ['07', 1],      // סטנדרטי 3
  17: ['08', 1],      // סטנדרטי 4
  16: ['09', 1]       // סטנדרטי 5
};

var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-01';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* Items carrying a graded question IN CODE. Item 01 is absent: it is the hook, walked through rather
   than answered, and the metadata gives it no questions at all. Its open-text screen (s2) records an
   'interacted', not an 'answered' — see the note at hookOpenReveal(). */
var XAPI_EVAL_ITEMS = { '02': 1, '03': 1, '04': 1, '05': 1, '06': 1, '07': 1, '08': 1, '09': 1 };

/* ═══════════════════ xAPI (720 LMS common host) ═══════════════════
   Loaded from the MOE 720 platform's own common host (not a 3rd-party
   CDN); fails gracefully offline. Fires learning statements. */

/* Per-part seam read by unit-js/50-loader.js. */
var XAPI_METADATA_FILE = '../metadata/methodica-science-volume-solid-01-01.json';

/* ═══════════════════════════════════════════════════════════
   RESUME — this component's payload
   The largest by far: 33 screens, a branching playlist, three applets, a comic slider, flip cards,
   two guess screens, a matching board and five practice questions.

   What makes it tractable is that MOST of it already restores itself. imgqEnter, dispEnter, aqEnter,
   floodEnter, flipEnter, guessEnter, comicSliderEnter, measEnter→measRender, scqEnter's `done` branch
   and ddqEnter+ddqRender all rebuild their screen from the variables the second assignment pass has
   just restored. So the payload's job is to carry those variables faithfully, and restoreScreenUI()
   only has to fill the four gaps where an enter() does not repaint everything.
   ═══════════════════════════════════════════════════════════ */

/* Plain booleans and counters, copied verbatim.
   ⚠️ The four *Dnd controllers (dispDnd, aqDnd, floodDnd, measDnd) are deliberately ABSENT: they are
   live pointer-drag controllers bound to DOM nodes that no longer exist after a reload. Capturing one
   would serialise to {} and restoring it would convince the enter() that the applet is already wired
   when it is not. */
var RESUME_PLAIN_VARS = ['dispPlaced', 'aqMeasured', 'floodPlaced',
                         'measStep', 'measDone', 'measRevealed', 'measPoured'];

/* Typed answers live only in the DOM — no variable holds them — so they travel by element id.
   Reading them at capture time is safe: no branch clears these, only disables. */
var RESUME_INPUT_IDS = ['s2-open-text', 'meas-input', 'meas2-input'];
var RESUME_TEXT_IDS  = [];

function captureResumeInputs() {
  var out = {};
  RESUME_INPUT_IDS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) out[id] = el.value;
  });
  return out;
}

/* Comic sliders: only the MUTABLE half.
   `built`, `timer` and `token` are DOM/timer identity, not learner state — and restoring built:true
   would make comicBuild() early-return against an empty track after a reload, leaving a blank comic.
   `seen` is an array, so it is sliced rather than referenced.
   `reported` is what stops a resumed panel re-emitting its 'experienced'. */
function captureComicState() {
  return Object.keys(comicState).reduce(function (o, k) {
    var s = comicState[k];
    o[k] = { i: s.i, seen: (s.seen || []).slice(), done: !!s.done, reported: !!s.reported };
    return o;
  }, {});
}

function applyComicState(comic) {
  if (!comic) return;
  Object.keys(comic).forEach(function (k) {
    var cur = comicState[k];
    if (!cur) return;   // not built yet — comicBuild() seeds it, then the second pass re-applies
    var src = comic[k];
    cur.i = src.i;
    cur.seen = (src.seen || []).slice();
    cur.done = !!src.done;
    cur.reported = !!src.reported;
  });
}

/* SCQ: mutable subset. `locked` matters — s10's options start locked until the aquarium ruler has
   been dragged, and a restored answered s10 must not come back locked. */
function captureScqState() {
  return Object.keys(SCQ_REG).reduce(function (o, k) {
    var s = SCQ_REG[k];
    o[k] = { sel: s.sel, attempts: s.attempts, answered: !!s.answered, done: !!s.done,
             phase: s.phase || null, locked: !!s.locked };
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
             correctPlacement: s.correctPlacement ? Object.assign({}, s.correctPlacement) : null };
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

/* ⚠️ Everything nested is COPIED, never referenced — see the note in part 04. */
function capturePartPayload() {
  var st = {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    /* The mascot rides in localStorage across parts, but learningPath is JS-only and decides which
       branch switchLearningPath() and advanceFromPathChoice() offer next. */
    lomdaState: {
      selectedCharacter: window.lomdaState.selectedCharacter,
      learningPath: window.lomdaState.learningPath
    },
    imgqRevealed: Object.assign({}, imgqRevealed),
    comic: captureComicState(),
    guessPicked: Object.assign({}, guessPicked),
    /* flipState is {screen: {cardId: true}} — two levels, so a shallow copy is not enough. */
    flipState: Object.keys(flipState).reduce(function (o, k) {
      o[k] = Object.assign({}, flipState[k]); return o;
    }, {}),
    scq: captureScqState(),
    ddq: captureDdqState(),
    practice: capturePracticeState(),
    inputs: captureResumeInputs(),
    vars: {}
  };
  RESUME_PLAIN_VARS.forEach(function (k) {
    try { st.vars[k] = eval(k); } catch (e) {}
  });
  return st;
}

/* The parameter MUST stay named `st` — the eval below assigns through that name, and renaming it
   fails SILENTLY. See unit-js/README.md. */
function applyResumeVars(st) {
  if (st.qResults) XAPI_Q_RESULTS = Object.assign({}, st.qResults);
  if (st.lomdaState) {
    window.lomdaState.selectedCharacter = st.lomdaState.selectedCharacter;
    window.lomdaState.learningPath      = st.lomdaState.learningPath;
  }
  if (st.imgqRevealed) imgqRevealed = Object.assign({}, st.imgqRevealed);
  applyComicState(st.comic);
  if (st.guessPicked) Object.keys(st.guessPicked).forEach(function (k) { guessPicked[k] = st.guessPicked[k]; });
  if (st.flipState) Object.keys(st.flipState).forEach(function (k) { flipState[k] = Object.assign({}, st.flipState[k]); });
  applyScqState(st.scq);
  applyDdqState(st.ddq);
  applyPracticeState(st.practice);
  if (st.vars) {
    Object.keys(st.vars).forEach(function (k) {
      if (RESUME_PLAIN_VARS.indexOf(k) === -1) return;   // never assign an unlisted name
      try { eval(k + ' = st.vars[k];'); } catch (e) {}
    });
  }
}

function applyResumeDom(st) {
  RESUME_INPUT_IDS.forEach(function (id) {
    if (!st.inputs || typeof st.inputs[id] !== 'string') return;
    var el = document.getElementById(id);
    if (el) el.value = st.inputs[id];
  });
}

/* The five gaps where an enter() does not repaint everything.

   Everything NOT listed here is deliberately absent because its enter() already handles it:
   the three applets branch on dispPlaced / aqMeasured / floodPlaced to redraw the completed look;
   measEnter→measRender rebuilds entirely from measStep / measDone / measRevealed / measPoured; flipEnter repaints
   from flipState; guessEnter from guessPicked; imgqEnter from imgqRevealed. Adding redundant
   painters here would be dead code that drifts. */
var SCQ_RESTORE_SCREENS = [10, 13, 14, 15, 16, 19];
var DDQ_RESTORE_SCREENS = [17, 18];

function restoreScreenUI(n) {
  try {
    /* 1. s2 — hookOpenInput() derives the hint/continue gate from the textarea, but only on input.
           applyResumeDom() puts the text back afterwards, so the gate has to be re-derived. */
    if (n === 2) hookOpenInput();

    /* 2. the SCQ screens — scqEnter()'s `done` branch disables options and relabels the button, but
           never repaints the marks, a mid-attempt selection, or the feedback. */
    if (SCQ_RESTORE_SCREENS.indexOf(n) !== -1) scqRestoreUI('s' + n);

    /* 2b. the two matching boards — ddqEnter()+ddqRender() paint the slots, but the board they paint
           has to be derived from the restored snapshots, and the feedback popup that carries the
           answer toggle is not theirs to reopen. */
    if (DDQ_RESTORE_SCREENS.indexOf(n) !== -1) ddqRestoreUI('s' + n);

    /* 3. s22/s34 — measRender() recomputes everything from measStep/measDone/measRevealed/measPoured
           EXCEPT the confirm button, which it derives from #meas-input's live value; that value is
           restored after measRender has already run. */
    if ((n === 22 || n === 34) && typeof measInputChange === 'function') measInputChange();

    /* 4. the comic sliders — comicSliderEnter() runs comicBuild(), which seeds a FRESH record when
           comicState[sid] is absent (as it is after a reload) and then pages to i:0. The second
           applyResumeVars() pass fixes the record but not the paint, so the learner would land on
           panel 1 of a slider they had finished. comicSliderGo is idempotent; animate:false keeps it
           from sliding visibly on arrival. */
    if (COMIC_SCREENS.indexOf(n) !== -1) {
      var sid = 's' + n, cs = comicState[sid];
      if (cs && COMIC_DATA[sid] && COMIC_DATA[sid].kind !== 'guess') {
        comicSliderGo(sid, cs.i, { animate: false });
      }
    }
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

  /* s19 is a dropdown: its trigger carries the verdict rather than the options. */
  if (s.done) {
    var trig = document.getElementById(screen + '-dropdown-trigger');
    if (trig) {
      trig.classList.remove('correct', 'wrong');
      trig.classList.add(s.sel === s.cfg.correctId ? 'correct' : 'wrong');
    }
  }

  if (s.phase) scqShowPopup(screen, s.phase);

  /* Mirror the live enablement predicate, including s10's lock. An answered screen's button is the
     'שנמשיך?' one scqEnter already relabelled and enabled, so only the unsolved case is computed
     here — a painter that leaves a full screen with a dead button strands the learner. */
  if (!s.done) {
    var chk = document.getElementById(screen + '-scq-check');
    if (chk) chk.disabled = !s.sel || !!s.locked;
  }
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
  if (!s.checked && !anyPlaced) return;             // pristine — ddqEnter already drew a clean board

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
