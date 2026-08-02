/* ═══════════════════════════════════════════════════════════
   js/main.js — 720 Science · Volume of a Solid · Part 01
   Engine ported verbatim from methodica-science-mass-measure-01.
   Screens built so far: S0 character-select, S1–S3 Roni hook.
   (More screens are appended as the storyboard is implemented.)
   ═══════════════════════════════════════════════════════════ */

/* xAPI: canonical URL id prefix + short-id helper */
var XAPI_ID_PREFIX = "https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/";
function shortId(u){ return String(u || "").split("/").pop(); }

'use strict';

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 33;  // …S9 disp, S21 guess-Q, S11 flooding, S20 flip-cards, S22 measurement applet, S12 transition, warm-ups, practice, S23–S28 comic slides 13–18, S29 guess-Q (sb24), S30/S31 overflow can (sb39/40), S32 practice rules (sb50). Bump as screens are added.
                           // Must equal the live `.screen` count — index_dev.html derives its jump range from that,
                           // while goTo() rejects n >= TOTAL_SCREENS. The two silently disagree if only one is edited.

/* ─── Global lomda state ────────────────────────────────────
   Single source of truth persisting across every screen. Screens
   read window.lomdaState.selectedCharacter. JS-global for now. */
window.lomdaState = window.lomdaState || {
  selectedCharacter: null
};

/* ─── State ─────────────────────────────────────────────── */
let currentScreen = 0;

/* ─── Scale App ──────────────────────────────────────────────
   Scale-to-fit the 1280×710 design while EXTENDING the canvas to
   fill the viewport, so edge-anchored chrome reaches screen edges.
   scale = min(vw/1280, vh/710); canvas = viewport / scale. */
function scaleApp() {
  const app = document.getElementById('app');
  const scale   = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  const canvasW = window.innerWidth  / scale;
  const canvasH = window.innerHeight / scale;
  app.style.width     = canvasW + 'px';
  app.style.height    = canvasH + 'px';
  app.style.transform = `scale(${scale})`;
  app.style.left      = '0px';
  app.style.top       = '0px';
}
window.addEventListener('resize', scaleApp);
scaleApp();

/* ═══ Image zoom (shared) — enlarges any content image whose
   wrapper carries a [data-zoom-src] button. ═══ */
function openImageZoom(btn) {
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-modal-stage');
  if (!modal || !stage || !btn) return;
  const wrapper = btn.closest('.hook-img-frame, .scq-img-inner, .zoomable-img-inner');
  if (!wrapper) return;
  const clone = wrapper.cloneNode(true);
  clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
  clone.classList.add('img-zoom-clone');
  stage.innerHTML = '';
  stage.appendChild(clone);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}
function closeImageZoom() {
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-modal-stage');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  if (stage) stage.innerHTML = '';
}
document.addEventListener('click', function (e) {
  const openBtn = e.target.closest('[data-zoom-src]');
  if (openBtn) { openImageZoom(openBtn); return; }
  if (e.target.closest('[data-zoom-close="true"]')) closeImageZoom();
});

/* ═══════════════════════════════════════════════════════════
   Pointer-based drag-and-drop helper (engine — reused by future
   DnD/matching screens). Ghost clone follows the pointer, scaled
   to the #app transform so it matches the source visually.
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
    const rect  = src.getBoundingClientRect();
    const scale = getAppScale();
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
    active.ghost.style.left = (e.clientX - active.offX) + 'px';
    active.ghost.style.top  = (e.clientY - active.offY) + 'px';
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
    active.ghost.remove();
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

/* ─── Navigation ─────────────────────────────────────────── */
function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  // Close every feedback popup / hint overlay before the screen swap.
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]')
    .forEach(el => el.classList.add('hidden'));
  // Pause any playing media before leaving the current screen.
  document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (e) {} });
  const prev = document.querySelector('.screen.active');
  if (prev) prev.classList.remove('active');
  currentScreen = n;
  const next = document.getElementById('s' + n);
  if (next) next.classList.add('active');
  resetScreenState(n);
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Companion character
   The learner picks a mascot on part-01 S0; localStorage is the only
   carrier across parts, so a missing value must never blank the mascot.
   Slots are per-screen records injected by renderCompanion() rather than
   authored markup: ~20 slots across six index.html files would have to be
   kept in sync with every position tweak, and injecting lets the pose
   resolver run at render time.
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
const CHARACTER_ASSETS = { selection: 'png' };
function characterAsset(pose) {
  const ext = CHARACTER_ASSETS[pose];
  return 'assets/img/character-' + getCharacter() + '-' +
         (ext ? pose : 'selection') + '.' + (ext || 'png');
}
const CHARACTER_SLOTS = {
  s1:  { pose: 'examine',          w: 162, right: 61, bottom: 142 },  /* sb4  */
  s3:  { pose: 'cylinder-pendant', w: 220, right: 42, bottom: 198 },  /* sb6  */
  s5:  { pose: 'toga',             w: 178, right: 43, top:     31 },  /* sb9  */
  s6:  { pose: 'towel',            w: 178, right: 49, bottom:  96 },  /* sb10 */
  s9:  { pose: 'pingpong',         w: 160, right: 30, bottom:  95 },  /* sb26 */
  s11: { pose: 'soap',             w: 160, right: 30, bottom:  97 },  /* sb29 */
  s12: { pose: 'stretch',          w: 200, right: 40, bottom:  89 },  /* sb41 */
  s21: { pose: 'ask',              w: 160, left:  40, bottom:  90 },  /* sb27 */
  s22: { pose: 'wet-object',       w: 150, left:  30, bottom: 100 },  /* sb35/38 */
  s23: { pose: 'ask',              w: 179, right: 50, bottom: 200 },  /* sb13 */
  s26: { pose: 'ask',              w: 179, right: 50, bottom: 200 }   /* sb16 */
};
/* S7's two path cards are the mascot in two poses. Not a CHARACTER_SLOTS entry:
   these sit inside the option cards as content, not as a floating sprite. */
