# ASSETS-TODO — methodica-science-volume-solid-01

Production-art checklist for the *Volume of a Solid* lomda (6-part unit).
Generated from the QA/publish audit on 2026-07-16.

**Scope of this list:** every asset that is currently a **placeholder** (live
HTML / CSS / SVG / emoji stand-in) awaiting produced art, plus existing
**AI-generated / reference images** that need fixing or final confirmation.
None of these are broken references — the build runs end-to-end with the
placeholders in place. Interactive logic is complete; only the visuals are pending.

**720 asset rules to respect for every item below:**
- Never bake learner-facing Hebrew text into an image — all copy stays live HTML.
- Export only text-free illustrations / icons / backgrounds.
- Use local assets under `…-0N/assets/img/`, relative paths only, no external CDN.
- Prefer transparent PNG for objects that sit inside containers (`object-fit: contain`).

---

## A. Placeholders needing produced art

### A1. Companion-character GIFs — cross-cutting (highest priority)

- [x] **Orange companion — selection image** ✅ `character-orange-selection.png` (fluffy orange
  character holding an empty graduated cylinder). Placed in `…-01/assets/img/`, white bg made
  transparent, wired into **S0**. *Static PNG for now — optionally re-supply as an animated GIF later.*
- [x] **Turquoise companion — selection image** ✅ `character-turquoise-selection.png` (holding a
  water jug). Placed + transparent + wired into **S0**. *Static PNG; animate later if desired.*
- [ ] **Additional character variations** still needed for the asset-map (guiding / speaking /
  watching / cards / watching-video) — only the `selection` variation exists so far.
- [ ] **Path-choice GIFs** (`…-01` **S7**): character **reading a comic** (right) and character **with cylinder / lab coat** (left). Currently `.char-slot` placeholders.
- [ ] **Companion presence across all content screens** — *production + implementation item.*
  Per storyboard ("הדמות שנבחרה תופיע בכל מקומות הדמות לאורך כל הרכיבים"), the selected
  character should appear/guide throughout. Currently the choice is stored in
  `window.lomdaState.selectedCharacter` but the companion is **not rendered on content
  screens**. Needs: context variations of each character (guiding / speaking / watching)
  **and** wiring onto screens via a character asset-map (see `720-templates` →
  `_global-components.md` → Companion character system).

### A2. Comic panels (`…-01` **S8, S24, S25, S27, S28**)

Delivered by Ron Reuveni on **27.7.26** (18a on **2.8.26**) as photorealistic art, not
illustrated comic style — *"סיימתי לג'נרט את התמונות כריאלסטיות. שמרתי על הנראות לפי מה
שכבר קיים בתסריט."* **All 17 panels are in. All dialogue is live HTML overlaid on the art.**

Source: `Images/comics/` — normalised to **`.jpg` only** (the delivered PNGs were converted
at q80 and removed, `.jpeg` files renamed to `.jpg`, `17F` lower-cased): 45.3 MB → 3.6 MB.
Shipped to `assets/img/comic/` as JPEG **q80**, long edge 1800 px, compressed once from the
originals rather than re-encoded from the source JPEGs: **3.5 MB for all 17 panels.**
The layered `comics_Sc_8.psd` and the SharePoint link in the delivery e-mail remain the
lossless fallback.

The comic is no longer one flipbook screen: each storyboard slide is its own screen,
and slides 15/17/18 are horizontal sliders over their panels (see the `COMIC_SCREENS`
comment in `js/main.js`).

- [x] **Slide 12** → `12.jpg` (**S8**). One composite frame containing both storyboard
      panels (right: addresses the learners · left: measures with a ruler). Shown whole
      at `--ratio:2`, with a bubble over each half — deliberately **not** split.
- [x] **Slide 14** → `14.jpg` (**S24**). Same composite treatment (right: measures and
      calculates · left: key / acorn / marble).
- [x] **Slide 15** → `15a.jpg` … `15e.jpg` (**S25**, 5-panel slider).
- [x] **Slide 17** → `17a.jpg` … `17g.jpg` (**S27**, 7-panel slider).
      Source `17F.png` was lower-cased to `17f.jpg` — an uppercase letter breaks on any
      case-sensitive host.
