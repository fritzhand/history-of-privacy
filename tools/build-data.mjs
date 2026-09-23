#!/usr/bin/env node
/**
 * build-data.mjs — compile js/data.js (window.privacyData) from the research
 * notes and the editorial layer.
 *
 *   node tools/build-data.mjs
 *
 * Inputs
 *   research/*.json      The research pass: every event, series, quantity and
 *                        image with its source objects, each carrying the
 *                        exact quote that supports it. These files are the
 *                        evidence and are not edited by hand.
 *   tools/editorial.mjs  Everything that is judgement rather than evidence:
 *                        which events the page shows, the narrative steps,
 *                        era boundaries, charts, the tables and the IEEE 7012
 *                        section. It receives lookup helpers, so a figure it
 *                        quotes carries the research source object rather
 *                        than a retyped one.
 *
 * Output
 *   js/data.js           window.privacyData.
 *
 * Rules the build enforces, so the page cannot drift from its evidence:
 *   - an event's era is computed from its year, never copied;
 *   - a series point whose source is a free-text note is matched to the
 *     series-level source object it names, and the note is kept;
 *   - a unit conversion or an index is marked DERIVED and says so.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import editorial from './editorial.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SLICES = ['early', 'letalone', 'dataprotection', 'internet', 'surveillance',
  'numbers', 'myterms', 'agents', 'concepts', 'global',
  'personas-code', 'personas-advocates', 'personas-researchers', 'essay', 'media'];
const research = Object.fromEntries(SLICES
  .filter(k => fs.existsSync(path.join(root, 'research', k + '.json')))
  .map(k => [k, JSON.parse(fs.readFileSync(path.join(root, 'research', k + '.json'), 'utf8'))]));

/* ── sources ─────────────────────────────────────────────── */
const SRC_KEYS = ['institution', 'title', 'date', 'url', 'quote', 'note', 'verificationStatus', 'accessType'];
/* Page-text extraction leaves a space before punctuation where a quoted
   word was in italics or bold ("first parties , and"); close it up. */
const tidy = t => String(t).replace(/\s+([,;:!?])/g, '$1').replace(/\s+\.(?!\.)/g, '.').replace(/\s{2,}/g, ' ').trim();
function cleanSource(s, extra = {}) {
  if (!s || typeof s !== 'object') return null;
  const o = {};
  for (const k of SRC_KEYS) if (s[k] != null && s[k] !== '') o[k] = typeof s[k] === 'string' ? (k === 'quote' ? tidy(s[k]) : s[k].trim()) : s[k];
  Object.assign(o, extra);
  if (!o.verificationStatus) o.verificationStatus = 'PENDING';
  if (!o.accessType) o.accessType = 'FREE';
  if (!o.date) o.date = s.accessed || 'n.d.';
  if (isLead(o)) {  // Wikipedia is a lead, never a source
    o.verificationStatus = 'PENDING';
    if (!/Wikipedia is a lead/.test(o.note || '')) o.note = `${o.note ? o.note + ' ' : ''}Wikipedia is a lead, not a source: a primary source is wanted.`;
  }
  return o;
}

/* An encyclopedia citation is shown only when a record has nothing better. */
const isLead = s => /(^|\.)wikipedia\.org$/.test((() => { try { return new URL(s.url).hostname; } catch { return ''; } })());
const dropLeads = list => (list.some(s => s && !isLead(s)) ? list.filter(s => s && !isLead(s)) : list);

/* One record often quotes the same document twice (two sentences from one
   paper, or two clauses of one standard). Merge those into one source object
   per document, keeping every quote and naming each part cited, so the page
   links each document once and the audit counts documents per record rather
   than sentences. */