function renderPathCharacters() {
  const c = document.getElementById('s7-img-comic');
  const e = document.getElementById('s7-img-experiments');
  if (c) c.src = characterAsset('comic');
  if (e) e.src = characterAsset('experiments');
}
function renderCompanion(n) {
  const screen = document.getElementById('s' + n);
  if (!screen) return;
  const slot = CHARACTER_SLOTS['s' + n];
  // Lets a template reserve room for the sprite instead of being drawn over —
  // the storyboard's narration column is narrower on exactly these screens.
  screen.classList.toggle('has-companion', !!slot);
  let el = screen.querySelector(':scope > .companion');
  if (!slot) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('img');
    el.className = 'companion';
    el.alt = '';                                   // decorative, carries no information
    el.setAttribute('aria-hidden', 'true');
    el.draggable = false;
    screen.appendChild(el);
  }
  el.src = characterAsset(slot.pose);
  el.style.setProperty('--cw', slot.w + 'px');
  el.classList.toggle('companion--center', slot.center === true);
  ['left', 'right', 'top', 'bottom'].forEach(function (k) {
    el.style[k] = slot[k] != null ? slot[k] + 'px' : '';
  });
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
  if (n === 11) {
    // Flooding / overflow applet.
    floodEnter();
  }
  if (n === 20) { flipEnter('s20'); }              // real-world uses (flip cards)
  if (n === 21) { guessEnter('s21'); }             // guess-question (no feedback)
  if (n === 29) { guessEnter('s29'); }             // guess-question sb24 (no feedback)
  if (n === 30 || n === 31) { syncPathToggle(); }  // overflow-can info screens
  if (n === 22) { measEnter(); }                   // multi-step measurement applet
  if (n === 18) { ddqEnter('s18'); }               // warm-up 1 (matching)
  if (n === 19) { dqEnter('s19'); }                // warm-up 2 (dropdown)
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
  if (e.key === 'Escape') { closeImageZoom(); return; }
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
  if (currentScreen === 20) { goTo(11); return; }       // flip-cards → back to flooding
  if (currentScreen === 22) { goTo(20); return; }       // measurement applet → back to flip-cards
  if (currentScreen === 30) { goTo(22); return; }       // overflow can → back to measurement applet
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
      xapiSend('completed', 'question', null, { category: 'comic' });
      goTo(MERGE_SCREEN); return;
    }
    goTo(COMIC_SCREENS[ci + 1]); return;
  }
  if (currentScreen === 10) return;                                        // aquarium advances via its check button
  if (currentScreen === 29) { if (!guessPicked['s29']) return; goTo(9); return; }        // guess-Q (sb24) → displacement
  if (currentScreen === 9)  { if (!dispPlaced) return; goTo(21); return; } // displacement → guess-Q
  if (currentScreen === 21) { if (!guessPicked['s21']) return; goTo(11); return; }       // guess-Q → flooding
  if (currentScreen === 11) { if (!floodPlaced) return; goTo(20); return; }             // flooding → flip-cards
  if (currentScreen === 20) { const c = document.getElementById('s20-continue'); if (c && c.disabled) return; goTo(22); return; } // flip-cards → measurement applet
  if (currentScreen === 22) { if (!measDone) return; goTo(30); return; }                 // measurement applet → overflow can
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
/* Fire-and-forget xAPI. The xapiwrapper send can run synchronously on the live
   host; because the browser only paints AFTER a click handler returns, a blocking
   send inside a handler delays the visual feedback (button enable, popup, marks).
   Deferring to a macrotask lets the feedback paint first, then the statement fires.
   NOTE: navigation-boundary sends that precede window.location.href (goToNextPart's
   'completed') stay synchronous so they aren't cut off by page unload. */
