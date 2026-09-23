/**
 * app.js — Who Writes the Terms? A History of Privacy
 *
 * A domain fork of the Indigo engine (itself from Downtown Tampa): same
 * editorial furniture (sticky era legend, scrollytelling map, year scrubber,
 * cited tooltips, live source audit), re-pointed at the history of privacy —
 * from the earliest written rules to IEEE 7012 and the age of AI agents.
 *
 * Sections:
 *   1. Constants & Helpers (palette, compressed time axis, citations)
 *   2. Progress Bar
 *   3. Era Legend
 *   4. Scrollytelling Map (Leaflet, world)
 *   5. Scroll Steps — Build & Observe
 *   6. Spread Map (the scrubber's map)
 *   7. Timeline Slider
 *   8. Chart.js Charts
 *   9. Tables — lineage, harms, jurisdictions
 *  10. Concepts, Who-Writes-the-Terms, Principles, Figure Cards
 *  11. IEEE 7012, the Argument, the Scenario, Counterpoints, Myths
 *  11b. The Essay, the World Map, the People
 *  12. Photo Archive, Stat Blocks, Source Audit
 *  13. Theme, Resize, Main Init
 */

'use strict';

const D = () => window.privacyData || {};

/* The editorial data ramp. These literals are only the pre-stylesheet
   fallback: refreshTheme() reads the live values out of css/styles.css, so
   light and dark each get their own palette. */
const V = {
  v0:'#4A4A50', v1:'#66666E', v2:'#85858D', v3:'#A7A6AC',
  v4:'#BDB9AE', v5:'#D8B45C', v6:'#7CC49A', v7:'#D9985A',
  v8:'#DC7C5E', v9:'#E0645A'
};

/* The eight eras come from the data layer (meta.eras) in order; their colours
   come from the stylesheet (--era-<slug>). */
const ERAS = (D().meta && D().meta.eras) || [];
const PC = Object.fromEntries(ERAS.map(e => [e.slug, e.fallback || '#999']));
const ERA_LABEL = Object.fromEntries(ERAS.map(e => [e.slug, e.label || e.slug]));

function eraLabel(slug) { return ERA_LABEL[slug] || String(slug || ''); }

/* WCAG relative luminance of a #rrggbb fill, used to choose a legible label
   colour for era pills. */
function contrastInk(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return '#F8F7F3';
  const n = parseInt(m[1], 16);
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? '#0E1016' : '#F8F7F3';
}

/* Resolve a palette key from the data layer ("v9", "cookies") to the live
   colour for the current theme; anything unrecognised passes through. */
function paint(c, fallback) {
  if (!c) return fallback || V.v5;
  if (Object.prototype.hasOwnProperty.call(V, c))  return V[c];
  if (Object.prototype.hasOwnProperty.call(PC, c)) return PC[c];
  return c;
}

function hexA(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  return '#' + m[1] + Math.round(a * 255).toString(16).padStart(2, '0');
}

/* ── Compressed time ──
   Two and a half thousand years on one linear axis would give the last
   century and a half, where almost all of this story happens, a sliver at
   the right edge. The
   scrubber and the spread chart therefore share a piecewise-linear scale
   declared in the data (meta.timeKnots: [[position, year], ...]). Each
   segment is linear; the tick labels say which year a position is. */
const KNOTS = (D().meta && D().meta.timeKnots) || [[0, -500], [1000, 2026]];
const POS_MAX = KNOTS[KNOTS.length - 1][0];
const YEAR_MIN = KNOTS[0][1];
const YEAR_MAX = KNOTS[KNOTS.length - 1][1];

function yearOfPos(p) {
  for (let i = 1; i < KNOTS.length; i++) {
    const [p0, y0] = KNOTS[i - 1], [p1, y1] = KNOTS[i];
    if (p <= p1) return Math.round(y0 + (y1 - y0) * (p - p0) / (p1 - p0));
  }
  return YEAR_MAX;
}
function posOfYear(y) {
  for (let i = 1; i < KNOTS.length; i++) {
    const [p0, y0] = KNOTS[i - 1], [p1, y1] = KNOTS[i];
    if (y <= y1) return p0 + (p1 - p0) * (y - y0) / (y1 - y0);
  }
  return POS_MAX;
}

/* There is no year zero: 1 BCE is followed by 1 CE. Negative integers in the
   data are BCE years (-400 = 400 BCE). */
function fmtYear(y, { era = true } = {}) {
  if (y == null || Number.isNaN(y)) return '—';
  if (y < 0) return `${Math.abs(y).toLocaleString('en-US')} BCE`;
  if (y < 1000 && era) return `${y} CE`;
  return String(y);
}

/* Short tick labels: no thousands separator, and year 1 reads "1 CE". */
function axisYear(y) {
  if (y < 0) return `${Math.abs(y)} BCE`;
  if (y < 1000) return `${y} CE`;
  return String(y);
}

function eraOfYear(year) {
  let cur = ERAS[0] ? ERAS[0].slug : '';
  for (const e of ERAS) if (year >= e.start) cur = e.slug;
  return cur;
}

/* Nearest point in a year-keyed series, but never one that would be a lie:
   before a series begins there is no figure to show, and a point more than
   `maxGap` years away is too far to stand in for the requested year. */
function closestByYear(arr, year, { maxGap = 12 } = {}) {
  if (!arr || !arr.length) return null;
  const first = arr.reduce((m, d) => Math.min(m, d.year), Infinity);
  const last  = arr.reduce((m, d) => Math.max(m, d.year), -Infinity);
  if (year < first - 0.5 || year > last + maxGap) return null;
  const best = arr.reduce((b, c) => (Math.abs(c.year - year) < Math.abs(b.year - year) ? c : b));
  return Math.abs(best.year - year) > maxGap ? null : best;
}

Chart.defaults.font.family = "'Work Sans', system-ui, sans-serif";
Chart.defaults.font.size   = 10;

/* Theme tokens for canvas and SVG surfaces that CSS cannot reach. */
const T = {
  text:'#7A7872', textDim:'#8B8983', title:'#6B6964', grid:'#222228',
  tipBg:'#1B1B20', tipBorder:'#313139', tipTitle:'#EDEBE6', tipBody:'#A3A09A',
  markerStroke:'rgba(255,255,255,0.35)', markerActive:'#ffffff'
};

const TIP = {
  backgroundColor:T.tipBg, borderColor:T.tipBorder, borderWidth:1,
  titleColor:T.tipTitle, bodyColor:T.tipBody, padding:12,
  titleFont:{ family:"'Work Sans',system-ui,sans-serif", weight:'600', size:12 },
  bodyFont:{ family:"'Work Sans',system-ui,sans-serif", size:10.5 },
  footerFont:{ family:"'Work Sans',system-ui,sans-serif", size:9.5, weight:'400' }
};

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function refreshTheme() {
  const light = currentTheme() === 'light';
  T.text         = cssVar('--text-faint', T.text);
  T.textDim      = cssVar('--text-dim', T.textDim);
  T.title        = cssVar('--text-muted', T.title);
  T.grid         = cssVar('--border-light', T.grid);
  T.tipBg        = cssVar('--bg-card', T.tipBg);
  T.tipBorder    = cssVar('--border', T.tipBorder);
  T.tipTitle     = cssVar('--text-primary', T.tipTitle);
  T.tipBody      = cssVar('--text-secondary', T.tipBody);
  T.markerStroke = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
  T.markerActive = light ? '#1A1814' : '#ffffff';
  for (let i = 0; i <= 9; i++) V['v' + i] = cssVar('--v' + i, V['v' + i]);
  for (const e of ERAS) PC[e.slug] = cssVar('--era-' + e.slug, PC[e.slug]);
  Chart.defaults.color       = T.text;
  Chart.defaults.borderColor = T.grid;
  Object.assign(TIP, { backgroundColor:T.tipBg, borderColor:T.tipBorder, titleColor:T.tipTitle, bodyColor:T.tipBody });
}

function mkScale(overrides = {}) {
  return {
    grid:  { color:T.grid },
    ticks: { color:T.text, font:{ family:"'Work Sans',system-ui,sans-serif", size:10 } },
    ...overrides
  };
}

function axisTitle(text) {
  return { display:true, text, color:T.title, font:{ size:10 } };
}

/* Linear year axis: no thousands separators on years ("1,900" → "1900"). */
function yearScale(overrides = {}) {
  const s = mkScale({ type:'linear', title:axisTitle('Year'), ...overrides });
  s.ticks = { ...s.ticks, callback: v => String(v) };
  return s;
}

function fmtNum(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(Math.abs(n) >= 1e7 ? 0 : 1) + 'M';
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString('en-US');
  return String(Math.round(n * 100) / 100);
}

/* Basemap — key-free Esri canvas tiles, dark and light. */
const BASEMAPS = {
  dark: {
    base:  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    label: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
  },
  light: {
    base:  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    label: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
  },
  attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  maxNativeZoom: 16,
  maxZoom: 12
};

const _basemapLayers = new Map();

function addBasemap(map) {
  const urls = BASEMAPS[currentTheme()];
  const prev = _basemapLayers.get(map);
  if (prev) { map.removeLayer(prev.base); map.removeLayer(prev.label); }
  const base = L.tileLayer(urls.base, {
    attribution: BASEMAPS.attribution,
    maxNativeZoom: BASEMAPS.maxNativeZoom, maxZoom: BASEMAPS.maxZoom
  }).addTo(map);
  const label = L.tileLayer(urls.label, {
    maxNativeZoom: BASEMAPS.maxNativeZoom, maxZoom: BASEMAPS.maxZoom, opacity: 0.8
  }).addTo(map);
  _basemapLayers.set(map, { base, label });
}

/* Citation helpers. A `source` may be one source object
   { institution, title, date, url, note, verificationStatus, accessType }
   or an array of them. */
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}

function statusBadge(status) {
  if (!status) return '';
  const s = String(status).toUpperCase();
  return `<span class="src-badge src-${s.toLowerCase()}" title="Verification status: ${s}">${s}</span>`;
}

function sourceHtml(src, { badge = true } = {}) {
  if (!src) return '';
  if (Array.isArray(src)) return src.map(s => sourceHtml(s, { badge })).filter(Boolean).join(' · ');
  if (typeof src === 'string') return esc(src);
  const label = esc(src.institution || src.label || src.url || 'Source');
  const tip   = src.title ? ` title="${esc(src.title)}"` : '';
  const link  = src.url
    ? `<a href="${esc(src.url)}" target="_blank" rel="noopener"${tip}>${label}</a>`
    : label;
  const date  = src.date ? ` (${esc(src.date)})` : '';
  return link + date + (badge ? ' ' + statusBadge(src.verificationStatus) : '');
}

/* Tooltip footer lines for one data point. */
function pointFooter(d) {
  if (!d) return '';
  const lines = [];
  const note = d.note || (d.source && !Array.isArray(d.source) && d.source.note);
  if (note) lines.push(...wrap(note, 60));
  const one = Array.isArray(d.source) ? d.source[0] : d.source;
  const status = one && one.verificationStatus;
  const flags = [d.estimate ? 'estimate' : null, status && status !== 'CONFIRMED' ? status : null].filter(Boolean);
  if (flags.length) lines.push('Status: ' + flags.join(' · '));
  if (one && one.institution) lines.push(...wrap('Source: ' + one.institution + (one.date ? ', ' + one.date : ''), 60));
  return lines;
}

function wrap(text, n) {
  const words = String(text).split(/\s+/); const out = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) { if (cur) out.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

/* Print a section's own source line into a footer element, so a DERIVED
   model always announces itself rather than hiding behind a tidy caption. */
function renderSourceLine(elId, source, prefix = 'Source: ') {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!source) { el.textContent = ''; return; }
  const one = Array.isArray(source) ? source[0] : source;
  const note = one && one.note ? `<span class="chart-source-note">${esc(one.note)}</span>` : '';
  el.innerHTML = prefix + sourceHtml(source) + note;
}