function joinTitles(a, b) {
  if (!b || a === b || a.includes(b)) return a;
  let n = 0;  // keep the shared stem once: "Std 7012, cl. 5.2.4 …; cl. 5.4.4 …"
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  const cut = Math.max(b.lastIndexOf(', ', n) + 2, b.lastIndexOf(' — ', n) + 3);
  return cut > 10 ? `${a}; ${b.slice(cut)}` : `${a}; ${b}`;
}
function mergeSources(list) {
  const out = [], byKey = new Map();
  for (const s of dropLeads(list.filter(Boolean))) {
    const k = `${s.url}|${s.verificationStatus}`;
    const prev = byKey.get(k);
    if (!prev) { const c = { ...s }; byKey.set(k, c); out.push(c); continue; }
    prev.title = joinTitles(prev.title || '', s.title || '');
    if (s.quote && prev.quote !== s.quote && !String(prev.quote || '').includes(s.quote)) {
      prev.quote = prev.quote ? `${prev.quote} … ${s.quote}` : s.quote;
    }
    if (s.note && !String(prev.note || '').includes(s.note)) prev.note = prev.note ? `${prev.note} ${s.note}` : s.note;
  }
  return out;
}

/* ── indexes ─────────────────────────────────────────────── */
const events = new Map(), seriesIdx = new Map(), quant = new Map(), myths = new Map();
for (const [slice, data] of Object.entries(research)) {
  for (const ev of data.events || []) if (!events.has(ev.id)) events.set(ev.id, { ...ev, slice });
  for (const s of data.series || []) if (!seriesIdx.has(s.id)) seriesIdx.set(s.id, { ...s, slice });
  for (const q of data.quant || []) if (!quant.has(q.id)) quant.set(q.id, { ...q, slice });
  for (const m of data.myths || []) if (!myths.has(m.id)) myths.set(m.id, { ...m, slice });
}
const need = (map, id, kind) => { const v = map.get(id); if (!v) throw new Error(`${kind} "${id}" is not in the research files`); return v; };

/* A free-text point source ("Wenner 2017, citing …") names one of the
   series-level sources; pick the one whose institution or title shares the
   most distinctive words with it. */
const STOP = new Set(['the', 'and', 'of', 'in', 'on', 'via', 'from', 'for', 'a', 'an', 'per', 'table', 'p', 'pp', 'citing', 'cited', 'year', 'source', 'figure', 'report']);
const words = s => String(s || '').toLowerCase().replace(/[^a-z0-9&]+/g, ' ').split(' ').filter(w => w.length > 2 && !STOP.has(w));
function matchLevelSource(text, level) {
  if (!level.length) return null;
  const want = new Set(words(text));
  let best = level[0], bestN = 0;
  for (const s of level) {
    const have = new Set(words(`${s.institution} ${s.title}`));
    const n = [...want].filter(w => have.has(w)).length;
    if (n > bestN) { best = s; bestN = n; }
  }
  return best;
}

function seriesPoints(id, pick = {}) {
  const s = need(seriesIdx, id, 'series');
  const level = dropLeads((s.sources || []).map(x => cleanSource(x)).filter(Boolean));
  return s.points.map(p => {
    let src;
    if (p.source && typeof p.source === 'object') src = cleanSource(p.source);
    else {
      /* An explicit editorial pick beats the word-overlap guess. */
      const m = pick[p.year] != null ? level[pick[p.year]] : matchLevelSource(p.source, level);
      src = m ? { ...m, note: [p.source, m.note].filter(Boolean).join(' — ') } : null;
      if (src && p.verificationStatus) src.verificationStatus = p.verificationStatus;
    }
    const out = { year: p.year, value: p.value };
    if (p.estimate) out.estimate = true;
    const note = [p.period ? `Fiscal year ${p.period}` : p.fiscalYear ? `Fiscal year ${p.fiscalYear}` : null, p.note].filter(Boolean).join('. ');
    if (note) out.note = note;
    out.source = src;
    return out;
  });
}

/* Pictures come from the media slice and from the portraits the three
   personas slices found; one list, first id wins. */
function allImages() {
  const seen = new Set(), out = [];
  for (const k of ['media', 'personas-code', 'personas-advocates', 'personas-researchers']) for (const a of ((research[k] || {}).images || [])) {
    if (!a || !a.id || seen.has(a.id)) continue;
    seen.add(a.id);
    /* An image whose licence the verification pass could not confirm at
       source is not published, whatever tag it carries on Commons. */
    if (a.verified === false) { console.error(`  image ${a.id} left out: licence not confirmed`); continue; }
    out.push(k === 'media' ? a : { ...a, _portrait: true });
  }
  return out;
}

