'use strict';
/* ═══════════════════ Shared UI ═══════════════════
   Shared by all six components. DEFINITION-ONLY — every listener registration and the first
   scaleApp() call live in 90-boot.js, the one file with top-level side effects.

   Nothing here reports to the LRS. */

/* ── Screen-reader announcer ──────────────────────────────────────────
   NEW in this unit, and deliberately inert today. The shared goTo() announces the heading of the
   screen it lands on, which is how the sibling unit does it — but this unit's markup has no
   announcer region. The only aria-live attributes here sit on the SCQ feedback popups, which are
   a different thing: they announce a *result*, not a navigation.

   So this early-returns unless #sr-announcer exists, which makes it a no-op in all six parts as
   they stand. That is intentional: it keeps behaviour byte-identical through the extraction while
   turning the a11y improvement into a one-line opt-in (add the region to a part's markup and that
   part starts announcing). Adding the region is NOT part of this reconstruction — it changes what
   a screen-reader user hears on every navigation and belongs in an accessibility pass with its own
   review. */
function announce(msg) {
  var el = document.getElementById('sr-announcer');
  if (!el || !msg) return;
  /* Clear first: re-announcing identical text is otherwise dropped by most screen readers. */
  el.textContent = '';
  setTimeout(function () { el.textContent = String(msg); }, 50);
}

/* ── Scale-to-fit ─────────────────────────────────────────────────────
   Scales the 1280×710 design while EXTENDING the canvas to fill the viewport, so edge-anchored
   chrome reaches the screen edges. scale = min(vw/1280, vh/710); canvas = viewport / scale.

   All six parts had this, and all six were behaviourally identical — the drift was purely
   formatting (part 01 named the intermediates; the others inlined them). Part 01's spelling is
   kept because it is the legible one. */
function scaleApp() {
  const app = document.getElementById('app');
  if (!app) return;
  const scale   = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  const canvasW = window.innerWidth  / scale;
  const canvasH = window.innerHeight / scale;
  app.style.width     = canvasW + 'px';
  app.style.height    = canvasH + 'px';
  app.style.transform = `scale(${scale})`;
  app.style.left      = '0px';
  app.style.top       = '0px';
}

/* Current canvas scale, parsed back out of the transform scaleApp() wrote. Pointer coordinates
   are in viewport pixels but the popups are positioned inside the scaled canvas, so every drag
   delta has to be divided by this. Reads the live style rather than recomputing from the viewport
   so it cannot disagree with what is actually rendered. */
function appScale() {
  const app = document.getElementById('app');
  const m = app && app.style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

/* ── Image zoom ───────────────────────────────────────────────────────
   Enlarges any content image whose wrapper carries a [data-zoom-src] button.

   Only part 01 has the #img-zoom-modal markup and any [data-zoom-src] buttons. Sharing these is
   inert in the other five: every lookup is guarded and returns early, and initImgZoom's delegated
   listener never matches. That is cheaper than keeping a sixth of the UI layer in one part. */
/* Target ~75% of the canvas (70-80% requested) on whichever axis is tighter, in the
   photo's own proportions — never a fixed square. Computed here rather than in CSS
   because #app's own design-pixel size varies with window aspect ratio (scaleApp() grows
   whichever axis isn't the tight constraint to fill the real viewport — see 15-ui.js
   scaleApp()), so "70-80% of the canvas" has to be measured live, not hardcoded. */
var IMG_ZOOM_TARGET = 0.75;

function openImageZoom(btn) {
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-modal-stage');
  if (!modal || !stage || !btn) return;
  const wrapper = btn.closest('.hook-img-frame, .scq-img-inner, .zoomable-img-inner');
  if (!wrapper) return;
  const clone = wrapper.cloneNode(true);
  clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
  clone.classList.add('img-zoom-clone');

  const srcImg = wrapper.querySelector('img');
  const ar = (srcImg && srcImg.naturalWidth && srcImg.naturalHeight)
    ? srcImg.naturalWidth / srcImg.naturalHeight
    : 1;
  const app = document.getElementById('app');
  const scale   = appScale();
  const canvasW = app ? app.getBoundingClientRect().width  / scale : 1280;
  const canvasH = app ? app.getBoundingClientRect().height / scale : 710;
  let w = canvasW * IMG_ZOOM_TARGET, h = w / ar;
  if (h > canvasH * IMG_ZOOM_TARGET) { h = canvasH * IMG_ZOOM_TARGET; w = h * ar; }
  clone.style.width  = w + 'px';
  clone.style.height = h + 'px';

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

/* Delegated open/close. Registered from 90-boot.js.
   Escape is NOT handled here: part 01's own keydown listener already closes the zoom before it
   falls through to comic panel paging, and a second handler would only close an already-closed
   modal. If a future part gains the zoom markup without that listener, add Escape here. */
function initImgZoom() {
  document.addEventListener('click', function (e) {
    const openBtn = e.target.closest('[data-zoom-src]');
    if (openBtn) { openImageZoom(openBtn); return; }
    if (e.target.closest('[data-zoom-close="true"]')) closeImageZoom();
  });
}

/* ── Draggable feedback popups ────────────────────────────────────────
   Lets the learner move a feedback popup off the content it covers.

   Existed in parts 01, 02 and 04 in three textually different copies that normalise to the SAME
   program — the only real difference was `const r = …; const sc = …` versus `const r = …, sc = …`.
   So this is a true deduplication with nothing to reconcile.

   NOTE this is deliberately NOT the sibling unit's initFeedbackDrag(), which replaces window.goTo
   with a wrapper and therefore has to be the last thing that touches goTo. This unit wraps
   nothing, and per-popup wiring keeps it that way — see unit-js/README.md. */
function attachPopupDrag(popup) {
  if (!popup || popup._dragWired) return;
  popup._dragWired = true;
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  const header = popup.querySelector('.scq-popup-header') || popup;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('.scq-popup-close')) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = popup.getBoundingClientRect(); const sc = appScale();
    ox = r.left / sc; oy = r.top / sc;
    /* The popup is bottom-anchored by CSS; switching to top/left positioning mid-drag needs the
       bottom constraint released or it fights the assignment below. */
    popup.style.bottom = 'auto';
    header.setPointerCapture(e.pointerId); e.preventDefault();
  });
  header.addEventListener('pointermove', e => {
    if (!dragging) return; const sc = appScale();
    popup.style.left = (ox + (e.clientX - sx) / sc) + 'px';
    popup.style.top  = (oy + (e.clientY - sy) / sc) + 'px';
  });
  header.addEventListener('pointerup', () => { dragging = false; });
  header.addEventListener('pointercancel', () => { dragging = false; });
}