function xapiSend() {
  const args = arguments;
  setTimeout(function () {
    try { sendStatement720.apply(null, args); } catch (e) {}
  }, 0);
}
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
  xapiSend('selected', 'question', { response: cardEl.dataset.value }, { category: 'learningType' });
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
  xapiSend('answered.last', 'question', { response: (ta ? ta.value.trim() : '') });
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
  xapiSend('selected', 'question', { response: id }, { category: 'why-measure-volume' });
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
const EXPERIMENTS_SCREENS = [9, 10, 11, 20, 21, 22, 29, 30, 31];   // membership list for the path toggle, NOT the order
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
  xapiSend('selected', 'question', { response: cardEl.dataset.value }, { category: 'learningType' });
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
        { type: 'caption', text: 'ארכימדס הגיע עד לימינו כדי ללמד אותנו על השיטות לחישוב נפח שהוא המציא.' },
        { type: 'speech', tail: 'down-left', r: 3, t: 5, w: 21,
          text: 'בואו נתחיל בתזכורת! איך מודדים גוף בעל צורה הנדסית מוגדרת כמו גליל או תיבה?' },
        { type: 'speech', tail: 'down-left', r: 54, t: 5, w: 23,
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
        { type: 'thought', tail: 'down-left', r: 3, t: 22, w: 21,
          text: 'יש לנו קובייה שכל צלע שלה = 10 ס"מ. 10·10·10 = 1,000. נפח הקובייה = 1,000 סמ"ק!' },
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
          { type: 'speech', tail: 'down-left', r: 3, t: 5, w: 32,
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
          { type: 'speech', tail: 'down-left', r: 3, t: 5, w: 32,
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

function comicCanAdvance(screenId) {
  const cfg = COMIC_DATA[screenId];
  if (!cfg) return true;
  if (cfg.kind === 'guess') return !!guessPicked[screenId];
  const st = comicState[screenId];
  return !!(st && st.done);
}

/* One bubble → one .speech-bubble. Docked variants (caption/banner) ignore
   --r/--t/--w; positioned variants read them. */
function comicBubbleHtml(b, k) {
  const type  = b.type || 'speech';
  const docked = (type === 'caption');   // banner is width-docked but honours --t
  let cls = 'speech-bubble speech-bubble--' + type;
  if (b.tail) cls += ' speech-bubble--tail-' + b.tail;
  let style = '--k:' + k + ';';
  if (!docked) {
    style += '--r:' + (b.r != null ? b.r : 5) + '%;'
           + '--t:' + (b.t != null ? b.t : 5) + '%;'
           + '--w:' + (b.w != null ? b.w : 30) + '%;';
  }
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
         +   (p.bubbles || []).map(comicBubbleHtml).join('')
         + '</div>';
  }).join('');

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

  const track = document.getElementById(screenId + '-track');
  if (track) {
    if (opts && opts.animate === false) {
      track.style.transition = 'none';
      track.style.transform  = 'translateX(' + (i * 100) + '%)';
      void track.offsetWidth;              // flush, then hand the transition back to CSS
      track.style.transition = '';
    } else {
      track.style.transform = 'translateX(' + (i * 100) + '%)';
    }
  }

  st.i = i;
  st.seen[i] = true;
  const justDone = !st.done && st.seen.every(Boolean);
  if (justDone) st.done = true;            // sticky — never re-gate on return

  // Keep inactive panels out of the a11y and focus trees. Focusing anything in
  // an off-screen panel would scroll the clipping box and permanently offset
  // the strip; scrollLeft = 0 is the belt-and-braces half of that fix.
  document.querySelectorAll('#' + screenId + ' .comic-panel').forEach(function (p, k) {
    p.toggleAttribute('inert', k !== i);
    p.setAttribute('aria-hidden', k !== i ? 'true' : 'false');
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
    const p = document.getElementById(screenId + '-panel-' + i);
    if (p) p.classList.add('is-revealed');
  }, COMIC_REDUCED_MOTION.matches ? 200 : COMIC_BUBBLE_DELAY);
}

function comicUpdateNav(screenId) {
  const cfg = COMIC_DATA[screenId], st = comicState[screenId];
  if (!cfg || !st) return;
  const last = cfg.panels.length - 1;
  const prev = document.getElementById(screenId + '-prev');
  const next = document.getElementById(screenId + '-next');
  if (prev) prev.disabled = st.i === 0;
  if (next) next.disabled = st.i === last;
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
  const track = document.getElementById(screenId + '-track');
  if (!vp || !track || vp.dataset.dragAttached === '1') return;
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
    track.classList.add('is-dragging');
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
    track.style.transform = 'translateX(' + (st.i * vpW + dx) + 'px)';
    lastX = e.clientX;
  });

  function settle(e) {
    if (!on || (e && e.pointerId !== pid)) return;
    on = false;
    track.classList.remove('is-dragging');
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
    const rs = document.getElementById('disp-reset');    if (rs) rs.hidden = false;
    const cont = document.getElementById('s9-continue');  if (cont) cont.disabled = false;
  }, 900);
  xapiSend('answered.last', 'question', { response: '62' }, { category: 'displacement-applet' });
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
function scqRegister(cfg) {
  cfg.maxAttempts = cfg.maxAttempts || 2;
  SCQ_REG[cfg.screen] = { cfg: cfg, sel: null, attempts: 0, answered: false, done: false, locked: !!cfg.startLocked };
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
  if (s.attempts > 0) { scqClosePopup(screen); scqOpts(screen).forEach(o => o.classList.remove('wrong', 'correct')); }
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
  xapiSend(correct || s.attempts >= cfg.maxAttempts ? 'answered.last' : 'answered', 'question',
    { success: !!correct, score: { scaled: correct ? 1 : 0 } }, { questionId: cfg.questionId });
  if (correct) { scqMark(screen, cfg.correctId, 'correct'); scqShowPopup(screen, 'correct'); scqFinish(screen, true); }
  else if (s.attempts >= cfg.maxAttempts) {
    scqMark(screen, cfg.correctId, 'correct'); scqMark(screen, s.sel, 'wrong');
    scqShowPopup(screen, 'wrong2'); scqFinish(screen, false);
  } else { scqMark(screen, s.sel, 'wrong'); scqShowPopup(screen, 'retry'); }
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
  s.answered = true; s.done = true; s.correctResolved = isCorrect;
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
  document.getElementById(screen + '-scq-popup-title').textContent = cfg.title;
  document.getElementById(screen + '-scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}
function scqClosePopup(screen) { document.getElementById(screen + '-scq-popup')?.classList.add('hidden'); }
function scqHint(screen) {
  const s = SCQ_REG[screen]; if (!s || s.answered) return;
  xapiSend('requested.1', 'question', null, { questionId: s.cfg.questionId });
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
  s.sel = null; s.attempts = 0; s.answered = false;
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
function attachPopupDrag(popup) {
  if (!popup || popup._dragWired) return;
  popup._dragWired = true;
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  const header = popup.querySelector('.scq-popup-header') || popup;
  function scale() { const app = document.getElementById('app'); const m = app && app.style.transform.match(/scale\(([^)]+)\)/); return m ? parseFloat(m[1]) : 1; }
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('.scq-popup-close')) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = popup.getBoundingClientRect(); const sc = scale();
    ox = r.left / sc; oy = r.top / sc;
    popup.style.bottom = 'auto';
    header.setPointerCapture(e.pointerId); e.preventDefault();
  });
  header.addEventListener('pointermove', e => {
    if (!dragging) return; const sc = scale();
    popup.style.left = (ox + (e.clientX - sx) / sc) + 'px';
    popup.style.top  = (oy + (e.clientY - sy) / sc) + 'px';
  });
  header.addEventListener('pointerup', () => { dragging = false; });
  header.addEventListener('pointercancel', () => { dragging = false; });
}