/* ── helpers handed to the editorial layer ───────────────── */
const H = {
  event: id => need(events, id, 'event'),
  eventSources: (id, idx) => {
    const all = (need(events, id, 'event').sources || []).map(x => cleanSource(x));
    return mergeSources(idx == null ? all : [].concat(idx).map(i => all[i]).filter(Boolean));
  },
  quant: id => need(quant, id, 'quant'),
  quantSources: (id, idx) => {
    const q = need(quant, id, 'quant');
    const all = [].concat(q.sources || q.source || []).map(x => cleanSource(x));
    return dropLeads(idx == null ? all : [].concat(idx).map(i => all[i]).filter(Boolean));
  },
  seriesPoint: (id, year) => {
    const p = seriesPoints(id).find(p => p.year === year);
    if (!p) throw new Error(`series ${id} has no point for ${year}`);
    return p;
  },
  seriesSources: id => dropLeads((need(seriesIdx, id, 'series').sources || []).map(x => cleanSource(x))),
  /* A slice-specific array (concepts, jurisdictions, harms, lineage, …) and
     one record from it by id. */
  list: (slice, key) => ((research[slice] || {})[key]) || [],
  item: (slice, key, id) => {
    const v = (((research[slice] || {})[key]) || []).find(x => x.id === id || x.code === id);
    if (!v) throw new Error(`${slice}.${key} has no record "${id}"`);
    return v;
  },
  obj: (slice, key) => (research[slice] || {})[key],
  sources: list => mergeSources([].concat(list || []).flat(4).map(x => cleanSource(x)).filter(Boolean)),
  myth: id => need(myths, id, 'myth'),
  myths: () => [...myths.values()],
  events: () => [...events.values()],
  media: id => allImages().find(a => a.id === id),
  hasMedia: id => !!allImages().find(a => a.id === id),
  cleanSource,
  tidy,
};

const E = editorial(H);

/* ── eras ────────────────────────────────────────────────── */
const ERAS = E.meta.eras;
const eraOf = y => { let cur = ERAS[0].slug; for (const e of ERAS) if (y >= e.start) cur = e.slug; return cur; };

/* ── regions: from coordinates, with named overrides ─────── */
function continentOf(lat, lng) {
  if (lng < -30) return lat >= 24.5 ? 'North America' : 'Latin America';
  if (lat >= 35 && lng >= -30 && lng < 40) return 'Europe';
  if (lng >= -30 && lng < 62) return 'Middle East & Africa';
  if (lng >= 62 && lng < 92.6 && lat < 36) return 'South Asia';
  return 'East Asia & Pacific';
}

/* ── events ──────────────────────────────────────────────── */
const mapEvents = E.events.map(sel => {
  const o = typeof sel === 'string' ? { id: sel } : sel;
  const ev = H.event(o.id);
  const year = o.year ?? ev.year;
  const lat = o.lat ?? ev.lat, lng = o.lng ?? ev.lng;
  const sources = mergeSources((ev.sources || []).map(s => cleanSource(s)).filter(Boolean)
    .filter((_, i) => !(o.dropSources || []).includes(i)));
  return {
    id: o.id,
    date: o.date ?? ev.displayDate,
    year,
    phase: eraOf(year),
    title: o.title ?? ev.title,
    place: o.place ?? ev.place,
    body: o.body ?? ev.summary,
    lat, lng,
    continent: o.continent ?? continentOf(lat, lng),
    source: sources,
  };
}).sort((a, b) => a.year - b.year);