/* Every institution behind a series, printed once. A run of annual volumes
   from one archive (thirty Government of India statistics scans, say) is one
   entry with a count, not thirty links; each point's own tooltip still names
   its exact volume. */
function seriesSourceLine(elId, rows, prefix = 'Sources: ') {
  const el = document.getElementById(elId);
  if (!el) return;
  const byInst = new Map();
  (rows || []).forEach(r => {
    [].concat(r.source || []).forEach(s => {
      if (!s || !s.url) return;
      const k = (s.institution || s.url) + '|' + s.verificationStatus;
      const e = byInst.get(k) || { s, urls: new Set() };
      e.urls.add(s.url);
      byInst.set(k, e);
    });
  });
  el.innerHTML = byInst.size ? prefix + [...byInst.values()].map(({ s, urls }) =>
    sourceHtml({ ...s, date: urls.size > 1 ? `${urls.size} documents` : s.date })).join(' · ') : '';
}

function series(id) {
  const s = (D().series || {})[id];
  return s ? s.points || [] : [];
}
function seriesMeta(id) { return (D().series || {})[id] || null; }

/* ═══════════════════════════════════════════════════════════════
   2. PROGRESS BAR
═══════════════════════════════════════════════════════════════ */
function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const dH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${dH > 0 ? Math.min(window.scrollY / dH, 1) : 0})`;
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════
   3. ERA LEGEND
═══════════════════════════════════════════════════════════════ */
function buildPhaseLegend() {
  const c = document.getElementById('phase-pills-container');
  if (!c) return;
  c.innerHTML = '';
  ERAS.forEach(e => {
    const color = PC[e.slug];
    const ink = contrastInk(color);
    const el = document.createElement('a');
    el.className = 'phase-pill';
    el.dataset.phase = e.slug;
    el.href = '#scrollytelling';
    el.title = `${e.label}, ${fmtYear(e.start)} – ${e.end == null ? 'today' : fmtYear(e.end)}: jump to it in the narrative`;
    el.style.cssText = `background:${color};color:${ink}`;
    el.innerHTML = `<span class="dot" style="background:${ink}"></span>${esc(e.label)}`;
    el.addEventListener('click', ev => { ev.preventDefault(); scrollToPhase(e.slug); });
    c.appendChild(el);
  });
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function navHeight() {
  return document.getElementById('main-nav')?.offsetHeight || 56;
}

function legendHeight() {
  return document.getElementById('phase-legend')?.offsetHeight || 46;
}

function stickyOffset() {
  const legend = document.getElementById('phase-legend');
  const stuck = legend && getComputedStyle(legend).position === 'sticky' && legend.offsetHeight > 0;
  return navHeight() + (stuck ? legend.offsetHeight : 0);
}

function setLayoutVars() {
  document.documentElement.style.setProperty('--nav-h', navHeight() + 'px');
  document.documentElement.style.setProperty('--legend-h', legendHeight() + 'px');
}

function stepForPhase(phase) {
  const exact = document.querySelector(`.scroll-step[data-phase="${phase}"]`);
  if (exact) return exact;
  const order = ERAS.map(e => e.slug);
  const want  = order.indexOf(phase);
  if (want === -1) return null;
  let best = null, bestDist = Infinity;
  document.querySelectorAll('.scroll-step').forEach(s => {
    const oi = order.indexOf(s.dataset.phase);
    if (oi === -1) return;
    const dist = Math.abs(oi - want);
    if (dist < bestDist) { best = s; bestDist = dist; }
  });
  return best;
}

function scrollToPhase(phase) {
  const target = stepForPhase(phase) || document.getElementById('scrollytelling');
  if (!target) return;
  const isStep = target.classList.contains('scroll-step');
  const mapH   = (isStep && window.innerWidth <= 900) ? (document.querySelector('.sticky-figure')?.offsetHeight || 0) : 0;
  const y = target.getBoundingClientRect().top + window.scrollY - navHeight() - legendHeight() - mapH - 16;
  if (isStep) lockScrollyStep(target);
  window.scrollTo({ top: Math.max(y, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function highlightPhasePill(phase) {
  const scroller = document.getElementById('phase-legend');
  document.querySelectorAll('#phase-pills-container .phase-pill').forEach(p => {
    const on = p.dataset.phase === phase;
    p.classList.toggle('is-current', on);
    if (on && scroller && scroller.scrollWidth > scroller.clientWidth + 4) {
      const cRect = scroller.getBoundingClientRect();
      const pRect = p.getBoundingClientRect();
      const left  = scroller.scrollLeft + (pRect.left - cRect.left) - (cRect.width / 2) + (pRect.width / 2);
      scroller.scrollTo({ left: Math.max(left, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  });
  const ind = document.getElementById('nav-phase-indicator');
  if (ind) {
    const color = PC[phase];
    ind.innerHTML = color
      ? `<span class="nav-phase-pill" style="background:${color};color:${contrastInk(color)}">${esc(eraLabel(phase))}</span>`
      : '';
  }
}

/* ═══════════════════════════════════════════════════════════════
   4. SCROLLYTELLING MAP
═══════════════════════════════════════════════════════════════ */
let scrollMap     = null;
const scrollMkrs  = {};
let prevActiveId  = null;

function popupHtml(ev) {
  return `<div class="map-popup-date" style="color:${PC[ev.phase] || V.v5}">${esc(ev.date)} · ${esc(eraLabel(ev.phase))}</div>` +
    `<div class="map-popup-title">${esc(ev.title)}</div>` +
    (ev.place ? `<div class="map-popup-place">${esc(ev.place)}</div>` : '') +
    `<div class="map-popup-body">${esc(ev.body)}</div>` +
    `<div class="map-popup-source">${sourceHtml(ev.source)}</div>`;
}

function initScrollMap() {
  const el = document.getElementById('scroll-map-container');
  if (!el || typeof L === 'undefined') return;

  const m = D().meta || {};
  scrollMap = L.map('scroll-map-container', {
    center: m.center || [35, -20], zoom: m.defaultZoom || 2, minZoom: 1,
    zoomControl:false, scrollWheelZoom:false, worldCopyJump:true,
    dragging:false, touchZoom:false, doubleClickZoom:false, keyboard:false
  });
  addBasemap(scrollMap);

  (D().mapEvents || []).forEach(ev => {
    const color = PC[ev.phase] || V.v3;
    const mk = L.circleMarker([ev.lat, ev.lng], {
      radius:4.5, fillColor:color,
      color:T.markerStroke, weight:1,
      fillOpacity:0.8, opacity:1
    }).bindPopup(popupHtml(ev), { maxWidth:280 }).addTo(scrollMap);
    scrollMkrs[ev.id] = { m: mk, phase: ev.phase };
  });
}

function activateMapStep(step) {
  if (!scrollMap) return;

  if (prevActiveId && scrollMkrs[prevActiveId]) {
    const p = scrollMkrs[prevActiveId];
    p.m.setRadius(4.5);
    p.m.setStyle({ fillOpacity:0.8, weight:1, color:T.markerStroke });
  }

  const ev = (D().mapEvents || []).find(e => e.id === step.eventId);
  if (ev && scrollMkrs[ev.id]) {
    const cur = scrollMkrs[ev.id];
    cur.m.setRadius(11);
    cur.m.setStyle({ fillOpacity:1, weight:2.5, color:T.markerActive });
    cur.m.bringToFront();
    prevActiveId = ev.id;
  }

  const to = step.flyTo || (ev ? [ev.lat, ev.lng] : null);
  if (to) scrollMap.flyTo(to, step.zoom || 4, { animate:!prefersReducedMotion(), duration:1.2 });
}

/* ═══════════════════════════════════════════════════════════════
   5. SCROLL STEPS
═══════════════════════════════════════════════════════════════ */
function dropStepFigure(img) {
  const fig = img.closest('.step-figure');
  const box = fig && fig.parentElement;
  if (fig) fig.remove();
  if (box && box.querySelectorAll('.step-figure').length < 2) box.classList.remove('is-pair');
  if (box && !box.querySelector('.step-figure')) box.remove();
}
window.dropStepFigure = dropStepFigure;

function mediaById(id) {
  const idx = mediaById._index ||
    (mediaById._index = new Map((D().mediaAssets || []).map(a => [a.id, a])));
  return idx.get(id);
}

function stepMediaHtml(step) {
  const items = (step.media || []).map(mediaById).filter(Boolean);
  if (!items.length) return '';
  const figures = items.map(a => `
    <figure class="step-figure">
      <a class="step-figure-link" href="${esc(a.sourceUrl)}" target="_blank" rel="noopener"
         title="${esc(a.title)} — open the source record">
        <img class="step-figure-img" src="${esc(a.thumbUrl)}" alt="${esc(a.alt || a.title)}"
             loading="lazy" decoding="async" referrerpolicy="no-referrer"
             onerror="dropStepFigure(this)" />
      </a>
      <figcaption class="step-figure-cap">
        <span class="step-figure-title">${esc(a.title)}</span>
        <span class="step-figure-year">${esc(a.year)}</span>
        <span class="step-figure-credit">${esc(a.creditLine || '')}</span>
      </figcaption>
    </figure>`).join('');
  return `<div class="step-figures${items.length > 1 ? ' is-pair' : ''}">${figures}</div>`;
}

/* How many mapped moments exist by a given year. A count of this site's own
   map layer, not of the world: it says how much of the story has happened,
   and is labelled that way wherever it is shown. */
function centresBy(year) {
  return (D().mapEvents || []).filter(e => e.year <= year).length;
}
function continentsBy(year) {
  return new Set((D().mapEvents || []).filter(e => e.year <= year && e.continent).map(e => e.continent)).size;
}

function buildScrollSteps() {
  const container = document.getElementById('scroll-steps-container');
  if (!container) return;
  const evById = new Map((D().mapEvents || []).map(e => [e.id, e]));

  (D().scrollSteps || []).forEach((step, idx) => {
    const color = PC[step.phase] || V.v3;
    const ev = evById.get(step.eventId) || {};
    const chips = (step.chips || []).map(c =>
      `<div class="step-metric-chip">${esc(c.label)} <strong>${esc(c.value)}</strong></div>`).join('');
    const el = document.createElement('div');
    el.className = 'scroll-step';
    el.dataset.idx = idx;
    el.dataset.phase = step.phase || '';
    el.style.borderLeftColor = color;
    el.innerHTML = `
      <div class="step-phase-date" style="color:${color}">
        ${esc(step.date)}&nbsp;&nbsp;·&nbsp;&nbsp;${esc(eraLabel(step.phase))}
      </div>
      <h3 class="step-headline">${esc(step.headline)}</h3>
      ${ev.place ? `<p class="step-place">${esc(ev.place)}</p>` : ''}
      <p class="step-narrative">${esc(step.narrative)}</p>
      ${stepMediaHtml(step)}
      ${chips ? `<div class="step-metrics">${chips}</div>` : ''}
      <p class="step-source">${sourceHtml(ev.source)}</p>`;
    container.appendChild(el);
  });
}

let setActiveStep    = null;
let _scrollyObserver = null;
let _navScrollLock   = false;
let _navLockTimer    = null;
let _navLockRelease  = null;

function lockScrollyStep(target) {
  _navScrollLock = true;
  if (target && typeof setActiveStep === 'function') setActiveStep(target);
  if (_navLockRelease) window.removeEventListener('scrollend', _navLockRelease);
  clearTimeout(_navLockTimer);
  _navLockRelease = () => {
    clearTimeout(_navLockTimer);
    window.removeEventListener('scrollend', _navLockRelease);
    _navLockRelease = null;
    const cur = document.querySelector('.scroll-step.is-active');
    if (target && cur !== target && typeof setActiveStep === 'function') setActiveStep(target);
    _navScrollLock = false;
  };
  window.addEventListener('scrollend', _navLockRelease);
  _navLockTimer = setTimeout(_navLockRelease, 1600);
}

/* The page is still settling while a jump is in flight (charts lay out,
   lazy figures load), so re-assert the destination for a short window. */
let _jumpStop = null;
function scrollToSection(target) {
  const destOf = () => Math.max(target.getBoundingClientRect().top + window.scrollY - stickyOffset() - 8, 0);
  const smooth = !prefersReducedMotion();
  window.scrollTo({ top: destOf(), behavior: smooth ? 'smooth' : 'auto' });
  if (!smooth) return;

  if (_jumpStop) _jumpStop();
  let settled = false;
  const snap = () => {
    const want = destOf();
    if (Math.abs(window.scrollY - want) > 8) window.scrollTo({ top: want, behavior: 'auto' });
  };
  const onSettle = () => { settled = true; snap(); };
  const ro = ('ResizeObserver' in window)
    ? new ResizeObserver(() => { if (settled) snap(); })
    : null;
  ro && ro.observe(document.body);
  window.addEventListener('scrollend', onSettle);
  const t1 = setTimeout(onSettle, 900);
  const t2 = setTimeout(snap, 1600);
  const stop = setTimeout(() => _jumpStop && _jumpStop(), 2600);

  _jumpStop = () => {
    clearTimeout(t1); clearTimeout(t2); clearTimeout(stop);
    window.removeEventListener('scrollend', onSettle);
    ro && ro.disconnect();
    _jumpStop = null;
  };
  window.addEventListener('wheel',      () => _jumpStop && _jumpStop(), { once: true, passive: true });
  window.addEventListener('touchstart', () => _jumpStop && _jumpStop(), { once: true, passive: true });
}

function initAnchorScroll() {
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('#nav-drawer') || a.classList.contains('phase-pill')) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (id === 'scrollytelling') { scrollToPhase(ERAS[0] && ERAS[0].slug); }
    else { scrollToSection(target); }
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });
}

/* Section drawer, built from the page's own sections. */
function initNavDrawer() {
  const btn    = document.getElementById('nav-toggle');
  const drawer = document.getElementById('nav-drawer');
  const scrim  = document.getElementById('nav-scrim');
  const list   = document.getElementById('nav-drawer-list');
  if (!btn || !drawer || !scrim || !list) return;

  const NAMES = {
    hero: 'Top of the page',
    scrollytelling: 'The narrative map',
    about: 'About this project',
    'resolution-footer': 'Closing figures',
  };
  const buildList = () => {
    const secs = Array.from(document.querySelectorAll('section[id], footer[id]'))
      .filter(el => !el.hasAttribute('hidden'));
    list.innerHTML = secs.map((el, i) => {
      const kicker = el.querySelector('.section-eyebrow, .pathways-kicker')?.textContent.trim().replace(/\s+/g, ' ');
      const title  = el.querySelector('.section-title, .footer-title')?.textContent.trim().replace(/\s+/g, ' ');
      const label  = NAMES[el.id] || kicker || title || el.id;
      return `<a class="nav-drawer-link" href="#${esc(el.id)}" data-target="${esc(el.id)}"` +
             (title ? ` title="${esc(title)}"` : '') +
             `><span class="nav-drawer-num">${String(i + 1).padStart(2, '0')}</span>` +
             `<span>${esc(label)}</span></a>`;
    }).join('');
  };
  buildList();

  const isOpen = () => document.body.classList.contains('nav-open');

  const open = () => {
    buildList();
    markCurrent();
    document.body.dataset.navLockY = String(window.scrollY || 0);
    document.body.classList.add('nav-open');
    scrim.hidden = false;
    drawer.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close the section menu');
    drawer.querySelector('.nav-drawer-link')?.focus({ preventScroll: true });
  };

  const close = ({ restore = true } = {}) => {
    if (!isOpen()) return;
    document.body.classList.remove('nav-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open the section menu');
    const y = parseInt(document.body.dataset.navLockY || '0', 10);
    if (restore) window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    setTimeout(() => {
      if (isOpen()) return;
      scrim.hidden = true;
      drawer.hidden = true;
    }, 260);
  };

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  scrim.addEventListener('click', () => close());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  list.addEventListener('click', e => {
    const a = e.target.closest('.nav-drawer-link');
    if (!a) return;
    e.preventDefault();
    const target = document.getElementById(a.dataset.target);
    close({ restore: false });
    if (!target) return;
    if (target.id === 'scrollytelling') { scrollToPhase(ERAS[0] && ERAS[0].slug); return; }
    scrollToSection(target);
  });

  function markCurrent() {
    const mid = window.scrollY + window.innerHeight * 0.35;
    let best = null;
    for (const a of list.querySelectorAll('.nav-drawer-link')) {
      const el = document.getElementById(a.dataset.target);
      if (!el) continue;
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= mid) best = a;
    }
    list.querySelectorAll('.nav-drawer-link').forEach(a => a.classList.toggle('is-current', a === best));
  }
  window.addEventListener('scroll', () => { if (isOpen()) markCurrent(); }, { passive: true });
}

/* Floating scroll assist: section to section, and step by step through the
   narrative so the sticky map is never jumped past in one leap. */
function initSectionNav() {
  const nav  = document.getElementById('section-nav');
  const up   = document.getElementById('section-nav-up');
  const down = document.getElementById('section-nav-down');
  if (!nav || !up || !down) return;

  const targets = () =>
    Array.from(document.querySelectorAll('#hero, section[id], footer[id], .scroll-step'))
         .filter(el => el.id !== 'scrollytelling' || true)
         .filter(el => !el.hasAttribute('hidden') && el.offsetParent !== null);

  const readingOffset = el => {
    if (el.classList.contains('scroll-step') && window.innerWidth <= 900) {
      const fig = document.querySelector('.sticky-figure');
      return stickyOffset() + (fig?.offsetHeight || 0) + 14;
    }
    return stickyOffset() + 8;
  };

  const destOf    = el => el.getBoundingClientRect().top + window.scrollY - readingOffset(el);
  const scrollToY = y  => window.scrollTo({ top: Math.max(y, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  const goTo = t => {
    if (!t) return;
    if (t.el.classList.contains('scroll-step')) lockScrollyStep(t.el);
    scrollToY(t.y);
  };

  down.addEventListener('click', () => {
    const next = targets().map(el => ({ el, y: destOf(el) }))
      .filter(o => o.y > window.scrollY + 24).sort((a, b) => a.y - b.y)[0];
    next ? goTo(next) : scrollToY(document.body.scrollHeight);
  });

  up.addEventListener('click', () => {
    const prev = targets().map(el => ({ el, y: destOf(el) }))
      .filter(o => o.y < window.scrollY - 24).sort((a, b) => b.y - a.y)[0];
    prev ? goTo(prev) : scrollToY(0);
  });

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-visible', y > window.innerHeight * 0.45);
    up.classList.toggle('is-disabled', y <= 24);
    down.classList.toggle('is-disabled', (window.innerHeight + y) >= document.body.scrollHeight - 4);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function scrollyRootMargin() {
  if (window.innerWidth <= 900) {
    const fig    = document.querySelector('.sticky-figure');
    const top    = navHeight() + legendHeight() + (fig?.offsetHeight || 0);
    const bottom = Math.max(window.innerHeight - top - Math.round(window.innerHeight * 0.22), 60);
    return `-${top}px 0px -${bottom}px 0px`;
  }
  return '-8% 0px -28% 0px';
}

function initScrollytelling() {
  const steps = document.querySelectorAll('.scroll-step');
  if (!steps.length) return;

  const oDate     = document.getElementById('map-overlay-date');
  const oHeadline = document.getElementById('map-overlay-headline');
  const oCentres  = document.getElementById('map-overlay-centres');
  const oConts    = document.getElementById('map-overlay-continents');
  const evById    = new Map((D().mapEvents || []).map(e => [e.id, e]));

  setActiveStep = target => {
    const idx  = +target.dataset.idx;
    const step = (D().scrollSteps || [])[idx];
    if (!step) return;
    steps.forEach(s => s.classList.remove('is-active'));
    target.classList.add('is-active');
    highlightPhasePill(step.phase);
    activateMapStep(step);
    const ev = evById.get(step.eventId);
    const y  = ev ? ev.year : null;
    if (oDate)     oDate.textContent     = `${step.date} · ${eraLabel(step.phase)}`;
    if (oHeadline) oHeadline.textContent = step.headline;
    if (oCentres && y != null)  oCentres.textContent  = String(centresBy(y));
    if (oConts && y != null)    oConts.textContent    = String(continentsBy(y));
  };

  const build = () => {
    if (_scrollyObserver) _scrollyObserver.disconnect();
    _scrollyObserver = new IntersectionObserver(entries => {
      if (_navScrollLock) return;
      entries.forEach(entry => { if (entry.isIntersecting) setActiveStep(entry.target); });
    }, { threshold: 0, rootMargin: scrollyRootMargin() });
    steps.forEach(s => _scrollyObserver.observe(s));
  };
  build();

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { setLayoutVars(); build(); }, 200);
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════
   6. SPREAD MAP — every mapped moment, revealed as the year advances
═══════════════════════════════════════════════════════════════ */
let sandboxMap = null;
const sandboxMkrs = [];
let _latestSandboxId = null;

function restyleMarkers() {
  Object.values(scrollMkrs).forEach(({ m, phase }) => {
    const active = prevActiveId && scrollMkrs[prevActiveId] && scrollMkrs[prevActiveId].m === m;
    m.setStyle({ fillColor: PC[phase] || V.v3, color: active ? T.markerActive : T.markerStroke });
  });
  sandboxMkrs.forEach(({ m, ev }) => m.setStyle({
    fillColor: PC[ev.phase] || V.v3,
    color: ev.id === _latestSandboxId ? T.markerActive : T.markerStroke
  }));
}

function initSandboxMap() {
  const el = document.getElementById('sandbox-map-container');
  if (!el || typeof L === 'undefined') return;

  sandboxMap = L.map('sandbox-map-container', {
    center: [30, 0], zoom: 1, minZoom: 1,
    zoomControl:true, scrollWheelZoom:false, worldCopyJump:true
  });
  addBasemap(sandboxMap);

  [...(D().mapEvents || [])].sort((a, b) => a.year - b.year).forEach(ev => {
    const m = L.circleMarker([ev.lat, ev.lng], {
      radius:5, fillColor:PC[ev.phase] || V.v3,
      color:T.markerStroke, weight:1, fillOpacity:0, opacity:0
    }).bindPopup(popupHtml(ev), { maxWidth:260 });
    m.addTo(sandboxMap);
    sandboxMkrs.push({ m, ev, shown:false });
  });
}

function updateSandboxMap(year) {
  if (!sandboxMap) return;
  let latest = null;
  sandboxMkrs.forEach(o => {
    const on = o.ev.year <= year;
    if (on) latest = o;
    if (on !== o.shown) {
      o.m.setStyle({ fillOpacity: on ? 0.85 : 0, opacity: on ? 1 : 0 });
      o.m.options.interactive = on;
      if (o.m._path) o.m._path.style.pointerEvents = on ? '' : 'none';
      o.shown = on;
    }
    o.m.setRadius(5);
    o.m.setStyle({ weight: 1, color: T.markerStroke });
  });
  if (latest) {
    latest.m.setRadius(10);
    latest.m.setStyle({ weight: 2.5, color: T.markerActive });
    latest.m.bringToFront();
  }
  _latestSandboxId = latest ? latest.ev.id : null;
}

/* ═══════════════════════════════════════════════════════════════
   7. TIMELINE SLIDER (compressed time)
═══════════════════════════════════════════════════════════════ */
function paintSliderTrack() {
  const slider = document.getElementById('era-slider');
  if (!slider) return;
  const stops = ERAS.map((e, i) => {
    const a = posOfYear(Math.max(e.start, YEAR_MIN)) / POS_MAX * 100;
    const b = (i < ERAS.length - 1 ? posOfYear(ERAS[i + 1].start) : POS_MAX) / POS_MAX * 100;
    return `${PC[e.slug]} ${a.toFixed(2)}% ${b.toFixed(2)}%`;
  });
  slider.style.setProperty('--slider-track', `linear-gradient(to right, ${stops.join(', ')})`);
}

function buildSliderTicks() {
  const box = document.getElementById('slider-ticks');
  if (!box) return;
  const ticks = (D().meta && D().meta.sliderTicks) || [];
  box.innerHTML = ticks.map(t =>
    `<span style="left:${(posOfYear(t.year) / POS_MAX * 100).toFixed(2)}%">${esc(t.label)}</span>`).join('');
}

function buildSliderCards() {
  const box = document.getElementById('stat-cards');
  if (!box || box.dataset.built) return;
  box.dataset.built = '1';
  ((D().meta && D().meta.sliderCards) || []).forEach(c => {
    const col = `var(--${/^v\d$/.test(c.color) ? c.color : 'era-' + c.color})`;
    const el = document.createElement('div');
    el.className = 'stat-card';
    el.style.borderLeftColor = col;
    el.innerHTML = `<div class="stat-card-value" id="${esc(c.id)}" style="color:${col}">—</div>
      <div class="stat-card-label">${esc(c.label)}</div>
      <div class="stat-card-asof" id="${esc(c.id)}-asof"></div>`;
    box.appendChild(el);
  });
}

function initSlider() {
  const slider = document.getElementById('era-slider');
  if (!slider) return;
  buildSliderCards();
  slider.max = POS_MAX;
  const startYear = (D().meta && D().meta.sliderStartYear) || YEAR_MIN;
  slider.value = Math.round(posOfYear(startYear));
  slider.addEventListener('input', () => updateSlider(+slider.value), { passive:true });
  paintSliderTrack();
  buildSliderTicks();
  updateSlider(+slider.value);
}

function updateSlider(pos) {
  const year = yearOfPos(pos);
  const era  = eraOfYear(year);
  const slider = document.getElementById('era-slider');
  if (slider) slider.setAttribute('aria-valuetext', fmtYear(year));

  const dEl = document.getElementById('slider-date-label');
  if (dEl) dEl.textContent = fmtYear(year);

  const badge = document.getElementById('era-badge');
  if (badge) {
    badge.textContent = `Era: ${eraLabel(era)}`;
    badge.style.color = PC[era] || V.v5;
  }

  const set = (id, point, value, emptyText) => {
    const e = document.getElementById(id);
    if (e) e.textContent = point ? value : '—';
    const a = document.getElementById(id + '-asof');
    if (!a) return;
    if (!point) {
      a.textContent = emptyText || 'no series for this year';
      a.className = 'stat-card-asof is-empty';
      return;
    }
    if (point === true) { a.textContent = `by ${fmtYear(year)}`; a.className = 'stat-card-asof'; return; }
    const gap = Math.abs(point.year - year);
    const one = Array.isArray(point.source) ? point.source[0] : point.source;
    const est = point.estimate || (one && one.verificationStatus === 'DERIVED');
    a.textContent = (gap === 0 ? `${fmtYear(point.year)}` : `as of ${fmtYear(point.year)}`) + (est ? ' · est.' : '');
    a.className = 'stat-card-asof' + (gap > 4 ? ' is-far' : '');
  };

  set('stat-centres', true, String(centresBy(year)));
  set('stat-continents', true, String(continentsBy(year)));

  const cards = (D().meta && D().meta.sliderCards) || [];
  cards.forEach(c => {
    const s = series(c.series);
    const p = closestByYear(s, year, { maxGap: c.maxGap ?? 3 });
    const fmt = v => (c.prefix || '') + fmtNum(v) + (c.suffix || '');
    set(c.id, p, p ? fmt(p.value) : '—', year < (s[0] ? s[0].year : 0) ? 'series not begun' : 'no figure within ' + (c.maxGap ?? 3) + ' yrs');
  });

  const evs = [...(D().mapEvents || [])].filter(e => e.year <= year).sort((a, b) => a.year - b.year);
  const ev  = evs[evs.length - 1];
  const evH = document.getElementById('sandbox-event-headline');
  const evB = document.getElementById('sandbox-event-body');
  if (ev) {
    if (evH) evH.textContent = `${ev.date} · ${ev.title}`;
    if (evB) evB.textContent = ev.body;
  } else {
    if (evH) evH.textContent = 'Before the first mapped moment';
    if (evB) evB.textContent = 'Drag the slider forward.';
  }

  updateSandboxMap(year);
  for (const ch of [_spreadMarkerChart, _centresChart]) {
    if (!ch) continue;
    ch.options.plugins.yearLine.pos = pos;
    ch.update('none');
  }
  for (const ch of _yearLineCharts) {
    ch.options.plugins.yearLine.pos = year;
    ch.update('none');
  }
}

/* ═══════════════════════════════════════════════════════════════
   8. CHARTS
═══════════════════════════════════════════════════════════════ */
function hideCard(ctx) { const c = ctx && ctx.closest('.chart-card'); if (c) c.hidden = true; }

/* A vertical line at the scrubber's year on the spread chart. */
const yearLinePlugin = {
  id: 'yearLine',
  afterDatasetsDraw(chart, _args, opts) {
    if (opts == null || opts.pos == null) return;
    const x = chart.scales.x.getPixelForValue(opts.pos);
    const { top, bottom, left, right } = chart.chartArea;
    if (x < left - 1 || x > right + 1) return;
    const c = chart.ctx;
    c.save();
    c.strokeStyle = opts.color || T.markerActive;
    c.lineWidth = 1.5;
    c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke();
    c.restore();
  }
};

function compressedTimeScale(overrides = {}) {
  const ticksAt = ((D().meta && D().meta.axisTicks) || []).map(posOfYear);
  const s = mkScale({
    type: 'linear', min: 0, max: POS_MAX,
    title: axisTitle('Year — compressed scale: each segment between ticks is linear'),
    afterBuildTicks: axis => { axis.ticks = ticksAt.map(v => ({ value: v })); },
    ...overrides
  });
  s.ticks = { ...s.ticks, autoSkip: false, maxRotation: 60, callback: v => axisYear(yearOfPos(v)) };
  return s;
}

/* Each mapped moment as a dot on its region's row, placed on the same
   compressed time axis as the scrubber. The dots are this site's events,
   so the chart shows the order of turning points, not their density. */
let _spreadMarkerChart = null;
function initSpreadChart() {
  const ctx = document.getElementById('chart-spread');
  if (!ctx) return;
  const evs = D().mapEvents || [];
  const conts = (D().meta && D().meta.continents) || [...new Set(evs.map(e => e.continent))];
  const byEra = ERAS.map(e => ({
    label: e.label,
    data: evs.filter(ev => ev.phase === e.slug && conts.includes(ev.continent))
             .map(ev => ({ x: posOfYear(ev.year), y: conts.indexOf(ev.continent) + (hashJitter(ev.id) - 0.5) * 0.5, ev })),
    backgroundColor: hexA(PC[e.slug], 0.85), borderColor: T.markerStroke, borderWidth: 1,
    pointRadius: 5, pointHoverRadius: 8
  }));
  _spreadMarkerChart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: byEra },
    plugins: [yearLinePlugin],
    options: {
      responsive: true, maintainAspectRatio: false, parsing: false,
      plugins: {
        yearLine: { pos: null, color: T.textDim },
        legend: { labels: { color:T.textDim, boxWidth:10, usePointStyle:true, font:{ size:10 } } },
        tooltip: { ...TIP, callbacks: {
          title: items => items[0].raw.ev.title,
          label: c => ` ${c.raw.ev.date} · ${c.raw.ev.place || ''}`,
          footer: items => pointFooter({ source: items[0].raw.ev.source })
        }}
      },
      scales: {
        x: compressedTimeScale(),
        y: mkScale({ min: -0.6, max: conts.length - 0.4, reverse: true,
          afterBuildTicks: axis => { axis.ticks = conts.map((_, i) => ({ value: i })); },
          ticks: { color:T.text, callback: v => conts[v] || '', font:{ size:10 } },
          grid: { color: T.grid } })
      }
    }
  });
}
function hashJitter(s) {
  let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

/* A generic cited bar or line chart over one or more series. */
function seriesChart(canvasId, defs, { type = 'bar', yTitle = '', yLog = false, xTitle = 'Year', stacked = false, y1Title = null, sourceEl = null, sourcePrefix = 'Sources: ', yMin = 0, legend = null, yearLine = false } = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const sets = defs.map(d => ({ ...d, rows: series(d.series) })).filter(d => d.rows.length);
  if (!sets.length) { hideCard(ctx); return null; }
  const chart = new Chart(ctx, {
    type,
    plugins: yearLine ? [yearLinePlugin] : [],
    data: {
      datasets: sets.map(d => {
        const col = paint(d.color);
        const derived = r => (r.estimate || [].concat(r.source || []).some(s => s && s.verificationStatus !== 'CONFIRMED'));
        return {
          label: d.label || (seriesMeta(d.series) || {}).label || d.series,
          type: d.type || type,
          data: d.rows.map(r => ({ x: r.year, y: r.value })),
          borderColor: col,
          backgroundColor: (d.type || type) === 'bar'
            ? d.rows.map(r => hexA(col, derived(r) ? 0.38 : 0.8))
            : hexA(col, 0.13),
          fill: (d.type || type) === 'line' && d.fill !== false && sets.length === 1,
          borderWidth: (d.type || type) === 'bar' ? 1 : 2.4,
          borderDash: d.dash || [],
          pointRadius: (d.type || type) === 'line' ? d.rows.map(r => derived(r) ? 3 : 4) : 0,
          pointStyle: d.rows.map(r => derived(r) ? 'rectRot' : 'circle'),
          tension: 0.2, borderRadius: 2, borderSkipped: false,
          yAxisID: d.axis || 'y', parsing: false, spanGaps: true
        };
      })
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: legend ?? sets.length > 1, labels: { color:T.textDim, boxWidth:14, font:{ size:10 } } },
        yearLine: { pos: null, color: T.textDim },
        tooltip: { ...TIP, callbacks: {
          title: items => fmtYear(items[0].raw.x),
          label: c => {
            const d = sets[c.datasetIndex], r = d.rows[c.dataIndex];
            const u = (seriesMeta(d.series) || {}).unit || '';
            return ` ${c.dataset.label}: ${fmtNum(c.raw.y)}${u ? ' ' + u : ''}${r.estimate ? ' (est.)' : ''}`;
          },
          footer: items => pointFooter(sets[items[0].datasetIndex].rows[items[0].dataIndex])
        }}
      },
      scales: {
        x: yearScale({ title: axisTitle(xTitle), offset: type === 'bar', stacked }),
        y: mkScale({ type: yLog ? 'logarithmic' : 'linear', min: yLog ? undefined : yMin, stacked,
          title: axisTitle(yTitle), ticks: { color:T.text, callback: v => fmtNum(v) } }),
        ...(y1Title ? { y1: mkScale({ position:'right', grid:{ drawOnChartArea:false }, min: 0,
          title: axisTitle(y1Title), ticks: { color:T.text, callback: v => fmtNum(v) } }) } : {})
      }
    }
  });
  if (sourceEl) seriesSourceLine(sourceEl, sets.flatMap(d => d.rows), sourcePrefix);
  return chart;
}

/* The chart set is declared in the data layer (D().charts), so a series
   added later appears without touching this file. */
const _yearLineCharts = [];
function initSeriesCharts() {
  _yearLineCharts.length = 0;
  (D().charts || []).forEach(c => {
    /* A chart may carry its own title and description, so a series added
       later explains itself without an edit to index.html. */
    const t = document.getElementById(c.canvas + '-title');
    if (t && c.title) t.textContent = c.title;
    const dsc = document.getElementById(c.canvas + '-desc');
    if (dsc && c.desc) dsc.textContent = c.desc;
    const ch = seriesChart(c.canvas, c.datasets, c.options || {});
    if (ch && c.options && c.options.yearLine) _yearLineCharts.push(ch);
  });
}

/* Category bars: one cited value per bar, no time axis. */
function initBarCharts() {
  (D().barCharts || []).forEach(bc => {
    const ctx = document.getElementById(bc.canvas);
    if (!ctx) return;
    const bars = bc.bars || [];
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: bars.map(b => b.label),
        datasets: [{
          data: bars.map(b => b.value),
          backgroundColor: bars.map(b => hexA(paint(b.color), 0.8)),
          borderColor: bars.map(b => paint(b.color)),
          borderWidth: 1, borderRadius: 2, borderSkipped: false
        }]
      },
      options: {
        indexAxis: bc.horizontal ? 'y' : 'x',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...TIP, callbacks: {
            label: c => ` ${fmtNum(c.raw)} ${bc.unit || ''}`,
            footer: items => pointFooter(bars[items[0].dataIndex])
          }}
        },
        scales: {
          [bc.horizontal ? 'x' : 'y']: mkScale({ min: 0, title: axisTitle(bc.unit || ''), ticks: { color:T.text, callback: v => fmtNum(v) } }),
          [bc.horizontal ? 'y' : 'x']: mkScale({ ticks: { color:T.text, font: { size: 10 } }, grid: { display: false } })
        }
      }
    });
    const el = document.getElementById(bc.sourceEl);
    if (el) el.innerHTML = (bc.note ? esc(bc.note) + ' ' : '') + 'Source: ' + sourceHtml(bars[0] && bars[0].source);
  });
}

/* How firm the evidence is, era by era: every source object attached to a
   mapped event, counted by verification status. The chart is about this
   site's citations, and says so. */
function initEvidenceChart() {
  const ctx = document.getElementById('chart-evidence');
  if (!ctx) return;
  const rows = ERAS.map(e => {
    const c = { CONFIRMED: 0, PENDING: 0, DERIVED: 0 };
    (D().mapEvents || []).filter(ev => ev.phase === e.slug)
      .forEach(ev => [].concat(ev.source || []).forEach(s => { c[s.verificationStatus] = (c[s.verificationStatus] || 0) + 1; }));
    return { e, c };
  });
  const ds = [['CONFIRMED', V.v6], ['PENDING', V.v7], ['DERIVED', V.v2]].map(([k, col]) => ({
    label: k[0] + k.slice(1).toLowerCase(), data: rows.map(r => r.c[k]),
    backgroundColor: hexA(col, 0.8), borderColor: col, borderWidth: 1, borderRadius: 2, stack: 's'
  }));
  new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.e.label), datasets: ds },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color:T.textDim, boxWidth:12, font:{ size:10 } } },
        tooltip: { ...TIP, callbacks: { label: c => ` ${c.dataset.label}: ${c.raw} sources` } }
      },
      scales: {
        x: mkScale({ stacked: true, min: 0, title: axisTitle('Source objects on mapped events') }),
        y: mkScale({ stacked: true, ticks: { color:T.text, font:{ size:10 } } })
      }
    }
  });
}

/* Cumulative mapped moments on the compressed axis, for the scrubber. */
let _centresChart = null;
function initSandboxCentresChart() {
  const ctx = document.getElementById('chart-sandbox-centres');
  if (!ctx) return;
  const evs = [...(D().mapEvents || [])].sort((a, b) => a.year - b.year);
  const pts = evs.map((e, i) => ({ x: posOfYear(e.year), y: i + 1, ev: e }));
  _centresChart = new Chart(ctx, {
    type: 'line',
    plugins: [yearLinePlugin],
    data: { datasets: [{
      label: 'Mapped moments (cumulative)', data: pts, stepped: true, parsing: false,
      borderColor: V.v5, backgroundColor: hexA(V.v5, 0.12), fill: true, borderWidth: 2,
      pointRadius: 2.2, pointBackgroundColor: pts.map(p => PC[p.ev.phase]), pointBorderWidth: 0
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        yearLine: { pos: null, color: T.textDim },
        tooltip: { ...TIP, callbacks: {
          title: items => items[0].raw.ev.title,
          label: c => ` ${c.raw.ev.date} · #${c.raw.y}`
        }}
      },
      scales: {
        x: compressedTimeScale({ title: axisTitle('Compressed time') }),
        y: mkScale({ min: 0, title: axisTitle('Cumulative events') })
      }
    }
  });
}