/* ═══════════════════════════════════════════════════════════
   APPLET — Aquarium ruler measurement (S10, experiments path)
   Drag the ruler onto the cube's highlighted wall → reveals the
   10 cm edge reading and unlocks the volume question (10³ = 1,000).
   ═══════════════════════════════════════════════════════════ */
let aqMeasured = false;
let aqDnd = null;
function aqInitDnd() {
  if (aqDnd) return;
  aqDnd = createPointerDnd({
    canDrag: function () { return !aqMeasured; },
    onDrop: function (dragId, targetId) { if (targetId === 'aq-cube') aqMeasure(); },
  });
  aqDnd.attachSource(document.getElementById('aq-ruler'), 'ruler');
  aqDnd.attachTarget(document.getElementById('aq-cube'), 'aq-cube');
}
function aqMeasure() {
  if (aqMeasured) return;
  aqMeasured = true;
  document.getElementById('aq-ruler').classList.add('measured');
  document.getElementById('aq-ruler-hint').textContent = '';
  document.getElementById('aq-readout').classList.remove('hidden');
  scqSetLocked('s10', false);   // unlock the volume question
  xapiSend('interacted', 'question', { response: '10cm' }, { category: 'aquarium-ruler' });
}
function aqReset() {
  aqMeasured = false;
  const ruler = document.getElementById('aq-ruler');
  ruler.classList.remove('measured'); ruler.style.transform = '';
  document.getElementById('aq-ruler-hint').textContent = 'גררו את הסרגל לדופן הצהובה';
  document.getElementById('aq-readout').classList.add('hidden');
}
function aqEnter() {
  aqInitDnd();
  syncPathToggle();
  if (aqMeasured) {
    document.getElementById('aq-readout').classList.remove('hidden');
    document.getElementById('aq-ruler').classList.add('measured');
    document.getElementById('aq-ruler-hint').textContent = '';
    scqSetLocked('s10', false);
  } else {
    aqReset();
    scqSetLocked('s10', !SCQ_REG['s10'].done);
  }
  scqEnter('s10');
}

/* Register the aquarium SCQ instance */
scqRegister({
  screen: 's10',
  correctId: 'd',
  startLocked: true,
  questionId: XAPI_ID_PREFIX + 'methodica-science-volume-solid-01-01-02/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['לא נורא, גם מטעויות לומדים.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['צלע הקובייה = 10 ס"מ.', 'נפח = 10 × 10 × 10 = 1,000 סמ"ק.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'צלע הקובייה = 10 ס"מ, ולכן הנפח = 10 × 10 × 10 = 1,000 סמ"ק.'] }
  },
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
  setTimeout(function () {
    const ex = document.getElementById('flood-explain'); if (ex) ex.hidden = false;
    const rs = document.getElementById('flood-reset');    if (rs) rs.hidden = false;
    const cont = document.getElementById('s11-continue');  if (cont) cont.disabled = false;
  }, 900);
  xapiSend('answered.last', 'question', { response: 'overflow' }, { category: 'flooding-applet' });
}
function floodReset() {
  floodPlaced = false;
  const rock = document.getElementById('flood-rock');
  rock.classList.remove('placed'); rock.style.transform = '';
  document.getElementById('flood-hint').textContent = 'גררו את האבן לקערה';
  document.getElementById('flood-bowl').classList.remove('flooded');
  document.getElementById('flood-instruction').textContent = 'לגוף שאינו נכנס למשורה. הכניסו את האבן לתוך הקערה הגדולה המלאה במים.';
  document.getElementById('flood-explain').hidden = true;
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
    document.getElementById('flood-explain').hidden = false;
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
const PART_02_URL = '../methodica-science-volume-solid-01-02/index.html';
const PART_03_URL = '../methodica-science-volume-solid-01-03/index.html';
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
  try { sendStatement720('completed', 'onlinelesson'); } catch (e) {}
  // ≥80% correct (4/5) → skip remediation (Part 03); else Part 02 (basic practice).
  const url = (practiceScore() >= 4) ? PART_03_URL : PART_02_URL;
  window.location.href = url + window.location.search;
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

const QID = XAPI_ID_PREFIX;   // question-id prefix shorthand
registerPractice(0, {
  correctId: 'c',
  questionId: QID + 'methodica-science-volume-solid-01-01-05/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['לא נורא, גם מטעויות לומדים.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['נפח האבן = 73 − 50 = 23 סמ"ק.', 'ההפרש בין הקריאה הסופית לקריאה ההתחלתית הוא נפח הגוף.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'נפח האבן = 73 − 50 = 23 סמ"ק (הקריאה הסופית פחות ההתחלתית).'] }
  }
});
registerPractice(1, {
  correctId: 'a',
  questionId: QID + 'methodica-science-volume-solid-01-01-06/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['חשבו: הכדור גדול מדי למשורה.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['הכדור גדול מדי למשורה, לכן משתמשים בשיטת ההצפה:', 'כמות המים שנשפכו = נפח הכדור.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'לגוף גדול שאינו נכנס למשורה משתמשים בשיטת ההצפה — נפח המים שנשפכו = נפח הכדור.'] }
  }
});
registerPractice(2, {
  correctId: 'd',
  questionId: QID + 'methodica-science-volume-solid-01-01-07/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['איזה טיעון מבוסס על מדידה בפועל?', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['רק המדידה בשיטת דחיקת המים מבוססת על ראיה שנמדדה:', 'המים עלו מ-50 ל-70, ולכן נפח הכפית = 20 מ"ל.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'רק שיטת דחיקת המים מתאימה לגוף לא־הנדסי ומבוססת על ראיה שנמדדה.'] }
  }
});
registerPractice(4, {
  correctId: 'd',
  questionId: QID + 'methodica-science-volume-solid-01-01-09/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['הכלי היה מלא עד הקצה — מה זה אומר על המים שנשפכו?', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['אופק צודק: נפח המים שנשפכו שווה לנפח הקריסטל.', 'הכלי היה מלא עד הקצה, ולכן כל המים שנדחקו מייצגים את נפח הגוף.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'נפח המים שנשפכו = נפח הקריסטל (הכלי היה מלא עד הקצה). שימו לב: נפח ולא מסה.'] }
  }
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
  xapiSend('answered.last', 'question', { success: !!allCorrect, score: { scaled: allCorrect ? 1 : 0 } }, { questionId: cfg.questionId });
  s.checked = true; s.done = true;
  if (!allCorrect) { Object.keys(cfg.correctMap).forEach(tId => { cfg.placement[cfg.correctMap[tId]] = tId; }); }  // reveal correct
  ddqRender(screen);
  ddqShowPopup(screen, allCorrect ? 'correct' : 'incorrect');
  const btn = document.getElementById(screen + '-ddq-check'); if (btn) { btn.textContent = 'שנמשיך?'; btn.disabled = false; }
  const hint = document.getElementById(screen + '-ddq-hint'); if (hint) hint.style.visibility = 'hidden';
  if (cfg.onFinish) cfg.onFinish(allCorrect);
}
/* Hint for a matching question. The scq* hint machinery is keyed on SCQ_REG,
   which the DnD screens do not use, so they get their own thin pair. Overlay
   ids end in -hint-overlay, so goTo() closes them on navigation. */
