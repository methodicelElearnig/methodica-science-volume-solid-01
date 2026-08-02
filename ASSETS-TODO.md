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

### A1. Companion-character poses — cross-cutting (highest priority)

**The wiring is done; only the artwork is outstanding.** (2.8.26) The learner's choice now drives a
mascot on 22 screens across all six parts, and the S7 path cards. Every pose currently resolves back
to the one produced image per colour — see "how to land a pose" below.

- [x] **Orange companion — selection image** ✅ `character-orange-selection.png` (fluffy orange
  character holding an empty graduated cylinder). White bg made transparent, wired into **S0**.
- [x] **Turquoise companion — selection image** ✅ `character-turquoise-selection.png` (holding a
  water jug). Placed + transparent + wired into **S0**.
- [x] **Both files copied into all six parts' `assets/img/`** — the parts share no assets.
- [x] **Companion rendering across the unit** ✅ `getCharacter()` / `CHARACTER_ASSETS` /
  `characterAsset()` / `CHARACTER_SLOTS` / `renderCompanion()` in every part's `js/main.js`,
  `.companion` in every `css/style.css`. `localStorage.lomda_selectedCharacter` was previously
  written but never read — parts 02–06 now read it, defaulting to `orange` on a cold deep-link.
- [x] **Path-choice cards** (`…-01` **S7**) ✅ the dashed `.char-slot` placeholders are gone; both
  cards now show the **selected** character (the storyboard draws one of each colour there only
  because it reuses the slide-3 renders — by that point the choice has been made).
- [ ] **The ~25 produced poses are still missing.** Every slot renders the `selection` pose.
  Filenames: `character-{orange|turquoise}-{pose}.{png|gif}`. Poses in use, by screen:
  `comic` + `experiments` (01 S7) · `examine` (01 S1) · `cylinder-pendant` (01 S3) · `toga` (01 S5) ·
  `towel` (01 S6) · `pingpong` (01 S9) · `soap` (01 S11) · `stretch` (01 S12) · `ask`
  (01 S21/S23/S26) · `wet-object` (01 S22) · `start-line` (02 S0) · `notebook` (03 S0) ·
  `dumbbells` (04 S0) · `run` (05 S0) · `cheer` (05 S5) · `think` (05 S6) · `two-fingers` (06 S0) ·
  `party` (06 S5) · `panting` (06 S6). The storyboard also asks for `overflow-can`, `headband`,
  `encourage` and `thumbs-up`, which land on popups/screens this build does not have.
  **How to land a pose:** drop the file in each part's `assets/img/` and add one line to
  `CHARACTER_ASSETS` in that part's `main.js` (e.g. `cheer: 'gif'`). Nothing else changes.
  A manifest is used rather than an `<img onerror>` fallback on purpose — `onerror` would fire a
  real 404 on nearly every screen, and the QA gate for this unit checks the network log for zero 404s.
- [ ] The storyboard specifies these as **animated GIFs**; the two that exist are static PNGs.
- [ ] **Deliberate omissions, for the record.** The storyboard puts the mascot on 38 slides. 16 of
  them are per-question feedback or hint slides that this build renders as `.scq-popup` /
  `.scq-hint-overlay` cards, not screens (sb55, 144/145, 157/158, 170/171), or applet
  *result states* that are folded into the live applet screen (sb35/38/39/40/97). A ~190px sprite
  would dominate the small draggable popup, so it is left out. Revisit if the popups grow.
- [ ] Positions are adapted, not copied: where the storyboard centres the mascot beneath a block of
  text, this build centres that text vertically instead, so those slots move to the free edge
  (`.screen.has-companion` lets a template reserve room — see `.hook-content` / `.peak-intro`).

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

- [x] **"4 ילדים במעבדה"** illustration (**S15** ImageHotspot) ✅ **sourced from the storyboard**
  (slide 61, `image59.jpeg`) and shipped as `s15-four-kids.jpg`. The emoji card grid is gone: the
  screen is now the storyboard's composition — one photo with a clickable ring over each child and
  the four arguments as live-HTML bubbles in columns either side. Correct answer = the rightmost
  child ("הילד מימין"). ⚠️ The photo carries a baked bottom-edge line
  *"תוכן שהופק על ידי בינה מלאכותית"* — see the watermark item in §A5.