function initEraChart() {
  const ctx = document.getElementById('chart-eras');
  if (!ctx || !ERAS.length) return;
  const now = (D().meta && D().meta.asOfYear) || new Date().getFullYear();
  const spans = ERAS.map((e, i) => {
    const end = i < ERAS.length - 1 ? ERAS[i + 1].start : now;
    return { label: e.label, years: end - Math.max(e.start, YEAR_MIN), e };
  });
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: spans.map(s => s.label),
      datasets: [{
        label: 'Years in era',
        data: spans.map(s => s.years),
        backgroundColor: spans.map(s => hexA(PC[s.e.slug], 0.8)),
        borderColor: spans.map(s => PC[s.e.slug]),
        borderWidth: 1.5, borderRadius: 3, borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        tooltip: { ...TIP, callbacks: {
          label: c => ` ${c.raw.toLocaleString('en-US')} years`,
          footer: items => wrap(spans[items[0].dataIndex].e.note || '', 60)
        }},
        legend: { display: false }
      },
      scales: {
        x: mkScale({ type:'logarithmic', title: axisTitle('Years (log scale)'),
          ticks: { color:T.text, callback: v => [3, 10, 30, 100, 300, 1000, 3000].includes(v) ? v.toLocaleString('en-US') : '' } }),
        y: mkScale({ ticks: { font: { size: 10 } } })
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   9. TABLES — lineage, harms, jurisdictions
═══════════════════════════════════════════════════════════════ */
/* Who proffers the terms: the organisation, the person's software as a
   signal, an industry framework, or the person. One class per voice, the
   same four colours as the diagram at the top of the page. */
const WHO_CLS = { organisation: 'who-org', signal: 'who-signal', industry: 'who-industry', person: 'who-person' };
const WHO_TXT = { organisation: 'The organisation', signal: "The person's software, as a signal", industry: 'An industry framework', person: 'The person' };

function whoBadge(who, label) {
  const cls = WHO_CLS[who] || 'who-industry';
  return `<span class="who-badge ${cls}">${esc(label || WHO_TXT[who] || who)}</span>`;
}

function ynBadge(v, text) {
  const k = v === true || v === 'yes' ? 'yes' : v === 'partial' ? 'partial' : 'no';
  const label = text || { yes: 'Yes', partial: 'Partly', no: 'No' }[k];
  return `<span class="yn yn-${k}">${esc(label)}</span>`;
}

function buildLineageTable() {
  const tbody = document.getElementById('lineage-table-body');
  const rows = D().lineage || [];
  if (!tbody) return;
  if (!rows.length) { const s = document.getElementById('signals'); if (s) s.hidden = true; return; }
  tbody.innerHTML = rows.map(r => `
    <tr${r.destination ? ' class="is-destination"' : ''}>
      <td class="country-cell wrap" style="min-width:170px">${esc(r.name)}
        <div class="disp-note">${esc(r.years || '')}${r.body ? ' · ' + esc(r.body) : ''}</div></td>
      <td>${whoBadge(r.whoProffers, r.whoLabel)}</td>
      <td>${ynBadge(r.machineReadable, r.machineReadableLabel)}</td>
      <td class="wrap" style="min-width:160px;max-width:240px;font-size:12px;color:var(--text-secondary);line-height:1.5">${esc(r.legalForce)}</td>
      <td class="wrap" style="min-width:110px;font-size:12px;color:var(--text-secondary)">${esc(r.recordKeptBy)}</td>
      <td class="wrap" style="min-width:200px;max-width:320px;font-size:12px;color:var(--text-secondary);line-height:1.5">${esc(r.fate)}
        <div class="table-source">${sourceHtml(r.source)}</div></td>
    </tr>`).join('');
  const note = document.getElementById('lineage-note');
  if (note && D().lineageNote) note.textContent = D().lineageNote;
}

function buildHarmsTable() {
  const section = document.getElementById('harms');
  const rows = D().harms || [];
  if (!section) return;
  if (!rows.length) { section.hidden = true; return; }
  const tbody = document.getElementById('harms-table-body');
  if (tbody) {
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="country-cell wrap" style="max-width:190px">${esc(r.place)}
          <div class="disp-note">${esc(r.years || '')}</div></td>
        <td class="wrap" style="max-width:300px;font-size:12px;color:var(--text-secondary);line-height:1.55">${esc(r.what)}</td>
        <td class="wrap" style="min-width:120px;max-width:170px"><strong class="harm-figure">${esc(r.figure || '—')}</strong>
          ${r.figureLabel ? `<div class="disp-note">${esc(r.figureLabel)}</div>` : ''}</td>
        <td class="wrap" style="max-width:300px;font-size:12px;color:var(--text-secondary);line-height:1.55">${esc(r.consequence)}</td>
        <td class="wrap" style="font-size:10px;max-width:220px">${sourceHtml(r.source)}</td>
      </tr>`).join('');
  }
}

function buildJurisdictionTable() {
  const tbody = document.getElementById('juris-table-body');
  const rows = D().jurisdictions || [];
  if (!tbody) return;
  if (!rows.length) { const s = document.getElementById('jurisdictions'); if (s) s.hidden = true; return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="country-cell wrap" style="min-width:120px">${esc(r.region)}</td>
      <td class="wrap" style="min-width:170px;max-width:260px;font-size:12px;line-height:1.5">${esc(r.law)}
        <div class="disp-note">${esc(r.years || '')}${r.regulator ? ' · ' + esc(r.regulator) : ''}</div></td>
      <td class="wrap" style="min-width:130px;max-width:200px;font-size:12px;color:var(--text-secondary);line-height:1.5">${esc(r.maxPenalty || '—')}</td>
      <td class="wrap" style="min-width:170px;max-width:300px;font-size:12px;color:var(--text-secondary);line-height:1.5">${ynBadge(r.automatedSignals)}
        ${r.signalNote ? `<div style="margin-top:4px">${esc(r.signalNote)}</div>` : ''}</td>
      <td class="wrap" style="min-width:170px;max-width:300px;font-size:12px;color:var(--text-secondary);line-height:1.5">${esc(r.aiRules || '—')}
        <div class="table-source">${sourceHtml(r.source)}</div></td>
    </tr>`).join('');
}

/* ═══════════════════════════════════════════════════════════════
   10. CONCEPTS, WHO WRITES THE TERMS, PRINCIPLES, FIGURE CARDS
═══════════════════════════════════════════════════════════════ */
function buildConceptCards() {
  const grid = document.getElementById('concepts-grid');
  if (!grid) return;
  grid.innerHTML = (D().concepts || []).map(c => {
    const a = c.media ? mediaById(c.media) : null;
    return `
      <article class="concept-card" style="--concept-accent:${esc(paint(c.color, V.v5))}">
        ${a ? `<a class="concept-thumb" href="${esc(a.sourceUrl)}" target="_blank" rel="noopener" title="${esc(a.creditLine)}">
          <img src="${esc(a.thumbUrl)}" alt="${esc(a.alt || a.title)}" loading="lazy" referrerpolicy="no-referrer"
               onerror="this.parentElement.remove()" /></a>` : ''}
        <div class="concept-body">
          <p class="concept-origin">${esc(c.originator)}${c.year ? ' · ' + esc(c.year) : ''}</p>
          <h3 class="concept-name">${esc(c.name)}</h3>
          ${c.definition ? `<p class="concept-def">${esc(c.definition)}</p>` : ''}
          <p class="concept-note">${esc(c.note || '')}</p>
          <p class="concept-source">${sourceHtml(c.source)}</p>
        </div>
      </article>`;
  }).join('');
}

/* Four small drawings for the four voices. Each reads the live palette
   through CSS classes, so it follows the theme toggle. */
const FLIP_ICONS = {
  policy: `<svg class="flip-svg" viewBox="0 0 120 64" aria-hidden="true">
      <rect class="f-org" x="4" y="16" width="20" height="34" rx="1.5"/>
      <rect class="f-doc" x="34" y="4" width="46" height="56" rx="2"/>
      <path class="f-line" d="M41 13 H73 M41 19 H73 M41 25 H73 M41 31 H73 M41 37 H66"/>
      <rect class="f-doc" x="41" y="45" width="8" height="8" rx="1"/>
      <path class="f-sig" style="stroke:var(--who-org)" d="M42.6 49 L44.8 51.2 L48 46.6"/>
      <text x="53" y="52">I agree</text>
      <circle class="f-actor" cx="102" cy="22" r="6"/><path class="f-actor" d="M92 50 C 92 36, 112 36, 112 50 Z"/></svg>`,
  signal: `<svg class="flip-svg" viewBox="0 0 120 64" aria-hidden="true">
      <circle class="f-actor" cx="14" cy="22" r="6"/><path class="f-actor" d="M4 50 C 4 36, 24 36, 24 50 Z"/>
      <path class="f-sig" d="M36 22 q 7 10 0 20 M46 15 q 11 17 0 34 M56 8 q 15 24 0 48"/>
      <rect class="f-org" x="94" y="16" width="20" height="34" rx="1.5"/>
      <text x="62" y="62">no reply required</text></svg>`,
  framework: `<svg class="flip-svg" viewBox="0 0 120 64" aria-hidden="true">
      <rect class="f-org" x="4" y="16" width="20" height="34" rx="1.5"/>
      <path class="f-arrow" d="M24 33 H48 M72 33 H94"/>
      <circle class="f-ind" cx="60" cy="33" r="12"/>
      <circle class="f-doc" cx="60" cy="33" r="5"/>
      <circle class="f-actor" cx="104" cy="22" r="6"/><path class="f-actor" d="M94 50 C 94 36, 114 36, 114 50 Z"/>
      <text x="36" y="62">a consent string</text></svg>`,
  agreement: `<svg class="flip-svg" viewBox="0 0 120 64" aria-hidden="true">
      <circle class="f-per" cx="11" cy="20" r="6"/><path class="f-per" d="M1 48 C 1 34, 21 34, 21 48 Z"/>
      <rect class="f-doc" x="28" y="8" width="26" height="36" rx="2"/>
      <path class="f-line" d="M33 16 H49 M33 22 H49 M33 28 H45"/>
      <circle class="f-seal" cx="47" cy="37" r="4"/>
      <path class="f-arrow" d="M58 26 H70"/><path class="f-arrowhead" d="M70 22 L76 26 L70 30 Z"/>
      <rect class="f-doc" x="80" y="8" width="26" height="36" rx="2"/>
      <path class="f-line" d="M85 16 H101 M85 22 H101 M85 28 H97"/>
      <circle class="f-seal" cx="99" cy="37" r="4"/>
      <text x="26" y="60">both keep the record</text></svg>`
};
const FLIP_ACCENT = { policy: 'var(--who-org)', signal: 'var(--who-signal)', framework: 'var(--who-industry)', agreement: 'var(--who-person)' };

function buildFlipSteps() {
  const box = document.getElementById('flip-steps');
  const f = D().flip;
  if (!box || !f) return;
  box.innerHTML = (f.steps || []).map((s, i) => `
    <div class="flip-step" style="--flip-accent:${FLIP_ACCENT[s.icon] || 'var(--v5)'}">
      <div class="flip-figure">${FLIP_ICONS[s.icon] || ''}</div>
      <div class="flip-kicker">${esc(s.kicker || `Voice ${i + 1}`)}</div>
      <div class="flip-title">${esc(s.title)}</div>
      <div class="flip-body">${esc(s.body)}</div>
      ${s.examples ? `<div class="flip-examples">${esc(s.examples)}</div>` : ''}
      ${s.source ? `<div class="flip-src">${sourceHtml(s.source)}</div>` : ''}
    </div>`).join('');
  const foot = document.getElementById('flip-foot');
  if (foot) foot.innerHTML = f.foot ? `${esc(f.foot)}${f.footSource ? ' · ' + sourceHtml(f.footSource) : ''}` : '';
}

function buildFipps() {
  const grid = document.getElementById('fipps-grid');
  if (!grid) return;
  grid.innerHTML = (D().fipps || []).map(f => `
    <div class="fipps-col" style="--fipps-accent:${esc(paint(f.color, 'var(--era-dataprotection)'))}">
      <div class="fipps-head">${esc(f.framework)}</div>
      <div class="fipps-sub">${esc(f.sub || f.year || '')}</div>
      <ol class="fipps-list">${(f.principles || []).map(p =>
        `<li>${p.name ? `<strong>${esc(p.name)}.</strong> ` : ''}${esc(p.text)}</li>`).join('')}</ol>
      <div class="fipps-src">${sourceHtml(f.source)}</div>
    </div>`).join('');
}

function figureCard(f) {
  return `
    <div class="fig-card" style="--fig-accent:${esc(paint(f.color, V.v5))}">
      <div class="fig-value">${esc(f.value)}</div>
      <div class="fig-label">${esc(f.label)}</div>
      ${f.note ? `<div class="fig-note">${esc(f.note)}</div>` : ''}
      <div class="fig-src">${sourceHtml(f.source)}</div>
    </div>`;
}

function buildFigureCards() {
  const figs = D().figures || {};
  for (const [key, list] of Object.entries(figs)) {
    const box = document.getElementById(key + '-figures');
    if (box) box.innerHTML = (list || []).map(figureCard).join('');
  }
}

/* ═══════════════════════════════════════════════════════════════
   11. IEEE 7012, THE ARGUMENT, THE SCENARIO, COUNTERPOINTS, MYTHS
═══════════════════════════════════════════════════════════════ */
function buildStandard() {
  const st = D().standard;
  if (!st) return;
  const q = document.getElementById('myterms-quote');
  if (q) {
    if (st.quote) {
      q.innerHTML = `<p>&ldquo;${esc(st.quote.text)}&rdquo;</p><cite>${esc(st.quote.cite)} · ${sourceHtml(st.quote.source, { badge: false })}</cite>`;
    } else q.remove();
  }
  const lede = document.getElementById('myterms-lede');
  if (lede && st.lede) lede.textContent = st.lede;
  const card = document.getElementById('std-card');
  if (card) {
    card.innerHTML = `
      <div>
        <div class="std-designation">${esc(st.designation)}</div>
        <div class="std-title">${esc(st.title)}</div>
        ${st.purpose ? `<p class="std-purpose">${esc(st.purpose)}</p>` : ''}
        ${st.scope ? `<p class="std-scope">${esc(st.scope)}</p>` : ''}
      </div>
      <dl class="std-facts">${(st.facts || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <div class="std-src">${sourceHtml(st.source)}</div>`;
  }
  const pr = document.getElementById('principles-row');
  if (pr) pr.innerHTML = (st.principles || []).map(p => `
    <div class="principle"><div class="principle-name">${esc(p.name)}</div><div class="principle-text">${esc(p.text)}</div></div>`).join('')
    + (st.principlesSource ? `<p class="chart-source" style="grid-column:1/-1">${sourceHtml(st.principlesSource)}</p>` : '');
  const ag = document.getElementById('agreements-grid');
  if (ag) ag.innerHTML = (st.agreements || []).map(a => `
    <div class="agreement-card" style="--agreement-weight:${a.type && /contribution/i.test(a.type) ? 0.55 : 1}">
      <div class="agreement-type">${esc(a.type || '')}</div>
      <div class="agreement-code">${esc(a.code)}</div>
      <div class="agreement-name">${esc(a.name)}</div>
      <div class="agreement-body">${esc(a.body)}</div>
      <div class="agreement-src">${sourceHtml(a.source)}</div>
    </div>`).join('');
  const ad = document.getElementById('agreements-desc');
  if (ad && st.agreementsDesc) ad.textContent = st.agreementsDesc;
  const coda = document.getElementById('myterms-coda');
  if (coda) coda.innerHTML = st.coda ? esc(st.coda) + (st.codaSource ? ' ' + sourceHtml(st.codaSource) : '') : '';
}

function quoteLine(src) {
  const list = [].concat(src || []).filter(Boolean);
  return list.map(s => (s.quote ? `<q>${esc(s.quote.length > 260 ? s.quote.slice(0, 257).replace(/\s+\S*$/, '') + '…' : s.quote)}</q> — ` : '') + sourceHtml(s)).join('<br>');
}

function buildArgument() {
  const box = document.getElementById('arg-list');
  if (!box) return;
  const lede = document.getElementById('agents-lede');
  if (lede && D().agentsLede) lede.textContent = D().agentsLede;
  box.innerHTML = (D().argument || []).map(a => `
    <div class="arg-card reveal-on-scroll">
      <div class="arg-claim">${esc(a.claim)}</div>
      <div class="arg-expl">${esc(a.explanation)}</div>
      <div class="arg-evidence">${quoteLine(a.source)}</div>
    </div>`).join('');
}

function buildScenario() {
  const box = document.getElementById('scenario-steps');
  const rows = D().scenario || [];
  if (!box) return;
  if (!rows.length) { const c = box.closest('.chart-card'); if (c) c.hidden = true; return; }
  box.innerHTML = rows.map(s => `
    <li class="scenario-step">
      <div class="scenario-actor">${esc(s.actor)}</div>
      <p class="scenario-text">${esc(s.text)}</p>
      <p class="scenario-basis${s.unspecified ? ' is-unspecified' : ''}">${esc(s.basis || '')}${s.source ? ' ' + sourceHtml(s.source) : ''}</p>
    </li>`).join('');
}

function buildCounterpoints() {
  const box = document.getElementById('counter-grid');
  if (!box) return;
  box.innerHTML = (D().counterpoints || []).map(c => `
    <div class="counter-card">
      <div class="counter-point">${esc(c.point)}</div>
      ${c.response ? `<div class="counter-response">${esc(c.response)}</div>` : ''}
      <div class="counter-src">${sourceHtml(c.source)}</div>
    </div>`).join('');
}

function buildMyths() {
  const box = document.getElementById('myth-grid');
  const rows = D().myths || [];
  if (!box) return;
  if (!rows.length) { const s = document.getElementById('myths'); if (s) s.hidden = true; return; }
  box.innerHTML = rows.map(m => {
    const v = String(m.verdict || 'UNVERIFIED').toUpperCase();
    return `
      <div class="myth-card">
        ${m.era ? `<div class="myth-era">${esc(eraLabel(m.era))}</div>` : ''}
        <span class="myth-verdict v-${v.toLowerCase()}">${esc(v === 'FALSE' ? 'False' : v === 'MISLEADING' ? 'Misleading' : 'Unverified')}</span>
        <div class="myth-claim">${esc(m.claim)}</div>
        <div class="myth-correction">${esc(m.correction)}</div>
        <div class="myth-src">${sourceHtml(m.source)}</div>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   11b. THE ESSAY, THE WORLD, THE PEOPLE
═══════════════════════════════════════════════════════════════ */
/* The opening essay. A paragraph's text may carry {n} markers, which point
   at its own nth source; each becomes a superscript note number linked to
   the numbered notes beside the essay. Notes are numbered across the whole
   essay, and a document cited twice keeps its first number. */
function buildEssay() {
  const body = document.getElementById('essay-body');
  const list = document.getElementById('essay-notes');
  const es = D().essay;
  if (!body || !list) return;
  if (!es || !(es.paragraphs || []).length) { const s = document.getElementById('essay'); if (s) s.hidden = true; return; }
  const t = document.getElementById('essay-title'); if (t && es.title) t.textContent = es.title;
  const dk = document.getElementById('essay-dek'); if (dk && es.dek) dk.textContent = es.dek;
  const notes = [], noteIdx = new Map();
  const noteNo = s => {
    const k = (s.url || '') + '|' + (s.quote || s.title || '');
    if (!noteIdx.has(k)) { notes.push(s); noteIdx.set(k, notes.length); }
    return noteIdx.get(k);
  };
  const cite = nums => `<sup class="essay-cite">${nums.map(n => `<a href="#essay-note-${n}" aria-label="Note ${n}">${n}</a>`).join(',')}</sup>`;
  body.innerHTML = es.paragraphs.map(p => {
    const srcs = [].concat(p.source || []);
    let html = esc(p.text);
    let used = false;
    html = html.replace(/\{(\d+(?:,\d+)*)\}/g, (_, g) => {
      used = true;
      const nums = g.split(',').map(i => srcs[+i - 1]).filter(Boolean).map(noteNo);
      return nums.length ? cite(nums) : '';
    });
    if (!used && srcs.length) html += cite(srcs.map(noteNo));
    return (p.heading ? `<h3 class="essay-h">${esc(p.heading)}</h3>` : '') + `<p class="essay-p">${html}</p>`;
  }).join('');
  list.innerHTML = notes.map((s, i) => `<li id="essay-note-${i + 1}">${s.quote ? `<q>${esc(s.quote.length > 220 ? s.quote.slice(0, 217).replace(/\s+\S*$/, '') + '…' : s.quote)}</q> — ` : ''}${sourceHtml(s)}</li>`).join('');
}

/* Around the world: one dot per country's first comprehensive law. */
let worldMap = null;
const worldMkrs = [];
function decadeOf(y) { return Math.floor(y / 10) * 10; }
function decadeColor(y) {
  const d = Math.min(Math.max(decadeOf(y), 1970), 2020);
  return cssVar('--dec-' + d, '#6CB2BA');
}

function worldPopup(l) {
  return `<div class="map-popup-date" style="color:${decadeColor(l.year)}">${esc(l.year)}${l.inForce && l.inForce !== l.year ? ` · in force ${esc(l.inForce)}` : ''}</div>` +
    `<div class="map-popup-title">${esc(l.country)}</div>` +
    `<div class="map-popup-body">${esc(l.law)}${l.regulator ? ` · ${esc(l.regulator)}` : ''}</div>` +
    (l.note ? `<div class="map-popup-body" style="margin-top:4px">${esc(l.note)}</div>` : '') +
    `<div class="map-popup-source">${sourceHtml(l.source)}</div>`;
}

function initWorldMap() {
  const el = document.getElementById('world-map-container');
  const laws = D().worldLaws || [];
  if (!el || typeof L === 'undefined') return;
  if (!laws.length) { const s = document.getElementById('world'); if (s) s.hidden = true; return; }
  worldMap = L.map('world-map-container', { center: [20, 10], zoom: 1, minZoom: 1, zoomControl: true, scrollWheelZoom: false, worldCopyJump: true });
  addBasemap(worldMap);
  [...laws].sort((a, b) => a.year - b.year).forEach(l => {
    const m = L.circleMarker([l.lat, l.lng], { radius: 6, fillColor: decadeColor(l.year), color: T.markerStroke, weight: 1, fillOpacity: 0.9, opacity: 1 })
      .bindPopup(worldPopup(l), { maxWidth: 280 }).addTo(worldMap);
    worldMkrs.push({ m, l, shown: true });
  });
  const leg = document.getElementById('decade-legend');
  if (leg) leg.innerHTML = [1970, 1980, 1990, 2000, 2010, 2020].map(d =>
    `<span><i style="background:${decadeColor(d)}"></i>${d}s · ${laws.filter(l => decadeOf(l.year) === d || (d === 1970 && l.year < 1970)).length}</span>`).join('');
  const tbody = document.getElementById('world-list-body');
  if (tbody) tbody.innerHTML = [...laws].sort((a, b) => a.year - b.year || a.country.localeCompare(b.country)).map(l => `
    <tr data-year="${esc(l.year)}"><td class="y">${esc(l.year)}</td>
      <td><span class="c">${esc(l.country)}</span><br>${esc(l.law)}</td>
      <td>${sourceHtml([].concat(l.source || [])[0], { badge: true })}</td></tr>`).join('');
  const slider = document.getElementById('world-slider');
  if (slider) {
    const min = Math.min(...laws.map(l => l.year));
    slider.min = Math.min(1970, min);
    slider.max = (D().meta && D().meta.asOfYear) || 2026;
    slider.value = slider.max;
    slider.addEventListener('input', () => updateWorld(+slider.value), { passive: true });
    updateWorld(+slider.value);
  }
}

function updateWorld(year) {
  const laws = D().worldLaws || [];
  let n = 0;
  worldMkrs.forEach(o => {
    const on = o.l.year <= year;
    if (on) n++;
    if (on !== o.shown) {
      o.m.setStyle({ fillOpacity: on ? 0.9 : 0, opacity: on ? 1 : 0 });
      if (o.m._path) o.m._path.style.pointerEvents = on ? '' : 'none';
      o.shown = on;
    }
  });
  const y = document.getElementById('world-year'); if (y) y.textContent = String(year);
  const c = document.getElementById('world-count');
  if (c) c.innerHTML = `<strong>${n}</strong> of the ${laws.length} countries in this list had a first law by ${year}`;
  document.querySelectorAll('#world-list-body tr').forEach(tr => tr.classList.toggle('is-future', +tr.dataset.year > year));
}

function restyleWorld() {
  worldMkrs.forEach(({ m, l }) => m.setStyle({ fillColor: decadeColor(l.year), color: T.markerStroke }));
  const leg = document.getElementById('decade-legend');
  if (leg) leg.querySelectorAll('i').forEach((i, k) => { i.style.background = decadeColor(1970 + 10 * k); });
}

/* First laws by decade, stacked by region: counted from this site's own
   list, and labelled as such. */
function initWorldRegionsChart() {
  const ctx = document.getElementById('chart-world-regions');
  const laws = D().worldLaws || [];
  if (!ctx || !laws.length) return;
  const decades = [1970, 1980, 1990, 2000, 2010, 2020];
  const regions = (D().meta && D().meta.lawRegions) || [...new Set(laws.map(l => l.region))];
  const cols = [V.v5, V.v6, PC.rights, PC.dataprotection, PC.castle, PC.cookies, PC.surveillance, V.v3];
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: decades.map(d => d + 's'),
      datasets: regions.map((r, i) => ({
        label: r, stack: 's',
        data: decades.map(d => laws.filter(l => l.region === r && Math.min(Math.max(decadeOf(l.year), 1970), 2020) === d).length),
        backgroundColor: hexA(cols[i % cols.length], 0.82), borderColor: cols[i % cols.length], borderWidth: 1, borderRadius: 2
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: T.textDim, boxWidth: 10, font: { size: 10 } } },
        tooltip: { ...TIP, callbacks: {
          label: c => ` ${c.dataset.label}: ${c.raw}`,
          footer: items => {
            const d = decades[items[0].dataIndex], r = items[0].dataset.label;
            return wrap(laws.filter(l => l.region === r && Math.min(Math.max(decadeOf(l.year), 1970), 2020) === d).map(l => l.country).join(', '), 60);
          }
        } }
      },
      scales: {
        x: mkScale({ stacked: true, grid: { display: false } }),
        y: mkScale({ stacked: true, min: 0, title: axisTitle('Countries (first comprehensive law)'), ticks: { color: T.text, precision: 0 } })
      }
    }
  });
  const src = document.getElementById('chart-world-regions-source');
  if (src) src.textContent = `DERIVED: counted from the ${laws.length} cited country records in the list above; each record carries its own source.`;
}

function buildFrameworks() {
  const tbody = document.getElementById('frameworks-table-body');
  const rows = D().frameworks || [];
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="country-cell wrap" style="min-width:180px">${esc(r.name)}</td>
      <td class="wrap" style="min-width:120px;font-size:12px;color:var(--text-secondary)">${esc(r.body)}</td>
      <td style="font-variant-numeric:tabular-nums">${esc(r.year)}</td>
      <td class="wrap" style="min-width:110px"><span class="role-badge">${esc(r.force)}</span></td>
      <td class="wrap" style="min-width:200px;max-width:340px;font-size:12px;color:var(--text-secondary);line-height:1.5">${esc(r.reach || '')}
        <div class="table-source">${sourceHtml(r.source)}</div></td>
    </tr>`).join('');
}

function buildPolicyModels() {
  const box = document.getElementById('model-grid');
  if (!box) return;
  box.innerHTML = (D().policyModels || []).map(m => `
    <div class="model-card" style="--model-accent:${esc(paint(m.color, 'var(--era-dataprotection)'))}">
      <div class="model-name">${esc(m.name)}</div>
      <div class="model-ex">${esc(m.exemplars || '')}</div>
      <div class="model-desc">${esc(m.description)}</div>
      <div class="model-src">${sourceHtml(m.source)}</div>
    </div>`).join('');
}

/* The people: one card each, filterable by the group the editorial layer
   assigns (code, clubs and advocates, researchers, disclosure, identity). */
function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function buildPeople() {
  const grid = document.getElementById('people-grid');
  const people = D().people || [];
  if (!grid) return;
  if (!people.length) { const s = document.getElementById('people'); if (s) s.hidden = true; return; }
  const groups = D().peopleGroups || [];
  const gcol = Object.fromEntries(groups.map(g => [g.key, paint(g.color, V.v5)]));
  const render = key => {
    grid.innerHTML = people.filter(p => !key || p.group === key).map(p => {
      const a = p.portrait ? mediaById(p.portrait) : null;
      const q = p.quote ? `<blockquote class="person-quote">&ldquo;${esc(p.quote)}&rdquo;${p.quoteSource ? `<cite>${sourceHtml(p.quoteSource)}</cite>` : ''}</blockquote>` : '';
      const kw = p.keyWork && p.keyWork.title
        ? `<p class="person-work">Key work: ${p.keyWork.url ? `<a href="${esc(p.keyWork.url)}" target="_blank" rel="noopener">${esc(p.keyWork.title)}</a>` : esc(p.keyWork.title)}${p.keyWork.year ? ` (${esc(p.keyWork.year)})` : ''}</p>` : '';
      return `
        <article class="person-card" style="--person-accent:${gcol[p.group] || V.v5}">
          <div class="person-head">
            <div class="person-portrait">${a
              ? `<img src="${esc(a.thumbUrl)}" alt="${esc(a.alt || p.name)}" loading="lazy" referrerpolicy="no-referrer" title="${esc(a.creditLine || '')}" onerror="this.parentElement.innerHTML='<span class=&quot;person-initials&quot;>${esc(initials(p.name))}</span>'" />`
              : `<span class="person-initials">${esc(initials(p.name))}</span>`}</div>
            <div>
              <div class="person-roles">${esc(p.roles || '')}</div>
              <h3 class="person-name">${esc(p.name)}</h3>
              ${p.handle ? `<div class="person-handle">${esc(p.handle)}</div>` : ''}
              <div class="person-years">${esc([p.years, p.place].filter(Boolean).join(' · '))}</div>
            </div>
          </div>
          <div class="person-body">
            ${q}
            <p class="person-text">${esc(p.contribution || '')}</p>
            ${p.influence ? `<p class="person-text">${esc(p.influence)}</p>` : ''}
            ${kw}
            ${p.thread ? `<p class="person-thread">${esc(p.thread)}</p>` : ''}
            ${a ? `<p class="person-src">Portrait: ${esc(a.creditLine || '')}</p>` : ''}
            <p class="person-src">${sourceHtml(p.source)}</p>
          </div>
        </article>`;
    }).join('');
  };
  const filter = document.getElementById('people-filter');
  if (filter && groups.length) {
    const present = groups.filter(g => people.some(p => p.group === g.key));
    filter.innerHTML = `<button type="button" class="archive-chip is-on" data-g="">All ${people.length}</button>` +
      present.map(g => `<button type="button" class="archive-chip" data-g="${esc(g.key)}" style="--chip:${gcol[g.key]}">${esc(g.label)} · ${people.filter(p => p.group === g.key).length}</button>`).join('');
    filter.onclick = ev => {
      const b = ev.target.closest('.archive-chip');
      if (!b) return;
      filter.querySelectorAll('.archive-chip').forEach(x => x.classList.toggle('is-on', x === b));
      render(b.dataset.g);
    };
  }
  render('');
}

/* ═══════════════════════════════════════════════════════════════
   12. PHOTO ARCHIVE, STAT BLOCKS, SOURCE AUDIT
═══════════════════════════════════════════════════════════════ */
function buildMediaGrid() {
  const grid = document.getElementById('photo-archive-grid');
  if (!grid) return;
  const assets = D().mediaAssets || [];
  const filter = document.getElementById('archive-filter');
  const render = era => {
    grid.innerHTML = '';
    assets.filter(a => !era || a.era === era).forEach(a => {
      const eraColor = PC[a.era];
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.innerHTML = `
        <a class="photo-thumb-wrap" href="${esc(a.fullUrl || a.sourceUrl)}" target="_blank" rel="noopener" title="Open full-size image">
          <img class="photo-thumb" src="${esc(a.thumbUrl)}" alt="${esc(a.alt || a.title)}" loading="lazy" referrerpolicy="no-referrer"
               onerror="this.style.display='none'; this.parentElement.classList.add('photo-fallback');" />
        </a>
        <div class="photo-meta">
          <div class="photo-title">${esc(a.title)}</div>
          <div class="photo-year">${esc(a.year)}${eraColor ? `<span class="photo-era" style="background:${eraColor};color:${contrastInk(eraColor)}">${esc(eraLabel(a.era))}</span>` : ''}</div>
          <div class="photo-caption">${esc(a.caption || '')}</div>
          <div class="photo-credit">${esc(a.creditLine || '')}</div>
          <div class="photo-license">${esc(a.license)} ${statusBadge(a.verificationStatus)}</div>
          <div class="photo-links">
            <a href="${esc(a.sourceUrl)}" target="_blank" rel="noopener">Source record</a>
            ${a.upstreamUrl ? `<a href="${esc(a.upstreamUrl)}" target="_blank" rel="noopener">${esc(a.upstreamArchive || 'Archive record')}</a>` : ''}
          </div>
        </div>`;
      grid.appendChild(card);
    });
  };
  if (filter) {
    const present = ERAS.filter(e => assets.some(a => a.era === e.slug));
    filter.innerHTML = `<button type="button" class="archive-chip is-on" data-era="">All ${assets.length}</button>` +
      present.map(e => `<button type="button" class="archive-chip" data-era="${esc(e.slug)}" style="--chip:${PC[e.slug]}">${esc(e.label)} · ${assets.filter(a => a.era === e.slug).length}</button>`).join('');
    filter.onclick = ev => {
      const b = ev.target.closest('.archive-chip');
      if (!b) return;
      filter.querySelectorAll('.archive-chip').forEach(x => x.classList.toggle('is-on', x === b));
      render(b.dataset.era);
    };
  }
  render('');
}

function renderStatBlocks() {
  const hero = document.querySelector('.hero-stats');
  const hs = D().heroStats;
  if (hero && Array.isArray(hs) && hs.length) {
    hero.innerHTML = hs.map(s => `
      <div>
        <div class="hero-stat-number" style="color:${esc(paint(s.color))}">${esc(s.value)}</div>
        <div class="hero-stat-label">${esc(s.label)}${s.sublabel ? '<br>' + esc(s.sublabel) : ''}</div>
        ${s.source ? `<div class="hero-stat-source">${sourceHtml(s.source)}</div>` : ''}
      </div>`).join('');
  }
  const foot = document.querySelector('.footer-stats');
  const fs = D().footerStats;
  if (foot && Array.isArray(fs) && fs.length) {
    foot.innerHTML = fs.map(s => `
      <div class="footer-stat" style="border-color:${esc(paint(s.color))}">
        <div class="footer-stat-value" style="color:${esc(paint(s.color))}">${esc(s.value)}</div>
        <div class="footer-stat-delta">${esc(s.sublabel || '')}</div>
        <div class="footer-stat-label">${esc(s.label)}</div>
        ${s.source ? `<div class="footer-stat-source">${sourceHtml(s.source)}</div>` : ''}
      </div>`).join('');
  }
}

function buildSourceRoll() {
  const tbody   = document.getElementById('source-roll-body');
  const summary = document.getElementById('source-audit-summary');
  if (!tbody) return;

  const byInst = new Map();
  const counts = { CONFIRMED:0, PENDING:0, DERIVED:0 };
  let total = 0;

  const add = src => {
    if (!src) return;
    if (Array.isArray(src)) { src.forEach(add); return; }
    if (typeof src !== 'object' || !(src.institution || src.url)) return;
    total++;
    const st = src.verificationStatus || 'PENDING';
    counts[st] = (counts[st] || 0) + 1;
    const k = src.institution || 'Unknown';
    const e = byInst.get(k) || { n:0, CONFIRMED:0, PENDING:0, DERIVED:0, url:'', access:new Set() };
    e.n++; e[st] = (e[st] || 0) + 1;
    if (src.accessType) e.access.add(src.accessType);
    if (!e.url && src.url) e.url = src.url;
    byInst.set(k, e);
  };
  const walk = (o, depth) => {
    if (!o || depth > 6) return;
    if (Array.isArray(o)) { o.forEach(x => walk(x, depth + 1)); return; }
    if (typeof o !== 'object') return;
    if ('source' in o && typeof o.source === 'object') add(o.source);
    for (const [k, v] of Object.entries(o)) if (k !== 'source' && v && typeof v === 'object') walk(v, depth + 1);
  };
  walk(D(), 0);

  const rows = [...byInst.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
  tbody.innerHTML = rows.map(([inst, e]) => `
    <tr>
      <td class="country-cell" style="white-space:normal">${esc(inst)}</td>
      <td>${e.n}</td>
      <td>${e.CONFIRMED ? `<span class="net-badge net-gain">${e.CONFIRMED}</span>` : '—'}</td>
      <td>${e.PENDING ? `<span class="net-badge net-mixed">${e.PENDING}</span>` : '—'}</td>
      <td>${e.DERIVED ? `<span class="net-badge net-moderate">${e.DERIVED}</span>` : '—'}</td>
      <td><span class="role-badge">${[...e.access].join(' / ') || '—'}</span></td>
      <td>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener" style="font-family:var(--font-sans);font-size:10px">open ↗</a>` : '—'}</td>
    </tr>`).join('');

  /* The footer names the institutions that carry the most citations. */
  const foot = document.getElementById('footer-institutions');
  if (foot) foot.textContent = rows.slice(0, 28).map(([inst]) => inst).join(' · ') + (rows.length > 28 ? ` · and ${rows.length - 28} more` : '');

  if (summary) {
    const pct = total ? Math.round(100 * counts.CONFIRMED / total) : 0;
    summary.innerHTML =
      `${total.toLocaleString('en-US')} cited data points across ${rows.length} institutions — ` +
      `<strong style="color:var(--v6)">${counts.CONFIRMED} confirmed (${pct}%)</strong>, ` +
      `<strong style="color:var(--v7)">${counts.PENDING} pending</strong>, ` +
      `<strong style="color:var(--v9)">${counts.DERIVED} derived</strong>.`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   13. THEME (light / dark)
═══════════════════════════════════════════════════════════════ */
const THEME_KEY = 'ora-theme';
const SUN_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const MOON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function buildCharts() {
  initSpreadChart();
  initSeriesCharts();
  initBarCharts();
  initEraChart();
  initEvidenceChart();
  initSandboxCentresChart();
  initWorldRegionsChart();
  /* A canvas the data layer declares no chart for is hidden with its card,
     rather than shown as an empty frame. */
  document.querySelectorAll('.chart-card canvas').forEach(c => { if (!Chart.getChart(c)) hideCard(c); });
}

function rebuildCharts() {
  document.querySelectorAll('canvas').forEach(c => { const ch = Chart.getChart(c); if (ch) ch.destroy(); });
  _spreadMarkerChart = null;
  _centresChart = null;
  buildCharts();
  const slider = document.getElementById('era-slider');
  if (slider) updateSlider(+slider.value);
}

function updateThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const light = currentTheme() === 'light';
  btn.setAttribute('aria-pressed', String(light));
  btn.title = light ? 'Switch to dark mode' : 'Switch to light mode';
  btn.innerHTML = light ? MOON_SVG : SUN_SVG;
}

function applyTheme(theme) {
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable */ }
  refreshTheme();
  if (scrollMap)  addBasemap(scrollMap);
  if (sandboxMap) addBasemap(sandboxMap);
  if (worldMap)   addBasemap(worldMap);
  restyleMarkers();
  restyleWorld();
  buildPhaseLegend();
  paintSliderTrack();
  const cur = document.querySelector('.scroll-step.is-active');
  if (cur) highlightPhasePill(cur.dataset.phase);
  rebuildCharts();
  buildFlipSteps();
  buildMediaGrid();
  updateThemeToggle();
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => applyTheme(currentTheme() === 'light' ? 'dark' : 'light'));
  updateThemeToggle();
}

let _rsTimer;
window.addEventListener('resize', () => {
  clearTimeout(_rsTimer);
  _rsTimer = setTimeout(() => {
    if (scrollMap)  scrollMap.invalidateSize();
    if (sandboxMap) sandboxMap.invalidateSize();
    if (worldMap)   worldMap.invalidateSize();
  }, 220);
}, { passive:true });

/* ═══════════════════════════════════════════════════════════════
   MAIN INIT
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  refreshTheme();
  initThemeToggle();
  initProgressBar();
  initAnchorScroll();
  initNavDrawer();
  initSectionNav();
  buildPhaseLegend();
  setLayoutVars();

  initScrollMap();
  initSandboxMap();
  initWorldMap();

  buildScrollSteps();
  requestAnimationFrame(() => requestAnimationFrame(initScrollytelling));

  buildCharts();
  initSlider();

  buildEssay();
  buildConceptCards();
  buildFlipSteps();
  buildFipps();
  buildFigureCards();
  buildFrameworks();
  buildPolicyModels();
  buildPeople();
  buildLineageTable();
  buildHarmsTable();
  buildStandard();
  buildArgument();
  buildScenario();
  buildCounterpoints();
  buildJurisdictionTable();
  buildMyths();
  buildMediaGrid();
  renderStatBlocks();
  buildSourceRoll();
});
