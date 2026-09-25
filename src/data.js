/* ------------------------------------------------------------------ */
/* Kolhar — demo dataset                                               */
/* Operator: a university small-satellite laboratory that has moved its */
/* program from Part 5 experimental authority to commercial Part 25     */
/* licensing. Six 12U-class imaging smallsats in 550 km SSO.            */
/* ------------------------------------------------------------------ */

export const OPERATOR = {
  name: 'Small Satellite Systems Laboratory',
  unit: 'Regulatory Affairs · Aerospace Engineering',
  constellation: 'AURORA-1',
  frn: '0034219876',
  admin: 'USA (FCC as notifying administration)',
  callSign: 'S3021',
  noaaLicense: 'NOAA-CRSRA-2026-018',
  fccFile: 'SAT-LOA-20251103-00142',
  plan: 'Constellation · 6 spacecraft',
  seats: 9,
}

/* the pilot's real tension: research authority → commercial authority */
export const AUTHORITY_TRANSITION = {
  from: 'Part 5 experimental (call sign WM2XKD)',
  to: 'Part 25 commercial NGSO (SAT-LOA-20251103-00142)',
  note: 'Commercial imaging revenue ended eligibility for experimental authority. Part 5 STA expires with the last research-only payload pass.',
  pct: 78,
}

export const EXTRACTED_FIELDS = [
  { field: 'Orbit', value: '550 km SSO', confidence: 98, source: 'Bus ICD · p.12 §3.1' },
  { field: 'Inclination', value: '97.59°', confidence: 99, source: 'Bus ICD · p.12 §3.1' },
  { field: 'Uplink', value: '13.85–14.0 GHz', confidence: 97, source: 'Frequency plan · p.4 T2' },
  { field: 'Downlink', value: '10.7–10.95 GHz', confidence: 98, source: 'Frequency plan · p.4 T2' },
  { field: 'TT&C uplink', value: '2025–2110 MHz', confidence: 99, source: 'Bus ICD · p.31 §6.2' },
  { field: 'EIRP', value: '42.3 dBW', confidence: 94, source: 'Link budget · Ku_UL!C14' },
  { field: 'Antenna gain', value: '34 dBi', confidence: 96, source: 'Link budget · Ku_UL!C9' },
  { field: 'GSD (nadir)', value: '0.82 m pan', confidence: 92, source: 'Bus ICD · p.58 §9.4' },
]

/* the three documents "use sample documents" loads into the wizard */
export const SAMPLE_FILES = [
  { name: 'aurora1_bus_icd_rev_c.pdf', size: 4404019, pages: 84 },
  { name: 'aurora1_frequency_plan_2026.docx', size: 1153434, pages: 22 },
  { name: 'ku_link_budget_v7.xlsx', size: 319488, pages: 6 },
]

/* what the extraction log prints between hits, per document */
export const SCAN_NOISE = [
  'Table of contents — 14 sections indexed',
  'Revision history — rev C supersedes rev B (Apr 2026)',
  'Mass budget table — skipped, not a filing parameter',
  'Power subsystem — solar array 96 W BOL',
  'Figure 3-2 — ground track, OCR 99.1%',
  'Thermal limits — skipped',
  'Ground segment appendix — 5 stations referenced',
  'Link margin summary — 4.6 dB clear-sky',
]

/* the rules engine, in the order it runs them */
export const VALIDATION_CHECKS = [
  { rule: '47 CFR §25.114(c)(4)', text: 'Orbital parameters complete and self-consistent', detail: 'a = 6928 km · e = 0.0011 · i = 97.59°' },
  { rule: '47 CFR §25.114(d)(1)', text: 'Frequency bands inside FSS allocation', detail: '13.85–14.0 GHz ⊂ 13.75–14.5 GHz (Earth-to-space)' },
  { rule: '47 CFR §25.204', text: 'Earth-station EIRP density limits', detail: '−1.8 dB margin to limit' },
  { rule: 'RR App. 4 · A.4.b', text: 'Non-GSO orbit description', detail: '6 SC · 3 planes · phasing 60°' },
  { rule: 'RR App. 4 · C.8', text: 'Maximum power density per carrier', detail: '−42.1 dBW/Hz' },
  { rule: 'RR Art. 22 · Table 22-1B', text: 'EPFD↓ against GSO protection mask', detail: 'worst case −178.4 dBW/m² · margin 3.1 dB' },
  { rule: '47 CFR §25.283', text: 'End-of-life disposal within 5 years', detail: '4.6 yr natural decay at 550 km' },
  { rule: '15 CFR 960.6', text: 'Remote-sensing tier consistent with GSD', detail: '0.82 m → Tier 2' },
  { rule: 'Cross-filing', text: 'Consistent with ITU API/A/12847 and SAT-LOA-00142', detail: '38 shared fields · 0 mismatches' },
]

