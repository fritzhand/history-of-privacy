# Archival Research Brief — Who Writes the Terms? A History of Privacy

The next evidence pass. Each item is a named gap on the live site: one of the
73 sources still PENDING, a figure resting on a law firm, the press or our own
arithmetic, a series with holes, or a claim the first pass could not verify.
Close each against a primary institution, record it in `research/*.json` with
the exact quote, then rebuild (`node tools/build-data.mjs`).

## Standard

- One source object per claim: `institution`, `title`, `date`, `url`, `quote`,
  `verificationStatus`, `accessType`; translations and caveats go in `note`.
- CONFIRMED only when `python3 tools/fetch-text.py URL --check "quote"` finds
  it. A quote seen only in raw HTML, a JSON field or a scan stays PENDING.
- Prefer, in order: statutes on official sites; judgments on court sites;
  treaty texts from the UN, the Council of Europe or the OECD; specifications
  from W3C, IETF or IEEE; regulator decisions; then peer-reviewed scholarship.
  Law firms and the press are second sources. Wikipedia is a lead, not a source.

## Access notes

- EUR-Lex, coe.int, oecd.org, Légifrance, Gallica, OHCHR, SSRN, HathiTrust and
  IEEE Xplore block scripts. What worked: the EU Publications Office's Cellar
  repository (the same Official Journal text) and legislation.gov.uk's copies
  of EU directives; the CNIL's copy of Loi 78-17; the OECD's PDF editions; the
  Irish Statute Book's Convention 108; `documents.un.org`; `static.case.law`.
- w3.org and doc.searls.com refuse the helper but serve curl: save the page
  into `/tmp/fetch-text-cache`, then `--check`. web.archive.org reset every
  connection in the verification pass: 65 of the 73 PENDING are snapshots.

## Tier 1 — quantitative gaps

1. **IEEE 7012-2025, the normative text (priority).** IEEE Xplore document
   11360682 is free under the GET Program but needs an IEEE sign-in, and Xplore
   bot-challenges scripts: only the abstract, scope and purpose were read. Check
   the five launch agreements (SD-BASE, SD-BASE-DP, PDC-AI, PDC-GOOD,
   PDC-INTENT) and whether Annex A lists 13; the four principles (transparency,
   data minimisation, purpose limitation, reciprocity), sourced to myterms.info
   alone; the record-keeping clause ("a matching record shall be kept by both
   sides") and any record format, signature, protocol or dispute forum, which
   the agent walk-through calls "not specified"; scope sentences 2–3 (PENDING).
2. **US data breaches by year.** The Identity Theft Resource Center's annual
   reports (idtheftcenter.org 403). The series `us-data-compromises` waits.
3. **Greenleaf's count, year by year.** His 2025 list (SSRN 5189972; 403).
   Pre-2011 points are sums of decade counts; years between editions are blank.
4. **UNCTAD's share of countries with a law.** The 2026 point (155 of 195) is
   our tally of `CyberlawData.js` (unctad.org 403), PENDING in three records.
   Reproduce it, or find an UNCTAD sentence newer than "137 of 194".
5. **First data-protection laws.** 93 jurisdictions; 29 rest on DLA Piper
   alone and Zimbabwe's year is PENDING. Missing: Denmark (Lov nr. 293 and 294
   of 1978; retsinformation.dk is script-rendered), the Netherlands, Portugal,
   Belgium, Greece, Poland and 17 more named in the `global.json` notes.
   Gazettes would change the map and the per-decade chart.
6. **Treaty status.** Council of Europe Treaty Office charts (coe.int 403):
   Convention 108's entry into force (1 October 1985; the site says "1985");
   Convention 108+ ratifications (Moldova as "34th" is PENDING) against the 38
   needed; Uruguay's accession, now from a law firm that is wrong on 108+.
7. **Person-side signals in use.** No primary figure for DNT adoption, ATT
   opt-in (Flurry: charts only) or GPC users; needed to show use, not design.
