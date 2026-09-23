/**
 * editorial.mjs — the judgement layer of the privacy data file.
 *
 * Evidence lives in research/*.json. This file decides what the page shows
 * and how it is framed: era boundaries, which events are mapped, the
 * narrative steps, the opening essay, charts, figure cards, tables, the
 * IEEE 7012 section and the case for it in the age of agents. Every figure
 * or quotation used here is taken from a research record, and the record's
 * own source objects travel with it through the helpers; the only prose
 * written here is framing (headlines, section labels, the essay's sentences,
 * each of which is tied to the research facts that support it).
 * tools/build-data.mjs compiles the result into js/data.js.
 */

export default function editorial(H) {
  const ev  = (id, idx) => H.eventSources(id, idx);
  const qs  = (id, idx) => H.quantSources(id, idx);
  const src = list => H.sources(list);
  const q   = id => H.quant(id);
  const confirmed = list => src(list).filter(s => s.verificationStatus === 'CONFIRMED');
  /* The source in a list whose quote contains the given words. */
  const withQuote = (list, words) => {
    const s = src(list).find(x => String(x.quote || '').includes(words));
    if (!s) throw new Error(`no source quoting "${words}"`);
    return s;
  };

  /* ── ERAS ─────────────────────────────────────────────────────────
     Eight named periods, each opening at a cited turning point named in
     its note. The boundaries themselves are an editorial reading. */
  const eras = [
    { slug: 'walls', label: 'Walls & Seals', name: 'Walls & Seals', start: -400, fallback: '#C9A46E',
      note: 'Opens with the Hippocratic Oath (traditionally c. 400 BCE; the date is disputed), the oldest text on this map that promises to keep a private matter private.' },
    { slug: 'castle', label: 'Castle & Warrant', name: 'The Castle & the Warrant', start: 1604, fallback: '#A58BD6',
      note: 'Opens with Semayne\'s Case (1604): "the house of every one is to him as his castle and fortress".' },
    { slug: 'letalone', label: 'Let Alone', name: 'The Right to Be Let Alone', start: 1879, fallback: '#A7AEBD',
      note: 'Opens with Judge Thomas Cooley\'s Treatise on the Law of Torts (1879) and its right "to be let alone".' },
    { slug: 'rights', label: 'Rights & Records', name: 'Human Rights & the Data Bank', start: 1948, fallback: '#6FA8DC',
      note: 'Opens with Article 12 of the Universal Declaration of Human Rights, 10 December 1948.' },
    { slug: 'dataprotection', label: 'Data Protection', name: 'Data Protection', start: 1970, fallback: '#6CB2BA',
      note: 'Opens with Hesse\'s Data Protection Act of 7 October 1970, the first data protection law anywhere.' },
    { slug: 'cookies', label: 'Cookies & Consent', name: 'Cookies & Consent', start: 1994, fallback: '#DC8A55',
      note: 'Opens with Lou Montulli\'s HTTP cookie at Netscape, summer 1994.' },
    { slug: 'surveillance', label: 'Surveillance', name: 'Surveillance & Reckoning', start: 2013, fallback: '#E0645A',
      note: 'Opens with The Guardian\'s first Snowden story, 5 June 2013.' },
    { slug: 'agents', label: 'Agents & Terms', name: 'Agents & Terms', start: 2023, fallback: '#7CC49A',
      note: 'Opens in 2023, when Italy\'s data-protection authority limited ChatGPT (30 March 2023); ChatGPT itself launched on 30 November 2022, the last moment of the previous era.' },
  ];

  const meta = {
    title: 'Who Writes the Terms? A History of Privacy',
    subtitle: 'From the closed door to IEEE 7012 (MyTerms), and why it matters in the age of AI agents',
    asOfYear: 2026,
    center: [38, -12],
    defaultZoom: 2,
    eras,
    /* Compressed time: [slider position, year] knots, linear between. The
       last decade, where most of the digital story sits, gets a quarter. */
    timeKnots: [[0, -450], [100, 1600], [200, 1880], [320, 1970], [520, 2000], [760, 2016], [1000, 2026]],
    axisTicks: [-400, 1600, 1800, 1900, 1970, 1990, 2000, 2010, 2016, 2020, 2024],
    sliderTicks: [
      { year: -450, label: '450 BCE' }, { year: 1600, label: '1600' }, { year: 1880, label: '1880' },
      { year: 1948, label: '1948' }, { year: 1970, label: '1970' }, { year: 1994, label: '1994' },
      { year: 2013, label: '2013' }, { year: 2026, label: '2026' },
    ],
    sliderStartYear: 1890,
    continents: ['North America', 'Latin America', 'Europe', 'Middle East & Africa', 'South Asia', 'East Asia & Pacific'],
    lawRegions: ['Europe', 'North America', 'Latin America & Caribbean', 'Middle East & North Africa', 'Sub-Saharan Africa', 'South Asia', 'East Asia & Pacific', 'Central Asia'],
    sliderCards: [
      { id: 'stat-laws', series: 'countries-with-data-privacy-laws', label: 'Countries with a national data-privacy law (Greenleaf count)', color: 'dataprotection', maxGap: 6 },
      { id: 'stat-states', series: 'us-state-comprehensive-privacy-laws', label: 'US states with a comprehensive consumer privacy law', color: 'surveillance', maxGap: 1 },
    ],
  };

  /* ── MAPPED EVENTS ────────────────────────────────────────────────
     Every research event with coordinates, except where two slices covered
     the same moment (one record is kept) or the event has no place. */
  const DUPLICATES = new Set([
    'cooley-right-to-be-let-alone-torts-treatise-1879',          // letalone's record kept
    'searls-intention-economy-essay-2006',                       // internet's record kept
    'projectvrm-launched-berkman-center-2006', 'searls-projectvrm-launched-berkman-2006',
    'w3c-p3p-recommendation-2002',                               // internet's record kept
    'soghoian-stamm-do-not-track-header-prototype-2009',
    'narayanan-shmatikov-netflix-deanonymization-2008',
    'puttaswamy-privacy-fundamental-right-india-2017',           // global's record kept
    'india-digital-personal-data-protection-act-2023',           // agents' DPDP record kept
    'intention-economy-book-harvard-talk-2012',
    'ieee-7012-myterms-published-2026',                          // myterms' record kept
  ]);
  /* Records that share an id across slices (Zuboff 2019, China's PIPL)
     are already merged by the build, first slice wins. */
  const events = H.events()
    .filter(e => typeof e.lat === 'number' && typeof e.lng === 'number')
    .filter(e => !DUPLICATES.has(e.id))
    .map(e => ({ id: e.id }));

  /* ── NARRATIVE STEPS ──────────────────────────────────────────────
     Each step reads its event's verified summary and its significance
     line; the step adds a headline, pictures and a chip naming who set the
     terms at that moment — the page's thesis, one step at a time. */
  const T = (value) => [{ label: 'Terms set by', value }];
  const scrollSteps = [
    // Walls & Seals
    { eventId: 'hippocratic-oath-confidentiality-clause-c-400-bce', headline: 'A physician swears to keep what he sees',
      media: ['hippocratic-oath-papyrus-oxyrhynchus-2547'], chips: T('The practitioner\'s oath'), zoom: 5 },
    { eventId: 'mishnah-talmud-hezek-reiyah-damage-by-sight-c-200-ce', headline: 'Being seen becomes an injury',
      media: ['bomberg-talmud-bava-batra-venice-1522'], chips: T('Religious law'), zoom: 5 },
    { eventId: 'quran-surah-an-nur-al-hujurat-permission-and-no-spying-c-627', headline: 'Ask before you enter; do not spy',
      chips: T('Religious law'), zoom: 5 },
    { eventId: 'fourth-lateran-council-canon-21-seal-of-confession-1215', headline: 'Everyone must confess — and the Church must keep the secret',
      media: ['dirc-van-delft-confession-to-a-bishop-c1404'], chips: T('The institution that collects'), zoom: 5 },
    // Castle & Warrant
    { eventId: 'semaynes-case-house-as-castle-and-fortress-1604', headline: 'The house as castle and fortress',
      media: ['edward-coke-engraving-van-de-passe'], chips: T('The court'), zoom: 5 },
    { eventId: 'entick-v-carrington-papers-dearest-property-1765', headline: 'Papers are a man\'s dearest property',
      media: ['lord-camden-bartolozzi-drawing', 'hogarth-john-wilkes-1763'], chips: T('The court'), zoom: 5 },
    { eventId: 'us-fourth-amendment-ratified-1791', headline: 'Persons, houses, papers and effects',
      media: ['us-bill-of-rights-1789-nara'], chips: T('The constitution'), zoom: 4 },
    // The Right to Be Let Alone
    { eventId: 'kodak-camera-you-press-the-button-1888', headline: 'Anyone can take anyone\'s picture',
      media: ['kodak-advert-you-press-the-button-1891'], chips: T('Nobody — the technology arrives first'), zoom: 4 },
    { eventId: 'warren-brandeis-right-to-privacy-1890', headline: 'A right to privacy, argued into existence',
      media: ['right-to-privacy-harvard-law-review-1890'], chips: T('Lawyers, arguing for the person'), zoom: 5 },
    { eventId: 'olmstead-brandeis-dissent-1928', headline: 'The wiretap that was not a search',
      media: ['louis-brandeis-harris-ewing-c1916', 'house-office-building-telephone-exchange-1912'], chips: T('The court (5–4)'), zoom: 5 },
    { eventId: 'netherlands-population-register-lentz-1941', headline: 'A perfect register, in the wrong hands',
      chips: T('The occupier'), zoom: 5 },
    // Rights & Records
    { eventId: 'udhr-article-12-privacy-1948', headline: 'Privacy becomes a human right',
      media: ['eleanor-roosevelt-udhr-poster-1949', 'palais-de-chaillot-un-general-assembly-1951'], chips: T('International law'), zoom: 5 },
    { eventId: 'tokyo-district-court-utage-no-ato-privacy-1964', headline: 'A Tokyo court names a right to privacy',
      chips: T('The court'), zoom: 5 },
    { eventId: 'national-data-center-gallagher-hearings-1966', headline: 'Congress puts the data bank on trial',
      media: ['univac-i-census-bureau-dedication-1951'], chips: T('The legislature'), zoom: 5 },
    { eventId: 'katz-v-united-states-reasonable-expectation-1967', headline: 'People, not places',
      chips: T('The court'), zoom: 4 },
    // Data Protection
    { eventId: 'hesse-data-protection-act-1970', headline: 'The first data protection law',
      media: ['hessian-landtag-stadtschloss-wiesbaden'], chips: T('The statute'), zoom: 6 },
    { eventId: 'hew-records-computers-rights-citizens-1973', headline: 'Five rules for record-keepers',
      chips: T('Rules for the record-keeper'), zoom: 5 },
    { eventId: 'oecd-privacy-guidelines-1980', headline: 'Eight principles for the world',
      media: ['oecd-chateau-de-la-muette-paris'], chips: T('Governments, for organisations'), zoom: 5 },
    { eventId: 'chaos-computer-club-first-meeting-taz-berlin-1981', headline: 'Hackers ask: who owns my data?',
      media: ['wau-holland-hamburg-1984'], chips: T('A question from the users'), zoom: 5 },
    { eventId: 'census-judgment-informational-self-determination-1983', headline: '"My data belongs to me" reaches the constitution',
      media: ['census-boycott-demo-freiburg-1987', 'federal-constitutional-court-karlsruhe'], chips: T('The person, in principle'), zoom: 5 },
    { eventId: 'brazil-constitution-habeas-data-1988', headline: 'A writ to see your own file',
      chips: T('The person, through a court'), zoom: 4 },
    { eventId: 'zimmermann-releases-pgp-1-0-1991', headline: 'Encryption anyone can download',
      media: ['phil-zimmermann-hal-enschede-2001'], chips: T('The person\'s own software'), zoom: 4 },
    { eventId: 'hughes-a-cypherpunks-manifesto-1993', headline: 'Privacy as the power to reveal selectively',
      media: ['eric-hughes-cypherpunk-kspiers'], chips: T('The person, in code'), zoom: 5 },
    // Cookies & Consent
    { eventId: 'montulli-invents-the-http-cookie-1994', headline: 'The web gets a memory — the site\'s',
      media: ['netscape-navigator-1-1-install-disk'], chips: T('The site'), zoom: 5 },
    { eventId: 'w3c-p3p-1-0-recommendation-2002', headline: 'Machine-readable privacy, written by the site',
      media: ['lorrie-cranor-capitol-hill-briefing-2014'], chips: T('The site (its policy)'), zoom: 5 },
    { eventId: 'projectvrm-launched-berkman-2006', headline: 'Tools for the customer\'s side',
      media: ['berkman-center-23-everett-street-2011'], chips: T('The idea: the person'), zoom: 5 },
    { eventId: 'do-not-track-header-prototype-soghoian-stamm-2009', headline: 'The browser says "do not track"',
      media: ['christopher-soghoian-30c3-hamburg-2013'], chips: T('The person\'s signal — optional to honour'), zoom: 5 },
    { eventId: 'searls-intention-economy-book-hbr-press-2012', headline: 'Customers who dictate their own terms',
      media: ['doc-searls-2020'], chips: T('The idea: the person'), zoom: 5 },
    // Surveillance & Reckoning
    { eventId: 'guardian-verizon-order-prism-revealed-2013', headline: 'The walls turn out to be inside the network',
      media: ['edward-snowden-hong-kong-2013', 'nsa-utah-data-center-eff-2014'], chips: T('Nobody the person could see'), zoom: 5 },
    { eventId: 'cjeu-schrems-i-safe-harbour-invalid-2015', headline: 'One student topples a transatlantic deal',
      media: ['max-schrems-big-brother-awards-2015', 'cjeu-kirchberg-luxembourg-2006'], chips: T('The court, at a person\'s request'), zoom: 5 },
    { eventId: 'gdpr-adopted-regulation-2016-679-2016', headline: 'A right to object "by automated means"',
      media: ['european-parliament-hemicycle-strasbourg-2014'], chips: T('The statute — with room for the person\'s software'), zoom: 5 },
    { eventId: 'ieee-p7012-par-approved-2017', headline: 'A standard for terms the person proffers',
      chips: T('A standard, drafted for the person'), zoom: 5 },
    { eventId: 'cambridge-analytica-revealed-2018', headline: 'Friends who agreed to nothing',
      media: ['christopher-wylie-parliament-square-2018', 'carole-cadwalladr-2019'], chips: T('The platform'), zoom: 5 },
    { eventId: 'global-privacy-control-launched-2020', headline: 'A signal the law will enforce',
      media: ['ashkan-soltani-2012'], chips: T('The person\'s signal — with a statute behind it'), zoom: 5 },
    { eventId: 'sephora-ccpa-settlement-global-privacy-control-2022', headline: 'Ignoring the signal costs $1.2 million',
      chips: T('The regulator enforces the person\'s signal'), zoom: 5 },
    { eventId: 'chatgpt-research-preview-2022', headline: 'Everyone gets an assistant',
      chips: T('The provider'), zoom: 5 },
    // Agents & Terms
    { eventId: 'garante-limits-chatgpt-2023', headline: 'A regulator stops a chatbot',
      chips: T('The regulator'), zoom: 5 },
    { eventId: 'eu-parliament-adopts-ai-act-2024', headline: 'Europe writes rules for AI',
      media: ['eko-ai-act-open-letter-strasbourg-2023'], chips: T('The statute'), zoom: 5 },
    { eventId: 'anthropic-computer-use-2024', headline: 'Software that clicks like a person',
      media: ['generative-ai-agent-architecture-diagram'], chips: T('Whatever each site\'s banner says'), zoom: 5 },
    { eventId: 'openai-operator-2025', headline: 'An agent hands the keyboard back',
      chips: T('Whatever each site\'s banner says'), zoom: 5 },
    { eventId: 'ieee-sasb-approves-7012-2025', headline: 'IEEE 7012 is approved',
      chips: T('The person — under a standard'), zoom: 5 },
    { eventId: 'eu-digital-omnibus-article-88b-2025', headline: 'Brussels proposes honouring machine-readable choices',
      chips: T('The person\'s signal — proposed in law'), zoom: 5 },
    { eventId: 'ieee-7012-published-xplore-2026', headline: 'IEEE 7012 is published: the person as first party',
      media: ['doc-searls-headshot-2022'], chips: T('The person — first party'), zoom: 5 },
    { eventId: 'myterms-public-launch-london-2026', headline: 'MyTerms launches, pitched at agents',
      chips: T('The person — first party'), zoom: 5 },
    { eventId: 'council-drops-article-88b-coalition-letter-2026', headline: 'The fight over the signal',
      chips: T('Still being decided'), zoom: 5 },
  ];

  /* ── THE OPENING ESSAY ────────────────────────────────────────────
     Each sentence is tied to the research facts (research/essay.json) or
     events that support it; {n} markers become numbered notes. */
  const factSources = id => {
    try { return src(H.item('essay', 'facts', id).sources); } catch (e) { /* not a fact */ }
    try { return src(H.item('essay', 'quotes', id).sources); } catch (e) { /* not a quote */ }
    return ev(id);
  };
  function para(heading, parts) {
    const source = []; let text = '';
    for (const [t, ids] of parts) {
      const nums = [];
      for (const id of [].concat(ids || [])) for (const s of factSources(id)) { source.push(s); nums.push(source.length); }
      text += t + (nums.length ? `{${nums.join(',')}}` : '') + ' ';
    }
    return { heading, text: text.trim(), source };
  }
  const essay = {
    title: 'A Short History of an Idea',
    dek: 'Privacy is older than the word for it, and the word has meant different things in different places. The small numbers are notes: each sentence is backed by the source beside it.',
    paragraphs: [
      para('A word that meant “deprived”', [
        ['The English word “private” comes from the Latin privatus — set apart from what is public, belonging to oneself rather than to the state — which is itself formed from privare, to deprive or strip. The root carries both meanings at once: one’s own, and deprived of.', 'latin-privatus-privare'],
        ['The noun “privacy” is recorded in English from the 1590s, first for a private matter or a secret; its sense of freedom from intrusion is dated only to 1814.', 'privacy-enters-english-1590s'],
        ['Greek thought drew the first map, dividing the household (oikos) from the political community (polis), and what is one’s own (idion) from what is common (koinon).', 'greek-oikos-polis-idion-koinon'],
        ['For the ancient Greeks, Hannah Arendt argued, a life lived only in private was “privative” — deprived of the public realm — while for moderns privacy’s most relevant function is to shelter the intimate.', 'arendt-privative-to-intimate'],
      ]),
      para('Every culture draws the line somewhere', [
        ['Alan Westin, drawing on studies of animal territoriality, argued that the human need for privacy is probably rooted in our animal origins.', 'westin-animal-origins'],
        ['The psychologist Irwin Altman concluded in 1977, from ethnographic evidence, that privacy is a universal process regulated by culturally specific means — secret forest paths among some Brazilian peoples, soft speech in Java, the Tuareg face veil — a boundary people open as well as close.', 'altman-1977-universal-process'],
        ['The sociologist Barrington Moore called it “a socially created need”.', 'moore-1984-socially-created-need'],
        ['The oldest rules are about relationships and homes: the Hippocratic Oath binds the physician to keep secret what he sees and hears in patients’ lives;', 'hippocratic-oath-confidentiality'],
        ['the Mishnah forbids opening a window onto a courtyard shared with neighbours;', 'mishnah-windows-courtyard'],
        ['and the Qur’an tells believers not to enter others’ houses until welcomed, and not to spy — in Arabic-Islamic usage, the idea closest to privacy is often hurma, what may not be looked at without permission.', 'arabic-islamic-hurma-and-quran'],
      ]),
      para('Walls, rooms and seals', [
        ['In 1604 English law declared that “the house of every one is to him as his Castle and Fortress”, for defence and “for his repose”.', 'coke-semayne-castle-1604'],
        ['Yet for most people the pre-modern home offered little seclusion: until the seventeenth century many homes were one multipurpose space, and even after houses were divided into rooms, people walked through each other’s.', 'rooms-and-the-private-home'],
        ['Before mass-produced envelopes spread in the 1830s, most letters were “letterlocked” — folded and sealed into their own envelopes, often with tamper-evident locks;', 'letterlocking-and-the-brienne-trunk'],
        ['in colonial America, where seals were weak and clerks were suspected of reading the mail, Benjamin Franklin made postal employees swear not to open letters, which leads Daniel Solove to conclude that privacy is “not just found but constructed”.', 'privacy-of-letters-constructed'],
        ['In 1878 the US Supreme Court carried the protection of the home to the sealed page: letters in the mail are protected “as if they were retained by the parties forwarding them in their own domiciles”.', 'ex-parte-jackson-sealed-letters'],
        ['French pictures private life as walled — Littré’s dictionary illustrates vie privée with the maxim “private life must be walled in”.', 'french-vie-privee-walled'],
      ]),
      para('From the wall to the right', [
        ['In December 1890 two Boston lawyers, Samuel Warren and Louis Brandeis, argued that “instantaneous photographs and newspaper enterprise” had invaded “the sacred precincts of private and domestic life”, and that the law should protect what Judge Thomas Cooley had called the right “to be let alone”.', 'warren-brandeis-1890-right-to-privacy'],
        ['In 1928, dissenting in a wiretapping case, Brandeis called that right “the most comprehensive of rights and the right most valued by civilized men”.', 'brandeis-olmstead-1928'],
        ['After the Second World War privacy became a human right: “No one shall be subjected to arbitrary interference with his privacy, family, home or correspondence”, the Universal Declaration proclaimed in 1948,', 'udhr-article-12-1948'],
        ['and the European Convention of 1950 and the UN Covenant of 1966 followed.', 'echr-1950-and-iccpr-1966'],
        ['Today 171 of 188 national constitutions in force are coded as providing a right to privacy; where the text is silent, as in the United States, India, France and Japan, courts have found it.', ['constitutions-with-privacy-171-of-188', 'griswold-1965-penumbras', 'puttaswamy-2017-nine-judges']],
        ['Words travelled with the law. Japanese adopted the loanword puraibashii, which — according to Masao Horibe, later chairman of Japan’s data-protection commission — spread after a Tokyo court first recognised a right to privacy in 1964;', 'japan-puraibashii-1964'],
        ['the Chinese yinsi (隐私) — “hide” and “private” — long carried the sense of a shameful secret, until China’s Civil Code of 2020 defined it as the tranquillity of private life and the space, activities and information a person does not wish others to know.', ['chinese-yinsi-shameful-secret', 'china-civil-code-1032-defines-privacy']],
      ]),
      para('From the house to the record', [
        ['In 1967 Alan Westin moved privacy from the house to the data: it is “the claim of individuals, groups, or institutions to determine for themselves when, how, and to what extent information about them is communicated to others”.', 'westin-1967-definition'],
        ['By 1971 the threat had a name — Arthur Miller’s The Assault on Privacy: Computers, Data Banks, and Dossiers.', 'miller-1971-assault-on-privacy'],
        ['In 1983 Germany’s constitutional court gave it a right: informational self-determination, the individual’s authority, in principle, to decide on the disclosure and use of their personal data.', 'german-privatsphaere-and-informational-self-determination'],
        ['The UN Human Rights Committee read the Covenant the same way in 1988: data banks must be regulated by law, and every individual should be able to learn whether data about them is stored, and why.', 'gc16-1988-data-banks'],
        ['Programmers answered in code. Phil Zimmermann released PGP in 1991, warning that “if privacy is outlawed, only outlaws will have privacy”;', 'zimmermann-1991-pgp'],
        ['Eric Hughes’s cypherpunk manifesto of 1993 separated privacy from secrecy — “the power to selectively reveal oneself to the world”.', 'hughes-1993-privacy-not-secrecy'],
        ['Business had its own view: “You have zero privacy anyway. Get over it,” Sun Microsystems’ chief executive told reporters in 1999;', 'mcnealy-1999-zero-privacy'],
        ['in 2015 Shoshana Zuboff set out a theory of “surveillance capitalism”, a logic of accumulation whose mechanisms “exile persons from their own behavior”.', 'zuboff-2015-surveillance-capitalism'],
      ]),
      para('A concept in dispute', [
        ['Philosophers have never agreed on a definition. Judith Jarvis Thomson thought the right to privacy a cluster of other rights;', 'thomson-1975-reductionism'],
        ['Ruth Gavison defined privacy as limited access to a person — secrecy, anonymity and solitude;', 'gavison-1980-limited-access'],
        ['Daniel Solove argued there is no single common core, only “family resemblances”;', 'solove-2002-no-single-definition'],
        ['Helen Nissenbaum proposed that privacy is violated when information flows break the norms of the context in which it was shared;', 'nissenbaum-2004-contextual-integrity'],
        ['and Julie Cohen that privacy is the breathing room in which a self develops, shielding “dynamic, emergent subjectivity” from efforts to make people fixed, transparent and predictable.', 'cohen-2013-emergent-subjectivity'],
      ]),
      para('Consent, its critics — and terms the person writes', [
        ['What the law settled on, online, was consent. Solove named the model “privacy self-management” — notice, access and consent, little changed since the 1970s — and argued that it does not give people meaningful control, because there are too many data collectors to manage one by one.', 'solove-2013-privacy-self-management'],
        ['Nissenbaum called its flaw the “transparency paradox”: detailed notices go unread, simple ones leave out what matters.', 'nissenbaum-2011-transparency-paradox'],
        ['Reading the privacy policies of the sites one American visits would take about 201 hours a year, researchers at Carnegie Mellon estimated in 2008.', 'mcdonald-cranor-2008-201-hours'],
        ['Doc Searls argued that privacy online cannot be “a grace of privacy policies”; individuals should proffer terms “as first parties”, which sites agree to, with both keeping records.', 'searls-2019-proffer-as-first-parties'],
        ['That is what IEEE 7012-2025 standardises. It was approved on 4 November 2025 and published on 20 January 2026 —', 'ieee-7012-2025-published'],
        ['just as software agents began to browse, fill in forms and buy for people, each errand meeting someone else’s terms.', ['openai-operator-2025', 'agentic-commerce-protocol-instant-checkout-2025']],
      ]),
    ],
  };

  /* ── WHAT PRIVACY MEANS: concept cards ──────────────────────────── */
  const CONCEPT_STYLE = {
    'confidentiality-hippocratic-oath-c400bce':      { color: 'walls', media: 'hippocratic-oath-byzantine-cross-manuscript' },
    'home-as-castle-semaynes-case-1604':             { color: 'castle', media: 'edward-coke-engraving-van-de-passe' },
    'right-to-be-let-alone-warren-brandeis-1890':    { color: 'letalone', media: 'right-to-privacy-harvard-law-review-1890' },
    'decisional-privacy-griswold-1965':              { color: 'rights' },
    'control-over-information-westin-1967':          { color: 'rights', media: 'univac-i-census-bureau-dedication-1951' },
    'informational-self-determination-bverfg-1983': { color: 'dataprotection', media: 'census-boycott-demo-freiburg-1987' },
    'contextual-integrity-nissenbaum-2004':          { color: 'cookies', media: 'helen-nissenbaum-berkeley-lecture-2008' },
    'taxonomy-of-privacy-solove-2006':               { color: 'cookies' },
    'person-as-first-party-vrm-2006':                { color: 'agents', media: 'vrm-day-crowd-2015' },
  };
  const concepts = H.list('concepts', 'concepts')
    .slice().sort((a, b) => a.year - b.year)
    .map(c => ({
      id: c.id, name: c.name, originator: c.originator, year: c.displayDate || String(c.year),
      definition: c.definition, note: c.plainSummary,
      color: (CONCEPT_STYLE[c.id] || {}).color || 'v5', media: (CONCEPT_STYLE[c.id] || {}).media,
      source: src(c.sources),
    }));

  /* ── WHO WRITES THE TERMS: the four voices ─────────────────────── */
  const lineageRec = id => H.item('myterms', 'lineage', id);
  const firstParty = id => H.item('myterms', 'firstParty', id);
  const flip = {
    steps: [
      { icon: 'policy', kicker: 'Voice 1 · The organisation writes', title: 'Their policy, your click',
        body: 'The organisation publishes a privacy policy or a cookie banner; the person is deemed to agree by using the service or clicking “I agree”. The dominant model — notice and consent — has changed little since the 1970s.',
        examples: 'Privacy policies · cookie banners · terms of service',
        source: [...factSources('solove-2013-privacy-self-management').slice(0, 1), ...qs('pew-2023-click-agree-without-reading')] },
      { icon: 'signal', kicker: 'Voice 2 · The person\'s software signals', title: 'A preference, not an agreement',
        body: 'The person\'s browser sends a one-line request — Do Not Track, Global Privacy Control. Whether anyone must honour it depends on the law where they are. Nothing is agreed and nobody keeps a record.',
        examples: 'Do Not Track (2009–2019) · Global Privacy Control (2020–)',
        source: [...src(lineageRec('do-not-track-2009').sources).slice(0, 1), ...src(lineageRec('global-privacy-control-2020').sources).slice(0, 1)] },
      { icon: 'framework', kicker: 'Voice 3 · An industry framework speaks', title: 'A consent string',
        body: 'The advertising industry\'s Transparency & Consent Framework turns a banner choice into a coded “TC string” passed between companies. The EU Court of Justice held in 2024 that the string is personal data.',
        examples: 'IAB Europe TCF (2018–)',
        source: src(lineageRec('iab-europe-tcf-2018').sources).slice(0, 2) },
      { icon: 'agreement', kicker: 'Voice 4 · The person proffers', title: 'Your terms; both keep the record',
        body: 'Under IEEE 7012 the person — or their agent — points to one of a small roster of standard agreements; the organisation accepts one, both sign, and each keeps a matching record.',
        examples: 'IEEE 7012-2025 · MyTerms (2026–)',
        source: src(H.obj('myterms', 'standard').sources).filter(s => s.verificationStatus === 'CONFIRMED').slice(0, 2) },
    ],
    foot: 'In the first three, the person answers choices someone else designed — in the MyTerms FAQ\'s words, "persons are second parties, not first parties". In the fourth, the person is the first party.',
    footSource: src(firstParty('faq-second-parties').sources),
  };

  /* ── PRINCIPLES, SIDE BY SIDE ──────────────────────────────────── */
  const fippsRows = H.list('dataprotection', 'fipps');
  const fippsCol = (framework, sub, color, trim) => {
    const rows = fippsRows.filter(r => r.framework === framework).sort((a, b) => a.order - b.order);
    if (!rows.length) throw new Error(`no fipps rows for ${framework}`);
    return {
      framework: rows[0].framework.replace(/ \(.*\)$/, ''), sub, color,
      principles: rows.map(r => ({ name: r.name.replace(/^Art\. [0-9a-z()]+ /, ''), text: trim ? r.text.replace(/^\d+\.\s*/, '') : r.text })),
      source: src(rows.map(r => r.source)),
    };
  };
  const fipps = [
    fippsCol('HEW Code of Fair Information Practice (Records, Computers and the Rights of Citizens)', 'United States · 1973 · five principles', 'dataprotection', false),
    fippsCol('OECD Guidelines on the Protection of Privacy and Transborder Flows of Personal Data', 'OECD · 1980 · eight principles', 'rights', true),
    fippsCol('Council of Europe Convention 108 (ETS No. 108)', 'Council of Europe · 1981 · a binding treaty', 'castle', false),
  ];

  /* ── AROUND THE WORLD ──────────────────────────────────────────── */
  const worldLaws = H.list('global', 'laws')
    .filter(l => typeof l.lat === 'number' && typeof l.yearEnacted === 'number')
    .map(l => ({
      id: l.id, country: l.country, law: l.law, year: l.yearEnacted,
      inForce: typeof l.inForce === 'number' ? l.inForce : undefined,
      regulator: l.regulator || undefined, region: l.region, lat: l.lat, lng: l.lng,
      note: l.note || undefined, source: src(l.sources),
    }));
  const firstSentence = t => { const m = /^(.+?[.;])(\s|$)/.exec(String(t || '')); return m ? m[1] : String(t || ''); };
  const FORCE = { 'binding treaty': 'Binding treaty', regulation: 'EU law', guidelines: 'Guidelines', 'voluntary framework': 'Voluntary framework' };
  const frameworks = H.list('global', 'frameworks').slice().sort((a, b) => a.year - b.year).map(f => ({
    name: f.name, body: f.body, year: f.year, force: FORCE[f.bindingness] || f.bindingness,
    reach: [typeof f.parties === 'string' ? f.parties : '', firstSentence(f.note)].filter(Boolean).join(' '),
    source: src(f.sources),
  }));
  const MODEL_COLOR = { 'eu-omnibus-rights-based': 'rights', 'us-sectoral-notice-and-choice': 'cookies', 'apec-accountability-certification': 'dataprotection',
    'state-security-data-sovereignty': 'surveillance', 'constitutional-habeas-data': 'castle', 'african-regional-harmonisation': 'walls' };
  const policyModels = H.list('global', 'policyModels').map(m => ({
    name: m.name, description: m.description, color: MODEL_COLOR[m.id] || 'v5',
    exemplars: Array.isArray(m.exemplars) ? m.exemplars.join(', ') : m.exemplars,
    source: src(m.sources),
  }));

  /* ── FIGURE CARDS ──────────────────────────────────────────────── */
  const fig = (id, value, label, color, note) => ({ value, label, note, color, source: qs(id) });
  const figures = {
    consent: [
      fig('cost-of-reading-privacy-policies-hours-per-user-2008', '201 hours', 'a year to read the privacy policies of the sites one American visits', 'v9', 'McDonald & Cranor, Carnegie Mellon, 2008 — about $781 billion a year in time, nationally.'),
      fig('obar-oeldorf-hirsch-skipped-privacy-policy', '74%', 'skipped the privacy policy entirely, using a "quick join" button', 'v8', 'Obar & Oeldorf-Hirsch, experiment with a fictitious social network.'),
      fig('obar-oeldorf-hirsch-mean-privacy-policy-reading-time', '73 seconds', 'spent on the privacy policy by those who opened it', 'v7'),
      fig('obar-oeldorf-hirsch-missed-gotcha-clauses', '98%', 'missed the "gotcha" clauses — including one handing over their first-born child', 'v9'),
      fig('pew-2023-click-agree-without-reading', '56%', 'of Americans frequently click "agree" without reading the privacy policy', 'v7', 'Pew Research Center, 2023.'),
      fig('nouwens-cmp-sites-meeting-minimal-legal-requirements', '11.8%', 'of consent pop-ups met minimal requirements of European law', 'v8', 'Nouwens et al., top 10,000 UK sites, 2019.'),
      fig('ftc-1998-sites-with-privacy-policy-notice-pct', '2%', 'of data-collecting US commercial websites posted a comprehensive privacy policy in 1998', 'v4', 'FTC, Privacy Online: A Report to Congress.'),
    ],
    surveillance: [
      fig('iccl-rtb-broadcasts-per-person-per-day-us', '747', 'real-time-bidding broadcasts about the average American\'s online activity and location, every day', 'v9', 'Europe: 376 a day (Irish Council for Civil Liberties, 2022).'),
      fig('iccl-rtb-broadcasts-per-year-us-europe', '178 trillion', 'such broadcasts a year across the US and Europe', 'v9'),
      fig('englehardt-narayanan-third-parties-on-top-million-sites', '81,000+', 'third parties found on at least two of the top million websites', 'v8', 'Englehardt & Narayanan, Princeton, 2016.'),
      fig('ftc-2014-data-segments-per-consumer', '3,000', 'data segments one data broker held on nearly every US consumer', 'v8', 'FTC, Data Brokers, 2014.'),
      fig('california-registered-data-brokers-2026', '603', 'data brokers in California\'s 2026 registry', 'v7'),
      fig('quant-equifax-people-affected-2017', '147 million', 'people affected by the 2017 Equifax breach', 'v9'),
      fig('quant-dpc-meta-transfer-fine-2023', '€1.2 billion', 'the largest GDPR fine: Meta, for transfers to the US (Ireland, 2023)', 'v6'),
    ],
  };

  /* ── CHARTS ────────────────────────────────────────────────────── */
  const charts = [
    { canvas: 'chart-sandbox-laws', datasets: [{ series: 'countries-with-data-privacy-laws', color: 'dataprotection', type: 'line' }],
      options: { type: 'line', yearLine: true, yTitle: 'Countries', sourceEl: 'chart-sandbox-laws-source', sourcePrefix: 'Dashed line: the slider year. Sources: ' } },
    { canvas: 'chart-laws',
      desc: 'Graham Greenleaf\'s global count of countries with a national data-privacy law — one covering most of the private sector and meeting minimum international standards — from Sweden\'s first national law in 1973 to 172 in 2025. New laws have averaged 5.4 a year since 2020.',
      datasets: [
        { series: 'countries-with-data-privacy-laws', label: 'Countries with a law (cumulative)', color: 'dataprotection', type: 'line' },
        { series: 'greenleaf-new-countries-per-decade', label: 'New countries in the decade to this year', color: 'rights', type: 'bar' },
      ],
      options: { type: 'line', yTitle: 'Countries', sourceEl: 'chart-laws-source', legend: true } },
    { canvas: 'chart-consent-a', title: 'Privacy Policies Got Longer',
      desc: 'Median length of a website privacy policy, reconstructed from more than a million policies in the Internet Archive (Amos et al., 2021): 876 words in early 2009, 1,522 in late 2019. Their median reading level rose from grade 11.9 in 2000 to 13.2 — college level — in 2019.',
      datasets: [{ series: 'privacy-policy-median-length-words', label: 'Median words', color: 'cookies', type: 'bar' }],
      options: { type: 'bar', yTitle: 'Words (median)', sourceEl: 'chart-consent-a-source' } },
    { canvas: 'chart-consent-b', title: 'What Americans Say, 2019 and 2023',
      desc: 'The same questions, asked by Pew Research Center four years apart. Confusion rose: more Americans now say they understand little or nothing about what companies do with their data, and about the laws meant to protect it.',
      datasets: [
        { series: 'pew-little-or-no-control-over-company-data', label: 'Little or no control over company data', color: 'v9', type: 'bar' },
        { series: 'pew-understand-little-or-nothing-company-data-use', label: 'Understand little or nothing of company data use', color: 'v7', type: 'bar' },
        { series: 'pew-concerned-company-data-use', label: 'Concerned about company data use', color: 'v8', type: 'bar' },
        { series: 'pew-understand-little-privacy-laws', label: 'Understand little or nothing of privacy laws', color: 'v4', type: 'bar' },
      ],
      options: { type: 'bar', yTitle: '% of US adults', sourceEl: 'chart-consent-b-source', legend: true } },
    { canvas: 'chart-surv-a', title: 'GDPR Fines, Cumulative',
      desc: 'Fines under the GDPR since it applied on 25 May 2018, as counted by DLA Piper each January (EUR billion). Points for 2022–2024 are built from DLA Piper\'s stated annual totals.',
      datasets: [{ series: 'gdpr-fines-cumulative-eur', label: 'Cumulative fines (EUR bn)', color: 'surveillance', type: 'bar' }],
      options: { type: 'bar', yTitle: 'EUR billion', sourceEl: 'chart-surv-a-source' } },
    { canvas: 'chart-surv-b', title: 'GDPR Fines per Survey Year',
      desc: 'Fines issued in each DLA Piper survey year (late January to late January). The 2023 peak includes the record €1.2 billion fine on Meta.',
      datasets: [{ series: 'gdpr-fines-annual-eur', label: 'Fines in the year (EUR bn)', color: 'v8', type: 'bar' }],
      options: { type: 'bar', yTitle: 'EUR billion', sourceEl: 'chart-surv-b-source' } },
    { canvas: 'chart-states',
      desc: 'Cumulative number of US states with a comprehensive consumer privacy law, by the year it was signed (IAPP definition). California was alone until 2021; by September 2026 there were 23. There is still no comprehensive federal consumer privacy law.',
      datasets: [{ series: 'us-state-comprehensive-privacy-laws', label: 'States (cumulative)', color: 'surveillance', type: 'bar' }],
      options: { type: 'bar', yTitle: 'States', sourceEl: 'chart-states-source' } },
  ];
  const series = {};
  for (const id of ['countries-with-data-privacy-laws', 'greenleaf-new-countries-per-decade', 'privacy-policy-median-length-words',
    'pew-little-or-no-control-over-company-data', 'pew-understand-little-or-nothing-company-data-use', 'pew-concerned-company-data-use',
    'pew-understand-little-privacy-laws', 'gdpr-fines-cumulative-eur', 'gdpr-fines-annual-eur', 'us-state-comprehensive-privacy-laws']) {
    series[id] = { from: id };
  }

  /* ── MACHINE-READABLE PRIVACY: the lineage ─────────────────────── */
  const WHO = { organisation: 'organisation', person: 'person', "person's software, as a signal": 'signal', 'industry framework': 'industry' };
  const WHO_LABEL = { organisation: 'The organisation', person: 'The person', signal: 'The person\'s software (a signal)', industry: 'An industry framework' };
  const lineage = H.list('myterms', 'lineage').slice().sort((a, b) => a.year - b.year).map(l => {
    const who = WHO[l.whoProffers] || 'organisation';
    return {
      name: l.name, years: String(l.year), body: l.body, whoProffers: who, whoLabel: WHO_LABEL[who],
      machineReadable: !!l.machineReadable, legalForce: l.legalForce,
      recordKeptBy: l.recordKeptBy.charAt(0).toUpperCase() + l.recordKeptBy.slice(1),
      fate: l.fate, destination: l.id === 'ieee-7012-2025', source: src(l.sources),
    };
  });
  const lineageNote = 'Rows are ordered by year. "Who proffers the terms" asks whose text the agreement or signal is: the organisation\'s policy, the person\'s browser signal, an industry framework, or the person\'s own terms. Each row cites its specification or the body that published it.';

  /* ── HARMS ─────────────────────────────────────────────────────── */
  const HARM_FIGURE = {
    'dutch-jewish-registration-1941': '159,806', 'us-census-japanese-americans-1942': '112,000', 'stasi-files-1950-1989': '189,000',
    'cointelpro-1956-1971': '2,370', 'bork-video-rental-list-1987': '146', 'aol-search-data-release-2006': '20 million',
    'equifax-breach-2017': '147 million', 'cambridge-analytica-facebook-2014': '50–65 million', 'grindr-adtech-sharing-2020': 'NOK 65 million',
    'clearview-ai-faceprints-2020': '3 billion+', 'kochava-location-data-2022': '61 million+', '23andme-breach-2023': '5.5 million',
    'dutch-childcare-benefits-algorithm-2021': 'Tens of thousands',
  };
  const harms = H.list('concepts', 'harms').slice().sort((a, b) => a.year - b.year).map(h => ({
    place: h.place.split(/[,(]/)[0].trim(), years: h.displayDate, what: h.what,
    figure: HARM_FIGURE[h.id] || '—', figureLabel: h.scale, consequence: h.consequence, source: src(h.sources),
  }));

  /* ── IEEE 7012 ─────────────────────────────────────────────────── */
  const st = H.obj('myterms', 'standard');
  const stSources = src(st.sources).filter(s => s.verificationStatus === 'CONFIRMED');
  /* SD-BASE's description is held to what its sources say (ProjectVRM:
     'only what the visitor came for, and not to share personal data with
     third parties'); the others use the research summary. */
  const AGREEMENT_BODY = {
    'SD-BASE': 'The default, "Service Delivery only": the site or service provides only what the visitor came for and does not share their personal data with third parties. It is the agreement a person\'s agent proposes first.',
  };
  const agreements = H.list('myterms', 'agreements').map(a => ({
    code: a.code, name: a.name, type: a.type === 'Relationship' ? 'Relationship agreement' : 'Personal data contribution',
    body: AGREEMENT_BODY[a.code] || a.plainSummary, source: src(a.sources),
  }));
  const mech = id => H.item('myterms', 'mechanics', id);
  const standard = {
    designation: 'IEEE 7012-2025 · “MyTerms”',
    title: st.title,
    purpose: st.purpose,
    scope: st.abstract,
    facts: [
      ['Project', 'P7012 — authorised 6 December 2017'],
      ['Sponsor', 'IEEE Social Implications of Technology Standards Committee'],
      ['Chair', 'Doc Searls (after David P. Reed and Lisa LeVasseur)'],
      ['Approved', '4 November 2025, IEEE SA Standards Board — hence “-2025”'],
      ['Published', '20 January 2026 · IEEE Xplore 11360682'],
      ['DOI', '10.1109/IEEESTD.2025.11360682'],
      ['Access', 'Free PDF through the IEEE GET Program (free IEEE account)'],
      ['Roster', 'Standard agreements kept by a neutral nonprofit, Customer Commons'],
      ['Launched', '28 January 2026 (Data Privacy Day), London and online'],
    ],
    quote: { text: H.tidy(firstParty('faq-full-agency').quote), cite: 'MyTerms FAQ, “Why must I be the first party?”', source: src(firstParty('faq-full-agency').sources) },
    principles: H.list('myterms', 'principles').map(p => ({ name: p.name, text: p.quote.replace(/\s*\(The Principle of [^)]*\)\s*$/i, '') })),
    principlesSource: src(H.list('myterms', 'principles')[0].sources),
    agreements,
    agreementsDesc: 'Two relationship agreements for an ongoing service, three for one-off contributions of data. Each is published in plain language, in machine-readable form and as a legal text, and links its key terms to the W3C Data Privacy Vocabulary.',
    coda: 'MyTerms launched with these five in a market-feedback phase of up to six months, with more in the pipeline. The standard leaves the record format, its storage and the wire protocol open — so interoperability will be decided by implementations, not the text. The launch agreements\' full legal and machine-readable texts were not yet published on the pages this study could read.',
    codaSource: src([...mech('launch-mode').sources, ...mech('records-both-sides').sources]),
    source: stSources,
  };

  /* ── THE AGE OF AGENTS ─────────────────────────────────────────── */
  const argument = H.list('agents', 'argument').map(a => ({ claim: a.claim, explanation: a.explanation, source: src(a.evidence) }));
  const scenario = H.list('agents', 'agentScenario').slice().sort((a, b) => a.step - b.step).map(s => ({
    actor: s.title,
    text: s.action.replace(/^ILLUSTRATIVE\.\s*/, ''),
    basis: s.supportInPublicMaterials,
    unspecified: /not specified in public materials/i.test(s.supportInPublicMaterials) && !/abstract|FAQ|IEEE 7012|MyTerms/i.test(s.supportInPublicMaterials),
    source: src(s.sources),
  }));
  const counterpoints = H.list('agents', 'counterpoints').map(c => ({ point: c.point, response: c.response, source: src(c.sources) }));

  /* ── JURISDICTIONS ─────────────────────────────────────────────── */
  const jurisdictions = H.list('concepts', 'jurisdictions').map(j => ({
    region: j.region, law: j.law,
    years: j.enacted === j.inForce ? String(j.enacted) : `enacted ${j.enacted} · in force ${j.inForce}`,
    regulator: j.regulator, maxPenalty: j.maxPenalty, automatedSignals: j.automatedSignals,
    signalNote: j.automatedSignalsProvision, aiRules: j.aiRules, source: src(j.sources),
  }));

  /* ── MYTHS ─────────────────────────────────────────────────────── */
  const MYTHS = [
    ['early', 'myth-1361-act-outlawed-peeping-toms-and-eavesdroppers', 'walls'],
    ['essay', 'myth-privacy-modern-western-invention', 'walls'],
    ['early', 'myth-pitt-poorest-man-cottage-quote-recorded-1763', 'castle'],
    ['early', 'myth-franklin-essential-liberty-quote-about-privacy', 'castle'],
    ['concepts', 'myth-warren-brandeis-coined-let-alone', 'letalone'],
    ['letalone', 'myth-warren-daughters-wedding', 'letalone'],
    ['letalone', 'myth-ibm-punch-cards-located-holocaust-victims', 'letalone'],
    ['concepts', 'myth-us-constitution-explicit-privacy-right', 'rights'],
    ['dataprotection', 'myth-sweden-first-data-protection-law', 'dataprotection'],
    ['dataprotection', 'myth-informational-self-determination-means-ownership', 'dataprotection'],
    ['dataprotection', 'myth-fipps-meant-notice-and-click-consent', 'dataprotection'],
    ['personas-code', 'diffie-hellman-first-to-discover-public-key-cryptography', 'dataprotection'],
    ['personas-code', 'zimmermann-was-prosecuted-for-exporting-pgp', 'dataprotection'],
    ['internet', 'myth-cookies-were-invented-to-track-people', 'cookies'],
    ['internet', 'myth-p3p-let-people-set-their-own-privacy-terms', 'cookies'],
    ['internet', 'myth-do-not-track-was-a-law', 'cookies'],
    ['internet', 'myth-mcnealy-said-privacy-is-dead-get-over-it', 'cookies'],
    ['internet', 'myth-removing-names-makes-data-anonymous', 'cookies'],
    ['personas-code', 'tor-built-by-nsa-as-spy-tool', 'cookies'],
    ['surveillance', 'myth-gdpr-requires-cookie-banners', 'surveillance'],
    ['surveillance', 'myth-cambridge-analytica-hacked-facebook', 'surveillance'],
    ['surveillance', 'myth-google-killed-third-party-cookies', 'surveillance'],
    ['global', 'most-of-the-world-has-no-privacy-law', 'surveillance'],
    ['numbers', 'myth-people-dont-care-about-privacy', 'surveillance'],
    ['agents', 'myth-cookie-consent-covers-ai-agents', 'agents'],
    ['agents', 'myth-robots-txt-protects-personal-data', 'agents'],
    ['agents', 'myth-telling-ai-to-respect-privacy-is-enough', 'agents'],
    ['myterms', 'myth-myterms-is-browser-setting', 'agents'],
    ['myterms', 'myth-7012-is-a-law', 'agents'],
    ['myterms', 'myth-individuals-write-custom-terms', 'agents'],
    ['myterms', 'myth-published-january-2025', 'agents'],
  ];
  const myths = MYTHS.map(([slice, id, era]) => {
    const m = H.item(slice, 'myths', id);
    return { claim: m.claim, verdict: m.verdict, correction: m.correction, era, source: src(m.sources) };
  });

  /* ── THE PEOPLE ────────────────────────────────────────────────── */
  const peopleGroups = [
    { key: 'code', label: 'Cryptographers & code', color: 'dataprotection' },
    { key: 'advocates', label: 'Hackers, advocates & disclosure', color: 'surveillance' },
    { key: 'researchers', label: 'Researchers & identity', color: 'agents' },
  ];
  const PEOPLE_FROM = [['personas-researchers', 'researchers'], ['personas-code', 'code'], ['personas-advocates', 'advocates']];
  const startYear = p => { const m = /(\d{4})/.exec(String(p.years || '')); return m ? +m[1] : 9999; };
  const pSeen = new Set(), people = [];
  for (const [slice, group] of PEOPLE_FROM) {
    for (const p of H.list(slice, 'people')) {
      if (pSeen.has(p.id)) continue;
      pSeen.add(p.id);
      const kw = p.keyWork && typeof p.keyWork === 'object' ? { title: p.keyWork.title, year: p.keyWork.year, url: p.keyWork.url } : undefined;
      people.push({
        id: p.id, name: p.name, handle: p.handle || undefined, roles: p.roles, years: p.years, place: p.place, group,
        keyWork: kw, contribution: p.contribution, influence: p.influence, thread: p.thread || undefined,
        quote: p.quote || undefined, quoteSource: p.quote ? src(p.quoteSource)[0] : undefined,
        portrait: p.portrait || undefined, source: src(p.sources),
      });
    }
  }
  people.sort((a, b) => startYear(a) - startYear(b) || a.name.localeCompare(b.name));

  /* ── PULL QUOTES ───────────────────────────────────────────────── */
  const eq = id => H.item('essay', 'quotes', id);
  const pq = (id, cite) => ({ text: H.tidy(eq(id).quote), cite, source: src(eq(id).sources) });
  const pullQuotes = {
    laws: { text: 'Although there is nothing inherently unfair in trading some measure of privacy for a benefit, both parties to the exchange should participate in setting the terms.',
      cite: 'US Department of Health, Education and Welfare, Records, Computers and the Rights of Citizens, 1973',
      source: withQuote(ev('hew-records-computers-rights-citizens-1973'), 'both parties to the exchange') },
    world: pq('q-puttaswamy-2017-dignity', 'Supreme Court of India, Justice K.S. Puttaswamy v. Union of India, 2017'),
    consent: pq('q-solove-2013-no-meaningful-control', 'Daniel J. Solove, “Privacy Self-Management and the Consent Dilemma”, Harvard Law Review, 2013'),
    people: pq('q-hughes-1993-selectively-reveal', 'Eric Hughes, “A Cypherpunk\'s Manifesto”, 9 March 1993'),
    surveillance: pq('q-zuboff-2015-exile', 'Shoshana Zuboff, “Big Other: surveillance capitalism and the prospects of an information civilization”, 2015'),
    harms: pq('q-bverfg-1983-who-knows-what', 'Federal Constitutional Court of Germany, census judgment, 15 December 1983'),
    agents: { text: H.tidy(firstParty('searls-only-way-flip').quote), cite: 'Doc Searls, ProjectVRM, January 2026', source: src(firstParty('searls-only-way-flip').sources) },
  };

  /* ── HERO AND FOOTER (CONFIRMED only) ──────────────────────────── */
  const heroStats = [
    { value: '1970', label: 'The first data protection law', sublabel: 'Hesse, West Germany', color: 'dataprotection',
      source: confirmed(ev('hesse-data-protection-act-1970')).slice(0, 1) },
    { value: '172', label: 'countries with a national data-privacy law', sublabel: 'Greenleaf count, 2025', color: 'v6',
      source: confirmed(qs('countries-with-data-privacy-laws-2025')).slice(0, 1) },
    { value: '201', label: 'hours a year to read the privacy policies', sublabel: 'of the sites one American visits (2008)', color: 'v9',
      source: confirmed(qs('cost-of-reading-privacy-policies-hours-per-user-2008')).slice(0, 1) },
    { value: '5', label: 'standard agreements a person can proffer', sublabel: 'IEEE 7012 / MyTerms, launched January 2026', color: 'agents',
      source: confirmed(qs('myterms-launch-agreements-2026')).slice(0, 1) },
  ];
  const footerStats = [
    { value: 'P3P · 2002', label: 'Machine-readable — the site\'s policy', sublabel: 'W3C Recommendation; obsolete 2018', color: 'cookies',
      source: confirmed(lineageRec('p3p-w3c-2002').sources).slice(0, 1) },
    { value: 'DNT · 2009', label: 'The person\'s signal — no legal force', sublabel: 'W3C work closed January 2019', color: 'rights',
      source: confirmed(lineageRec('do-not-track-2009').sources).slice(0, 1) },
    { value: 'GPC · 2020', label: 'A signal the law enforces', sublabel: 'Sephora paid $1.2 million, 2022', color: 'surveillance',
      source: confirmed(ev('sephora-ccpa-settlement-global-privacy-control-2022')).slice(0, 1) },
    { value: 'IEEE 7012 · 2026', label: 'The person proffers; both keep the record', sublabel: 'Published 20 January 2026', color: 'agents',
      source: confirmed(ev('ieee-7012-published-xplore-2026')).slice(0, 1) },
  ];

  /* ── MEDIA ─────────────────────────────────────────────────────── */
  const mediaOrder = [];

  return {
    meta, heroStats, footerStats, essay, concepts, flip, events, scrollSteps, series, charts,
    fipps, worldLaws, frameworks, policyModels, figures, lineage, lineageNote, harms, standard,
    argument, scenario, counterpoints, jurisdictions, myths, people, peopleGroups, pullQuotes, mediaOrder,
  };
}
