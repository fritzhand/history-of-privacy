# Progress — Who Writes the Terms? A History of Privacy

**Repository:** `fritzhand/history-of-privacy`
**Branches:** `main` (GitHub Pages) and `claude/privacy-history-research-z9ozcn`, kept identical
**Last updated:** 2026-09-23

A domain fork of `fritzhand/history-of-indigo`, built in one pass: a research
sweep in fifteen slices, an adversarial verification of every record, a check
of the IEEE 7012 claims against the standard's own text, and a fact-check of
the site's authored prose.

---

## Where the project stands

The site runs end to end. Every section renders from the cited data layer in
both themes and at phone width, with no console errors and no horizontal
scroll; the validator reports no errors, and the share card and metadata are
current. The remaining work is evidentiary: the gaps are listed in
`ARCHIVAL_RESEARCH_PROMPT_PRIVACY.md`.

To publish: **Settings → Pages → Deploy from a branch → `main`, `/ (root)`**.
The site will then be at <https://fritzhand.github.io/history-of-privacy/>.

| Layer | Status | Notes |
|---|---|---|
| Research pass | **done** | 15 slices in `research/`: early, let alone, data protection, internet, surveillance, numbers, MyTerms, agents, concepts, global, three personas slices, essay, media. 949 records, each with source objects carrying the supporting quote |
| Verification | **done** | 128 verdict files in `research/verify/`. Every displayed record was re-fetched and challenged: 372 OK, 563 corrected, 11 downgraded, 1 dropped (kept with its reasons). The only unchecked records are two MyTerms milestones the page does not show |
| IEEE 7012 against its text | **done** | The standard's full text (free through the IEEE GET Program) was read and every claim the site makes about it checked clause by clause; see below |
| Prose fact-check | **done** | Four agents checked every authored headline, chip, essay sentence, figure label, chart description and static paragraph against its sources; 53 fixes applied |
| Data build | **done** | `tools/build-data.mjs` + `tools/editorial.mjs` → `js/data.js`. One source object per document; Wikipedia never shown as a source; images whose licence was not confirmed at source are left out |
| Essay | **done** | "A Short History of an Idea": every sentence numbered to its notes |
| Narrative map | **done** | 242 mapped events, 45 scrollytelling steps from c. 400 BCE to 2026 |
| Spread chart & scrubber | **done** | Compressed time axis shared by the chart and the slider |
| Data protection & world | **done** | Greenleaf's count, FIPPs side by side, 93 first laws on a map, 15 cross-border instruments, 6 policy models |
| Consent & surveillance | **done** | Figure cards and charts, each cited |
| People | **done** | 48 people in three groups (cryptographers & code, hackers & advocates, researchers & identity), each quoting their own words |
| Machine-readable privacy | **done** | 14 mechanisms from the HEW code to IEEE 7012: who proffers, legal force, who keeps the record, fate |
| IEEE 7012 / agents | **done** | The standard, its principles, the five launch agreements, the case in the age of agents, an illustrative errand, counterpoints, 18 jurisdictions |
| Where 7012 sits | **done** | The twelve standards of IEEE's GET Program for AI Ethics and Governance (series page rendered headless; every quote checked), read by their own abstracts and scopes (this study's reading, marked DERIVED): six set organisations' processes, five concern the systems themselves, one (7012) is written from the person's side. `research/ieee-get.json`, verified in `research/verify/ieee-get-*.json` |
| Myths | **done** | 32 popular claims that did not survive checking |
| Picture archive | **done** | 85 images (40 CC BY, 24 CC BY-SA, 16 public domain, 5 CC0); every licence read on its record page and quoted in `rightsEvidence` |
| Share card & metadata | **done** | `tools/og-card.html` → `assets/og-image.png`; `tools/check-meta.mjs` passes |

## Citation status