/* interference model inputs per conflict — see interferenceModel() */
export const INTERFERENCE = {
  usasat: { dir: 'uplink', f: 13.96, eirp: 38, bwTheirs: 130, bwOurs: 150, slantKm: 1180, tsys: 700, gSat: 34, beam: 3.2, dish: 1.2, pass: 12, thetaMin: 0.35, rate: 1.3, eventsPerDay: 3.4 },
  lightspeed: { dir: 'uplink', f: 13.875, eirp: 36, bwTheirs: 150, bwOurs: 150, slantKm: 1180, tsys: 700, gSat: 34, beam: 3.2, dish: 1.2, pass: 12, thetaMin: 1.1, rate: 1.5, eventsPerDay: 2.1 },
  oneweb: { dir: 'downlink', f: 10.775, eirp: 30, bwTheirs: 150, bwOurs: 250, slantKm: 1180, tsys: 700, gSat: 34, beam: 3.2, dish: 0.9, pass: 12, thetaMin: 2.4, rate: 1.8, eventsPerDay: 5.2 },
  o3b: { dir: 'uplink', f: 14.0, eirp: 40, bwTheirs: 500, bwOurs: 150, slantKm: 1180, tsys: 700, gSat: 34, beam: 3.2, dish: 1.2, pass: 12, thetaMin: 4.5, rate: 1.1, eventsPerDay: 1.2 },
}

/* background work the agent reports while the console is open */
export const AGENT_TICKER = [
  'Telemetry frame batch validated — 6 SC, EIRP within ±0.2 dB of last pass',
  'Federal Register polled — 0 new documents matching 47 CFR 25 / 15 CFR 960',
  'IFIC 3022 pre-publication index checked — no new Ku-band filings',
  'Restricted-area tasking screen — 112 tasks cleared, 1 rejected and logged',
  'Conjunction screen (18 SDS) — closest approach 4.1 km, AURORA-1B, no action',
  'DDTC USML change log polled — no further Cat XV amendments',
  'Underwriter data room checked — no new requests',
  'FCC ELS docket SAT-MOD-20260708-00061 — 0 new comments',
]

export const LETTER_V1 = `Attn: Spectrum Coordination Team
Telesat Corporation, Ottawa, ON

Re: Frequency coordination request — AURORA-1 NGSO system / USASAT-NG 214

Dear Coordination Team,

We write on behalf of the AURORA-1 constellation operator regarding a potential interference scenario identified in IFIC 3021. The USASAT-NG 214 filing (13.92–14.05 GHz) overlaps our coordinated Ku-band uplink (13.85–14.0 GHz) by 80 MHz, with preliminary analysis indicating a high probability of harmful interference during in-line events.

Pursuant to RR Article 9.52, we propose opening coordination discussions and offer three mitigation approaches for consideration:

1. Band segmentation within the shared 13.92–14.0 GHz range;
2. Coordinated power reduction during arc-crossing geometries;
3. Geographic avoidance zones around the Fairbanks and Svalbard gateway sites.

We would welcome a technical coordination meeting within the next ten business days and can provide our interference analysis upon request.

Sincerely,
Regulatory Affairs — AURORA-1 Program
Small Satellite Systems Laboratory`

export const LETTER_V2 = `Attn: Spectrum Coordination Team
Telesat Corporation, Ottawa, ON

Re: Coordination request under RR Article 9.52 — AURORA-1 / USASAT-NG 214

Dear Coordination Team,

Following publication of IFIC 3021, we have identified an 80 MHz overlap between the USASAT-NG 214 filing (13.92–14.05 GHz) and the AURORA-1 system's coordinated Ku-band uplink (13.85–14.0 GHz). Our analysis indicates a high likelihood of harmful interference during in-line conjunction events.

We respectfully request the initiation of coordination discussions and propose the following mitigation options:

1. Segmentation of the shared 13.92–14.0 GHz band;
2. Reciprocal power reduction during arc crossings;
3. Geographic avoidance around the Fairbanks and Svalbard gateway locations.

Our technical team is available for a coordination meeting at your earliest convenience, and we are prepared to share our full interference assessment.

Respectfully,
Regulatory Affairs — AURORA-1 Program
Small Satellite Systems Laboratory`

export const DEADLINE_DETAILS = {
  telesat: {
    required:
      'Respond to Telesat regarding the USASAT-NG 214 coordination request published in IFIC 3021. Under ITU procedure, failure to respond within the comment window is treated as agreement to the new filing.',
    status: 'Kolhar has drafted an outreach letter proposing three mitigation options. Awaiting your review before sending.',
    next: 'Review and send the AI-drafted coordination letter, or open the interference analysis for full technical detail.',
    filingId: 'crc-a1',
    owner: 'j.okafor',
  },
  noaa: {
    required:
      'File the annual NOAA CRSRA operational report and the pending Tier 2 condition waiver for sub-metre imagery over the restricted-area list under 15 CFR 960.',
    status:
      'Kolhar assembled the report from pass logs and tasking records — 47 of 49 fields populated. Two conditions require the PI attestation signature.',
    next: 'Sign the two attestations and submit through the CRSRA portal.',
    filingId: 'noaa-a1',
    owner: 'a.whitfield',
  },
  fcc: {
    required:
      'File Schedule F under the FCC Part 100 transition rules to migrate AURORA-1 authorizations to the new licensing framework.',
    status:
      'Kolhar auto-drafted the complete Schedule F from your existing Part 25 grant and current ephemeris data. All 61 fields populated; 2 flagged for operator confirmation.',
    next: 'Review the two flagged fields (orbital tolerance and disposal timeline), then submit via FCC ELS.',
    filingId: 'schf-a1',
    owner: 's.chandra',
  },
  export: {
    required:
      'Amend the EU ground-segment TAA to reflect the DDTC Category XV revision before the next hardware shipment to the Svalbard gateway.',
    status:
      'Two component classifications moved from EAR 9A515 to the USML. The fundamental-research exclusion no longer covers this hardware now that the program books commercial tasking revenue.',
    next: 'Generate the amended classification package and route to the university export-control officer.',
    filingId: 'taa-a1',
    owner: 'a.whitfield',
  },
  debris: {
    required:
      'Submit the semi-annual orbital debris mitigation report covering conjunction events, maneuvers, and disposal reserve status.',
    status: 'Kolhar is auto-filling the report from live telemetry — 82% complete. Remaining sections populate as the reporting window closes.',
    next: 'No action needed yet. Kolhar will queue the completed report for signature 7 days before the deadline.',
    filingId: 'sdmp-a1',
    owner: 'm.reyes',
  },
}