- [x] **Slide 18** → `18a.jpg`, `18b.jpg`, `18c.jpg` (**S28**, 3-panel slider).
      The production placeholder is gone; every comic panel now has real art.
      *History: a first `18a` (2.8.26) was the same render as `17c` — Archimedes over the
      watermelon in the overflow bowl — and was rejected rather than wired in, since it
      belongs to slide 17's flooding method and already ships as panel 3 of S27. The
      replacement is the correct scene: he turns from the bench to listen to the
      off-panel question.*

**Open issues on the delivered art — left exactly as delivered, by decision:**

- [ ] **Generator watermarks retained.** A Gemini sparkle glyph is baked into `17a`,
      `17c`, `17e`, `17f` and `18a`; `18c` additionally carries a baked Hebrew line
      *"נוצר/הופק על ידי בינה מלאכותית"* along its bottom edge. Neither was cropped.
      Decide whether the MOE delivery requires them removed or requires them kept as an
      AI-generation disclosure.
- [ ] **Content conflict on `14.jpg`.** The wall in the right half reads
      `V = 20 × 15 × 10` / `V = 3000 cm³`, while the storyboard's thought bubble for the
      same panel says `10·10·10 = 1,000` / `נפח הקובייה = 1,000 סמ"ק`. Both were left
      unchanged — the bubble text is verbatim from the script. **Needs a content-owner
      ruling:** re-generate the art, or rewrite the bubble to 20×15×10 = 3,000 סמ"ק.
- [ ] Two files are not exactly 16:9 (`17f` = 1.833, `18c` = 1.794). The frame uses
      `object-fit: cover`, so ≤3 % is trimmed at display time; the files are untouched.

### A3. Interactive-applet illustrations (`…-01`)

- [x] **Graduated cylinder** ✅ hand-authored vector `assets/img/s9-cylinder.svg` (glass tube,
  10–100 ml scale, base + spout). Replaced the wood-background photo; used by **S9** & **S22**.
  Water/badge/marble CSS re-calibrated to it (50 mL = 50%, 62 mL = 41%).
- [x] **Cube aquarium** (**S10**) ✅ upgraded inline SVG — 3D glass cube with water + top surface +
  highlighted measure-wall (yellow, with arrows).