Counted by `node tools/validate-data.mjs` (and live in the page's source audit):

| Verification status | Source objects |
|---|---|
| CONFIRMED | 1,642 |
| PENDING | 36 |
| DERIVED | 0 |

Source objects are merged per document within a record: two clauses of one
standard, or two sentences of one paper, count once, with each part named.

Most PENDING sources are Internet Archive snapshots that could not be
re-fetched during verification (web.archive.org reset every connection); in
nearly every case the same record also cites a CONFIRMED copy of the text.

## IEEE 7012-2025, checked against the standard

The first pass read only the IEEE abstract and the MyTerms, Customer Commons
and ProjectVRM pages. The full text was then read and the site corrected:

- **No fixed number of agreements.** The normative clauses name no agreement
  and set no number (cl. 4.1: "as few agreements as possible"). Informative
  Annex A lists 13 sample agreements; five is MyTerms' launch roster. The hero
  figure now says so.
- **Acceptance is conditional.** The organisation's agent may accept, reject,
  or answer once with one alternative from the same roster (cl. 5.3.1); a
  refusal must be recorded (cl. 5.2.4). The page no longer says the site
  "agrees".
- **The record is specified.** Its minimum contents (terms, date, time stamp,
  identifiers, a unique contract ID) and identical, immutable copies on both
  sides are normative (cl. 5.2.4, 5.4.4); only the format, storage medium and
  protocol are open, and interoperability "is not a requirement of this
  standard" (cl. 5.5).
- **The person proffers; they do not write.** Terms come from a roster kept by
  a neutral non-business entity (cl. 4.2), which the normative text does not
  name; Customer Commons appears only in informative text.
- **SD-BASE.** The MyTerms FAQ's gloss (the site "may observe you while you
  are there") is looser than the standard's own sample, which rules out
  analytics, tracking and profiling by the site itself (Annex A).

## IEEE's GET AI-ethics series

Added after the first build, at the reader's request: the series page
(<https://ieeexplore.ieee.org/browse/standards/get-program/page/series?id=93>)
and each standard's Xplore page were rendered in a headless browser, because
Xplore bot-challenges scripts. What it changed:

- **Access.** The programme page says: "To download any of these standards,
  you must sign in with an IEEE Account." The site's facts row and the
  paywall myth now say so. (The 7012 PDF link did serve the file without a
  sign-in on 23 September 2026; 7002's redirected to the IEEE login.)
- **"The latest of the 7000 series."** True when Doc Searls wrote it in
  January 2026; IEEE 7014.1-2026 (emulated empathy in general-purpose AI
  "partners") followed on 12 June 2026. The timeline entry is now dated.
- **No cross-reference, either way.** IEEE 7012 cites no other standard in the
  series; IEEE 7002 (Data Privacy Process), read in full from a copy the
  author downloaded with an IEEE account, cites none of the 7000 series
  either. No public IEEE statement found relates the two; IEEE SA's 2018
  statement lists both among its 7000-series projects. The one person on both
  working groups is John Wunderlich (7002's vice chair).
- **7002 beside 7012.** 7002 describes the public privacy policy as something
  "an organization publishes to notify potential data subjects"; the only
  agreements it names are with third parties or inside the organisation, and
  it mentions consent once. 7012's agent "shall specify that the individual's
  chosen terms shall supersede any Terms of Use (TOU) or Privacy Policy".
  7002 traces its principles to the US government's 1973 Fair Information
  Practices, linking the HEW report this site quotes. The PDF itself is IEEE's
  licensed copy and is not in the repository; the site quotes short passages.
- **Source audit.** Side sources (a section's closing note, a person's quote)
  were not counted or validated before; they are now.

## Corrections the verification made to the popular story

- McDonald and Cranor's "201 hours" is in their conclusion; their own Table 7
  gives 244 hours a year, and the $781 billion total is computed from 244.
- Warren and Brandeis did not coin the phrase "to be let alone": they credited
  it to Judge Thomas Cooley's treatise on torts, first published in 1879.
- Microsoft's 2012 P3P disclosure named only Google; Facebook's bypass was made
  public by Nik Cubrilovic the next day.
- The Malabo Convention's fifteenth party was Angola, not Benin (a signatory
  only).
- The first non-European state to ratify Convention 108+ was Mauritius (2020),
  not Uruguay.
- Only four privacy commissioners' conferences were held outside Europe before
  1999, not five.
- The Wall Street Journal's "What They Know" series was a Pulitzer finalist in
  2012, not 2011.
- Sephora's $1.2 million CCPA settlement covered three allegations, not only
  ignoring Global Privacy Control.
- The New York Times reported that Clearview *claimed* to have scraped more
  than three billion images; Twitter was not among the sites it named.
- The CCC's 1984 Btx demonstration moved DM 134,694.70 by the Bundespost's own
  statement, and nothing was stolen.
- The Council presidency's Digital Omnibus text of 18 June 2026 dropped the
  proposed GDPR Article 88b on machine-readable privacy signals.

## Link audit (2026-09-23)

`tools/check-links.mjs` over the final `js/data.js`: 1,443 URLs, 1,321 answer,
103 are rate-limited or bot-gated (Council of Europe, EUR-Lex, Légifrance, the
New York Times, SSRN, the Library of Congress, Flickr and similar; they resolve
in a browser). Of the 19 flagged, none is dead:

- 7 answer HTTP 200 to a browser user agent (WhatsApp's blog, the Riksdag's
  open data, Wiktionary, three W3C mailing-list archives, Ghana's ministry);
- 6 are Internet Archive snapshots, and web.archive.org reset every connection
  from the build environment;
- gnu.org and sfu.ca reset connections from the build environment, their home
  pages included;
- `fb.me/p3p` is text inside Facebook's quoted P3P header, not a link;
- the site's own two URLs answer 404 until GitHub Pages is enabled.

The one genuinely dead link found earlier, NSF's deleted Flickr page for the
Cranor portrait, was retired; the Commons record and its licence review remain.

## Next

1. Work through the research brief: Tier 1 first (the MyTerms launch
   agreements' full texts, the first-laws table beyond DLA Piper, Greenleaf's
   year-by-year count, US breach figures).
2. Re-fetch the PENDING Internet Archive snapshots, or drop those that sit
   beside a CONFIRMED copy.
3. Images still wanted: Lou Montulli, the MyTerms launch, the 1950 ECHR signing.