/* ---------------- filings ---------------- */

export const LIFECYCLE_STAGES = ['Drafted', 'Submitted', 'Under review', 'Coordination', 'Granted']

export const FILINGS = [
  { id: 'api-a1', name: 'AURORA-1 ITU Advance Publication', type: 'ITU API', agency: 'ITU', status: 'Filed', submitted: 'Nov 3, 2025', deadline: '—', stage: 4, owner: 's.chandra', ref: 'API/A/12847' },
  { id: 'crc-a1', name: 'AURORA-1 ITU Coordination Request', type: 'ITU CR/C', agency: 'ITU', status: 'Action required', submitted: 'Feb 14, 2026', deadline: 'Telesat response · 6d', stage: 3, owner: 'j.okafor', ref: 'CR/C/3021-214' },
  { id: 'loa-a1', name: 'Part 25 space station license (NGSO)', type: 'FCC Part 25', agency: 'FCC', status: 'Filed', submitted: 'Nov 3, 2025', deadline: '—', stage: 4, owner: 's.chandra', ref: 'SAT-LOA-20251103-00142' },
  { id: 'schs-a1', name: 'AURORA-1 FCC Schedule S', type: 'FCC Schedule S', agency: 'FCC', status: 'Filed', submitted: 'Jan 20, 2026', deadline: '—', stage: 4, owner: 's.chandra', ref: 'SES-LIC-20260120-00088' },
  { id: 'schf-a1', name: 'Part 100 transition — Schedule F', type: 'FCC Schedule S', agency: 'FCC', status: 'Draft', submitted: '—', deadline: 'Submission · 23d', stage: 0, owner: 's.chandra', ref: '—' },
  { id: 'noaa-a1', name: 'NOAA CRSRA annual operational report', type: 'NOAA CRSRA', agency: 'NOAA', status: 'Action required', submitted: '—', deadline: 'Report + waiver · 11d', stage: 0, owner: 'a.whitfield', ref: 'NOAA-CRSRA-2026-018' },
  { id: 'sta-a1', name: 'Part 5 experimental STA — research payload', type: 'FCC Part 5', agency: 'FCC', status: 'Expiring', submitted: 'Mar 1, 2026', deadline: 'Expiry · 61d', stage: 4, owner: 'm.reyes', ref: 'WM2XKD-STA-0442' },
  { id: 'faa-a1', name: 'FAA Part 450 launch license', type: 'FAA launch license', agency: 'FAA', status: 'Filed', submitted: 'Aug 12, 2025', deadline: 'Q3 window', stage: 4, owner: 'm.reyes', ref: 'LLO 26-041' },
  { id: 'taa-a1', name: 'EU ground-segment TAA amendment', type: 'DDTC TAA', agency: 'DDTC', status: 'Action required', submitted: 'Apr 4, 2026', deadline: 'Amendment · 18d', stage: 2, owner: 'a.whitfield', ref: 'TAA-0912-26' },
  { id: 'sdmp-a1', name: 'Orbital debris mitigation plan', type: 'SDMP', agency: 'FCC', status: 'Under review', submitted: 'Jun 2, 2026', deadline: 'Semi-annual report · 41d', stage: 2, owner: 'm.reyes', ref: 'ODMP-A1-R3' },
  { id: 'mod-a1', name: 'AURORA-1 modification — Ka feeder link', type: 'FCC Schedule S', agency: 'FCC', status: 'Under review', submitted: 'Jul 8, 2026', deadline: 'Comment period · 12d', stage: 2, owner: 's.chandra', ref: 'SAT-MOD-20260708-00061' },
  { id: 'api-a2', name: 'AURORA-2 ITU Advance Publication (draft)', type: 'ITU API', agency: 'ITU', status: 'Draft', submitted: '—', deadline: '—', stage: 0, owner: 's.chandra', ref: '—' },
]

export const FILING_STATUS_COLOR = {
  Filed: 'green',
  Granted: 'green',
  Draft: 'grey',
  'Under review': 'amber',
  Expiring: 'amber',
  'Action required': 'red',
}

export const AGENCIES = ['FCC', 'ITU', 'NOAA', 'FAA', 'DDTC']