- [x] **Ruler** (**S10**) ✅ clean inline SVG (cream ruler, cm ticks + 0/5/10/15 labels), proportional.
- [x] **Overflow vessel** (**S11**) ✅ refined into a glass bowl + collection tray (CSS, matching the
  cylinder's glass palette; overflow/fill animation kept).
- [x] **Green marble** ✅ hand-authored vector `assets/img/s9-marble.svg` (glossy green sphere).
  Replaces the App-prototype PNG in S9 (draggable + sunk). Old PNG removed.
- [x] **Rock** (**S11**) ✅ upgraded inline SVG — faceted grey stone with light/shadow facets.
- [x] **Chess-king & hammer** (**S22**) ✅ hand-authored vectors `assets/img/s22-chess-king.svg`
  and `assets/img/s22-hammer.svg`; wired into the measurement applet (emoji removed).

> **All applet objects & vessels are now a consistent hand-authored vector set.**
> Old raster placeholders `s9-cylinder.png` / `s9-marble.png` deleted. If you later want
> photorealistic versions, the prompts in `ASSETS-PROMPTS.md §A3` still apply.

### A4. Other Part-01 placeholders

- [ ] **"4 ילדים במעבדה"** illustration (**S15** ImageHotspot) — currently 4 emoji avatars
  (👧🧒👦🧑). Produce four children, each with a speech bubble; **argument text stays live HTML**.
- [ ] **Flip-card fronts ×3** (**S20**) — currently dashed "איור להפקה". Produce/license:
  - [ ] תעשיית המתכות (metal lathe) — Envato ref in storyboard slide 30.
  - [ ] זהב ותכשיטים (jewelry & gold coins) — Envato ref.
  - [ ] ארכיאולוגיה (Roman excavation) — Envato ref.

---

## B. Existing images needing a fix / final confirmation (`…-01/assets/img/`)

- [ ] **`s6-archimedes-bath.jpg`** — AI-generated, has a **visible AI-generation watermark**
  (bottom-left). **Re-export without the watermark** (crop or regenerate).
- [ ] **`s1-roni-hook.jpg`** — Roni on the beach with metal detector + gold-star pendant.
  Confirm final or replace with produced/licensed art.
- [ ] **`s2-roni-think.jpg`** — should show Roni holding the pendant + cylinder ("רוני 2"). Verify/replace.
- [ ] **`s3-roni-displacement.jpg`** — Roni with pendant + cylinder of water ("רוני 3"). Verify/replace.
- [ ] **`s5-archimedes-crown.jpg`** — King Hiron + Archimedes + crown. Confirm final / match house style.
- [ ] **`s4-opt-suitcase.jpg`**, **`s4-opt-planter.jpg`**, **`s4-opt-apple.jpg`** — option photos.
  Confirm final; the apple must clearly show a **digital scale reading grams** (mass distractor).

---

## C. Content-implied images (currently text-only) — confirm intent

- [ ] **Part 02 · Q1** ("איזה מהגופים **שבתמונה**…") — rendered as text options
  (לבנה / מפלצת פלסטלינה / קופסת קרטון / קוביית עץ). Storyboard implies an **image of the
  four bodies**. Add illustration, or reword to drop "שבתמונה".
- [ ] **Part 02 · Q5** ("בתמונה א' / בתמונה ב'…") — text-only 2-choice. Storyboard shows **two
  cylinder images** (water level before / after). Add the two images (or an ImageHotspot on them).
- Parts 03–06 — text-based scenarios; **no image assets required** (optional scenario art only).

---

## D. Housekeeping (not art)

- [ ] **`Merriweather-BoldItalic.ttf`** — bundled + `@font-face`-declared in every part's CSS
  but **not actually used** in this unit (inherited from the mass-measure base). Safe to remove
  from all six `assets/fonts/` folders and the `@font-face` block to trim payload.
- [ ] (Optional) Remove the dev-only `console.log('[xAPI] skipped on localhost (dev)')` from each
  `js/main.js` — it sits inside the localhost guard and never runs in production, but can be dropped.

---

## E. Non-asset follow-ups (tracked here for handoff completeness)

- [ ] Content-owner confirm on two metadata↔storyboard deviations from the build:
  peak-question pass threshold (implemented **≥3/4**) and per-question vs reveal-at-end
  feedback on advanced item **04-05**.
- [ ] Paste the real Kata API key into `send-metadata.ps1` (git-ignored) and push the catalog.
- [ ] Full cross-part click-through on a served build (score-branch → Part 02/03; Part 05 fail → Part 06).

---

## Quick index — asset files currently in the repo (`…-01/assets/img/`)

| File | Status |
|---|---|
| `btn-flag-default.png`, `btn-flag-hover.png`, `icon-idea-blue.svg` | ✅ final (shared 720 components) |
| `character-orange-selection.png` | ✅ placed & wired (S0); static — optionally animate |
| `character-turquoise-selection.png` | ✅ placed & wired (S0); static — optionally animate |
| `s1-roni-hook.jpg` | ⚠️ confirm final (§B) |
| `s2-roni-think.jpg` | ⚠️ confirm final (§B) |
| `s3-roni-displacement.jpg` | ⚠️ confirm final (§B) |
| `s4-opt-suitcase.jpg` / `s4-opt-planter.jpg` / `s4-opt-apple.jpg` | ⚠️ confirm final (§B) |
| `s5-archimedes-crown.jpg` | ⚠️ confirm final (§B) |
| `s6-archimedes-bath.jpg` | ❌ re-export without watermark (§B) |
| `s9-cylinder.png` | ❌ re-produce clean (§A3) |
| `s9-marble.png` | ❌ re-produce (§A3) |

Parts 02–06 `assets/img/` currently contain only the shared flag/hint icons — all their
questions are text-based (see §C for two optional Part-02 images).
