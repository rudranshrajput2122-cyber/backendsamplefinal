import { useEffect, useMemo, useState } from 'react'
import {
  Tag, Check, Breadcrumbs, WorkingBar, SuccessBlock, FreqViz, Lifecycle,
  Segmented, Th, useSort, Empty,
} from './ui.jsx'
import {
  OPERATOR, EXTRACTED_FIELDS, FILINGS, FILING_STATUS_COLOR,
  LIFECYCLE_STAGES, AGENCIES, CONFLICTS, SEVERITY_COLOR, CONFLICT_STATUS_COLOR,
  SPACECRAFT, SPACECRAFT_FILINGS, MODULES, SPECTRUM_ALLOCATIONS, GROUND_STATIONS,
  ITAR_COMPONENTS, NOAA_CONDITIONS, LAUNCH_CHECKLIST, INSURANCE_CHECKLIST,
  DOCUMENTS, FEED, SEVERITY_TAG, freqGeometry,
} from './data.js'

export const resolveConflictStatus = (c, usasatStatus) => (c.id === 'usasat' ? usasatStatus : c.status)

/* ================================================================== */
/* Dashboard                                                           */
/* ================================================================== */

export function Dashboard({
  deadlines, usasatStatus, ruleReady, noaaSigned, go, openModal,
}) {
  const [owner, setOwner] = useState('all')

  const outreachSent = usasatStatus === 'Outreach sent'

  /* each obligation carries the single action that resolves it */
  const ACTIONS = {
    telesat: outreachSent
      ? { label: 'Track', run: () => go('conflictDetail', 'usasat') }
      : { label: 'Draft response', run: () => openModal('letter'), primary: true },
    noaa: noaaSigned
      ? { label: 'View', run: () => go('filingDetail', 'noaa-a1') }
      : { label: 'Sign & submit', run: () => openModal('attest'), primary: true },
    export: ruleReady
      ? { label: 'View', run: () => go('moduleDetail', 'itar') }
      : { label: 'Review', run: () => openModal('rule'), primary: true },
    fcc: { label: 'Review', run: () => go('filingDetail', 'schf-a1') },
    debris: { label: 'Open', run: () => go('filingDetail', 'sdmp-a1') },
  }

  const owners = ['all', ...new Set(deadlines.map((d) => d.owner))]
  const shown = owner === 'all' ? deadlines : deadlines.filter((d) => d.owner === owner)

  return (
    <div className="view view-fill">
      {/* the single thing that most needs attention */}
      <div className="note">
        <div className="note-text">
          {outreachSent ? (
            <>A coordination letter has gone to Telesat over the USASAT-NG 214 overlap. The
              response window runs <strong>six days</strong>; any reply or filing change appears here.</>
          ) : (
            <>A new Ku-band filing, USASAT-NG 214, overlaps the licensed 13.85–14.0 GHz uplink by{' '}
              <strong>80 MHz</strong>. The comment window is open, and silence is treated as
              agreement to the filing.</>
          )}
        </div>
        <div className="note-actions">
          {outreachSent ? (
            <button className="btn btn-primary" onClick={() => go('conflictDetail', 'usasat')}>
              Outreach status
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => openModal('letter')}>
              Draft response
            </button>
          )}
          <button className="btn btn-outline" onClick={() => go('conflictDetail', 'usasat')}>
            Interference analysis
          </button>
        </div>
      </div>

      <div className="panel flush" style={{ marginBottom: 46 }}>
        <div className="panel-title">
          Obligations
          <span className="t-right">
            <select className="input" value={owner} onChange={(e) => setOwner(e.target.value)}>
              {owners.map((o) => (
                <option key={o} value={o}>{o === 'all' ? 'All owners' : o}</option>
              ))}
            </select>
          </span>
        </div>

        {shown.length === 0 && <Empty>Nothing assigned to this owner.</Empty>}

        {shown.map((d) => {
          const a = ACTIONS[d.id]
          return (
            <div key={d.id} className="deadline-row">
              <button
                style={{ flex: 1, textAlign: 'left', padding: 0 }}
                onClick={() => openModal({ type: 'deadline', id: d.id })}
              >
                <div className="dl-title">{d.title}</div>
                <div className="dl-sub">{d.sub} · {d.owner}</div>
              </button>
              <div className="dl-right">
                <span className={`dl-count${d.done ? ' done' : d.days <= 7 ? ' soon' : ''}`}>
                  {d.done ? '✓' : d.days}
                  {!d.done && <span className="u">days</span>}
                </span>
                {a && !d.done && (
                  <button className={`btn btn-sm ${a.primary ? 'btn-primary' : 'btn-outline'}`} onClick={a.run}>
                    {a.label}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="panel flush">
        <div className="panel-title">Constellation</div>
        <table className="table">
          <thead>
            <tr>
              <th>Spacecraft</th>
              <th>Authority</th>
              <th>Status</th>
              <th>Orbit</th>
              <th className="num">Licensed EIRP</th>
              <th className="num">Observed</th>
              <th>Next obligation</th>
            </tr>
          </thead>
          <tbody>
            {SPACECRAFT.map((s) => (
              <tr key={s.id} className="rowlink" onClick={() => go('spacecraft', s.id)}>
                <td className="name">{s.name}</td>
                <td className="muted">{s.authority}</td>
                <td>
                  <Tag color={s.status === 'In orbit' ? 'green' : 'grey'}>{s.status}</Tag>
                </td>
                <td className="muted">{s.orbit}</td>
                <td className="num muted">42.3 dBW</td>
                <td className="num" style={{ color: s.rf === 'Drift detected' ? 'var(--a2)' : undefined }}>
                  {s.obsEirp}
                </td>
                <td className="muted">{s.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Filing wizard                                                       */
/* ================================================================== */

export function FilingWizard({ onExit, onGenerated, showToast }) {
  const [step, setStep] = useState(1)
  const [uploaded, setUploaded] = useState(false)
  const [extracted, setExtracted] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [fields, setFields] = useState(EXTRACTED_FIELDS)
  const [editing, setEditing] = useState(null)
  const [target, setTarget] = useState('schs')

  useEffect(() => {
    if (step === 2) {
      setExtracted(false)
      const t = setTimeout(() => setExtracted(true), 1900)
      return () => clearTimeout(t)
    }
    if (step === 3) {
      setGenerated(false)
      const t = setTimeout(() => { setGenerated(true); onGenerated() }, 1900)
      return () => clearTimeout(t)
    }
  }, [step])

  const setValue = (field, value) => setFields((fs) => fs.map((f) => (f.field === field ? { ...f, value, confidence: 100, edited: true } : f)))
  const low = fields.filter((f) => f.confidence < 95).length

  const TARGETS = [
    { value: 'schs', label: 'FCC Schedule S' },
    { value: 'api', label: 'ITU API' },
    { value: 'noaa', label: 'NOAA CRSRA' },
  ]

  return (
    <div className="view wizard">
      <button className="btn btn-ghost" style={{ marginBottom: 16, paddingLeft: 0 }} onClick={onExit}>
        ← Back to dashboard
      </button>

      <div className="wizard-steps">
        <div className={`step-pill ${step === 1 ? 'active' : 'done'}`}>
          <span className="step-num">{step > 1 ? '✓' : '1'}</span> Upload
        </div>
        <div className="step-line" />
        <div className={`step-pill ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
          <span className="step-num">{step > 2 ? '✓' : '2'}</span> Extraction
        </div>
        <div className="step-line" />
        <div className={`step-pill ${step === 3 ? 'active' : ''}`}>
          <span className="step-num">3</span> Generation
        </div>
      </div>

      {step === 1 && (
        <div className="panel">
          <div className="panel-title">
            Source documentation
            <span className="t-right">
              <Segmented value={target} onChange={setTarget} options={TARGETS} />
            </span>
          </div>
          {!uploaded ? (
            <button className="dropzone" onClick={() => setUploaded(true)}>
              <div style={{ fontSize: 22, marginBottom: 10, color: 'var(--a2)' }}>⇪</div>
              Drop operator documentation
              <div style={{ fontSize: 11.5, marginTop: 6 }}>PDF, DOCX, or link-budget spreadsheets</div>
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: '34px 0' }}>
              <span className="file-chip">
                <span style={{ color: 'var(--a2)' }}>✓</span> aurora1_bus_icd_rev_c.pdf · 4.2 MB
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary" disabled={!uploaded} onClick={() => setStep(2)}>
              Extract with agent
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="panel">
          {!extracted ? (
            <WorkingBar label="Agent extracting technical parameters from aurora1_bus_icd_rev_c.pdf…" />
          ) : (
            <>
              <div className="panel-title">
                Extracted parameters
                <span className="t-right" style={{ fontSize: 11, color: low ? 'var(--a1)' : 'var(--faint)' }}>
                  {low ? `${low} below 95% confidence — confirm before filing` : 'all fields confirmed'}
                </span>
              </div>
              <table className="table" style={{ marginBottom: 16 }}>
                <thead>
                  <tr><th>Field</th><th>Extracted value</th><th className="num">Confidence</th><th></th></tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.field}>
                      <td className="muted">{f.field}</td>
                      <td className="mono">
                        {editing === f.field ? (
                          <input
                            className="input"
                            autoFocus
                            defaultValue={f.value}
                            onBlur={(e) => { setValue(f.field, e.target.value); setEditing(null) }}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                        ) : (
                          <>
                            <span style={{ color: f.edited ? 'var(--a3)' : 'var(--a2)', marginRight: 8 }}>✓</span>
                            {f.value}
                          </>
                        )}
                      </td>
                      <td className={`num mono ${f.confidence < 95 ? 'confidence' : 'muted'}`}>{f.confidence}%</td>
                      <td className="num">
                        <div className="row-actions">
                          <button className="icon-btn" title="Edit" onClick={() => setEditing(f.field)}>✎</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>Validate &amp; generate</button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="panel">
          {!generated ? (
            <WorkingBar label="Rules engine validating against FCC Part 25 / ITU Appendix 4 / 15 CFR 960…" />
          ) : (
            <SuccessBlock title="Filing generated" sub="Validated against Part 25, ITU Appendix 4, and NOAA Tier 2 conditions">
              <div className="doc-preview">
                <div className="doc-title">
                  {TARGETS.find((t) => t.value === target).label.toUpperCase()} · TECHNICAL ANNEX · AURORA-1
                </div>
                {fields.map((f) => (
                  <div className="doc-row" key={f.field}><span>{f.field}</span><span>{f.value}</span></div>
                ))}
                <div className="doc-row"><span>Validation</span><span>Part 25 ✓ · App. 4 ✓ · 960 ✓</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => showToast('Download started')}>Download filing</button>
                <button className="btn btn-primary" onClick={onExit}>Back to dashboard</button>
              </div>
            </SuccessBlock>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* Filings                                                             */
/* ================================================================== */

export function FilingsView({ go, starred, toggleStar, noaaSigned }) {
  const [q, setQ] = useState('')
  const [agency, setAgency] = useState('all')
  const [onlyStarred, setOnlyStarred] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return FILINGS.map((f) =>
      f.id === 'noaa-a1' && noaaSigned ? { ...f, status: 'Filed', deadline: '—' } : f,
    ).filter((f) => {
      if (agency !== 'all' && f.agency !== agency) return false
      if (onlyStarred && !starred.has(f.id)) return false
      if (!needle) return true
      return (f.name + f.type + f.ref + f.owner).toLowerCase().includes(needle)
    })
  }, [q, agency, onlyStarred, starred, noaaSigned])

  const { sorted, sort, toggle } = useSort(rows, 'name')

  const segs = [
    { value: 'all', label: 'All', count: FILINGS.length },
    ...AGENCIES.map((a) => ({ value: a, label: a, count: FILINGS.filter((f) => f.agency === a).length })),
  ]

  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Filings</div>
          <div className="page-sub">Every regulatory filing across the {OPERATOR.constellation} program</div>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => go('wizard')}>+ New filing</button>
        </div>
      </div>

      <div className="toolbar">
        <input className="input input-search" placeholder="Search name, reference, owner…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Segmented value={agency} onChange={setAgency} options={segs} />
        <button className={`btn btn-sm ${onlyStarred ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOnlyStarred((s) => !s)}>
          ★ Watchlist
        </button>
        <span className="toolbar-count">{sorted.length} of {FILINGS.length}</span>
      </div>

      <div className="panel flush">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <Th label="Filing" sortKey="name" sort={sort} onSort={toggle} />
              <Th label="Agency" sortKey="agency" sort={sort} onSort={toggle} />
              <Th label="Type" sortKey="type" sort={sort} onSort={toggle} />
              <Th label="Reference" sortKey="ref" sort={sort} onSort={toggle} />
              <Th label="Status" sortKey="status" sort={sort} onSort={toggle} />
              <Th label="Owner" sortKey="owner" sort={sort} onSort={toggle} />
              <Th label="Submitted" sortKey="submitted" sort={sort} onSort={toggle} />
              <Th label="Next deadline" sortKey="deadline" sort={sort} onSort={toggle} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => (
              <tr key={f.id} className="rowlink" onClick={() => go('filingDetail', f.id)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`icon-btn star${starred.has(f.id) ? ' on' : ''}`}
                    onClick={() => toggleStar(f.id)}
                    title={starred.has(f.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    {starred.has(f.id) ? '★' : '☆'}
                  </button>
                </td>
                <td className="name">{f.name}</td>
                <td className="mono muted">{f.agency}</td>
                <td className="muted">{f.type}</td>
                <td className="mono muted">{f.ref}</td>
                <td><Tag color={FILING_STATUS_COLOR[f.status]}>{f.status}</Tag></td>
                <td className="mono muted">{f.owner}</td>
                <td className="mono muted">{f.submitted}</td>
                <td className="muted">{f.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <Empty>No filings match those filters.</Empty>}
      </div>
    </div>
  )
}

export function FilingDetail({ id, go, openModal, showToast, starred, toggleStar }) {
  const filing = FILINGS.find((f) => f.id === id)
  const [regenerating, setRegenerating] = useState(false)

  const regenerate = () => {
    setRegenerating(true)
    setTimeout(() => { setRegenerating(false); showToast('Filing regenerated from current parameters') }, 1500)
  }

  return (
    <div className="view">
      <Breadcrumbs trail={[{ label: 'Filings', onClick: () => go('filings') }, { label: filing.name }]} />

      <div className="dash-header">
        <div>
          <div className="page-title">{filing.name}</div>
          <div className="page-sub">
            {filing.agency} · {filing.type} · {filing.ref} · owner {filing.owner}
          </div>
        </div>
        <div className="head-actions">
          <button className={`icon-btn star${starred?.has(filing.id) ? ' on' : ''}`} onClick={() => toggleStar(filing.id)}>
            {starred?.has(filing.id) ? '★' : '☆'}
          </button>
          <Tag color={FILING_STATUS_COLOR[filing.status]}>{filing.status}</Tag>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Lifecycle</div>
        <Lifecycle stages={LIFECYCLE_STAGES} current={filing.stage} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">Technical parameters</div>
          <div className="param-grid">
            {EXTRACTED_FIELDS.map((f) => (
              <div className="param-cell" key={f.field}>
                <div className="k">{f.field}</div>
                <div className="v">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">Document preview</div>
          <div className="doc-preview" style={{ margin: 0, maxWidth: 'none' }}>
            <div className="doc-title">{filing.type.toUpperCase()} · AURORA-1</div>
            <div className="doc-row"><span>Reference</span><span>{filing.ref}</span></div>
            <div className="doc-row"><span>Orbit</span><span>550 km SSO</span></div>
            <div className="doc-row"><span>Inclination</span><span>97.59°</span></div>
            <div className="doc-row"><span>Uplink band</span><span>13.85–14.0 GHz</span></div>
            <div className="doc-row"><span>Downlink band</span><span>10.7–10.95 GHz</span></div>
            <div className="doc-row"><span>EIRP</span><span>42.3 dBW</span></div>
            <div className="doc-row"><span>Status</span><span>{filing.status}</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => showToast('Download started')}>Download</button>
        <button className="btn btn-outline" onClick={() => openModal({ type: 'amendments', id: filing.id })}>
          View amendments
        </button>
        <button className="btn btn-outline" onClick={regenerate} disabled={regenerating}>
          {regenerating ? <><span className="spinner" /> Regenerating…</> : 'Regenerate'}
        </button>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Conflicts                                                           */
/* ================================================================== */

export function ConflictsView({ usasatStatus, go }) {
  const [sev, setSev] = useState('all')

  const rows = CONFLICTS.map((c) => ({ ...c, resolved: resolveConflictStatus(c, usasatStatus) }))
    .filter((c) => sev === 'all' || c.severity === sev)

  const { sorted, sort, toggle } = useSort(rows, 'overlapMHz', 'desc')

  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Conflicts</div>
          <div className="page-sub">Interference conflicts detected against licensed bands</div>
        </div>
      </div>

      <div className="toolbar">
        <Segmented
          value={sev}
          onChange={setSev}
          options={[
            { value: 'all', label: 'All', count: CONFLICTS.length },
            ...['High', 'Medium', 'Low'].map((s) => ({
              value: s, label: s, count: CONFLICTS.filter((c) => c.severity === s).length,
            })),
          ]}
        />
        <span className="toolbar-count">{sorted.length} shown</span>
      </div>

      <div className="panel flush">
        <table className="table">
          <thead>
            <tr>
              <Th label="Conflicting network" sortKey="network" sort={sort} onSort={toggle} />
              <Th label="Operator" sortKey="operator" sort={sort} onSort={toggle} />
              <Th label="Band" sortKey="band" sort={sort} onSort={toggle} />
              <Th label="Overlap" sortKey="overlapMHz" sort={sort} onSort={toggle} num />
              <Th label="Source" sortKey="ific" sort={sort} onSort={toggle} />
              <Th label="Severity" sortKey="severity" sort={sort} onSort={toggle} />
              <Th label="Status" sortKey="resolved" sort={sort} onSort={toggle} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="rowlink" onClick={() => go('conflictDetail', c.id)}>
                <td className="name">{c.network}</td>
                <td className="muted">{c.operator}</td>
                <td className="mono muted">{c.band}</td>
                <td className="num mono">{c.overlapMHz} MHz</td>
                <td className="mono muted">{c.ific}</td>
                <td><Tag color={SEVERITY_COLOR[c.severity]}>{c.severity}</Tag></td>
                <td><Tag color={CONFLICT_STATUS_COLOR[c.resolved]}>{c.resolved}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <Empty>No conflicts at that severity.</Empty>}
      </div>
    </div>
  )
}

export function ConflictDetail({ id, usasatStatus, go, openModal }) {
  const conflict = CONFLICTS.find((c) => c.id === id)
  const status = resolveConflictStatus(conflict, usasatStatus)
  const timeline =
    conflict.id === 'usasat' && usasatStatus === 'Outreach sent'
      ? [...conflict.timeline, { date: 'Jul 31, 2026', who: 'Lab ops', text: 'Coordination letter sent to Telesat — 6-day response window tracked' }]
      : conflict.timeline

  return (
    <div className="view">
      <Breadcrumbs trail={[{ label: 'Conflicts', onClick: () => go('conflicts') }, { label: conflict.network }]} />

      <div className="dash-header">
        <div>
          <div className="page-title">Interference analysis — {conflict.network}</div>
          <div className="page-sub">{conflict.operator} · {conflict.band} · {conflict.ific}</div>
        </div>
        <div className="head-actions">
          <Tag color={SEVERITY_COLOR[conflict.severity]}>{conflict.severity}</Tag>
          <Tag color={CONFLICT_STATUS_COLOR[status]}>{status}</Tag>
        </div>
      </div>

      <div className="param-grid" style={{ marginBottom: 14 }}>
        <div className="param-cell"><div className="k">Overlap</div><div className="v accent">{conflict.overlapMHz} MHz</div></div>
        <div className="param-cell"><div className="k">Band fraction</div><div className="v">{conflict.overlap}</div></div>
        <div className="param-cell"><div className="k">Our allocation</div><div className="v">{conflict.ours[0]}–{conflict.ours[1]}</div></div>
        <div className="param-cell"><div className="k">Their filing</div><div className="v">{conflict.theirs[0]}–{conflict.theirs[1]}</div></div>
        <div className="param-cell"><div className="k">Circular</div><div className="v">{conflict.ific}</div></div>
      </div>

      <FreqViz conflict={conflict} geometry={freqGeometry(conflict.ours, conflict.theirs)} />

      <div className="two-col">
        <div className="panel flush">
          <div className="panel-title">Coordination candidates</div>
          <table className="table">
            <thead><tr><th>Network</th><th className="num">Overlap</th><th>Position</th></tr></thead>
            <tbody>
              {CONFLICTS.map((c) => (
                <tr key={c.id} className={`rowlink${c.id === conflict.id ? ' sel' : ''}`} onClick={() => go('conflictDetail', c.id)}>
                  <td className="name">{c.network}</td>
                  <td className="num mono">{c.overlap}</td>
                  <td className="muted">{c.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-title">Coordination timeline</div>
          {timeline.map((e, i) => (
            <div className="co-entry" key={i}>
              <div className="co-date">{e.date}</div>
              <div>
                <div className="co-who">{e.who}</div>
                <div className="co-text">{e.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {status !== 'Resolved' && (
          <button className="btn btn-primary" onClick={() => openModal('letter')}>Draft response</button>
        )}
        <button className="btn btn-outline" onClick={() => go('conflicts')}>Back to conflicts</button>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Compliance modules                                                  */
/* ================================================================== */

export function ModulesView({ usasatStatus, ruleReady, noaaSigned, go }) {
  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Compliance modules</div>
          <div className="page-sub">Regulatory workstreams across the mission lifecycle</div>
        </div>
      </div>
      <div className="module-grid">
        {MODULES.map((m) => {
          const cleared =
            (m.id === 'spectrum' && usasatStatus === 'Outreach sent') ||
            (m.id === 'itar' && ruleReady) ||
            (m.id === 'noaa' && noaaSigned)
          return (
            <button key={m.id} className="status-card" onClick={() => go('moduleDetail', m.id)}>
              <div className="card-name">{m.name}</div>
              <div className="card-main">{m.main}</div>
              <div className="card-sub">{m.sub}</div>
              <Tag color={cleared ? 'green' : m.tagColor}>{cleared ? 'Cleared' : m.tag}</Tag>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const MODULE_TITLES = {
  spectrum: 'Spectrum',
  noaa: 'Remote sensing · NOAA',
  itar: 'Export control',
  launch: 'Launch · FAA',
  insurance: 'Insurance',
  postlaunch: 'Post-launch',
}

export function ModuleDetail({ id, usasatStatus, ruleReady, noaaSigned, go, openModal, showToast }) {
  return (
    <div className="view">
      <Breadcrumbs
        trail={[{ label: 'Compliance modules', onClick: () => go('modules') }, { label: MODULE_TITLES[id] }]}
      />
      {id === 'spectrum' && <SpectrumDetail usasatStatus={usasatStatus} go={go} />}
      {id === 'noaa' && <NoaaDetail noaaSigned={noaaSigned} openModal={openModal} />}
      {id === 'itar' && <ItarDetail ruleReady={ruleReady} openModal={openModal} />}
      {id === 'launch' && <LaunchDetail showToast={showToast} />}
      {id === 'insurance' && <InsuranceDetail showToast={showToast} />}
      {id === 'postlaunch' && <PostlaunchDetail go={go} />}
    </div>
  )
}

function SpectrumDetail({ usasatStatus, go }) {
  return (
    <>
      <div className="dash-header">
        <div>
          <div className="page-title">Spectrum</div>
          <div className="page-sub">Licensed allocations, earth stations, and coordination status</div>
        </div>
        <button className="btn btn-outline" onClick={() => go('conflicts')}>View conflicts →</button>
      </div>

      <div className="panel flush">
        <div className="panel-title">Licensed frequency allocations</div>
        <table className="table">
          <thead>
            <tr><th>Band</th><th>Direction</th><th>Service</th><th>Status</th><th>Note</th></tr>
          </thead>
          <tbody>
            {SPECTRUM_ALLOCATIONS.map((a) => (
              <tr key={a.band}>
                <td className="mono name">{a.band}</td>
                <td className="muted">{a.direction}</td>
                <td className="mono muted">{a.service}</td>
                <td><Tag color={a.color}>{a.status}</Tag></td>
                <td className="muted">{a.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel flush">
        <div className="panel-title">Earth station licensing</div>
        <table className="table">
          <thead>
            <tr><th>Station</th><th>Host nation</th><th>Bands</th><th>Authorization</th><th>Status</th><th>Note</th></tr>
          </thead>
          <tbody>
            {GROUND_STATIONS.map((g) => (
              <tr key={g.id}>
                <td className="name">{g.name} <span className="mono muted">({g.code})</span></td>
                <td className="muted">{g.country}</td>
                <td className="mono muted">{g.bands}</td>
                <td className="mono muted">{g.license}</td>
                <td><Tag color={g.color}>{g.status}</Tag></td>
                <td className="muted">{g.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel flush">
        <div className="panel-title">Coordination status per operator</div>
        <table className="table">
          <thead><tr><th>Operator</th><th>Network</th><th>Status</th></tr></thead>
          <tbody>
            <tr className="rowlink" onClick={() => go('conflictDetail', 'usasat')}>
              <td className="name">Telesat (USASAT-NG 214)</td>
              <td className="muted">Ku-band uplink</td>
              <td><Tag color={CONFLICT_STATUS_COLOR[usasatStatus]}>{usasatStatus}</Tag></td>
            </tr>
            <tr className="rowlink" onClick={() => go('conflictDetail', 'lightspeed')}>
              <td className="name">Telesat Lightspeed</td>
              <td className="muted">Ku-band uplink</td>
              <td><Tag color="green">Agreement signed</Tag></td>
            </tr>
            <tr className="rowlink" onClick={() => go('conflictDetail', 'oneweb')}>
              <td className="name">Eutelsat OneWeb Gen2</td>
              <td className="muted">Ku-band downlink</td>
              <td><Tag color="amber">Monitoring EPFD</Tag></td>
            </tr>
            <tr className="rowlink" onClick={() => go('conflictDetail', 'o3b')}>
              <td className="name">SES O3b mPOWER</td>
              <td className="muted">Ku band-edge</td>
              <td><Tag color="green">No coordination required</Tag></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

function NoaaDetail({ noaaSigned, openModal }) {
  const open = NOAA_CONDITIONS.filter((c) => c.color !== 'green' && !(noaaSigned && c.id === 'n4')).length
  return (
    <>
      <div className="dash-header">
        <div>
          <div className="page-title">Remote sensing · NOAA</div>
          <div className="page-sub">
            CRSRA licence {OPERATOR.noaaLicense} · Tier 2 · 15 CFR Part 960
          </div>
        </div>
        <Tag color={open ? 'amber' : 'green'}>{open ? `${open} conditions open` : 'All conditions met'}</Tag>
      </div>

      {!noaaSigned && (
        <div className="banner banner-red">
          <span>
            Annual operational report due in <strong style={{ color: 'var(--a2)' }}>11 days</strong> — 47 of 49 fields
            auto-populated, 2 PI attestations outstanding.
          </span>
          <button className="btn btn-primary" onClick={() => openModal('attest')}>Sign &amp; submit</button>
        </div>
      )}
      {noaaSigned && (
        <div className="banner banner-green">
          <span>✓ Annual operational report submitted — 49/49 fields, both attestations signed.</span>
        </div>
      )}

      <div className="param-grid" style={{ marginBottom: 14 }}>
        <div className="param-cell"><div className="k">Tier</div><div className="v">Tier 2</div></div>
        <div className="param-cell"><div className="k">GSD at nadir</div><div className="v">0.82 m</div></div>
        <div className="param-cell"><div className="k">Licensed SC</div><div className="v">5 on orbit</div></div>
        <div className="param-cell"><div className="k">Shutter test</div><div className="v">Jun 14, 2026</div></div>
        <div className="param-cell"><div className="k">Report cadence</div><div className="v accent">Semi-annual</div></div>
      </div>

      <div className="panel flush">
        <div className="panel-title">Licence conditions</div>
        <table className="table">
          <thead><tr><th>Condition</th><th>Detail</th><th>Status</th></tr></thead>
          <tbody>
            {NOAA_CONDITIONS.map((c) => {
              const done = noaaSigned && c.id === 'n4'
              return (
                <tr key={c.id}>
                  <td className="name">{c.cond}</td>
                  <td className="muted">{c.detail}</td>
                  <td>
                    <Tag color={done ? 'green' : c.color}>{done ? 'Submitted' : c.status}</Tag>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ItarDetail({ ruleReady, openModal }) {
  return (
    <>
      <div className="dash-header">
        <div>
          <div className="page-title">Export control</div>
          <div className="page-sub">ITAR / EAR classifications, screening, and technical assistance agreements</div>
        </div>
        <Tag color={ruleReady ? 'green' : 'red'}>{ruleReady ? 'Screening current' : 'Action required'}</Tag>
      </div>

      <div className="banner banner-amber">
        <span>
          The program books commercial tasking revenue, so the <strong>fundamental research exclusion</strong> no
          longer covers AURORA hardware or the technical data shared with the Svalbard gateway.
        </span>
      </div>

      <div className={`banner ${ruleReady ? 'banner-green' : 'banner-red'}`}>
        <span>
          {ruleReady
            ? '✓ Updated classification package ready — DDTC Cat XV revision addressed, TAA amendment drafted'
            : '2 components move from EAR 9A515 to the USML under the DDTC Cat XV revision (effective Jul 14, 2026)'}
        </span>
        <button className={ruleReady ? 'btn btn-outline' : 'btn btn-primary'} onClick={() => openModal('rule')}>
          {ruleReady ? 'View package' : 'Review impact'}
        </button>
      </div>

      <div className="panel flush">
        <div className="panel-title">Component classifications</div>
        <table className="table">
          <thead>
            <tr>
              <th>Component</th><th>Current classification</th><th>Post-revision</th>
              <th>Jurisdiction</th><th>Last reviewed</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ITAR_COMPONENTS.map((c) => (
              <tr key={c.component}>
                <td className="name">{c.component}</td>
                <td className="mono">{c.cls}</td>
                <td className="mono" style={{ color: c.newCls ? 'var(--a2)' : 'var(--faint)' }}>{c.newCls || '—'}</td>
                <td className="muted">{c.affected && ruleReady ? 'State' : c.jurisdiction}</td>
                <td className="mono muted">{c.reviewed}</td>
                <td>
                  {c.affected && !ruleReady ? (
                    <Tag color="red">Reclassification pending</Tag>
                  ) : (
                    <Tag color="green">Current</Tag>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function LaunchDetail({ showToast }) {
  return (
    <>
      <div className="dash-header">
        <div>
          <div className="page-title">Launch · FAA</div>
          <div className="page-sub">Part 450 license LLO 26-041 · valid through Dec 2027</div>
        </div>
        <Tag color="green">License active</Tag>
      </div>

      <div className="param-grid" style={{ marginBottom: 14 }}>
        <div className="param-cell"><div className="k">Window</div><div className="v">Q3 2026</div></div>
        <div className="param-cell"><div className="k">Vehicle</div><div className="v">Rideshare</div></div>
        <div className="param-cell"><div className="k">Corridor</div><div className="v">West coast SSO</div></div>
        <div className="param-cell"><div className="k">Payload</div><div className="v">AURORA-1F</div></div>
        <div className="param-cell"><div className="k">MPL bound</div><div className="v accent">$42M</div></div>
      </div>

      <div className="panel">
        <div className="panel-title">Payload review checklist</div>
        {LAUNCH_CHECKLIST.map((item) => (
          <div className="check-item" key={item.main}>
            <Check />
            <div>
              <div>{item.main}</div>
              <div className="sub">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={() => showToast('License package downloaded')}>
        Download license package
      </button>
    </>
  )
}

function InsuranceDetail({ showToast }) {
  const [regenerating, setRegenerating] = useState(false)
  const regenerate = () => {
    setRegenerating(true)
    setTimeout(() => { setRegenerating(false); showToast('Documentation package regenerated') }, 1600)
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <div className="page-title">Insurance</div>
          <div className="page-sub">Launch + in-orbit coverage · Policy AUR-2026-114</div>
        </div>
        <Tag color="green">Documentation current</Tag>
      </div>

      <div className="param-grid" style={{ marginBottom: 14 }}>
        <div className="param-cell"><div className="k">Coverage</div><div className="v">$42M MPL</div></div>
        <div className="param-cell"><div className="k">Term</div><div className="v">Launch + 12 mo</div></div>
        <div className="param-cell"><div className="k">Premium</div><div className="v">Paid</div></div>
        <div className="param-cell"><div className="k">Indemnity</div><div className="v">Trustees 26-114</div></div>
      </div>

      <div className="panel">
        <div className="panel-title">Underwriter documentation</div>
        {INSURANCE_CHECKLIST.map((item) => (
          <div className="check-item" key={item.main}>
            <Check />
            <div>
              <div>{item.main}</div>
              <div className="sub">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={regenerate} disabled={regenerating}>
        {regenerating ? <><span className="spinner" /> Regenerating package…</> : 'Regenerate package'}
      </button>
    </>
  )
}

function PostlaunchDetail({ go }) {
  const [reportState, setReportState] = useState('idle')
  const generateReport = () => {
    setReportState('generating')
    setTimeout(() => setReportState('done'), 1900)
  }
  const inOrbit = SPACECRAFT.filter((s) => s.status === 'In orbit')

  return (
    <>
      <div className="dash-header">
        <div>
          <div className="page-title">Post-launch</div>
          <div className="page-sub">RF telemetry cross-checked against licensed parameters</div>
        </div>
        <Tag color="amber">1 drift flag</Tag>
      </div>

      <div className="panel flush">
        <div className="panel-title">Telemetry vs. licence</div>
        <table className="table">
          <thead>
            <tr>
              <th>Spacecraft</th><th>Licensed EIRP</th><th>Observed EIRP</th><th className="num">Δ</th>
              <th>Licensed uplink</th><th>Observed uplink</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inOrbit.map((s) => {
              const delta = (parseFloat(s.obsEirp) - 42.3).toFixed(1)
              return (
                <tr key={s.id} className="rowlink" onClick={() => go('spacecraft', s.id)}>
                  <td className="name">{s.name}</td>
                  <td className="mono muted">42.3 dBW</td>
                  <td className="mono">{s.obsEirp}</td>
                  <td className="num mono" style={{ color: Math.abs(delta) > 0.5 ? 'var(--a2)' : 'var(--faint)' }}>
                    {delta > 0 ? '+' : ''}{delta}
                  </td>
                  <td className="mono muted">13.85–14.0 GHz</td>
                  <td className="mono">{s.obsFreq}</td>
                  <td><Tag color={s.rf === 'Nominal' ? 'green' : 'amber'}>{s.rf}</Tag></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-title">Deorbit compliance — FCC 5-year rule</div>
        {inOrbit.map((s) => (
          <div key={s.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              <span className="muted" style={{ color: 'var(--faint)' }}>
                Deorbit by {s.deorbitBy} · {s.yearsLeft} yrs remaining
              </span>
            </div>
            <div className="deorbit-track">
              <div className="deorbit-fill" style={{ width: `${100 - (s.yearsLeft / 10) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {reportState === 'done' ? (
        <div className="banner banner-green" style={{ marginBottom: 0 }}>
          <span>✓ Semi-annual report generated — queued for signature</span>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={generateReport} disabled={reportState === 'generating'}>
          {reportState === 'generating' ? <><span className="spinner" /> Compiling from telemetry…</> : 'Generate semi-annual report'}
        </button>
      )}
    </>
  )
}

/* ================================================================== */
/* Documents                                                           */
/* ================================================================== */

export function DocumentsView({ openModal, showToast }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')

  const types = ['all', ...new Set(DOCUMENTS.map((d) => d.type))]
  const rows = DOCUMENTS.filter((d) => {
    if (type !== 'all' && d.type !== type) return false
    const n = q.trim().toLowerCase()
    return !n || (d.name + d.mission + d.owner).toLowerCase().includes(n)
  })

  const { sorted, sort, toggle } = useSort(rows, 'date', 'desc')

  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Generated filings, letters, and compliance packages</div>
        </div>
      </div>

      <div className="toolbar">
        <input className="input input-search" placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        <span className="toolbar-count">{sorted.length} of {DOCUMENTS.length}</span>
      </div>

      <div className="panel flush">
        <table className="table">
          <thead>
            <tr>
              <Th label="Name" sortKey="name" sort={sort} onSort={toggle} />
              <Th label="Type" sortKey="type" sort={sort} onSort={toggle} />
              <Th label="Linked" sortKey="mission" sort={sort} onSort={toggle} />
              <Th label="Owner" sortKey="owner" sort={sort} onSort={toggle} />
              <Th label="Size" sortKey="size" sort={sort} onSort={toggle} />
              <Th label="Date" sortKey="date" sort={sort} onSort={toggle} />
              <Th label="Version" sortKey="version" sort={sort} onSort={toggle} />
              <th className="num"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id} className="rowlink" onClick={() => openModal({ type: 'doc', id: d.id })}>
                <td className="name mono">{d.name}</td>
                <td className="muted">{d.type}</td>
                <td className="muted">{d.mission}</td>
                <td className="mono muted">{d.owner}</td>
                <td className="mono muted">{d.size}</td>
                <td className="mono muted">{d.date}</td>
                <td className="mono">{d.version}</td>
                <td className="num" onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">
                    <button className="icon-btn" title="Download" onClick={() => showToast(`Downloading ${d.name}`)}>⤓</button>
                    <button className="icon-btn" title="Versions" onClick={() => openModal({ type: 'versions', id: d.id })}>⧉</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <Empty>No documents match that search.</Empty>}
      </div>
    </div>
  )
}

/* ================================================================== */
/* Regulatory feed                                                     */
/* ================================================================== */

export function FeedView() {
  const [src, setSrc] = useState('all')
  const sources = ['all', ...new Set(FEED.map((f) => f.source))]
  const rows = FEED.filter((f) => src === 'all' || f.source === src)

  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Regulatory feed</div>
          <div className="page-sub">Rule changes and publications affecting the {OPERATOR.constellation} program</div>
        </div>
      </div>

      <div className="toolbar">
        <Segmented
          value={src}
          onChange={setSrc}
          options={sources.map((s) => ({
            value: s, label: s === 'all' ? 'All' : s,
            count: s === 'all' ? FEED.length : FEED.filter((f) => f.source === s).length,
          }))}
        />
        <span className="toolbar-count">{rows.length} entries</span>
      </div>

      <div className="panel">
        {rows.map((e) => (
          <div className="feed-item" key={e.id}>
            <div className="feed-date">{e.date}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="feed-title">{e.title}</div>
              <div className="feed-text">{e.text}</div>
            </div>
            <Tag color="grey">{e.source}</Tag>
            <Tag color={SEVERITY_TAG[e.severity]}>{e.severity}</Tag>
          </div>
        ))}
        {rows.length === 0 && <Empty>Nothing from that source.</Empty>}
      </div>
    </div>
  )
}

/* ================================================================== */
/* Spacecraft detail                                                   */
/* ================================================================== */

export function SpacecraftDetail({ id, go }) {
  const s = SPACECRAFT.find((x) => x.id === id)
  const filings = FILINGS.filter((f) => SPACECRAFT_FILINGS.includes(f.id))
  const modules = [
    { name: 'Spectrum', ok: true, target: 'spectrum' },
    { name: 'Remote sensing', ok: s.tasking === 'Commercial', target: 'noaa' },
    { name: 'Export control', ok: false, target: 'itar' },
    { name: 'Launch · FAA', ok: true, target: 'launch' },
    { name: 'Insurance', ok: true, target: 'insurance' },
    { name: 'Post-launch', ok: s.rf !== 'Drift detected', target: 'postlaunch' },
  ]

  return (
    <div className="view">
      <Breadcrumbs trail={[{ label: 'Dashboard', onClick: () => go('dashboard') }, { label: s.name }]} />

      <div className="dash-header">
        <div>
          <div className="page-title">{s.name}</div>
          <div className="page-sub">
            {s.status === 'In orbit' ? `In orbit since ${s.launched}` : 'Awaiting launch · Q3 2026 window'}
            {' · '}{s.bus} bus · {s.tasking} tasking
          </div>
        </div>
        <div className="head-actions">
          <Tag color={s.authority === 'Part 25' ? 'green' : 'amber'}>{s.authority}</Tag>
          <Tag color={s.status === 'In orbit' ? 'green' : 'grey'}>{s.status}</Tag>
        </div>
      </div>

      <div className="param-grid" style={{ marginBottom: 14 }}>
        <div className="param-cell"><div className="k">NORAD</div><div className="v">{s.norad}</div></div>
        <div className="param-cell"><div className="k">COSPAR</div><div className="v">{s.cospar}</div></div>
        <div className="param-cell"><div className="k">Orbit</div><div className="v">{s.orbit}</div></div>
        <div className="param-cell"><div className="k">Inclination</div><div className="v">97.59°</div></div>
        <div className="param-cell"><div className="k">Launched</div><div className="v">{s.launched}</div></div>
        <div className="param-cell"><div className="k">Mission end</div><div className="v">{s.missionEnd}</div></div>
      </div>

      <div className="two-col">
        <div className="panel flush">
          <div className="panel-title">Licensed vs. observed</div>
          <table className="table">
            <thead><tr><th>Parameter</th><th>Licensed</th><th>Observed</th><th>Status</th></tr></thead>
            <tbody>
              <tr>
                <td className="muted">EIRP</td>
                <td className="mono">42.3 dBW</td>
                <td className="mono">{s.obsEirp}</td>
                <td>
                  {s.status !== 'In orbit' ? <span className="muted">—</span> : (
                    <Tag color={s.rf === 'Nominal' ? 'green' : 'amber'}>
                      {s.rf === 'Nominal' ? 'Within limits' : '+0.8 dB drift'}
                    </Tag>
                  )}
                </td>
              </tr>
              <tr>
                <td className="muted">Uplink</td>
                <td className="mono">13.85–14.0 GHz</td>
                <td className="mono">{s.obsFreq}</td>
                <td>{s.status !== 'In orbit' ? <span className="muted">—</span> : <Tag color="green">Within limits</Tag>}</td>
              </tr>
              <tr>
                <td className="muted">Authority</td>
                <td className="mono">Part 25</td>
                <td className="mono">{s.authority}</td>
                <td>
                  <Tag color={s.authority === 'Part 25' ? 'green' : 'amber'}>
                    {s.authority === 'Part 25' ? 'Aligned' : 'STA expiring'}
                  </Tag>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel flush">
          <div className="panel-title">Deadline chain</div>
          <div className={`deadline-row ${s.rf === 'Drift detected' ? 'bl-amber' : 'bl-grey'}`}>
            <div>
              <div className="dl-title">{s.next.split(' · ')[0]}</div>
              <div className="dl-sub">Tracked by Kolhar agent</div>
            </div>
            <Tag color={s.rf === 'Drift detected' ? 'amber' : 'grey'}>{s.next.split(' · ')[1]}</Tag>
          </div>
          <div className="deadline-row bl-grey">
            <div>
              <div className="dl-title">Semi-annual orbital debris report</div>
              <div className="dl-sub">Auto-filled from telemetry</div>
            </div>
            <Tag color="grey">41 days</Tag>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Compliance status per module</div>
        <div className="chip-row">
          {modules.map((m) => (
            <button key={m.name} className="mod-chip" onClick={() => go('moduleDetail', m.target)}>
              <span style={{ color: m.ok ? 'var(--dim)' : 'var(--a2)' }}>{m.ok ? '✓' : '!'}</span>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {s.status === 'In orbit' && (
        <div className="panel">
          <div className="panel-title">Deorbit timeline — FCC 5-year rule</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--faint)' }}>Mission end {s.missionEnd}</span>
            <span style={{ fontWeight: 600 }}>{s.yearsLeft} years remaining</span>
            <span style={{ color: 'var(--faint)' }}>Deorbit by {s.deorbitBy}</span>
          </div>
          <div className="deorbit-track">
            <div className="deorbit-fill" style={{ width: `${100 - (s.yearsLeft / 10) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="panel flush">
        <div className="panel-title">Filings covering this spacecraft</div>
        <table className="table">
          <tbody>
            {filings.map((f) => (
              <tr key={f.id} className="rowlink" onClick={() => go('filingDetail', f.id)}>
                <td className="name">{f.name}</td>
                <td className="mono muted">{f.agency}</td>
                <td className="muted">{f.type}</td>
                <td><Tag color={FILING_STATUS_COLOR[f.status]}>{f.status}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Settings                                                            */
/* ================================================================== */

export function SettingsView({ showToast }) {
  const [toggles, setToggles] = useState({
    deadlines: true, ific: true, rules: true, telemetry: false, noaa: true,
  })
  const [lead, setLead] = useState(14)
  const flip = (k) => setToggles((t) => ({ ...t, [k]: !t[k] }))

  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Organization, notifications, and integrations</div>
        </div>
        <button className="btn btn-primary" onClick={() => showToast('Settings saved')}>Save changes</button>
      </div>

      <div className="panel">
        <div className="panel-title">Organization</div>
        <div className="param-grid">
          <div className="param-cell"><div className="k">Operator</div><div className="v">{OPERATOR.name}</div></div>
          <div className="param-cell"><div className="k">FCC FRN</div><div className="v">{OPERATOR.frn}</div></div>
          <div className="param-cell"><div className="k">Call sign</div><div className="v">{OPERATOR.callSign}</div></div>
          <div className="param-cell"><div className="k">ITU admin</div><div className="v">USA</div></div>
          <div className="param-cell"><div className="k">NOAA licence</div><div className="v">{OPERATOR.noaaLicense}</div></div>
          <div className="param-cell"><div className="k">Seats</div><div className="v">{OPERATOR.seats}</div></div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">
            Notifications
            <span className="t-right" style={{ fontSize: 11, color: 'var(--faint)' }}>
              lead time
              <select className="input" value={lead} onChange={(e) => setLead(Number(e.target.value))} style={{ marginLeft: 8 }}>
                {[7, 14, 30, 60].map((n) => <option key={n} value={n}>{n} days</option>)}
              </select>
            </span>
          </div>
          {[
            ['deadlines', 'Deadline alerts', `Email + in-app, ${lead}/7/1 days out`],
            ['ific', 'IFIC scan results', 'Alert on any overlap with licensed bands'],
            ['rules', 'Rule-change alerts', 'FCC, ITU, NOAA, DDTC, FAA sources'],
            ['noaa', 'CRSRA condition monitoring', 'Restricted-area tasking screen and shutter tests'],
            ['telemetry', 'Telemetry drift warnings', 'Alert when observed RF departs the licence'],
          ].map(([k, label, sub]) => (
            <div className="settings-row" key={k}>
              <div>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div style={{ color: 'var(--faint)', fontSize: 11, marginTop: 2 }}>{sub}</div>
              </div>
              <button className={`toggle${toggles[k] ? ' on' : ''}`} onClick={() => flip(k)} aria-label={label} />
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">Integrations</div>
          {[
            ['Telemetry feed', 'Connected · streaming from the campus MOC API'],
            ['ITU IFIC monitor', 'Scanning each biweekly circular on publication'],
            ['FCC ELS bridge', 'Direct submission of generated filings'],
            ['NOAA CRSRA portal', 'Report submission and condition sync'],
            ['University export-control office', 'Routing for TAA and licence amendments'],
          ].map(([name, sub]) => (
            <div className="check-item" key={name}>
              <Check />
              <div style={{ flex: 1 }}>
                <div>{name}</div>
                <div className="sub">{sub}</div>
              </div>
              <Tag color="green">Active</Tag>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