export const AMENDMENTS = [
  { name: 'Amendment 1 — EIRP correction (42.1 → 42.3 dBW)', date: 'Filed Mar 3, 2026', status: 'Accepted' },
  { name: 'Amendment 2 — Ground station addition (Svalbard)', date: 'Filed May 19, 2026', status: 'Under review' },
  { name: 'Amendment 3 — Operator change to commercial status', date: 'Filed Jun 24, 2026', status: 'Accepted' },
]

/* ---------------- conflicts ---------------- */

export const CONFLICTS = [
  {
    id: 'usasat',
    network: 'USASAT-NG 214',
    operator: 'Telesat Corporation',
    band: '13.92–14.05 GHz',
    ours: [13.85, 14.0],
    theirs: [13.92, 14.05],
    overlapMHz: 80,
    overlap: '53%',
    severity: 'High',
    ific: 'IFIC 3021',
    priority: 'Later filing — AURORA-1 holds date priority',
    timeline: [
      { date: 'Jul 18, 2026', who: 'Kolhar agent', text: 'IFIC 3021 published — new Ku-band filing detected overlapping the AURORA-1 uplink' },
      { date: 'Jul 21, 2026', who: 'Kolhar agent', text: 'Interference analysis completed — 80 MHz overlap, high probability during in-line events' },
      { date: 'Jul 22, 2026', who: 'Lab ops', text: 'Analysis reviewed — coordination outreach approved for drafting' },
    ],
  },
  {
    id: 'lightspeed',
    network: 'Telesat Lightspeed',
    operator: 'Telesat Corporation',
    band: '13.75–13.90 GHz',
    ours: [13.85, 14.0],
    theirs: [13.75, 13.9],
    overlapMHz: 50,
    overlap: '22%',
    severity: 'Medium',
    status: 'Resolved',
    ific: 'IFIC 2984',
    priority: 'Coordination agreement in force',
    timeline: [
      { date: 'Sep 9, 2025', who: 'Kolhar agent', text: 'Overlap identified during CR/C preparation' },
      { date: 'Oct 2, 2025', who: 'Telesat', text: 'Coordination meeting held — band segmentation agreed in principle' },
      { date: 'Dec 11, 2025', who: 'Both parties', text: 'Coordination agreement signed — segmented at 13.88 GHz' },
    ],
  },
  {
    id: 'oneweb',
    network: 'OneWeb Gen2',
    operator: 'Eutelsat OneWeb',
    band: '10.7–10.85 GHz',
    ours: [10.7, 10.95],
    theirs: [10.7, 10.85],
    overlapMHz: 150,
    overlap: '14%',
    severity: 'Medium',
    status: 'Open',
    ific: 'IFIC 3019',
    priority: 'EPFD margins govern — no bilateral trigger yet',
    timeline: [
      { date: 'Jun 27, 2026', who: 'Kolhar agent', text: 'Downlink overlap flagged in IFIC 3019 — EPFD margins currently within Article 22 limits' },
      { date: 'Jul 5, 2026', who: 'Kolhar agent', text: 'Monitoring conjunction geometry — coordination trigger threshold not yet reached' },
    ],
  },
  {
    id: 'o3b',
    network: 'SES O3b mPOWER',
    operator: 'SES S.A.',
    band: '14.0–14.5 GHz',
    ours: [13.85, 14.0],
    theirs: [14.0, 14.5],
    overlapMHz: 5,
    overlap: '8%',
    severity: 'Low',
    status: 'Resolved',
    ific: 'IFIC 3002',
    priority: 'Guard band sufficient',
    timeline: [
      { date: 'Mar 14, 2026', who: 'Kolhar agent', text: 'Band-edge adjacency reviewed — guard band sufficient' },
      { date: 'Mar 20, 2026', who: 'SES', text: 'Confirmed no coordination required below threshold' },
    ],
  },
]

export const SEVERITY_COLOR = { High: 'red', Medium: 'amber', Low: 'grey' }
export const CONFLICT_STATUS_COLOR = { Open: 'red', 'Outreach sent': 'amber', Resolved: 'green' }

/* ---------------- constellation ---------------- */

