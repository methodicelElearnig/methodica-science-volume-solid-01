# ASSETS-PROMPTS — image-generation prompts

Ready-to-paste prompts for every asset in `ASSETS-TODO.md`, derived from the
storyboard art directions. Companion to that file. Generated 2026-07-16.

## How to use
1. Prompts are in **English** (image models perform best in English) — but the lomda is
   Hebrew. **Never let the model render any text in the image.** Every prompt ends with
   `no text, no letters, no numbers, no watermark`. All Hebrew copy stays as live HTML in the code.
2. Generate on a **plain solid-white (or transparent) background, centered, full subject** —
   I remove the background and fit it on integration.
3. For **consistency**, attach the relevant reference image (see each `REF:` line). In
   **Midjourney** use `--cref <image-url> --cw 100`; in **ChatGPT/GPT-Image** paste the
   reference and say *"keep this exact character — same colors, fur, face."*
4. **Licensing:** for a Ministry-of-Education deliverable prefer **Adobe Firefly** (licensed
   training data) or properly-licensed stock; confirm educational-distribution rights.
5. Hand the results back with the target filename noted per asset — integration is a drop-in.

---

## Shared style blocks (prepend to prompts as noted)

**[COMPANION STYLE]** — the two mascot characters
> Cute chubby round fluffy monster, soft dense fur, big expressive round cartoon eyes,
> tiny stubby arms and legs, friendly, high-end 3D animated-film style (Pixar / Illumination look),
> soft cinematic studio lighting, full body, centered, plain solid white background,
> ultra-detailed, no text, no letters, no numbers, no watermark.

- **Orange character** = orange fur, small spiky tuft on top of the head, cheerful wide open smile, orange-brown eyes.
- **Turquoise character** = teal/turquoise fur, wavy curly tuft on top, calm sleepy half-lidded eyes, gentle closed smile.
- `REF (orange):` `…-01/assets/img/character-orange-selection.png`
- `REF (turquoise):` `…-01/assets/img/character-turquoise-selection.png`

**[ARCHIMEDES-MODERN]** — comic character (Part 01 S8)
> Friendly cartoon Archimedes reimagined in the present day: older man, full white beard,
> grey hair, kind eyes; wearing modern casual clothes under an open modern lab coat; inside a
> bright modern science laboratory. Clean comic-book / graphic-novel illustration style, bold
> flat colors, soft shading, consistent character in every panel, plain background,
> no text, no speech bubbles, no letters, no numbers, no watermark.

**[PHOTO]** — realistic photography look (stock-style)
> Photorealistic, natural soft lighting, shallow depth of field, clean composition, plain
> or lightly-blurred background, no text, no watermark, no logos.

---

## A1. Companion-character variations
The `selection` pose exists for both. These add the poses the storyboard uses elsewhere.

**Path-choice (S7) — two poses PER character** (storyboard slide 11: right = reading a comic, left = lab-coat + cylinder)
- `character-{orange|turquoise}-comic.png`
  > [COMPANION STYLE] + the {orange|turquoise} character happily reading an open comic book held in its hands.  `REF`
- `character-{orange|turquoise}-experiments.png`
  > [COMPANION STYLE] + the {orange|turquoise} character wearing a small lab coat, holding an empty graduated glass cylinder, curious expression.  `REF`

**Optional guide poses** (if we later place the companion across screens)
- `character-{id}-cheer.png` — > [COMPANION STYLE] + the {id} character cheering with both arms up, big happy smile.  `REF`
- `character-{id}-think.png` — > [COMPANION STYLE] + the {id} character in a thinking pose, one hand near its chin, curious.  `REF`

*(Static PNGs are fine; supply GIFs later with the same names if you want motion.)*

---