/* ── series ──────────────────────────────────────────────── */
const series = {};
for (const [id, def] of Object.entries(E.series)) {
  let pts = def.from ? seriesPoints(def.from, def.pointSource) : def.points.map(p => ({ ...p, source: [].concat(p.source).map(x => cleanSource(x)) }));
  if (def.years) pts = pts.filter(p => def.years(p.year));
  (def.drop || []).forEach(y => { pts = pts.filter(p => p.year !== y); });
  if (def.convert) {
    const c = def.convert;
    pts = pts.map(p => ({
      ...p,
      value: Math.round(c.factor * p.value * (c.round || 1)) / (c.round || 1),
      source: { ...p.source, verificationStatus: 'DERIVED',
        note: `${c.note} Source figure: ${p.value.toLocaleString('en-US')} ${c.fromUnit}.` + (p.source && p.source.note ? ' ' + p.source.note : '') }
    }));
  }
  if (def.index) {
    const base = pts.find(p => p.year === def.index.baseYear);
    if (!base) throw new Error(`series ${id}: index base year ${def.index.baseYear} missing`);
    const bv = base.value;
    pts = pts.map(p => ({ ...p, value: Math.round(1000 * p.value / bv) / 10,
      source: { ...p.source, verificationStatus: 'DERIVED',
        note: `Index, ${def.index.baseYear} = 100, computed from the source figure ${p.value} ${def.index.unit}.` + (p.source && p.source.note ? ' ' + p.source.note : '') } }));
  }
  (def.patch || []).forEach(({ year, ...rest }) => {
    const p = pts.find(q => q.year === year);
    if (!p) throw new Error(`series ${id}: patch year ${year} missing`);
    Object.assign(p, rest);
  });
  const rs = def.from ? need(seriesIdx, def.from, 'series') : {};
  series[id] = { label: def.label ?? rs.label, unit: def.unit ?? rs.unit, geography: def.geography ?? rs.geography,
    note: def.note ?? rs.notes, points: pts };
}