export const SPACECRAFT = [
  { id: '1a', name: 'AURORA-1A', norad: '59214', cospar: '2025-045AK', bus: '12U', status: 'In orbit', orbit: '550 km SSO', uplink: '13.85–14.0 GHz', rf: 'Nominal', next: 'Debris report · 41d', launched: 'Mar 2025', missionEnd: '2030', deorbitBy: '2035', yearsLeft: 8.6, obsEirp: '42.1 dBW', obsFreq: '13.85–14.0 GHz', authority: 'Part 25', tasking: 'Commercial' },
  { id: '1b', name: 'AURORA-1B', norad: '59215', cospar: '2025-045AL', bus: '12U', status: 'In orbit', orbit: '550 km SSO', uplink: '13.85–14.0 GHz', rf: 'Nominal', next: 'Debris report · 41d', launched: 'Mar 2025', missionEnd: '2030', deorbitBy: '2035', yearsLeft: 8.6, obsEirp: '42.2 dBW', obsFreq: '13.85–14.0 GHz', authority: 'Part 25', tasking: 'Commercial' },
  { id: '1c', name: 'AURORA-1C', norad: '59288', cospar: '2025-119C', bus: '12U', status: 'In orbit', orbit: '551 km SSO', uplink: '13.85–14.0 GHz', rf: 'Nominal', next: 'NOAA report · 11d', launched: 'Sep 2025', missionEnd: '2030', deorbitBy: '2035', yearsLeft: 9.1, obsEirp: '42.3 dBW', obsFreq: '13.85–14.0 GHz', authority: 'Part 25', tasking: 'Commercial' },
  { id: '1d', name: 'AURORA-1D', norad: '59289', cospar: '2025-119D', bus: '12U', status: 'In orbit', orbit: '551 km SSO', uplink: '13.85–14.0 GHz', rf: 'Drift detected', next: 'RF review · 5d', launched: 'Sep 2025', missionEnd: '2030', deorbitBy: '2035', yearsLeft: 9.1, obsEirp: '43.1 dBW', obsFreq: '13.85–14.0 GHz', authority: 'Part 25', tasking: 'Commercial' },
  { id: '1e', name: 'AURORA-1E', norad: '59704', cospar: '2026-018B', bus: '12U', status: 'In orbit', orbit: '552 km SSO', uplink: '13.85–14.0 GHz', rf: 'Nominal', next: 'STA expiry · 61d', launched: 'Feb 2026', missionEnd: '2031', deorbitBy: '2036', yearsLeft: 9.6, obsEirp: '42.2 dBW', obsFreq: '13.85–14.0 GHz', authority: 'Part 5 STA', tasking: 'Research' },
  { id: '1f', name: 'AURORA-1F', norad: '—', cospar: '—', bus: '12U', status: 'Awaiting launch', orbit: '550 km SSO', uplink: '13.85–14.0 GHz', rf: '—', next: 'Launch window · Q3', launched: '—', missionEnd: '—', deorbitBy: '—', yearsLeft: null, obsEirp: '—', obsFreq: '—', authority: 'Part 25', tasking: 'Commercial' },
]

export const SPACECRAFT_FILINGS = ['api-a1', 'loa-a1', 'schs-a1', 'faa-a1', 'noaa-a1', 'sdmp-a1']

/* ---------------- ground segment (earth station licensing) ------- */

export const GROUND_STATIONS = [
  { id: 'cmp', name: 'Campus MOC', code: 'CMP', country: 'United States', bands: 'S / X', license: 'SES-LIC-20260120-00088', status: 'Licensed', color: 'green', note: 'Primary TT&C — university-owned' },
  { id: 'fbk', name: 'Fairbanks', code: 'FBK', country: 'United States', bands: 'S / X', license: 'SES-LIC-20251204-00311', status: 'Licensed', color: 'green', note: 'Leased capacity' },
  { id: 'svl', name: 'Svalbard', code: 'SVL', country: 'Norway', bands: 'S / X', license: 'NKOM-2026-4417', status: 'Coordinated', color: 'amber', note: 'TAA amendment pending for hardware shipment' },
  { id: 'awa', name: 'Awarua', code: 'AWA', country: 'New Zealand', bands: 'S', license: 'RSM-1188-26', status: 'Licensed', color: 'green', note: 'Leased capacity' },
  { id: 'scl', name: 'Santiago', code: 'SCL', country: 'Chile', bands: 'S / X', license: 'SUBTEL-pending', status: 'In process', color: 'amber', note: 'Host-nation filing submitted Jun 2026' },
]

/* ---------------- compliance modules ---------------- */

export const MODULES = [
  { id: 'spectrum', name: 'Spectrum', main: 'ITU CR/C filed', tag: '1 conflict', tagColor: 'amber', sub: 'Ku uplink · X downlink · S-band TT&C' },
  { id: 'noaa', name: 'Remote sensing · NOAA', main: 'Tier 2 licensed', tag: 'Report in 11d', tagColor: 'red', sub: '15 CFR 960 · sub-metre conditions' },
  { id: 'itar', name: 'Export control', main: '2 reclassifications', tag: 'Action required', tagColor: 'red', sub: 'ITAR / EAR · FRE no longer applies' },
  { id: 'launch', name: 'Launch · FAA', main: 'License active', tag: 'Q3 window', tagColor: 'green', sub: 'Part 450 · LLO 26-041' },
  { id: 'insurance', name: 'Insurance', main: 'Docs synced', tag: 'Underwriter OK', tagColor: 'green', sub: '$42M MPL · third-party liability' },
  { id: 'postlaunch', name: 'Post-launch', main: 'RF drift on 1D', tag: '1 drift flag', tagColor: 'amber', sub: 'Telemetry vs. licensed parameters' },
]

export const SPECTRUM_ALLOCATIONS = [
  { band: '13.85–14.0 GHz', direction: 'Uplink (Earth-to-space)', service: 'FSS', status: 'Coordinated', color: 'amber', note: '1 open conflict' },
  { band: '10.7–10.95 GHz', direction: 'Downlink (space-to-Earth)', service: 'FSS', status: 'Licensed', color: 'green', note: 'EPFD within Art. 22 limits' },
  { band: '8025–8400 MHz', direction: 'Payload downlink', service: 'EESS', status: 'Licensed', color: 'green', note: 'SFCG 21-2R4 compliant' },
  { band: '2025–2110 MHz', direction: 'TT&C uplink', service: 'SOS', status: 'Licensed', color: 'green', note: 'NTIA cleared' },
  { band: '2200–2290 MHz', direction: 'TT&C downlink', service: 'SOS', status: 'Licensed', color: 'green', note: 'NTIA cleared' },
]

