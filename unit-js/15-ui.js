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

   The modal markup and the buttons are PROVISIONED HERE, not authored per part (see
   provisionImgZoom below). Part 01 still carries two hand-written buttons on s5/s6 from before
   that; provisioning skips any frame that already has one, so both forms coexist. */
/* Image Zoom Surface (720-design-guidelines, producer decisions 2026-09-30 / 2026-10-05): the
   surface follows the media's aspect ratio inside a 1200x640 envelope with 64px padding on every
   side, so the media itself is fitted to at most 1072x512 — and is scaled UP to that, never left
   at its on-page size (a zoom that only changes the backdrop is a defect). The envelope is in
   design pixels; scaleApp() never makes the canvas smaller than 1280x710, but it is still clamped
   to the live canvas (minus a 16px margin a side) so the surface can never leave it. */
var IMG_ZOOM_ENVELOPE = { w: 1200, h: 640 };
var IMG_ZOOM_PAD = 64;
var IMG_ZOOM_MARGIN = 16;

/* Every wrapper that counts as a zoomable content-image frame. Each is already position:relative
   (the .scq-figure rule says so in its own comment, "anchor for .img-zoom-btn"), which the
   absolutely-positioned button needs. */
var IMG_ZOOM_FRAMES = '.hook-img-frame, .scq-figure, .hotspot-photo, .scq-img-inner, .zoomable-img-inner';

var IMG_ZOOM_ICON =
  '<svg class="img-zoom-btn__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" ' +
  'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<circle cx="8.5" cy="8.5" r="6" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M13.2 13.2L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

var IMG_ZOOM_MODAL_HTML =
  '<div class="img-zoom-modal__backdrop" data-zoom-close="true"></div>' +
  '<div class="img-zoom-modal__panel" role="dialog" aria-modal="true" aria-label="תצוגת תמונה מוגדלת">' +
  '<button class="img-zoom-modal__close" type="button" aria-label="סגירת התמונה" data-zoom-close="true">' +
  '<svg class="img-zoom-modal__close-icon" aria-hidden="true" width="15" height="15" viewBox="0 0 15 15" ' +
  'fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.192 1.192L13.808 13.808M13.808 1.192L1.192 13.808" ' +
  'stroke="currentColor" stroke-width="2.383" stroke-linecap="round"/></svg></button>' +
  '<div class="img-zoom-modal__stage" id="img-zoom-modal-stage"></div></div>';

/* The 720 global-components rule makes zoom mandatory on every content image, and hand-authoring
   the button into ~15 frames across five index.html files would be five copies of one decision
   that then drift. Provisioning walks the frames once at boot instead — the same reason the
   companion sprite is injected rather than authored into every screen.

   The modal is created here too when a part lacks it, so a part needs no zoom markup at all. */
function provisionImgZoom() {
  let modal = document.getElementById('img-zoom-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'img-zoom-modal';
    modal.className = 'img-zoom-modal hidden';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = IMG_ZOOM_MODAL_HTML;
    /* Directly in #app (720-templates, Image zoom → Zoom modal), as part 01 authors it — NOT on
       <body>. Every size here is in design pixels; only inside #app does scaleApp()'s transform
       apply to them (and `position: fixed` then resolves against the canvas). On <body> the
       surface rendered unscaled and overflowed any viewport smaller than 1280x710. */
    (document.getElementById('app') || document.body).appendChild(modal);
  }
  document.querySelectorAll(IMG_ZOOM_FRAMES).forEach(function (frame) {
    /* Opt-out for a frame the magnifier does not belong on. Added for 02/s5, where the deck
       (slides 99–103) draws the two photos bare and the answer is given by marking an area on
       one of them — a control in the corner of a photo that IS the answer surface is noise. */
    if (frame.hasAttribute('data-no-zoom')) return;
    if (frame.querySelector('.img-zoom-btn')) return;      // authored one already there
    const img = frame.querySelector('img');
    if (!img) return;                                      // applet frames draw their own SVG
    const btn = document.createElement('button');
    btn.className = 'img-zoom-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'הגדלת התמונה');
    btn.dataset.zoomSrc = img.getAttribute('src') || '';
    btn.dataset.zoomAlt = img.getAttribute('alt') || '';
    btn.innerHTML = IMG_ZOOM_ICON;
    frame.appendChild(btn);
  });
}