/* ── media ───────────────────────────────────────────────── */
const images = allImages().filter(a => !(E.mediaDrop || []).includes(a.id));
const mediaAssets = images.map(a => {
  const o = (E.mediaOverrides || {})[a.id] || {};
  /* Images are placed by the era they depict (the picture researcher's
     call, recorded in the research file). Thumbnails are mirrored locally
     in assets/media/ when present, so the page does not depend on hotlinks. */
  const local = `assets/media/${a.id}.jpg`;
  const m = {
    id: a.id,
    era: o.era ?? a.era,
    year: o.year ?? a.year,
    title: o.title ?? a.title,
    caption: o.caption ?? a.caption,
    alt: o.alt ?? a.alt ?? a.title,
    creator: a.creator,
    license: a.license,
    creditLine: o.creditLine ?? a.creditLine,
    sourceUrl: a.sourceUrl,
    thumbUrl: o.thumbUrl ?? (fs.existsSync(path.join(root, local)) ? local : a.thumbUrl),
    fullUrl: a.fullUrl,
    upstreamArchive: a.upstreamArchive,
    upstreamUrl: a.upstreamUrl,
    lat: a.lat, lng: a.lng,
    rightsEvidence: a.rightsEvidence,
    archive: (E.archiveExclude || []).includes(a.id) || a._portrait ? false : undefined,
    verificationStatus: a.verified ? 'CONFIRMED' : 'PENDING',
  };
  for (const k of Object.keys(m)) if (m[k] == null || m[k] === '' || Number.isNaN(m[k])) delete m[k];
  return m;
});
const order = E.mediaOrder || [];
mediaAssets.sort((a, b) => {
  const ea = ERAS.findIndex(e => e.slug === a.era), eb = ERAS.findIndex(e => e.slug === b.era);
  const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
  return ea - eb || (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
});

/* ── steps ───────────────────────────────────────────────── */
const evById = new Map(mapEvents.map(e => [e.id, e]));
const mediaIds = new Set(mediaAssets.map(m => m.id));
const scrollSteps = E.scrollSteps.map(st => {
  const ev = evById.get(st.eventId);
  if (!ev) throw new Error(`step ${st.eventId}: event not selected in editorial events`);
  const media = (st.media || []).filter(id => mediaIds.has(id));
  const rec = H.event(st.eventId);
  return { eventId: st.eventId, date: st.date ?? ev.date, phase: ev.phase, headline: st.headline ?? ev.title,
    narrative: st.narrative ?? ev.body, ...(st.why !== false && (st.why || rec.significance) ? { why: st.why || rec.significance } : {}),
    ...(media.length ? { media } : {}), ...(st.chips ? { chips: st.chips } : {}),
    flyTo: st.flyTo ?? [ev.lat, ev.lng], zoom: st.zoom ?? 4 };
});

const concepts = E.concepts.map(p => ({ ...p, source: mergeSources([].concat(p.source || [])), media: p.media && mediaIds.has(p.media) ? p.media : undefined }))
  .map(p => { if (!p.media) delete p.media; return p; });

const data = {
  meta: E.meta,
  heroStats: E.heroStats,
  footerStats: E.footerStats,
  essay: E.essay,
  concepts,
  flip: E.flip,
  mapEvents,
  scrollSteps,
  series,
  charts: E.charts,
  barCharts: E.barCharts || [],
  fipps: E.fipps,
  worldLaws: E.worldLaws,
  frameworks: E.frameworks,
  policyModels: E.policyModels,
  figures: E.figures,
  pullQuotes: E.pullQuotes,
  people: (E.people || []).map(p => (p.portrait && !mediaIds.has(p.portrait) ? { ...p, portrait: undefined } : p)),
  peopleGroups: E.peopleGroups,
  lineage: E.lineage,
  lineageNote: E.lineageNote,
  harms: E.harms,
  standard: E.standard,
  agentsLede: E.agentsLede,
  argument: E.argument,
  scenario: E.scenario,
  counterpoints: E.counterpoints,
  jurisdictions: E.jurisdictions,
  myths: E.myths,
  mediaAssets,
};

/* ── serialise ───────────────────────────────────────────── */
const q = s => JSON.stringify(s);
const K = k => /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
function fmt(v, indent) {
  const pad = ' '.repeat(indent);
  if (v === null || v === undefined) return 'null';
  if (typeof v !== 'object') return q(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every(x => typeof x !== 'object' || x === null)) return '[' + v.map(x => q(x)).join(', ') + ']';
    return '[\n' + v.map(x => pad + '  ' + fmt(x, indent + 2)).join(',\n') + '\n' + pad + ']';
  }
  const keys = Object.keys(v).filter(k => v[k] !== undefined);
  const flat = keys.every(k => typeof v[k] !== 'object' || v[k] === null ||
    (Array.isArray(v[k]) && v[k].every(x => typeof x !== 'object')));
  if (flat && q(v).length < 160) return '{ ' + keys.map(k => `${K(k)}: ${q(v[k])}`).join(', ') + ' }';
  return '{\n' + keys.map(k => pad + '  ' + K(k) + ': ' + fmt(v[k], indent + 2)).join(',\n') + '\n' + pad + '}';
}
const header = `/**
 * data.js — Who Writes the Terms? A History of Privacy
 * GENERATED by tools/build-data.mjs from research/*.json and tools/editorial.mjs.
 * Edit those and rebuild (node tools/build-data.mjs); do not edit this file by hand.
 *
 * Every data point carries a source object:
 *   { institution, title, date, url, quote?, note?, verificationStatus, accessType }
 *   CONFIRMED = the cited page states the figure (the quote is the evidence)
 *   PENDING   = right institution or a credible secondary source; primary not yet read
 *   DERIVED   = computed or editorial; the note names the inputs
 */
`;
const body = Object.keys(data).map(k => `  ${k}: ${fmt(data[k], 2)}`).join(',\n\n');
fs.writeFileSync(path.join(root, 'js', 'data.js'), header + '\nwindow.privacyData = {\n\n' + body + '\n};\n');
console.log(`js/data.js: ${mapEvents.length} events, ${scrollSteps.length} steps, ${Object.keys(series).length} series, ${mediaAssets.length} media, ${(fs.statSync(path.join(root, 'js', 'data.js')).size / 1024).toFixed(0)} KB`);