8. **GDPR fines, 2022–2024.** Back-calculated from DLA Piper's annual totals
   (`estimate=true`); its January 2023 and 2024 surveys would replace them.
9. **Three historical figures.** Stasi staff, 1950–89 (three points; Gieseke
   2000, KAS 403); "over 1.5 million" roll-film cameras by 1898 (Met essay, 429;
   name its journal); about 80 cases citing Warren and Brandeis by 1960 (Gajda).

## Tier 2 — claims to verify or retire

- **Wayback snapshots.** Most PENDING snapshots now sit beside a CONFIRMED copy
  (OECD 1980, Convention 108, the EU directives, the Bork tapes): drop or
  re-check them. Solove's "Conceptualizing Privacy" (9 essay records; GW
  repository 403) and Gajda (2008; BrooklynWorks 403) have no other copy.
- **Below the Standard.** Marked CONFIRMED though `--check` fails: Blackstone
  on Avalon, the Soghoian and Montulli posts, the myterms.info banner, Obar and
  Oeldorf-Hirsch, Proposition 24's vote counts. Wikipedia is cited 20 times;
  replace it first in the Warren-wedding myth, the laws table and Lentz (1936).
- **GDPR Art. 88b.** The site says the Council's 18 June 2026 Digital Omnibus
  text dropped it, citing noyb (the Council text was not read); `concepts.json`
  calls it a live proposal. Read the Council text and state its status.
- **IEEE 7012 dates and people.** "-2025" as the approval year (inferred; find
  the IEEE SA rule); Customer Commons' founding (2013, yet online in 2011; find
  the incorporation record); JLINC as MyTerms' protocol (evidence, or retire).
- **Hesse, 1970.** The Landtag passed the act on 30 September (Stenographischer
  Bericht Nr. 80, a scan); 7 October is the signing date. Two source notes on
  the event say otherwise: correct them, and find a copy with a text layer.
- **Texts read through others.** Cooley's 1879 first edition (HathiTrust bot
  wall; quoted from 1906); the Post Office Act 1710 (only via Hansard, 1844);
  Royer-Collard's 1819 speech (Gallica 403) and the "vie privée murée" maxim;
  Pavesich (vLex syllabus) and Roberson (an excerpt): try `static.case.law`.
  The 1929 Census Act and Second War Powers Act (via Ruggles and Magnuson);
  Seltzer and Anderson (2007), behind the Japanese-American census finding.
- **Secondary-only legal facts.** CCPA's 1 January 2020 start; APPI 2003/2005;
  Korea's 2026 fines (IAPP); Colorado's $20,000 penalty; Sephora as the first
  CCPA action (law firms); HRC 28/16 (OHCHR 403); Court of Rome 4153/2026.

## Tier 3 — images

Public domain, CC0, CC BY or CC BY-SA only; quote the rights statement in
`rightsEvidence`. Wanted: Lou Montulli; the MyTerms launch (London, 28 January
2026); a 1983 census-boycott poster; the 1950 ECHR signing; Samuel D. Warren
(Commons shows his father); Tim May, Vitaly Shmatikov, Aleecia McDonald,
Christopher Allen. Licences unproven: the Tor diagram, Adam Back's T-shirt.

## Tier 4 — coverage

- Pre-modern China and India: Kautilya's *Arthashastra*; Chinese *yinsi*.
- ID numbers: the US Social Security number (1936; ssa.gov 403); the UK
  National Registration Act 1939 and Willcock v Muckle (1951).
- Pre-1981 Europe: PACE Recommendation 509 (1968); CoE resolutions, 1973–74.
- Enforcement: the CNIL's Google fine (2019), Clearview fines (ICO, Greece),
  the Belgian Market Court on the TCF (2025), Latombe v Commission.
- Harms with no readable primary yet: OPM (2015), Grindr (2018), 23andMe
  (2025), Robodebt. Agents: OWASP's agentic Top 10, EDPS TechSonar, the CNIL.