function ddqHint(screen) {
  const s = DDQ_REG[screen]; if (!s || s.checked) return;
  xapiSend('requested.1', 'question', null, { questionId: s.cfg.questionId });
  document.getElementById(screen + '-ddq-hint-overlay')?.classList.remove('hidden');
}
function ddqCloseHint(screen) { document.getElementById(screen + '-ddq-hint-overlay')?.classList.add('hidden'); }
function ddqShowPopup(screen, type) {
  const popup = document.getElementById(screen + '-ddq-popup'); if (!popup) return;
  const cfg = DDQ_REG[screen].cfg.popups[type];
  popup.style.background = (type === 'correct') ? '#edf8ed' : '#ffdbdc';
  popup.style.left = '2px'; popup.style.top = 'auto'; popup.style.bottom = '84px';
  document.getElementById(screen + '-ddq-popup-title').textContent = cfg.title;
  document.getElementById(screen + '-ddq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
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
  questionId: QID + 'methodica-science-volume-solid-01-01-08/q1',
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
  popups: {
    correct:   { title: 'נכון!', body: ['קוביית מתכת = גוף הנדסי → מדידה בסרגל.', 'צדפה = גוף לא־הנדסי קטן שנכנס למשורה → דחיקת מים.', 'גביע גדול = גוף שאינו נכנס למשורה → שיטת ההצפה.'] },
    incorrect: { title: 'לא מדויק — התשובה הנכונה מוצגת.', body: ['קוביית מתכת → מדידה הנדסית בסרגל.', 'צדפה → שיטת דחיקת המים.', 'גביע גדול → שיטת ההצפה.'] }
  }
});

/* ═══════════════════════════════════════════════════════════
   WARM-UPS (metadata items 03–04) — precede standard practice.
   Standalone (no progress-dots). S18 matching (DnD), S19 choice (SCQ).
   ═══════════════════════════════════════════════════════════ */