- [ ] **Flip-card fronts ×3** (**S20**) — currently dashed "איור להפקה". Produce/license:
  - [ ] תעשיית המתכות (metal lathe) — Envato ref in storyboard slide 30.
  - [ ] זהב ותכשיטים (jewelry & gold coins) — Envato ref.
  - [ ] ארכיאולוגיה (Roman excavation) — Envato ref.

### A5. Storyboard photographs on the question screens ✅ **DONE (2.8.26)**

The storyboard puts a photograph on 14 question screens; the build had exactly one such layout
(`01 S4`). All of them are now extracted from the deck and wired in, and the image-bearing screens
follow the storyboard's composition (photo physically left, stem + options right).

Extracted from `ppt/media/` in the storyboard deck, re-encoded **JPEG q80 at ~2× the display box**
(PNG kept only where the source is a genuine cut-out with alpha). **86 MB of source PNG → 1.43 MB.**

| part | files | KB |
|---|---|---|
| 01 | `s14-bowling-ball` `s15-four-kids` `s16-crystals` `s17-{metal-cube,shell,trophy}.png` `s18-task-{water-cup,rubik,watermelon,doll,acorn}` `s19-sharpener` `s21-large-bodies` | 658 |
| 02 | `s1-bodies` `s2-tom-shirley` `s5-cylinder-{before,after}` | 296 |
| 04 | `s2-lentils` `s3-gold-measurements` `s4-slime` `s6-marbles` *(the last two reused on S5 / S7–S8)* | 286 |
| 05 | `s0-figurine` (on S1) · `s3-speaker-{male,female}.svg` | 113 |
| 06 | `s0-aquarium-statue` (on S1) | 80 |

Two screens were rebuilt rather than just decorated:
- **01 S15** — see §A4.
- **02 S5** — the stem said *"בתמונה א'… ובתמונה ב'…"* with **no images on screen at all**. Now two
  labelled photos with three clickable bands on תמונה ב', per storyboard slide 99.
  ⚠️ **The answer set grew from 2 options to 3** (a new distractor: the empty glass above the water).
  Correct answer is unchanged (`b`, the risen region). Popup/hint copy still reads correctly.

Extraction notes for anyone repeating this: the deck is normally open in PowerPoint and holds an
exclusive lock (`Presentation(path)` throws `PermissionError` — copy the file first), and the mascot
and flip-card faces are `blipFill` fills on autoshapes, so an extractor walking
`shape_type == PICTURE` silently misses them.

**Open issues on the extracted art — left exactly as delivered, per the standing rule:**

- [ ] **Generator watermarks retained.** A Gemini sparkle glyph is baked into `s2-tom-shirley`
      (02) and `s5-cylinder-after` (02, falls outside the square crop at display size).
      `s15-four-kids` (01) carries a baked Hebrew line *"תוכן שהופק על ידי בינה מלאכותית"* along its
      bottom edge, and Hebrew lab signage in the background. Same decision as the comic panels:
      nothing cropped. **Needs the same content-owner ruling** as the §A2 watermarks.
- [ ] **`05 S3` has three speakers, the storyboard has four.** Slide 153 shows רינה, משה, איריס
      **and עופר**; this build ships the first three. The two generic role icons the deck provides
      (ScientistMale / ScientistFemale) are wired to the three that exist. Adding עופר is a content
      change — **content-owner call.**
- [ ] **`image26` (storyboard slide 24) has no home.** It illustrates an experiments-path guess
      question about non-geometric bodies; the build's experiments path has only one guess screen
      (`01 S21`, which matches slide 27). Not extracted. Either the screen is missing or the
      storyboard slide is redundant — **content-owner call.**