## A2. Comic panels — Part 01 S8 / S24 / S25 / S27 / S28 ✅ **COMPLETE (27.7.26; 18a 2.8.26)**
Delivered by Ron Reuveni as photorealistic art and wired in as
`assets/img/comic/{12,14,15a-e,17a-g,18a,18c}.jpg` — all 17 panels, no placeholders left.
The prompts below are superseded — keep them only as reference for regeneration. See
`ASSETS-TODO.md` §A2 for the delivery record and the remaining open issues (retained
generator watermarks; the `14.jpg` 3000 cm³ vs 1,000 סמ"ק conflict).

If **18a** ever needs regenerating, the brief that produced the accepted version was:
Archimedes at his lab bench turning his head aside to listen to a question from outside
the frame — **no watermelon, no bowl, no overflow tray** (that is slide 17's scene, and a
first attempt wrongly reused it). 16:9 landscape, matching the `18b` rice-pouring frame.
**No speech bubbles, no text, no letters, no numbers, no watermark.**

<details><summary>Superseded original prompts (7-panel flipbook)</summary>

Use **[ARCHIMEDES-MODERN]** for all 7 so the character stays identical (attach panel-1 as
`REF` for panels 2–7). 4:3 landscape. Dialogue is added in code — **no speech bubbles in the art**.

- **p1** > [ARCHIMEDES-MODERN] + standing in his lab, gesturing toward the viewer, a rectangular box and a ruler on the bench beside him.
- **p2** > [ARCHIMEDES-MODERN] + holding up an irregular object (a key, an acorn, a glass marble), looking thoughtfully at the viewer as if posing a question.
- **p3** > [ARCHIMEDES-MODERN] + presenting a large cube on the bench, measuring its edge with a ruler; a key, an acorn and a marble beside it.
- **p4** > [ARCHIMEDES-MODERN] + holding a tall graduated cylinder filled with water, a green marble about to be dropped in; a "got it!" raised-finger gesture.
- **p5** > [ARCHIMEDES-MODERN] + standing next to a large object (a watermelon) that is clearly too big for the small cylinder, puzzled expression.
- **p6** > [ARCHIMEDES-MODERN] + a bowl filled with water to the very brim sitting inside a larger deep tray; he lowers a watermelon in and water spills over into the tray.
- **p7** > [ARCHIMEDES-MODERN] + cheerfully pouring rice / grains from a scoop into an empty measuring cup, celebratory mood.

</details>

---

## A3. Applet objects & vessels (Part 01 S9/S10/S11/S22)
Transparent PNG, single object, straight-on product view, soft shadow.

- `s9-cylinder.png` — > [PHOTO or clean 3D render] a tall laboratory graduated glass cylinder on a footed base, clearly printed volume marks 10–100 with "ml" at top; empty; straight-on; isolated on plain white. no text except the printed scale numbers on the glass. *(Storyboard: re-produce cleanly, keep scale readable & proportional.)*
- `s9-marble.png` — > a single glossy green glass marble, straight-on, soft reflection, isolated on plain white, no text.
- `s10-aquarium-cube.png` — > a perfectly cube-shaped transparent glass aquarium (looks square, not rectangular), partly empty, clean studio render, isolated on white, no text. *(One edge will be highlighted in code.)*
- `s10-ruler.png` — > a straight measuring ruler with clear centimeter tick marks, vertical, isolated on white, realistic proportions. numbers on the ruler are OK; no other text.
- `s11-bowl.png` — > a wide transparent glass bowl filled with water to the very brim, sitting inside a larger shallow collection tray, clean 3D render, isolated on white, no text.
- `s11-rock.png` — > a single grey natural stone / rock, matte, straight-on, isolated on white, no text.
- `s22-chess-king.png` — > a single glossy chess king piece, straight-on, isolated on white, no text.
- `s22-hammer.png` — > a single carpenter's claw hammer, straight-on, isolated on white, no text.

*(Alternatively I can hand-author these as clean SVG vector illustrations — say the word and I'll upgrade the current placeholders directly, no generation needed.)*

---

## A4. Other Part-01 art
- `s15-four-kids.png` — > four cartoon children (diverse) standing in a modern science classroom/lab, each looking slightly different, friendly, waist-up, evenly spaced left-to-right, flat modern illustration style, plain background, **no speech bubbles, no text**. *(Each child's argument is added as live HTML beside them.)*

**Flip cards (S20) — prefer licensed stock; storyboard gives Envato links.**
- `s20-metal.jpg` — Envato: *"closeup of rollers / blanks obtained on a lathe"* — search terms: `metal industry lathe blanks closeup`. AI fallback: > [PHOTO] close-up of freshly machined shiny metal cylinder blanks on a factory lathe.
- `s20-jewelry.jpg` — Envato: *"jewels and gold coins"* — search: `gold jewelry and coins closeup`. AI fallback: > [PHOTO] close-up of gold jewelry and gold coins on dark velvet.
- `s20-archaeology.jpg` — Envato: *"Roman excavations, La Olmeda"* — search: `roman archaeological excavation site statues`. AI fallback: > [PHOTO] archaeologists examining ancient statues at a Roman excavation site.

---

## B. Existing images — regenerate / fix (Part 01)
Current files are AI-reference images; regenerate only if you want higher quality/consistency.

- `s6-archimedes-bath.jpg` — **must fix the AI watermark.** Either I crop it out, or regenerate:
  > classical ancient-Greek Archimedes (older man, white beard) sitting in a stone Roman bath, water overflowing over the edge, holding a golden crown, joyful "eureka" expression, warm candlelight, cinematic, no text, no watermark.
- `s1-roni-hook.jpg` — > [PHOTO] a ~12-year-old girl kneeling on a lake beach holding up a small gold star-shaped pendant, a metal detector beside her, warm late-afternoon light. no text.
- `s2-roni-think.jpg` — > [PHOTO] the same girl indoors, holding the gold star pendant in one hand and a graduated water cylinder in the other, thoughtful. keep same girl as `s1-roni-hook.jpg` (REF). no text.
- `s3-roni-displacement.jpg` — > [PHOTO] the same girl holding the pendant next to a graduated cylinder of water, about to lower it in. REF `s1-roni-hook.jpg`. no text.
- `s5-archimedes-crown.jpg` — > classical ancient Greece: King Hiero (crowned, purple robe) and Archimedes (white beard, tunic) examining an ornate gold crown; a water vessel and small metal cubes on a stone table; candlelit, cinematic, no text.
- `s4-opt-suitcase.jpg` — > [PHOTO] an open travel suitcase being packed with boxes/items, top-down. no text.
- `s4-opt-planter.jpg` — > [PHOTO] a rectangular garden planter box being filled with soil, plant seedlings nearby. no text.
- `s4-opt-apple.jpg` — > [PHOTO] a red apple sitting on a digital kitchen scale that clearly shows a weight in **grams**, kitchen counter. (grams reading is the only allowed text.)

---

## C. Optional Part-02 illustrations (currently text-only)
- `p02-bodies.png` — > flat modern illustration of four solids side by side: a brick, a soft irregular blob of orange modeling-clay shaped like a little monster, a cardboard box, and a wooden cube; plain background; no text.
- `p02-cylinder-before.png` / `p02-cylinder-after.png` — > two matching graduated cylinders of water, the second with the water level noticeably higher after a small figurine was dropped in; clean render; isolated on white; keep scale marks; no other text.

---

### Filename → screen quick map
S0 companions (done) · S7 `character-*-comic/experiments` · S8 `s8-comic-p1..7` ·
S9 `s9-cylinder`,`s9-marble` · S10 `s10-aquarium-cube`,`s10-ruler` · S11 `s11-bowl`,`s11-rock` ·
S15 `s15-four-kids` · S20 `s20-metal/jewelry/archaeology` · S22 `s22-chess-king`,`s22-hammer` ·
story `s1-roni-hook`,`s2-roni-think`,`s3-roni-displacement`,`s5-archimedes-crown`,`s6-archimedes-bath` ·
S4 opts `s4-opt-suitcase/planter/apple`.
