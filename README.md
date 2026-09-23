# Who Writes the Terms? A History of Privacy

An open-data, scrollytelling data-journalism site on **the history of privacy** — from a physician's oath and a law of windows, through the castle, the sealed letter, the camera, the census, the data bank, the cookie and the consent banner, to **IEEE 7012-2025**, the standard for machine-readable personal privacy terms known as **[MyTerms](https://myterms.info/)**, and why it matters now that AI agents act for people.

The thesis is in the title. For most of history the terms of privacy were set by a wall, a seal, a court or a statute. Online they were set by the organisation — a policy the person was deemed to accept. Signals such as Do Not Track and Global Privacy Control let a person's browser say no, but did not make an agreement. IEEE 7012 turns the relationship around: the person (or an agent working for them) proffers standard terms; if the organisation agrees, both keep the record (a refusal is recorded too).

It is a domain fork of [`fritzhand/history-of-indigo`](https://github.com/fritzhand/history-of-indigo) (*Indigo: The Blue That Dyed the World*), itself a fork of [`fritzhand/history-of-tampa`](https://github.com/fritzhand/history-of-tampa): same architecture, same citation standard, a different subject.

**Live:** <https://fritzhand.github.io/history-of-privacy/> (GitHub Pages, from the `main` branch, repository root)

Every asset path is relative, so the site works unchanged under the `/history-of-privacy/` project subpath. The page sets no cookies and runs no analytics.

## What you get

| Layer | Implementation |
| --- | --- |
| What privacy means | Concept cards, each quoting the person who put the idea into words, and a four-voice diagram of who writes the terms online |
| Narrative scrollytelling map | Leaflet world map + IntersectionObserver steps (`js/app.js`) from antiquity to 2026 |
| Cited data layer | `js/data.js` — `window.privacyData`, compiled from `research/*.json` by `tools/build-data.mjs` |
| Spread chart & year scrubber | Every mapped event by region and era on a compressed time axis; the map fills in as the slider moves |
| Data protection | Countries with data-privacy laws over time, and the fair information principles side by side |
| The consent machine | What notice-and-consent costs a reader, and what people say about it |
| Machine-readable privacy | The lineage from P3P to Do Not Track, the IAB framework, Global Privacy Control, consent records, AI-preference signals and IEEE 7012 — who proffers, legal force, who keeps the record, fate |
| The surveillance economy | Fines, breaches, state laws, real-time bidding |
| Human cost | "When Records Were Turned on People", each row cited |
| IEEE 7012 / MyTerms | The standard, its principles and its launch agreements |
| The age of agents | The case for person-proffered terms, claim by claim with evidence; an illustrative agent errand; the counterpoints |
| Jurisdiction matrix | Which privacy laws oblige a business to honour an automated or machine-readable choice |
| Myths | Popular claims that did not survive checking |
| Open picture archive | Rights-cleared images (public domain / CC0 / CC BY / CC BY-SA), each credited |
| Live source audit | Every institution, its data points and their verification status |

## Run locally

A static site with no build step for the reader. From the repo root:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Map tiles, fonts and CDN libraries need network access.

## How the data is made

```
research/*.json          the research pass: events, series, quantities, concepts,
                         lineage, jurisdictions, harms, the standard, the argument,
                         images — every record with source objects that carry the
                         exact quote supporting it
research/verify/*.json   the adversarial pass: independent verifiers re-fetched every
                         source and tried to refute every record; their verdicts
tools/apply-verdicts.py  folds the verdicts back into research/*.json (fixes,
                         downgrades, drops — a dropped record is kept with its reasons)
tools/editorial.mjs      the judgement layer: eras, which events are mapped,
                         narrative steps, charts, tables, the IEEE 7012 section
tools/build-data.mjs     compiles both into js/data.js
```

`js/data.js` is generated; edit the research or the editorial layer and rebuild.

## Tools

```bash
python3 tools/fetch-text.py URL --check "quote"    # is this sentence really on that page?
python3 tools/apply-verdicts.py                    # verification verdicts -> research/*.json
node tools/build-data.mjs                          # research + editorial -> js/data.js
python3 tools/assemble-page.py                     # refresh the counts quoted in the share metadata
node tools/validate-data.mjs                       # schema, eras, renderer contract, hero rule
NODE_USE_ENV_PROXY=1 node tools/check-links.mjs    # every source URL, grouped by outcome
node tools/media-roll.mjs                          # regenerate the CONTENT_LICENSE media table
node tools/check-meta.mjs                          # Open Graph / Twitter / JSON-LD
node tools/render-card.mjs                         # rebuild assets/og-image.png from tools/og-card.html
```

`render-card.mjs` needs `playwright` and `sharp` available to node.

## Citation standard

Every claim in `js/data.js` carries:

```js
source: {
  institution: "...",
  title: "...",
  date: "YYYY-MM-DD",
  url: "https://...",
  quote: "...",                    // the sentence that supports the claim, checked against the page
  note: "...",                     // optional
  verificationStatus: "CONFIRMED", // or PENDING | DERIVED
  accessType: "FREE"               // or REGISTRATION | PAYWALL | API
}
```

- Prefer primary texts: statutes on official sites, judgments on court sites, treaties and guidelines from the UN, Council of Europe and OECD, specifications from W3C, IETF and IEEE, regulator decisions and reports, then peer-reviewed scholarship.
- A quote is CONFIRMED only when `tools/fetch-text.py --check` finds it on the cited page and it supports the claim.
- Hero and footer numbers must be `CONFIRMED`.
- Wikipedia is a lead, never a source: the build hides a Wikipedia citation when the record has a better one and marks it `PENDING` otherwise.
- An image is published only when its licence was confirmed on its record page; a Commons tag alone is not enough.
- The IEEE 7012 section is checked against the standard's own text (free through the IEEE GET Program), clause by clause; what comes only from MyTerms or Customer Commons is attributed to them.
- Popular claims that did not survive checking are shown as such in the Myths section.

## Planning documents

| File | Purpose |
|---|---|
| [`ARCHIVAL_RESEARCH_PROMPT_PRIVACY.md`](./ARCHIVAL_RESEARCH_PROMPT_PRIVACY.md) | Research brief for the next evidence pass |
| [`PROGRESS.md`](./PROGRESS.md) | Done / not-done checkpoint for resume |
| [`CONTENT_LICENSE.md`](./CONTENT_LICENSE.md) | Data license, media rights policy, media roll |

## Design

Editorial, after the Indigo and Tampa studies: Crimson Pro for headlines, Work Sans for body, labels and numbers. Two grounds — graphite (dark) and laid letter paper (light) — and a palette where colour means something: key brass is the primary accent, the red of a recording light marks surveillance and harm, and first-party green marks the person's own terms, the study's destination. Four "voices" carry through the diagram and the lineage table: the organisation (amber), the person's software sending a signal (blue), an industry framework (pewter) and the person proffering terms (green). The eight eras are named colours: clay, warrant violet, silver-gelatin, UN blue, punch-card teal, cookie amber, recording red and first-party green.

The whole palette lives in `css/styles.css` as custom properties, once for each theme; `js/app.js` reads it from there, so charts, map markers and cards follow the theme toggle.

## Built with

Leaflet · Chart.js · Esri World Dark Gray and Light Gray Canvas tiles · Crimson Pro / Work Sans

## Credit

Research, data and build by Jeremy Fritzhand
([GitHub](https://github.com/fritzhand) ·
[LinkedIn](https://www.linkedin.com/in/fritzhand/)), with Claude Code.