export const ITAR_COMPONENTS = [
  { component: 'X-band downlink transmitter', cls: 'EAR 9A515.e', newCls: 'USML XV(e)', jurisdiction: 'Commerce', reviewed: 'Jul 12, 2026', affected: true },
  { component: 'Star tracker assembly', cls: 'EAR 9A515.a', newCls: 'USML XV(e)', jurisdiction: 'Commerce', reviewed: 'Jul 12, 2026', affected: true },
  { component: 'Reaction wheel unit', cls: 'EAR 9A515.x', newCls: null, jurisdiction: 'Commerce', reviewed: 'Jun 2, 2026', affected: false },
  { component: 'Ku-band phased array', cls: 'EAR 9A515.e', newCls: null, jurisdiction: 'Commerce', reviewed: 'Jun 2, 2026', affected: false },
  { component: 'Propulsion module (HPGP)', cls: 'USML XV(e)', newCls: null, jurisdiction: 'State', reviewed: 'May 20, 2026', affected: false },
  { component: 'Radiation-hardened OBC', cls: 'EAR 9A515.d', newCls: null, jurisdiction: 'Commerce', reviewed: 'May 20, 2026', affected: false },
  { component: 'Multispectral imager (0.8 m GSD)', cls: 'EAR 9A515.b', newCls: null, jurisdiction: 'Commerce', reviewed: 'Jul 12, 2026', affected: false },
]

/* NOAA remote-sensing licence conditions — very specific to imaging operators */
export const NOAA_CONDITIONS = [
  { id: 'n1', cond: 'Tier 2 — sub-metre panchromatic imagery', detail: 'GSD 0.82 m at nadir; resolution above the Tier 3 threshold', status: 'Compliant', color: 'green' },
  { id: 'n2', cond: 'Restricted-area imaging list', detail: 'Automated tasking screen against the current NOAA restricted list', status: 'Compliant', color: 'green' },
  { id: 'n3', cond: 'Shutter-control acknowledgement', detail: 'Command path verified quarterly — last test Jun 14, 2026', status: 'Compliant', color: 'green' },
  { id: 'n4', cond: 'Annual operational report', detail: '47 of 49 fields auto-populated; 2 PI attestations outstanding', status: 'Due in 11 days', color: 'red' },
  { id: 'n5', cond: 'Foreign-entity data access log', detail: 'Svalbard and Awarua ground segment access recorded per condition 7(b)', status: 'Compliant', color: 'green' },
  { id: 'n6', cond: 'Non-Earth imaging waiver', detail: 'Requested for on-orbit RPO inspection demo — under NOAA review', status: 'Pending', color: 'amber' },
]

export const LAUNCH_CHECKLIST = [
  { main: 'Flight safety analysis accepted', sub: 'No open FAA action items' },
  { main: 'Payload review complete', sub: 'FCC + NOAA cross-clearances verified' },
  { main: 'Financial responsibility demonstrated', sub: 'MPL coverage bound at $42M' },
  { main: 'Environmental review closed', sub: 'Categorical exclusion granted' },
  { main: 'Launch site agreement executed', sub: 'Rideshare manifest, west-coast SSO corridor' },
  { main: 'University indemnification approved', sub: 'Board of trustees resolution 26-114 on file' },
]

export const INSURANCE_CHECKLIST = [
  { main: 'Launch + first-year in-orbit policy bound', sub: '$42M coverage, per FAA MPL requirement' },
  { main: 'Underwriter data room synced', sub: 'Last sync: 2 hours ago' },
  { main: 'Third-party liability certificate issued', sub: 'Meets Part 450 financial responsibility' },
  { main: 'Claims history attestation filed', sub: 'No open items' },
  { main: 'University risk-management sign-off', sub: 'Renewed for FY27' },
]

/* ---------------- documents ---------------- */