ddqRegister({
  screen: 's18',
  questionId: QID + 'methodica-science-volume-solid-01-01-03/q1',
  items: [
    // Storyboard slide 42 puts a small photo inside each task card. The שדף photo
    // is the one from S17 (slide 42 illustrates this task with a בלוט, which the
    // script later renamed to צדף — reusing S17's shell keeps art and copy agreed).
    { id: 'wu-cup',   label: 'כמה מים יש בכוס?',                    img: 'assets/img/s18-task-water-cup.jpg',  w: 72 },
    { id: 'wu-cube',  label: 'מה אורך הצלע של הקובייה?',            img: 'assets/img/s18-task-rubik.jpg',      w: 66 },
    { id: 'wu-melon', label: 'מה המסה של האבטיח?',                  img: 'assets/img/s18-task-watermelon.jpg', w: 64 },
    { id: 'wu-shell', label: 'מהו הנפח של הצדף הקטן?',              img: 'assets/img/s17-shell.png',           w: 68 },
    { id: 'wu-doll',  label: 'מהו הנפח של בובת הפלסטיק הגדולה?',    img: 'assets/img/s18-task-doll.jpg',       w: 90 }
  ],
  targets: [
    { id: 'wt-pour',     label: 'מזיגה למשורה' },
    { id: 'wt-ruler',    label: 'מדידה בסרגל' },
    { id: 'wt-scale',    label: 'מדידה במאזניים דיגיטליים' },
    { id: 'wt-displace', label: 'שיטת דחיקת מים' },
    { id: 'wt-flood',    label: 'שיטת ההצפה' }
  ],
  correctMap: { 'wt-pour': 'wu-cup', 'wt-ruler': 'wu-cube', 'wt-scale': 'wu-melon', 'wt-displace': 'wu-shell', 'wt-flood': 'wu-doll' },
  popups: {
    correct:   { title: 'נכון! כל הכבוד.', body: ['לכל משימת מדידה מתאים כלי אחר: נוזל נמזג למשורה, אורך נמדד בסרגל, מסה במאזניים.', 'נפח של גוף קטן שנכנס למשורה — בדחיקת מים; ושל גוף גדול — בשיטת ההצפה.'] },
    incorrect: { title: 'לא מדויק — ההתאמה הנכונה מוצגת.', body: ['כוס מים → מזיגה למשורה • צלע קובייה → סרגל • מסת אבטיח → מאזניים.', 'צדף קטן → דחיקת מים • בובה גדולה → שיטת ההצפה.'] }
  },
  onContinue: function () { goTo(19); }
});
attachPopupDrag(document.getElementById('s18-ddq-popup'));

