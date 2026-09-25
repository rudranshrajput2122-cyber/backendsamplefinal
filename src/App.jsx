import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FILINGS, DOCUMENTS, FEED, CONFLICTS, SPACECRAFT, MODULES, OPERATOR, AUTHORITY_TRANSITION,
  ACTIVITY, AGENT_TICKER,
} from './data.js'
import {
  LetterModal, RuleChangeModal, DeadlineModal, AmendmentsModal,
  DocPreviewModal, VersionsModal, ImpactModal, AttestModal,
} from './modals.jsx'
import {
  Dashboard, FilingWizard, FilingsView, FilingDetail, ConflictsView, ConflictDetail,
  ModulesView, ModuleDetail, DocumentsView, FeedView, SpacecraftDetail, SettingsView,
} from './views.jsx'

const NAV = [
  {
    group: 'Programme',
    items: [
      { id: 'dashboard', label: 'Overview' },
      { id: 'filings', label: 'Filings' },
      { id: 'conflicts', label: 'Conflicts' },
      { id: 'modules', label: 'Modules' },
    ],
  },
  {
    group: 'Reference',
    items: [
      { id: 'documents', label: 'Documents' },
      { id: 'feed', label: 'Regulatory feed' },
      { id: 'settings', label: 'Settings' },
    ],
  },
]

const ALL_NAV = NAV.flatMap((g) => g.items)

const SECTION_OF = {
  dashboard: 'dashboard',
  wizard: 'filings',
  spacecraft: 'dashboard',
  filings: 'filings',
  filingDetail: 'filings',
  conflicts: 'conflicts',
  conflictDetail: 'conflicts',
  modules: 'modules',
  moduleDetail: 'modules',
  documents: 'documents',
  feed: 'feed',
  settings: 'settings',
}

