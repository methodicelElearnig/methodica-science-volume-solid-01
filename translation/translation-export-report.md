# Translation Export Report — Target 08, מדידת נפח מוצק

**Module:** methodica-science-volume-solid-01
**Export type:** first export (no earlier translation export existed for this unit)
**Date:** 2026-10-19
**Languages:** Hebrew (he) → Arabic (ar). All `<target>` cells are empty.
**Regenerate:** `python3 translation/tools/extract_translations.py` (read-only against the build)

## Files

| File | What it is |
|---|---|
| `methodica-science-volume-solid-01-he-ar.xlsx` | Handoff for the translator: one row per string, a yellow column for the Arabic, and a second sheet listing the screens |
| `methodica-science-volume-solid-01-he-ar.xlf` | The same units as XLIFF 1.2, for a CAT tool |
| `translation-screen-manifest.csv` | One row per screen: id, DOM id, title, type, file, number of units |
| `tools/extract_translations.py` | The extractor |

## Totals

| | Count |
|---|---|
| Units | **1240** |
| From HTML (text and attributes: alt, aria-label, placeholder…) | 1017 |
| From JS (feedback, comic text, applet instructions, runtime labels) | 223 |
| Units whose source holds HTML tags (`<strong>`, `<br>`, `<span …>`) | 260 |
| Screens in the manifest | 69 |

Units per part: 00 → 5, 01 → 498, 02 → 167, 03 → 166, 04 → 37, 05 → 156, 06 → 107, 07 → 104.

## IDs

`08-PP-SS-NNN`: target 08, part (00–07), screen (`data-screen`), running number.

- **Part 00** is the module root (`index.html`, the redirect page) and the shared `unit-js` layer (image-zoom labels).
- **Screen 99** (331 units) is text that is not tied to one screen: the "מצאתם בעיה?" report dialog, the image-zoom modal, the page title, and JS strings the runtime uses on several screens (feedback titles such as "התשובה אינה נכונה.", "שנמשיך?", applet instructions). Each JS unit carries a `js-context` note with its line of code, so the translator can see where it is used.

## Notes for the translator

1. **HTML tags:** translate the text and keep the tags in place. `<strong>` marks emphasis that must stay on the matching words.
2. **Repeated strings:** the same Hebrew (e.g. "שנמשיך?", "התשובה אינה נכונה.") appears as several units, one per place in the code. Translate them the same way.
3. **Joined strings:** a few JS strings are pieces of one sentence that the code joins with `+` (e.g. "פאנל N מתוך M"). They are marked in the notes column. Translate them so they still read correctly when joined.
4. **Math:** keep the `·` multiplication sign and the numbers. Invisible direction marks (U+2066 / U+2069) around equations keep them left-to-right; keep them.
5. Units (מ"ל, סמ"ק, ס"מ, ליטר) need the Arabic convention the curriculum uses.

## Not covered by this export (needs separate localization)

- **Text inside images.** `methodica-science-volume-solid-01-05/assets/img/s5-slime-sink.svg` draws "מ״ל" as SVG text. Raster images (jpg/png) and videos (character clips, comic panels) were not scanned for burned-in Hebrew and should be checked by eye.
- **Metadata** (`metadata/*.json`): catalogue fields (titles, learning objective) are not learner-facing in the lomda and are not included.

## Verification

| Check | Result |
|---|---|
| XML well-formed | ✅ |
| Duplicate ids | ✅ 0 (1240 unique) |
| HTML comments, `<script>`, `<style>` and JS comments excluded | ✅ |
| All `<target>` empty | ✅ |