function openImageZoom(btn) {
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-modal-stage');
  if (!modal || !stage || !btn) return;
  const wrapper = btn.closest(IMG_ZOOM_FRAMES);
  if (!wrapper) return;
  const clone = wrapper.cloneNode(true);
  /* Strip every control, not just the zoom button: .hotspot-photo carries scq-opt overlay buttons
     with live onclick handlers, and a cloned one would answer the question from inside the zoom
     view — where the learner is looking, not choosing. The clone is a picture, never a control. */
  clone.querySelectorAll('button').forEach(b => b.remove());
  clone.classList.add('img-zoom-clone');

  /* The frame is enlarged as ONE unit (720-templates, Image zoom → "A frame carrying live overlays"):
     cloned at its authored layout size and scaled by a single transform, so a ring, a name tag or a
     label stays on the point it marks. offsetWidth/Height are layout pixels — the canvas scale is
     not in them. A frame not laid out (should not happen: the trigger is on the visible screen)
     falls back to the photo's natural size. */
  const srcImg = wrapper.querySelector('img');
  let w0 = wrapper.offsetWidth, h0 = wrapper.offsetHeight;
  if (!w0 || !h0) { w0 = (srcImg && srcImg.naturalWidth) || 1; h0 = (srcImg && srcImg.naturalHeight) || 1; }
  const app = document.getElementById('app');
  const scale   = appScale();
  const canvasW = app ? app.getBoundingClientRect().width  / scale : 1280;
  const canvasH = app ? app.getBoundingClientRect().height / scale : 710;
  const maxW = Math.min(IMG_ZOOM_ENVELOPE.w, canvasW - 2 * IMG_ZOOM_MARGIN) - 2 * IMG_ZOOM_PAD;
  const maxH = Math.min(IMG_ZOOM_ENVELOPE.h, canvasH - 2 * IMG_ZOOM_MARGIN) - 2 * IMG_ZOOM_PAD;
  const s = Math.min(maxW / w0, maxH / h0);   // not clamped at 1 — the zoom must enlarge
  clone.style.width     = w0 + 'px';
  clone.style.height    = h0 + 'px';
  clone.style.transform = 'scale(' + s + ')';
  stage.style.width  = (w0 * s) + 'px';
  stage.style.height = (h0 * s) + 'px';

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
  if (stage) { stage.innerHTML = ''; stage.style.width = ''; stage.style.height = ''; }
}

/* White key for the mascot sprites. Every character-*.mp4 has a baked-in white background, and
   the old per-screen fix, mix-blend-mode: multiply, only hid it over white: wherever a mascot
   overlapped a photo, the photo showed through his fur too (01/s29, 06's big-body guess). This
   filter makes only near-white pixels transparent (R+G+B above ~2.94 of 3) and leaves the artwork
   fully opaque, so he stands IN FRONT of whatever is behind him. The feComposite clips the result
   to the source alpha; without it the filter region's transparent margin keys to opaque black.
   Injected rather than authored so all six parts share one copy; `.companion` in unit-css uses it.
   CSS `filter: url()` only resolves same-document ids in Chromium, hence not an external .svg. */
function injectMascotKey() {
  if (document.getElementById('mascot-white-key')) return;
  const holder = document.createElement('div');
  holder.innerHTML =
    '<svg aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">' +
    '<filter id="mascot-white-key" color-interpolation-filters="sRGB">' +
    '<feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -8.33 -8.33 -8.33 0 24.5"/>' +
    '<feComposite in2="SourceAlpha" operator="in"/>' +
    '</filter></svg>';
  document.body.insertBefore(holder.firstChild, document.body.firstChild);
}

/* Delegated open/close. Registered from 90-boot.js.
   Escape IS handled here now: the zoom reaches all six parts, and only part 01 has a keydown
   listener of its own. Part 01 closes the zoom before falling through to comic paging, so by the
   time this handler runs there the modal is already hidden and closeImageZoom() is a no-op. */
function initImgZoom() {
  provisionImgZoom();
  document.addEventListener('click', function (e) {
    const openBtn = e.target.closest('[data-zoom-src]');
    if (openBtn) { openImageZoom(openBtn); return; }
    if (e.target.closest('[data-zoom-close="true"]')) closeImageZoom();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('img-zoom-modal');
    if (modal && !modal.classList.contains('hidden')) closeImageZoom();
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