const utcStamp = () => {
  const d = new Date()
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`
}

const INITIAL_DEADLINES = [
  { id: 'telesat', title: 'ITU coordination response — Telesat', sub: 'Silence is treated as agreement · IFIC 3021', days: 6, owner: 'j.okafor' },
  { id: 'noaa', title: 'NOAA CRSRA annual report', sub: '47 of 49 fields filled · two attestations open', days: 11, owner: 'a.whitfield' },
  { id: 'export', title: 'EU ground-segment TAA amendment', sub: 'Category XV revision · blocks the Svalbard shipment', days: 18, owner: 'a.whitfield' },
  { id: 'fcc', title: 'Part 100 transition — Schedule F', days: 23, sub: 'Drafted · two fields flagged for review', owner: 's.chandra' },
  { id: 'debris', title: 'Semi-annual orbital debris report', sub: 'Filled from telemetry · 82 per cent complete', days: 41, owner: 'm.reyes' },
]

export default function App() {
  const [route, setRoute] = useState({ view: 'dashboard' })
  const [modal, setModal] = useState(null)
  const [missionOpen, setMissionOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const toastTimer = useRef(null)

  /* persistent demo state — every action leaves a visible trace */
  const [generatedDocs, setGeneratedDocs] = useState([])
  const filingGenerated = generatedDocs.length > 0
  const [activity, setActivity] = useState(() => ACTIVITY.map((a, i) => ({ ...a, id: `seed-${i}` })))
  const [usasatStatus, setUsasatStatus] = useState('Open')
  const [ruleReady, setRuleReady] = useState(false)
  const [noaaSigned, setNoaaSigned] = useState(false)
  const [starred, setStarred] = useState(() => new Set(['crc-a1', 'noaa-a1']))
  const [deadlines, setDeadlines] = useState(INITIAL_DEADLINES)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* every action — agent or human — lands in the activity log */
  const logActivity = useCallback((text, who = 'Kolhar agent', kind = 'agent') => {
    setActivity((a) => [
      { id: `${Date.now()}-${Math.random()}`, t: utcStamp(), who, text, kind, fresh: true },
      ...a.map((x) => (x.fresh ? { ...x, fresh: false } : x)),
    ].slice(0, 40))
  }, [])

  /* the agent keeps working in the background while the console is open */
  useEffect(() => {
    let n = 0
    const t = setInterval(() => {
      logActivity(AGENT_TICKER[n++ % AGENT_TICKER.length])
    }, 11000)
    return () => clearInterval(t)
  }, [logActivity])

  const onFilingGenerated = useCallback((doc) => {
    setGeneratedDocs((ds) => [doc, ...ds.filter((d) => d.id !== doc.id)])
    logActivity(`Generated ${doc.name} — all validation checks passed`)
  }, [logActivity])

  const allDocs = useMemo(() => [...generatedDocs, ...DOCUMENTS], [generatedDocs])

  const onAddDocs = useCallback((docs) => {
    setGeneratedDocs((ds) => [...docs, ...ds])
    logActivity(`Filed ${docs.length === 1 ? docs[0].name : `${docs.length} uploaded documents`} — classified and linked`)
  }, [logActivity])

  /* the feed grows when someone uploads a publication for analysis */
  const [feed, setFeed] = useState(FEED)
  const onAddFeed = useCallback((entry) => {
    setFeed((f) => [entry, ...f])
    logActivity(`Analysed uploaded publication "${entry.title}" — 2 filings affected`)
  }, [logActivity])

  useEffect(() => {
    if (!missionOpen) return
    const close = () => setMissionOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [missionOpen])

  const go = useCallback((view, id) => {
    setRoute({ view, id })
    setModal(null)
    setMissionOpen(false)
    setPaletteOpen(false)
    window.scrollTo(0, 0)
  }, [])

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const closeModal = () => setModal(null)

  const toggleStar = (id) =>
    setStarred((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const markReviewed = (id) => {
    setDeadlines((ds) => ds.map((d) => (d.id === id ? { ...d, done: true } : d)))
    closeModal()
    showToast('Marked reviewed')
  }

  const dismissDeadline = (id) => {
    setDeadlines((ds) => ds.filter((d) => d.id !== id))
    closeModal()
    showToast('Obligation cleared')
  }

  const onLetterSent = () => {
    setUsasatStatus('Outreach sent')
    setDeadlines((ds) =>
      ds.map((d) =>
        d.id === 'telesat'
          ? { ...d, title: 'Awaiting Telesat response', sub: 'Outreach sent · response window tracked' }
          : d,
      ),
    )
    closeModal()
    showToast('Letter sent to Telesat')
    logActivity('Sent coordination letter to Telesat — RR Art. 9.52, 6-day window tracked', 'j.okafor', 'human')
  }

  const onAttested = () => {
    setNoaaSigned(true)
    setDeadlines((ds) =>
      ds.map((d) =>
        d.id === 'noaa'
          ? { ...d, title: 'NOAA CRSRA report — submitted', sub: '49 of 49 fields · attestations signed', done: true }
          : d,
      ),
    )
    closeModal()
    showToast('Report submitted')
    logActivity('Submitted NOAA CRSRA annual report — receipt NOAA-CRSRA-2026-018-R1', 'a.whitfield', 'human')
  }

  const openConflicts = CONFLICTS.filter(
    (c) => (c.id === 'usasat' ? usasatStatus : c.status) === 'Open',
  ).length
  const actionFilings = FILINGS.filter((f) => f.status === 'Action required').length - (noaaSigned ? 1 : 0)

  const counts = {
    filings: actionFilings > 0 ? actionFilings : null,
    conflicts: openConflicts > 0 ? openConflicts : null,
  }

  /* headline figures now live in the bar rather than the page body */
  const openObligations = deadlines.filter((d) => !d.done)
  const nearest = openObligations.length ? Math.min(...openObligations.map((d) => d.days)) : null

  const section = SECTION_OF[route.view]
  const shared = {
    go, openModal: setModal, showToast, usasatStatus, ruleReady, noaaSigned,
    starred, toggleStar, deadlines, logActivity,
  }

  return (
    <>
      <div className="stars" aria-hidden="true"><i /><i /><i /></div>

      <div className="shell">
        <nav className="sidebar">
          <div className="side-logo">Kolhar<span>.</span></div>

          {NAV.map((g) => (
            <div key={g.group}>
              <div className="nav-group">{g.group}</div>
              {g.items.map((n) => (
                <button
                  key={n.id}
                  className={`side-item${section === n.id ? ' active' : ''}`}
                  onClick={() => go(n.id)}
                >
                  <span className="label">{n.label}</span>
                  {counts[n.id] != null && <span className="nav-count">{counts[n.id]}</span>}
                </button>
              ))}
            </div>
          ))}

          <div className="side-foot">
            <AgentStatus syncedAt={activity[0]?.id} />
            {OPERATOR.name}<br />
            FRN {OPERATOR.frn}
          </div>
        </nav>

        <div className="main">
          <div className="topbar">
            <div className="mission-selector" onClick={(e) => e.stopPropagation()}>
              <button className="mission-btn" onClick={() => setMissionOpen((o) => !o)}>
                {OPERATOR.constellation} <span style={{ fontSize: 7 }}>▼</span>
              </button>
              {missionOpen && (
                <div className="mission-dropdown">
                  <button className="mission-option" onClick={() => { setMissionOpen(false); go('dashboard') }}>
                    <span>AURORA-1 <span className="opt-sub">6 spacecraft</span></span>
                    <span className="check">✓</span>
                  </button>
                  <button className="mission-option" onClick={() => { setMissionOpen(false); showToast('AURORA-2 is still in pre-filing') }}>
                    <span>AURORA-2 <span className="opt-sub">planned</span></span>
                  </button>
                </div>
              )}
            </div>

            <div className="topbar-stats">
              <div className="tstat">
                <span className="tstat-label">Open obligations</span>
                <div className="tstat-value">{openObligations.length}</div>
                <div className="tstat-foot">
                  {nearest != null ? `nearest in ${nearest} days` : 'nothing outstanding'}
                </div>
              </div>
              <button className="tstat" onClick={() => go('conflicts')}>
                <span className="tstat-label">Open conflicts</span>
                <div className="tstat-value">{openConflicts}</div>
                <div className="tstat-foot">{CONFLICTS.length} networks tracked</div>
              </button>
              <div className="tstat">
                <span className="tstat-label">Operating authority</span>
                <div className="tstat-value">{AUTHORITY_TRANSITION.pct}<span className="unit">%</span></div>
                <div className="tstat-foot">migrated to Part 25 · STA expires in 61 days</div>
              </div>
            </div>
          </div>

          {route.view === 'dashboard' && (
            <Dashboard deadlines={deadlines} filingGenerated={filingGenerated} activity={activity} {...shared} />
          )}
          {route.view === 'wizard' && (
            <FilingWizard onExit={() => go('dashboard')} onGenerated={onFilingGenerated} showToast={showToast} />
          )}
          {route.view === 'filings' && <FilingsView {...shared} />}
          {route.view === 'filingDetail' && <FilingDetail id={route.id} {...shared} />}
          {route.view === 'conflicts' && <ConflictsView {...shared} />}
          {route.view === 'conflictDetail' && <ConflictDetail id={route.id} {...shared} />}
          {route.view === 'modules' && <ModulesView {...shared} />}
          {route.view === 'moduleDetail' && <ModuleDetail id={route.id} {...shared} />}
          {route.view === 'documents' && <DocumentsView docs={allDocs} onAddDocs={onAddDocs} {...shared} />}
          {route.view === 'feed' && <FeedView feed={feed} onAddFeed={onAddFeed} {...shared} />}
          {route.view === 'spacecraft' && <SpacecraftDetail id={route.id} {...shared} />}
          {route.view === 'settings' && <SettingsView showToast={showToast} />}
        </div>
      </div>

      {modal === 'letter' && <LetterModal onClose={closeModal} onSent={onLetterSent} />}
      {modal === 'rule' && (
        <RuleChangeModal
          onClose={closeModal}
          ruleReady={ruleReady}
          onGenerated={() => { setRuleReady(true); logActivity('Drafted TAA-0912-26 amendment and updated classification matrix v5') }}
        />
      )}
      {modal === 'attest' && <AttestModal onClose={closeModal} onSubmitted={onAttested} />}
      {modal?.type === 'deadline' && (
        <DeadlineModal
          deadline={deadlines.find((d) => d.id === modal.id)}
          onClose={closeModal}
          onReviewed={markReviewed}
          onDismiss={dismissDeadline}
          onOpenFiling={(filingId) => go('filingDetail', filingId)}
        />
      )}
      {modal?.type === 'amendments' && (
        <AmendmentsModal filing={FILINGS.find((f) => f.id === modal.id)} onClose={closeModal} />
      )}
      {modal?.type === 'doc' && (
        <DocPreviewModal
          doc={allDocs.find((d) => d.id === modal.id)}
          onClose={closeModal}
          onDownload={() => { showToast('Download started'); closeModal() }}
          onVersions={() => setModal({ type: 'versions', id: modal.id })}
        />
      )}
      {modal?.type === 'versions' && (
        <VersionsModal doc={allDocs.find((d) => d.id === modal.id)} onClose={closeModal} showToast={showToast} />
      )}
      {modal?.type === 'impact' && (
        <ImpactModal entry={feed.find((e) => e.id === modal.id)} onClose={closeModal} go={go} />
      )}

      {paletteOpen && <CommandPalette go={go} onClose={() => setPaletteOpen(false)} openModal={setModal} />}

      {toast && (
        <div className="toast">
          <span>✓</span> {toast}
        </div>
      )}
    </>
  )
}

/* sidebar heartbeat — owns its own one-second tick so the rest of the
   app doesn't re-render with it; resets whenever the log gains a row */
function AgentStatus({ syncedAt }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    setSecs(0)
    const t = setInterval(() => setSecs((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [syncedAt])
  return (
    <div className="agent-status">
      <span className="live-dot" />
      Agent online · {secs}s ago
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Command palette                                                     */
/* ------------------------------------------------------------------ */

function CommandPalette({ go, onClose, openModal }) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const entries = useMemo(() => {
    const list = [
      ...ALL_NAV.map((n) => ({ group: 'Go to', label: n.label, sub: '', run: () => go(n.id) })),
      { group: 'Go to', label: 'New filing', sub: '', run: () => go('wizard') },
      ...FILINGS.map((f) => ({ group: 'Filings', label: f.name, sub: f.agency, run: () => go('filingDetail', f.id) })),
      ...CONFLICTS.map((c) => ({ group: 'Conflicts', label: c.network, sub: c.band, run: () => go('conflictDetail', c.id) })),
      ...MODULES.map((m) => ({ group: 'Modules', label: m.name, sub: m.main, run: () => go('moduleDetail', m.id) })),
      ...SPACECRAFT.map((s) => ({ group: 'Spacecraft', label: s.name, sub: s.norad, run: () => go('spacecraft', s.id) })),
      ...DOCUMENTS.map((d) => ({ group: 'Documents', label: d.name, sub: d.version, run: () => { onClose(); openModal({ type: 'doc', id: d.id }) } })),
    ]
    if (!q.trim()) return list.slice(0, 12)
    const needle = q.toLowerCase()
    return list.filter((e) => (e.label + ' ' + e.sub + ' ' + e.group).toLowerCase().includes(needle)).slice(0, 24)
  }, [q, go, onClose, openModal])

  useEffect(() => { setIdx(0) }, [q])

  const onKey = (e) => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, entries.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); entries[idx]?.run() }
  }

  let lastGroup = null

  return (
    <div className="palette-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette">
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="palette-list">
          {entries.length === 0 && <div className="empty">Nothing matches “{q}”</div>}
          {entries.map((e, i) => {
            const header = e.group !== lastGroup ? e.group : null
            lastGroup = e.group
            return (
              <div key={i}>
                {header && <div className="palette-group">{header}</div>}
                <button
                  className={`palette-item${i === idx ? ' on' : ''}`}
                  onMouseEnter={() => setIdx(i)}
                  onClick={e.run}
                >
                  <span>{e.label}</span>
                  {e.sub && <span className="pi-sub">{e.sub}</span>}
                </button>
              </div>
            )
          })}
        </div>
        <div className="palette-foot">
          <span>↑↓ move</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  )
}