scqRegister({
  screen: 's19',
  correctId: 'a',
  questionId: QID + 'methodica-science-volume-solid-01-01-04/q1',
  popups: {
    retry:   { title: 'התשובה אינה נכונה.', body: ['חשבו: הגוף תופס מקום בתוך המים.', 'נסו שוב!'] },
    correct: { title: 'נכון!', body: ['כשמכניסים גוף למים הוא תופס מקום, ולכן המים עולים.', 'ההפרש בין קריאת המפלס אחרי ולפני = נפח הגוף.'] },
    wrong2:  { title: 'התשובה אינה נכונה.', body: ['התשובה הנכונה מסומנת.', 'הגוף תופס מקום בתוך המים, ולכן מפלס המים עולה.'] }
  },
  onFinish: function (ok) {   // reflect result on the dropdown trigger
    const t = document.getElementById('s19-dropdown-trigger');
    if (t) { t.classList.remove('correct', 'wrong'); t.classList.add(ok ? 'correct' : 'wrong'); }
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
function dqEnter(screen) {
  const s = SCQ_REG[screen];
  const trigger = document.getElementById(screen + '-dropdown-trigger');
  if (trigger && s && !s.done) {
    trigger.classList.remove('correct', 'wrong');
    const tr = trigger.querySelector('.dropdown-trigger-text');
    if (tr) tr.textContent = 'בחרו מילה';
  }
  document.getElementById(screen + '-answers')?.classList.add('hidden');
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
function flipCard(screen, cardEl) {
  cardEl.classList.add('flipped');
  (flipState[screen] = flipState[screen] || {})[cardEl.dataset.card] = true;
  flipUpdateContinue(screen);
}
function flipUpdateContinue(screen) {
  const cards = document.querySelectorAll('#' + screen + '-flip .flip-card');
  const all = cards.length > 0 && [...cards].every(c => c.classList.contains('flipped'));
  const cont = document.getElementById(screen + '-continue');
  if (cont) cont.disabled = !all;
}
function flipEnter(screen) {
  syncPathToggle();
  const revealed = flipState[screen] || {};
  document.querySelectorAll('#' + screen + '-flip .flip-card').forEach(c => {
    c.classList.toggle('flipped', !!revealed[c.dataset.card]);
  });
  flipUpdateContinue(screen);
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Guess-question (no feedback). Pick any option →
   a companion bubble appears and Continue unlocks. No scoring.
   ═══════════════════════════════════════════════════════════ */
const guessPicked = {};
function guessPick(screen, btn) {
  document.querySelectorAll('#' + screen + '-guess .guess-opt').forEach(o => o.classList.remove('picked'));
  btn.classList.add('picked');
  guessPicked[screen] = btn.dataset.id;
  document.getElementById(screen + '-guess-bubble')?.classList.remove('hidden');
  const cont = document.getElementById(screen + '-continue'); if (cont) cont.disabled = false;
  xapiSend('answered.last', 'question', { response: btn.dataset.id }, { category: 'guess' });
}
function guessEnter(screen) {
  syncPathToggle();
  const picked = guessPicked[screen];
  document.querySelectorAll('#' + screen + '-guess .guess-opt').forEach(o => o.classList.toggle('picked', o.dataset.id === picked));
  document.getElementById(screen + '-guess-bubble')?.classList.toggle('hidden', !picked);
  const cont = document.getElementById(screen + '-continue'); if (cont) cont.disabled = !picked;
}

/* ═══════════════════════════════════════════════════════════
   APPLET — Multi-step measurement (S22, experiments path)
   4 steps: drag king→cylinder → type volume (reveal 15) → drag
   hammer→bowl → type volume (reveal 250). Wrong vessel bounces back.
   Numeric inputs have no feedback (any value proceeds).
   ═══════════════════════════════════════════════════════════ */
const MEAS = {
  1: { obj: true, objImg: 's22-chess-king.svg', objLabel: 'כלי שח-מט', correct: 'cyl',  instruction: 'שלב 1: גררו את כלי השח-מט אל כלי המדידה המתאים.' },
  2: { input: true, instruction: 'שלב 2: הכלי שקע והמים עלו — מדדו והקלידו את נפחו.', inputLabel: 'נפח כלי השח-מט (מ"ל):', reveal: 'נפח כלי השח-מט הוא 15 מ"ל. מפלס המים עלה מ-50 ל-65 מ"ל, ולכן: 65 − 50 = 15.' },
  3: { obj: true, objImg: 's22-hammer.svg', objLabel: 'פטיש', correct: 'bowl', instruction: 'שלב 3: הפטיש גדול מדי למשורה — גררו אותו אל כלי המדידה המתאים.' },
  4: { input: true, last: true, instruction: 'שלב 4: שפכו את המים שנשפכו לכלי המדידה והקלידו את נפח הפטיש.', inputLabel: 'נפח הפטיש (מ"ל):', reveal: 'המים שנשפכו היו בנפח 250 מ"ל — כלומר נפח הפטיש הוא 250 מ"ל, כי הוא הציף החוצה כמות מים השווה לנפחו!' }
};
let measStep = 1, measDone = false, measRevealed = false, measDnd = null;
function measInitDnd() {
  if (measDnd) return;
  measDnd = createPointerDnd({
    canDrag: function () { return !!MEAS[measStep].obj; },
    onDrop: function (id, vesselId) { measDropVessel(vesselId); },
  });
  measDnd.attachSource(document.getElementById('meas-object'), 'obj');
  measDnd.attachTarget(document.getElementById('meas-cyl'), 'cyl');
  measDnd.attachTarget(document.getElementById('meas-bowl'), 'bowl');
}
function measDropVessel(v) {
  const cfg = MEAS[measStep];
  if (!cfg.obj) return;
  if (v === cfg.correct) { measRevealed = false; measStep++; measRender(); }
  else {
    const err = document.getElementById('meas-error');
    err.classList.remove('hidden');
    setTimeout(function () { err.classList.add('hidden'); }, 1800);
  }
}
function measInputChange() {
  const inp = document.getElementById('meas-input');
  document.getElementById('meas-confirm').disabled = inp.value.trim() === '';
}
function measConfirm() {
  const cfg = MEAS[measStep];
  if (!cfg.input) return;
  measRevealed = true;
  xapiSend('answered.last', 'question', { response: document.getElementById('meas-input').value }, { category: 'measurement-applet' });
  if (cfg.last) measDone = true;
  measRender();
}
function measNext() {
  measStep++; measRevealed = false;
  const inp = document.getElementById('meas-input'); if (inp) inp.value = '';
  measRender();
}
function measRender() {
  const step = measStep, cfg = MEAS[step];
  document.getElementById('meas-instruction').textContent = cfg.instruction;
  const isDrag = !!cfg.obj, isInput = !!cfg.input;
  const objZone = document.getElementById('meas-object-zone');
  objZone.classList.toggle('hidden', !isDrag);
  if (isDrag) {
    document.getElementById('meas-object-icon').innerHTML = '<img class="meas-obj-img" src="assets/img/' + cfg.objImg + '" alt="" draggable="false">';
    document.getElementById('meas-object-label').textContent = cfg.objLabel;
    const obj = document.getElementById('meas-object'); obj.classList.remove('dragging'); obj.style.transform = '';
  }
  const inputRow = document.getElementById('meas-input-row');
  inputRow.classList.toggle('hidden', !(isInput && !measRevealed));
  if (isInput) document.getElementById('meas-input-label').textContent = cfg.inputLabel;
  if (isInput && !measRevealed) {
    const inp = document.getElementById('meas-input');
    document.getElementById('meas-confirm').disabled = inp.value.trim() === '';
  }
  const reveal = document.getElementById('meas-reveal');
  reveal.classList.toggle('hidden', !measRevealed);
  if (measRevealed) reveal.textContent = cfg.reveal;
  document.getElementById('meas-next').classList.toggle('hidden', !(measRevealed && !cfg.last));
  document.getElementById('meas-error').classList.add('hidden');
  document.getElementById('meas-cyl-badge').textContent = (step >= 2) ? '65 מ"ל' : '50 מ"ל';
  document.getElementById('meas-cyl').classList.toggle('has-king', step >= 2);
  document.getElementById('meas-bowl').classList.toggle('overflowed', step >= 4);
  document.getElementById('s22-continue').disabled = !measDone;
}
function measEnter() {
  measInitDnd();
  syncPathToggle();
  measRender();
}


// ============================================================
//  REPORT MODAL
// ============================================================
function openReportModal() {
  document.getElementById('report-modal').removeAttribute('hidden');
  setTimeout(function() { var el = document.getElementById('report-type'); if (el) el.focus(); }, 40);
}
function tryCloseReportModal() {
  var typeVal = document.getElementById('report-type').value;
  var textVal = document.getElementById('report-text').value.trim();
  if (typeVal || textVal) {
    document.getElementById('report-modal').setAttribute('hidden', '');
    document.getElementById('report-confirm-modal').removeAttribute('hidden');
  } else { forceCloseReportModal(); }
}
function forceCloseReportModal() {
  document.getElementById('report-modal').setAttribute('hidden', '');
  document.getElementById('report-confirm-modal').setAttribute('hidden', '');
  resetReportForm();
}
function backToReportForm() {
  document.getElementById('report-confirm-modal').setAttribute('hidden', '');
  document.getElementById('report-modal').removeAttribute('hidden');
  setTimeout(function() { var el = document.getElementById('report-type'); if (el) el.focus(); }, 40);
}

var REPORT_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfFq5XFtH1pPpLgV5RWT4m3NanYPW5GKremqTvkp6zKjEGqcw/formResponse';

// screen -> [subContent suffix, page-in-item] ; null = no matching subContent
var SCREEN_TO_SUBCONTENT = { 0:null, 1:['001',1], 2:['001',2], 3:['001',3] };

function submitReport() {
  var typeSel = document.getElementById('report-type');
  var textVal = document.getElementById('report-text').value.trim();
  var errEl   = document.getElementById('report-error');
  if (!typeSel.value || !textVal) {
    if (errEl) errEl.removeAttribute('hidden');
    (typeSel.value ? document.getElementById('report-text') : typeSel).focus();
    return;
  }
  if (errEl) errEl.setAttribute('hidden', '');
  var now  = new Date();
  var meta = window.METADATA || {};
  var body = new URLSearchParams();
  body.append('entry.301404029_year',  now.getFullYear());
  body.append('entry.301404029_month', now.getMonth() + 1);
  body.append('entry.301404029_day',   now.getDate());
  body.append('entry.2066097581_hour',   now.getHours());
  body.append('entry.2066097581_minute', now.getMinutes());
  body.append('entry.1933069481', shortId(meta.learningUnitId));
  body.append('entry.2070680092', shortId(meta.id));
  var mapEntry = SCREEN_TO_SUBCONTENT[currentScreen];
  var itemId   = mapEntry ? (shortId(meta.id)) + '-' + mapEntry[0] : '';
  var itemPage = mapEntry ? String(mapEntry[1]) : String(currentScreen);
  body.append('entry.1555704258', itemId);
  body.append('entry.1671046914', itemPage);
  body.append('entry.1179822443', typeSel.options[typeSel.selectedIndex].text);
  body.append('entry.806447525',  textVal);
  fetch(REPORT_FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body })
    .catch(function(e) { console.error('[Report] send failed', e); });
  showReportThanks();
}
function showReportThanks() {
  document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body')
    .forEach(function(el) { el.setAttribute('hidden', ''); });
  var t = document.getElementById('report-thanks');
  if (t) t.removeAttribute('hidden');
}
function resetReportForm() {
  document.getElementById('report-type').value = '';
  document.getElementById('report-text').value = '';
  document.getElementById('report-char-count').textContent = '0 / 250';
  var errEl = document.getElementById('report-error');
  if (errEl) errEl.setAttribute('hidden', '');
  var t = document.getElementById('report-thanks');
  if (t) t.setAttribute('hidden', '');
  document.querySelectorAll('#report-modal .report-field, #report-modal .report-actions, #report-modal .report-modal-body')
    .forEach(function(el) { el.removeAttribute('hidden'); });
}
(function wireReport() {
  var flagBtn = document.getElementById('flag-btn');
  if (flagBtn) flagBtn.addEventListener('click', openReportModal);
  var reportTextarea = document.getElementById('report-text');
  var reportCounter  = document.getElementById('report-char-count');
  if (reportTextarea && reportCounter) {
    reportTextarea.addEventListener('input', function() {
      reportCounter.textContent = reportTextarea.value.length + ' / 250';
    });
  }
  document.addEventListener('keydown', function(event) {
    if (event.key !== 'Escape') return;
    var confirmModal = document.getElementById('report-confirm-modal');
    var reportModal  = document.getElementById('report-modal');
    if (confirmModal && !confirmModal.hasAttribute('hidden')) { forceCloseReportModal(); return; }
    if (reportModal && !reportModal.hasAttribute('hidden'))  { tryCloseReportModal();   return; }
  });
})();

/* ═══════════════════════════════════════════════════════════
   Dev mode: postMessage bridge (used by index_dev.html)
   ═══════════════════════════════════════════════════════════ */
window.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'DEV_GOTO') return;
  const n = parseInt(e.data.screen, 10);
  if (!isNaN(n)) goTo(n);
});
if (window.parent !== window) {
  const count = document.querySelectorAll('.screen').length;
  window.parent.postMessage({ type: 'DEV_READY', total: count }, '*');
}

/* ═══════════════════ xAPI (720 LMS common host) ═══════════════════
   Loaded from the MOE 720 platform's own common host (not a 3rd-party
   CDN); fails gracefully offline. Fires learning statements. */
(function initXAPI() {
  // Skip the LMS xAPI wrapper during local development (localhost is never the
  // real 720 LMS). Offline it would storm retries against a missing endpoint,
  // starving the renderer. Production hosts run it normally.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return;
  }
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';
  var METADATA_FILE = '../metadata/methodica-science-volume-solid-01-01.json';
  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function() { console.error('[xAPI] failed to load', src); cb(); };
    document.head.appendChild(s);
  }
  function pollMetadataReady(cb) {
    if (window.jsXAPI_MetadataReady) { cb(); }
    else { setTimeout(function() { pollMetadataReady(cb); }, 200); }
  }
  loadScript(CDN + 'xapiwrapper.min.js', function() {
    loadScript(CDN + 'xapi-720-f.js', function() {
      try {
        getXAPIParameters(METADATA_FILE);
        pollMetadataReady(function() {
          try {
            ADL.XAPIWrapper.changeConfig({ endpoint: window.slxapi.endpoint, auth: window.slxapi.auth });
            sendStatement720('initialized', 'onlinelesson');
            loadUnitMetadata('../metadata/methodica-science-volume-solid-01_unit.json', function() {
              try { sendStatement720('initialized', 'onlinelesson', null, { scope: 'unit' }); } catch(e) {}
            });
          } catch(e) { console.error('[xAPI] init', e); }
        });
      } catch(e) { console.error('[xAPI] load', e); }
    });
  });
})();