- [ ] Storyboard internal inconsistencies noticed while extracting, all pre-existing and untouched:
      slide 78 vs 79/81/82 (גליל עץ → קוביית עץ) · slide 42 vs 44/45 (בלוט → צדף, and the art swaps
      acorn → dinosaur) · slide 46 vs 48/49 (מחדד → סיכת נעץ) · slides 92–97 (stem says גוש, the
      question and feedback both say גליל) · slides 170/171 (`12,50 סמ"ק` should be `1,250`).
      This build follows its own copy, which is already self-consistent.

### A6. Question-layout bugs fixed in passing (2.8.26)

Two inherited defects surfaced while adding the image layouts. Both affected **every** SCQ screen in
the unit and are fixed in all six `css/style.css` copies:

- **Questions were 160px off centre.** The base `.scq-question` still carries `right: 40px` from the
  inherited mass-measure block. `--textonly` sets `left`/`width` but never cleared `right`, and under
  an RTL containing block an over-constrained `left`/`right`/`width` resolves in favour of `right`.
  Fixed by clearing `right` on both modifiers.
- **The stem and options were out of flow.** The same inherited block absolutely positions
  `.scq-qtext` (`right:0; top:0`) and `.scq-answers` (`right:0; top:100px`) and pins `.scq-opt` to
  604px. Consequences: the question block measured zero height, so it was never actually centred as
  a whole, and long option lists ran past the 74px bottom bar — **`02 S3` ended at y=687 against a
  636 limit.** Fixed by returning both to `position: relative` inside the two modifiers.

Net effect: every question screen shifts slightly and is now genuinely centred and bounded. Verified
at 1280×710 and at canvas scales 0.63 and 1.27 — 60 screens, 99 images, zero overflow, zero 404s.

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

## C. Content-implied images — ✅ resolved (2.8.26)

- [x] **Part 02 · Q1** ("איזה מהגופים **שבתמונה**…") ✅ `s1-bodies.jpg` from storyboard slide 78;
  the stem's "שבתמונה" now refers to something the learner can see.
- [x] **Part 02 · Q5** ("בתמונה א' / בתמונה ב'…") ✅ both cylinder photos added and the screen
  rebuilt as a hotspot — see §A5.
- Parts 03–06 — text-based scenarios. 04/05/06 now carry the storyboard's scenario photographs
  (lentils, gold, slime, marbles, figurine, aquarium statue); part 03 remains text-only by design.

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
| `character-orange-selection.png` | ✅ wired; **also the stand-in for all ~25 poses** (§A1). Copied into all six parts |
| `character-turquoise-selection.png` | ✅ same |
| `s14-bowling-ball.jpg` `s15-four-kids.jpg` `s16-crystals.jpg` | ✅ from storyboard (§A5) |
| `s17-{metal-cube,shell,trophy}.png` | ✅ from storyboard — PNG, genuine cut-outs (§A5) |
| `s18-task-{water-cup,rubik,watermelon,doll,acorn}` | ✅ from storyboard (§A5); acorn is PNG (cut-out) |
| `s19-sharpener.jpg` `s21-large-bodies.jpg` | ✅ from storyboard (§A5) |
| `s1-roni-hook.jpg` | ⚠️ confirm final (§B) |
| `s2-roni-think.jpg` | ⚠️ confirm final (§B) |
| `s3-roni-displacement.jpg` | ⚠️ confirm final (§B) |
| `s4-opt-suitcase.jpg` / `s4-opt-planter.jpg` / `s4-opt-apple.jpg` | ⚠️ confirm final (§B) |
| `s5-archimedes-crown.jpg` | ⚠️ confirm final (§B) |
| `s6-archimedes-bath.jpg` | ❌ re-export without watermark (§B) |
| `s9-cylinder.svg` `s9-marble.svg` `s22-chess-king.svg` `s22-hammer.svg` | ✅ hand-authored vectors (§A3). The old `.png` placeholders are deleted |

Parts 02–06 `assets/img/` are no longer icon-only: each now also holds the two companion PNGs and
its own storyboard photographs (§A1, §A5). Full per-part file list in §A5.