export const DOCUMENTS = [
  { id: 'doc-schs', name: 'AURORA-1_Schedule_S.pdf', type: 'Filing', mission: 'AURORA-1', date: 'Jan 20, 2026', version: 'v3', kind: 'filing', size: '2.4 MB', owner: 's.chandra' },
  { id: 'doc-letter', name: 'Telesat_coordination_letter.pdf', type: 'Coordination letter', mission: 'AURORA-1', date: 'Jul 22, 2026', version: 'v2', kind: 'letter', size: '184 KB', owner: 'j.okafor' },
  { id: 'doc-noaa', name: 'NOAA_CRSRA_annual_report.pdf', type: 'Remote sensing', mission: 'AURORA-1', date: 'Jul 28, 2026', version: 'v2', kind: 'filing', size: '3.1 MB', owner: 'a.whitfield' },
  { id: 'doc-faa', name: 'FAA_license_package.zip', type: 'License package', mission: 'AURORA-1', date: 'Aug 12, 2025', version: 'v1', kind: 'filing', size: '18.6 MB', owner: 'm.reyes' },
  { id: 'doc-ins', name: 'Insurance_certificate_2026.pdf', type: 'Insurance', mission: 'AURORA-1', date: 'Feb 1, 2026', version: 'v2', kind: 'filing', size: '612 KB', owner: 'm.reyes' },
  { id: 'doc-itar', name: 'ITAR_classification_matrix.xlsx', type: 'Export control', mission: 'AURORA-1', date: 'Jul 12, 2026', version: 'v4', kind: 'filing', size: '96 KB', owner: 'a.whitfield' },
  { id: 'doc-taa', name: 'TAA_0912-26_amendment_draft.pdf', type: 'Export control', mission: 'Ground segment', date: 'Jul 29, 2026', version: 'v1', kind: 'filing', size: '448 KB', owner: 'a.whitfield' },
  { id: 'doc-sdmp', name: 'SDMP_semiannual_draft.pdf', type: 'Filing', mission: 'AURORA-1', date: 'Jul 25, 2026', version: 'v1', kind: 'filing', size: '1.2 MB', owner: 'm.reyes' },
  { id: 'doc-api', name: 'ITU_API_submission.pdf', type: 'Filing', mission: 'AURORA-1', date: 'Nov 3, 2025', version: 'v1', kind: 'filing', size: '890 KB', owner: 's.chandra' },
  { id: 'doc-uw', name: 'Underwriter_data_export.pdf', type: 'Insurance', mission: 'AURORA-1', date: 'Jul 26, 2026', version: 'v6', kind: 'filing', size: '2.9 MB', owner: 'm.reyes' },
]

export const DOC_VERSIONS = [
  { v: 'v3 (current)', date: 'Jul 25, 2026', note: 'Regenerated after EIRP amendment' },
  { v: 'v2', date: 'Mar 3, 2026', note: 'EIRP correction applied' },
  { v: 'v1', date: 'Jan 20, 2026', note: 'Initial generation from extraction' },
]

/* ---------------- regulatory feed ---------------- */

export const FEED = [
  {
    id: 'part100', date: 'Jun 30, 2026', severity: 'High', source: 'FCC', title: 'FCC adopts Part 100 licensing framework',
    text: 'New unified licensing regime for NGSO systems. Existing Part 25 grants must transition via Schedule F.',
    impact: 'AURORA-1 authorizations must migrate to Part 100. Kolhar auto-drafted the Schedule F transition filing — 61 fields populated from your existing grant, 2 flagged for confirmation.',
    action: 'Review flagged fields and submit within 23 days.',
  },
  {
    id: 'catxv', date: 'Jul 14, 2026', severity: 'High', source: 'DDTC', title: 'DDTC revises USML Category XV',
    text: 'Two AURORA-1 component classifications move from EAR jurisdiction to the USML.',
    impact: 'X-band downlink transmitter and star tracker assembly reclassify from EAR 9A515 to USML XV. Because the program now books commercial tasking revenue, the fundamental-research exclusion does not cover this hardware.',
    action: 'Generate updated classification package and amend the EU ground-segment TAA.',
  },
  {
    id: 'crsra', date: 'Jul 24, 2026', severity: 'High', source: 'NOAA', title: 'NOAA tightens Tier 2 reporting cadence',
    text: 'CRSRA licensees operating sub-metre systems move from annual to semi-annual operational reporting.',
    impact: 'AURORA-1 shifts to a semi-annual cycle beginning with the report due in 11 days. The restricted-area tasking screen must now log every rejected task, not just executed ones.',
    action: 'Enable rejected-task logging and submit the annual report with the two outstanding attestations.',
  },
  {
    id: 'ific3021', date: 'Jul 18, 2026', severity: 'High', source: 'ITU', title: 'ITU IFIC 3021 published',
    text: 'Contains USASAT-NG 214, a new Ku-band filing overlapping the AURORA-1 uplink by 80 MHz.',
    impact: 'High interference probability during in-line events. The four-month comment window is open — silence is treated as agreement to the new filing.',
    action: 'Send the drafted coordination outreach to Telesat within 6 days.',
  },
  {
    id: 'epfd', date: 'Jul 10, 2026', severity: 'Medium', source: 'ITU', title: 'ITU EPFD framework replacement study advances',
    text: 'WP 4A moves to replace Article 22 EPFD limits with a new aggregate-interference methodology.',
    impact: 'AURORA-1 downlink compliance margins would be recalculated under the proposed methodology. Current margins hold under both frameworks, but AURORA-2 link budgets should be designed to the new limits.',
    action: 'No immediate action. Kolhar is tracking the study group output for AURORA-2 planning.',
  },
  {
    id: 'faa450', date: 'Jun 12, 2026', severity: 'Low', source: 'FAA', title: 'FAA updates Part 450 application guidance',
    text: 'Streamlined flight-safety analysis requirements for rideshare payloads under 500 kg.',
    impact: 'No change to the active AURORA-1 license. Future AURORA-2 applications qualify for the streamlined path, cutting expected review time by ~8 weeks.',
    action: 'No action required. Noted for the AURORA-2 licensing plan.',
  },
  {
    id: 'wrc27', date: 'May 28, 2026', severity: 'Info', source: 'ITU', title: 'WRC-27 agenda item 1.6 — NGSO Ku-band review',
    text: 'Study cycle opens on revised sharing criteria between NGSO systems in 13.75–14.5 GHz.',
    impact: 'Potential long-term changes to coordination thresholds in your primary uplink band. Outcomes would not take effect before 2028.',
    action: 'Monitoring only. Kolhar will flag any draft resolution affecting the AURORA constellation.',
  },
]

