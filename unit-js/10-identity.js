'use strict';
/* ═══════════════════ xAPI (720) — identity ═══════════════════
   Shared by all SEVEN components of methodica-science-volume-solid-01. Loaded first; see
   unit-js/README.md for the load order and the hook contract.

   Canonical id prefix for this unit. Every component and item id the lomda reports is built from
   it and must match metadata/*.json byte-for-byte — INCLUDING the trailing slashes this unit's
   metadata carries on component and item ids (but not on question ids, and not on the unit id,
   which is a bare slug — see below). 50-loader.js compares XAPI_COMP_ID with window.METADATA.id
   on every load and shouts on a mismatch.

   Lowercase everywhere (ids, folder names, storage keys): Kata derives a uniqueKey from the last
   id segment, and currentPartSlug() derives the state key from location.pathname — a capital
   letter would split one learner's progress across two documents. */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/';

/* The unit id — a bare SLUG, not an IRI, equal to metadata/methodica-science-volume-solid-01_unit.json
   `id` and to `learningUnitId` in every component JSON (2.7 metadata, 2026-10-20). MOE v2.5 §2.7
   dropped the IRI requirement for the content unit only; components and items remain IRIs (hence
   XAPI_ID_PREFIX above).
   ⚠️ Never replace it with the prefix alone (what this unit used until 2026-10-20): Kata would take
   "01" as the uniqueKey and collide with every unit 01 of every subject. The issue-report form also
   posts shortId(learningUnitId) as the unit column of the sheet all 720 units share.
   No unit-level statement is ever sent (v2.5/v2.7 define completed at item and component level
   only); this id keys the library's localStorage fallback for the State document and nothing else
   on the wire. */
window.XAPI_UNIT_ID = 'methodica-science-volume-solid-01';

/* Last path segment of a canonical id — the short slug the bug-report form records.

   The trailing-slash strip is load-bearing, and its absence was a live bug: this unit's component
   and item ids all END in '/', so a plain split('/').pop() returned the empty string for every one
   of them. Every problem report was posting "" as the component and "-05" as the item id —
   unattributable. */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* Resume (Kata xAPI State API) — ON: one State document per component (v5), the four hooks in
   every part's js/main.js, the boot cover in every index.html (docs-and-tools/RESUME.md).
   ⚠️ This flag also changes reporting, not only restoring: it makes 50-loader.js load
   xapi-720-k.js (the build with the State layer and the helpType extension on 'requested')
   instead of xapi-720-i.js. Do not switch it off to debug a restore — use ?resetState.

   ⚠️ DEPLOY ALL SEVEN COMPONENT FOLDERS ATOMICALLY when this changes, and on rollback too. */
var RESUME_ENABLED = true;

/* ── Navigation between parts: off in production, open only for a local walkthrough ──
   The platform (Kata) decides which component comes next: it launches each component on its own,
   with its own ?registration, reads our 'completed' and routes by the catalogue
   (recommendedAfterFail / isRequired / order). Any in-unit hop would carry window.location.search
   along — i.e. report the next component under the previous component's registration. So every
   cross-part navigation (the last screen's forward hop and the first screen's "חזרה") runs only
   when DEV_NAV is true, which requires BOTH:
     1. ?dev=1 in the URL — only index_dev.html / the developer sets it;
     2. NO ?registration — every Kata launch carries one, so a URL that has it is a real learner
        session, and ?dev=1 does not open navigation there.
   The component 'completed' is never gated on this flag: it is sent by the last click on the last
   screen, and the button is disabled after it. */
var DEV_NAV = false;
try {
  var _devQ = new URLSearchParams(location.search);
  DEV_NAV = _devQ.get('dev') === '1' && !_devQ.has('registration');
} catch (e) {}