export const SEVERITY_TAG = { High: 'red', Medium: 'amber', Low: 'grey', Info: 'grey' }

/* ---------------- activity log (agent + human actions) ------------ */

export const ACTIVITY = [
  { t: '08:12Z', who: 'Kolhar agent', text: 'Scanned IFIC 3021 — 1 new overlap against licensed bands', kind: 'agent' },
  { t: '07:48Z', who: 'Kolhar agent', text: 'NOAA annual report auto-populated to 47/49 fields from pass logs', kind: 'agent' },
  { t: '06:31Z', who: 'a.whitfield', text: 'Opened TAA-0912-26 amendment draft', kind: 'human' },
  { t: '04:02Z', who: 'Kolhar agent', text: 'RF drift detected on AURORA-1D — observed EIRP 43.1 dBW vs 42.3 licensed', kind: 'agent' },
  { t: '23:14Z', who: 's.chandra', text: 'Confirmed 2 flagged fields on Schedule F transition draft', kind: 'human' },
  { t: '21:40Z', who: 'Kolhar agent', text: 'Underwriter data room synced — 6 documents updated', kind: 'agent' },
]

/* ---------------- team ---------------- */

export const TEAM = [
  { user: 's.chandra', role: 'Spectrum lead', open: 3 },
  { user: 'j.okafor', role: 'Coordination', open: 2 },
  { user: 'a.whitfield', role: 'Export control officer', open: 4 },
  { user: 'm.reyes', role: 'Launch & debris', open: 2 },
]

/* ---------------- frequency viz helper ---------------- */

export function freqGeometry(ours, theirs) {
  const lo = Math.min(ours[0], theirs[0])
  const hi = Math.max(ours[1], theirs[1])
  const pad = (hi - lo) * 0.18
  const min = lo - pad
  const span = hi - lo + pad * 2
  const pct = (f) => ((f - min) / span) * 100
  const oLo = Math.max(ours[0], theirs[0])
  const oHi = Math.min(ours[1], theirs[1])
  return { pct, min, max: min + span, overlap: oHi > oLo ? [oLo, oHi] : null }
}

/* ---------------- interference model ---------------- */
/* Single-entry I/N over one in-line pass. Earth-station pattern per    */
/* ITU-R S.465/S.580, satellite receive pattern a parabolic main lobe   */
/* with a 30 dB floor. Deterministic: same inputs, same curve.          */

const lg = Math.log10

function esGain(theta, dLambda) {
  const gMax = 20 * lg(dLambda) + 7.7
  const g1 = 2 + 15 * lg(dLambda)
  const thM = (20 / dLambda) * Math.sqrt(gMax - g1)
  const thR = 15.85 * dLambda ** -0.6
  if (theta < thM) return gMax - 2.5e-3 * (dLambda * theta) ** 2
  if (theta < thR) return g1
  if (theta < 48) return 32 - 25 * lg(theta)
  return -10
}

export function interferenceModel(conflict) {
  const p = INTERFERENCE[conflict.id]
  const lambda = 0.299792458 / p.f
  const dLambda = p.dish / lambda
  const gEs = 20 * lg(dLambda) + 7.7
  const fspl = 92.45 + 20 * lg(p.slantKm) + 20 * lg(p.f)
  const kTB = -228.6 + 10 * lg(p.tsys) + 10 * lg(p.bwOurs * 1e6)
  const overlapFactor = 10 * lg(conflict.overlapMHz / p.bwTheirs)
  const eirpInBand = p.eirp + overlapFactor

  const samples = 121
  const curve = []
  let longTerm = 0
  let shortTerm = 0
  for (let i = 0; i < samples; i++) {
    const t = (i / (samples - 1)) * p.pass
    const theta = Math.hypot(p.thetaMin, p.rate * (t - p.pass / 2))
    const gRx = Math.max(p.gSat - 12 * (theta / p.beam) ** 2, p.gSat - 30)
    const i_dBW = eirpInBand - (gEs - esGain(theta, dLambda)) - fspl + gRx - 0.4
    const iN = i_dBW - kTB
    curve.push({ t, theta, iN })
    if (iN > -12.2) longTerm++
    if (iN > -6) shortTerm++
  }
  const peak = curve.reduce((a, c) => (c.iN > a.iN ? c : a))
  const peakLin = 10 ** (peak.iN / 10)
  const exceedMin = (shortTerm / samples) * p.pass
  const dailyPct = ((exceedMin * p.eventsPerDay) / 1440) * 100

  return {
    p, fspl, kTB, gEs, overlapFactor, eirpInBand, curve, peak,
    deltaTT: peakLin * 100,
    cniLoss: 10 * lg(1 + peakLin),
    longTermPct: (longTerm / samples) * 100,
    shortTermPct: (shortTerm / samples) * 100,
    exceedMin,
    dailyPct,
    harmful: dailyPct > 0.03,
  }
}
