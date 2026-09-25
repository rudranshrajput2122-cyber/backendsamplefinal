import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Tag, Check, Breadcrumbs, WorkingBar, SuccessBlock, FreqViz, Lifecycle,
  Segmented, Th, useSort, Empty, AgentSteps, CountUp, useTicker, useTypewriter, formatBytes,
} from './ui.jsx'
import {
  OPERATOR, EXTRACTED_FIELDS, FILINGS, FILING_STATUS_COLOR,
  LIFECYCLE_STAGES, AGENCIES, CONFLICTS, SEVERITY_COLOR, CONFLICT_STATUS_COLOR,
  SPACECRAFT, SPACECRAFT_FILINGS, MODULES, SPECTRUM_ALLOCATIONS, GROUND_STATIONS,
  ITAR_COMPONENTS, NOAA_CONDITIONS, LAUNCH_CHECKLIST, INSURANCE_CHECKLIST,
  DOCUMENTS, FEED, SEVERITY_TAG, freqGeometry, SAMPLE_FILES, SCAN_NOISE, VALIDATION_CHECKS,
  ACTIVITY, interferenceModel,
} from './data.js'
import { INTERFERENCE_BASE, UPLOAD_SAMPLES, REVISION_DIFF } from './data.js'

export const resolveConflictStatus = (c, usasatStatus) => (c.id === 'usasat' ? usasatStatus : c.status)

/* ================================================================== */
/* Dashboard                                                           */
/* ================================================================== */

export function Dashboard({
  deadlines, usasatStatus, ruleReady, noaaSigned, go, openModal, activity,
}) {
  const [owner, setOwner] = useState('all')
  const tick = useTicker(2400)

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

      <div className="panel flush" style={{ marginBottom: 46 }}>
        <div className="panel-title">
          Constellation
          <span className="t-right live-label"><span className="live-dot" />Telemetry · pass {1840 + tick}</span>
        </div>
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
            {SPACECRAFT.map((s, i) => (
              <tr key={s.id} className="rowlink" onClick={() => go('spacecraft', s.id)}>
                <td className="name">{s.name}</td>
                <td className="muted">{s.authority}</td>
                <td>
                  <Tag color={s.status === 'In orbit' ? 'green' : 'grey'}>{s.status}</Tag>
                </td>
                <td className="muted">{s.orbit}</td>
                <td className="num muted">42.3 dBW</td>
                <td className="num" style={{ color: s.rf === 'Drift detected' ? 'var(--a2)' : undefined }}>
                  <LiveEirp value={s.obsEirp} tick={tick} seed={i} />
                </td>
                <td className="muted">{s.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel flush">
        <div className="panel-title">
          Agent activity
          <span className="t-right live-label"><span className="live-dot" />Running</span>
        </div>
        {activity.slice(0, 8).map((a) => (
          <div key={a.id} className={`activity-row${a.fresh ? ' fresh' : ''}`}>
            <span className="activity-t mono">{a.t}</span>
            <span className={`activity-who${a.kind === 'agent' ? ' agent' : ''}`}>{a.who}</span>
            <span className="activity-text">{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* observed EIRP wanders a tenth of a dB either way, like a real pass does */
function LiveEirp({ value, tick, seed }) {
  const base = parseFloat(value)
  if (Number.isNaN(base)) return <>{value}</>
  const wobble = (((tick * 7 + seed * 13) % 5) - 2) * 0.05
  const v = (base + wobble).toFixed(1)
  return <span key={v} className="live-val">{v} dBW</span>
}

/* ================================================================== */
/* Filing wizard                                                       */
/* ================================================================== */

export function FilingWizard({ onExit, onGenerated, showToast }) {
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState([])
  const [extracted, setExtracted] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [fields, setFields] = useState(EXTRACTED_FIELDS)
  const [editing, setEditing] = useState(null)
  const [target, setTarget] = useState('schs')

  const TARGETS = [
    { value: 'schs', label: 'FCC Schedule S' },
    { value: 'api', label: 'ITU API' },
    { value: 'noaa', label: 'NOAA CRSRA' },
  ]
  const targetLabel = TARGETS.find((t) => t.value === target).label

  const setValue = (field, value) => setFields((fs) => fs.map((f) => (f.field === field ? { ...f, value, confidence: 100, edited: true } : f)))
  const low = fields.filter((f) => f.confidence < 95).length
  const allParsed = files.length > 0 && files.every((f) => f.parsed)

  const checks = useMemo(
    () => [
      { text: `Loading ${targetLabel} schema`, detail: `${fields.length} extracted fields mapped to form items`, ms: 420 },
      ...VALIDATION_CHECKS.map((c, i) => ({ text: `${c.rule} — ${c.text}`, detail: c.detail, ms: 300 + ((i * 97) % 260) })),
      { text: 'Rendering technical annex (PDF/A-2b)', detail: '14 pages · signed hash 9f3c…a41e', ms: 650 },
    ],
    [targetLabel, fields.length],
  )

  const onChecksDone = useCallback(() => {
    setGenerated(true)
    onGenerated({
      id: `doc-gen-${target}`,
      name: `AURORA-1_${targetLabel.replace(/\s+/g, '_')}_annex.pdf`,
      type: 'Filing',
      mission: 'AURORA-1',
      date: 'Jul 31, 2026',
      version: 'v1',
      kind: 'filing',
      size: '1.6 MB',
      owner: 's.chandra',
      isNew: true,
    })
  }, [onGenerated, target, targetLabel])

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
          <UploadZone files={files} setFiles={setFiles} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary" disabled={!allParsed} onClick={() => { setExtracted(false); setStep(2) }}>
              Extract with agent
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="panel">
          {!extracted ? (
            <ExtractionRun files={files} onDone={() => setExtracted(true)} />
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
                  <tr><th>Field</th><th>Extracted value</th><th>Source</th><th className="num">Confidence</th><th></th></tr>
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
                      <td className="muted" style={{ fontSize: 11 }}>{f.edited ? 'Operator override' : f.source}</td>
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
                <button className="btn btn-primary" onClick={() => { setGenerated(false); setStep(3) }}>Validate &amp; generate</button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="panel">
          {!generated ? (
            <AgentSteps title="Rules engine · Part 25 / ITU App. 4 / 15 CFR 960" steps={checks} onDone={onChecksDone} />
          ) : (
            <SuccessBlock title="Filing generated" sub={`${checks.length - 2} of ${checks.length - 2} checks passed · saved to Documents`}>
              <div className="doc-preview">
                <div className="doc-title">
                  {targetLabel.toUpperCase()} · TECHNICAL ANNEX · AURORA-1
                </div>
                {fields.map((f, i) => (
                  <div className="doc-row row-in" style={{ animationDelay: `${i * 70}ms` }} key={f.field}>
                    <span>{f.field}</span><span>{f.value}</span>
                  </div>
                ))}
                <div className="doc-row row-in" style={{ animationDelay: `${fields.length * 70}ms` }}>
                  <span>Validation</span><span>Part 25 ✓ · App. 4 ✓ · 960 ✓</span>
                </div>
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

/* ------------------------------------------------------------------ */
/* Upload — real drag/drop or picker; the transfer itself is simulated */
/* ------------------------------------------------------------------ */

const estimatePages = (name, size) => {
  if (/\.xlsx?$/i.test(name)) return Math.max(1, Math.min(8, Math.round(size / 60000)))
  return Math.max(1, Math.min(320, Math.round(size / 52000)))
}

function UploadZone({
  files, setFiles,
  samples = SAMPLE_FILES,
  sampleLabel = 'or use AURORA-1 sample documents →',
  prompt = 'Drop operator documentation, or click to browse',
  hint = 'PDF, DOCX, or link-budget spreadsheets',
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv',
  compact = false,
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const add = (list) => {
    const incoming = list.map((f, i) => ({
      id: `${f.name}-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      pages: f.pages ?? estimatePages(f.name, f.size),
      progress: 0,
      parsed: false,
    }))
    setFiles((fs) => [...fs, ...incoming.filter((n) => !fs.some((f) => f.name === n.name))])
  }

  /* one timer drives every in-flight file: upload, then a short parse */
  const busy = files.some((f) => !f.parsed)
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => {
      setFiles((fs) =>
        fs.map((f) => {
          if (f.parsed) return f
          if (f.progress >= 100) return { ...f, parseTicks: (f.parseTicks || 0) + 1, parsed: (f.parseTicks || 0) >= 7 }
          /* bigger files move slower, like a real transfer */
          const rate = Math.max(3, 22 - f.size / 400000)
          return { ...f, progress: Math.min(100, f.progress + rate * (0.6 + Math.random() * 0.8)) }
        }),
      )
    }, 90)
    return () => clearInterval(t)
  }, [busy, setFiles])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) add([...e.dataTransfer.files])
  }

  return (
    <>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}${files.length || compact ? ' compact' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="dz-glyph">⇪</div>
        {dragging ? 'Release to upload' : prompt}
        <div style={{ fontSize: 11.5, marginTop: 6 }}>{hint}</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => { add([...e.target.files]); e.target.value = '' }}
        />
      </div>

      {files.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => add(samples)}>{sampleLabel}</button>
        </div>
      ) : (
        <div className="file-list">
          {files.map((f) => (
            <div key={f.id} className="file-row">
              <span className="file-ext mono">{(f.name.split('.').pop() || '').toUpperCase().slice(0, 4)}</span>
              <div className="file-main">
                <div className="file-name">
                  <span className="mono">{f.name}</span>
                  <span className="file-meta mono">
                    {f.parsed
                      ? `${formatBytes(f.size)} · ${f.pages} ${/\.xlsx?$/i.test(f.name) ? 'sheets' : 'pages'} · text layer ok`
                      : f.progress < 100
                        ? `${formatBytes((f.size * f.progress) / 100)} of ${formatBytes(f.size)}`
                        : 'Parsing layout…'}
                  </span>
                </div>
                <div className="file-track">
                  <div className={`file-fill${f.progress >= 100 && !f.parsed ? ' parsing' : ''}`} style={{ width: `${f.progress}%` }} />
                </div>
              </div>
              <span className="file-state">
                {f.parsed ? <span style={{ color: 'var(--a2)' }}>✓</span> : <span className="spinner" />}
              </span>
              <button
                className="icon-btn"
                title="Remove"
                onClick={() => setFiles((fs) => fs.filter((x) => x.id !== f.id))}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Upload → agent run → result. The one pattern every "drop a file and */
/* let Kolhar work" surface in the console shares.                      */
/* ------------------------------------------------------------------ */

export function UploadAndRun({
  title, samples, sampleLabel, prompt, hint, accept,
  steps, onDone, children, runTitle, again = 'Upload another', onAgain,
}) {
  const [files, setFiles] = useState([])
  const [phase, setPhase] = useState('upload')
  const [result, setResult] = useState(null)
  const [runSteps, setRunSteps] = useState([])
  const allParsed = files.length > 0 && files.every((f) => f.parsed)

  /* start the run a beat after the last file finishes parsing */
  useEffect(() => {
    if (phase !== 'upload' || !allParsed) return
    const t = setTimeout(() => { setRunSteps(steps(files)); setPhase('running') }, 450)
    return () => clearTimeout(t)
  }, [phase, allParsed, files, steps])

  const finish = useCallback(() => {
    setResult(onDone?.(files) ?? true)
    setPhase('done')
  }, [files, onDone])

  const reset = () => { setFiles([]); setResult(null); setPhase('upload'); onAgain?.() }

  return (
    <div className="upload-run">
      {title && <div className="upload-run-title">{title}</div>}
      {phase === 'upload' && (
        <UploadZone
          files={files} setFiles={setFiles} samples={samples} sampleLabel={sampleLabel}
          prompt={prompt} hint={hint} accept={accept} compact
        />
      )}
      {phase === 'running' && <AgentSteps title={runTitle} steps={runSteps} onDone={finish} />}
      {phase === 'done' && (
        <>
          {typeof children === 'function' ? children(result, files) : children}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={reset}>{again} →</button>
          </div>
        </>
      )}
    </div>
  )
}

const fileKind = (name) => {
  const n = name.toLowerCase()
  if (/letter|coordination|telesat/.test(n)) return 'Coordination letter'
  if (/itar|taa|export|bom|eccn/.test(n)) return 'Export control'
  if (/noaa|crsra|imag/.test(n)) return 'Remote sensing'
  if (/insur|underwrit|policy/.test(n)) return 'Insurance'
  if (/faa|launch|450/.test(n)) return 'License package'
  return 'Filing'
}

/* ------------------------------------------------------------------ */
/* Extraction — scan each document, fields fly out as they're found    */
/* ------------------------------------------------------------------ */

const SOURCE_DOC = { 'Bus ICD': 0, 'Frequency plan': 1, 'Link budget': 2 }

function buildScanEvents(files) {
  const byDoc = files.map(() => [])
  EXTRACTED_FIELDS.forEach((f) => {
    const doc = SOURCE_DOC[f.source.split(' · ')[0]] % files.length
    const page = parseInt((f.source.match(/p\.(\d+)/) || [])[1], 10) || 1
    byDoc[doc].push({ kind: 'hit', field: f, page })
  })
  let noise = 0
  const events = []
  byDoc.forEach((hits, doc) => {
    const pages = files[doc].pages
    const n = Math.max(2, 4 - hits.length / 2)
    const seq = []
    for (let i = 0; i < n; i++) {
      seq.push({ kind: 'scan', text: SCAN_NOISE[noise++ % SCAN_NOISE.length], page: Math.round(((i + 1) / (n + 1)) * pages) || 1 })
    }
    /* interleave hits into the scan lines by page so the counter only moves forward */
    const merged = [...seq, ...hits].sort((a, b) => a.page - b.page)
    merged.forEach((e) => events.push({ ...e, doc, page: Math.min(e.page, pages) }))
    events.push({ kind: 'close', doc, page: pages, text: `${files[doc].name} — ${hits.length} parameters, ${pages} ${pages === 1 ? 'page' : 'pages'} read` })
  })
  return events
}

function ExtractionRun({ files, onDone }) {
  const events = useMemo(() => buildScanEvents(files), [files])
  const [i, setI] = useState(0)

  useEffect(() => {
    if (i >= events.length) {
      const t = setTimeout(onDone, 700)
      return () => clearTimeout(t)
    }
    const e = events[i]
    const t = setTimeout(() => setI((x) => x + 1), e.kind === 'hit' ? 520 : 300)
    return () => clearTimeout(t)
  }, [i, events, onDone])

  const current = events[Math.min(i, events.length - 1)]
  const found = events.slice(0, i).filter((e) => e.kind === 'hit')
  const lastHit = events[i - 1]?.kind === 'hit' ? events[i - 1] : null
  const log = events.slice(Math.max(0, i - 5), i)

  return (
    <div className="extract">
      <div className="panel-title">
        Agent extracting technical parameters
        <span className="t-right mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
          {found.length} / {EXTRACTED_FIELDS.length} fields
        </span>
      </div>

      <div className="extract-grid">
        <div>
          <div className="doc-tabs">
            {files.map((f, d) => (
              <span
                key={f.id}
                className={`doc-tab mono${d === current.doc ? ' on' : ''}${d < current.doc || i >= events.length ? ' read' : ''}`}
              >
                {d < current.doc || i >= events.length ? '✓ ' : ''}{f.name.length > 22 ? `${f.name.slice(0, 20)}…` : f.name}
              </span>
            ))}
          </div>
          <div className="scan-doc" key={current.doc}>
            {Array.from({ length: 16 }, (_, k) => (
              <div
                key={k}
                className={`scan-line${lastHit && k === (lastHit.page * 5) % 16 ? ' hit' : ''}`}
                style={{ width: `${55 + ((k * 37 + current.page * 11) % 42)}%` }}
              />
            ))}
            <div className="scan-beam" />
            {lastHit && (
              <span className="scan-chip mono" key={lastHit.field.field} style={{ top: `${(((lastHit.page * 5) % 16) / 16) * 100}%` }}>
                {lastHit.field.field} · {lastHit.field.value}
              </span>
            )}
            <div className="scan-page mono">p. {current.page} / {files[current.doc].pages}</div>
          </div>
        </div>

        <div className="found-list">
          {found.length === 0 && <div className="found-empty">Reading document structure…</div>}
          {found.map((e) => (
            <div className="found-row" key={e.field.field}>
              <span className="found-k">{e.field.field}</span>
              <span className="found-v mono">{e.field.value}</span>
              <span className={`found-c mono${e.field.confidence < 95 ? ' low' : ''}`}>
                <CountUp to={e.field.confidence} ms={600} />%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="scan-log mono">
        {log.map((e, k) => (
          <div key={i - log.length + k} className={`scan-log-line ${e.kind}`}>
            <span className="scan-log-page">{files[e.doc].name.split('_').slice(0, 2).join('_')} p.{e.page}</span>
            {e.kind === 'hit' ? `→ ${e.field.field} = ${e.field.value}  (${e.field.source})` : e.text}
          </div>
        ))}
      </div>
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

export function FilingDetail({ id, go, openModal, showToast, starred, toggleStar, logActivity }) {
  const filing = FILINGS.find((f) => f.id === id)
  const [regenerating, setRegenerating] = useState(false)
  const [revising, setRevising] = useState(false)

  const regenerate = () => setRegenerating(true)
  const regenSteps = useMemo(() => [
    { text: `Loading current parameters for ${filing.ref}`, detail: `${EXTRACTED_FIELDS.length} fields · 3 amendments applied`, ms: 380 },
    { text: 'Re-running validation against current rules', detail: `${VALIDATION_CHECKS.length} of ${VALIDATION_CHECKS.length} checks pass`, ms: 620 },
    { text: 'Rendering filing (PDF/A-2b)', detail: 'new version v4', ms: 520 },
  ], [filing.ref])
  const onRegenerated = useCallback(() => {
    setRegenerating(false)
    showToast('Filing regenerated from current parameters')
    logActivity?.(`Regenerated ${filing.name} — v4, all checks pass`)
  }, [filing.name, showToast, logActivity])

  const revisionSteps = useCallback((files) => [
    ...files.map((f) => ({ text: `Extracting parameters from ${f.name}`, detail: `${f.pages} ${/\.xlsx?$/i.test(f.name) ? 'sheets' : 'pages'} read`, ms: 620 })),
    { text: `Diffing against filed values in ${filing.ref}`, detail: '2 parameters changed · 6 unchanged', ms: 480 },
    { text: 'Checking whether the change needs a modification filing', detail: 'EIRP +0.2 dB → minor modification, 47 CFR §25.117', ms: 520 },
  ], [filing.ref])

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
        <button className="btn btn-outline" onClick={() => setRevising(true)} disabled={revising}>
          Upload revised source
        </button>
      </div>

      {regenerating && (
        <div className="panel" style={{ marginTop: 22 }}>
          <AgentSteps title="Regenerating filing" steps={regenSteps} onDone={onRegenerated} />
        </div>
      )}

      {revising && (
        <div className="panel" style={{ marginTop: 22 }}>
          <UploadAndRun
            title="Revised source documentation"
            samples={UPLOAD_SAMPLES.revision}
            sampleLabel="or use link budget v8 →"
            prompt="Drop a revised ICD, frequency plan or link budget"
            hint="Kolhar re-extracts and diffs it against what was filed"
            runTitle="Comparing against the filed version"
            steps={revisionSteps}
            onDone={() => { logActivity?.(`Diffed revised source against ${filing.ref} — 2 parameters changed`); return true }}
            again="Close"
            onAgain={() => setRevising(false)}
          >
            <table className="table" style={{ marginBottom: 14 }}>
              <thead><tr><th>Parameter</th><th>Filed</th><th>Revised</th><th></th></tr></thead>
              <tbody>
                {REVISION_DIFF.map((d, i) => (
                  <tr key={d.field} className="row-in" style={{ animationDelay: `${i * 90}ms` }}>
                    <td className="muted">{d.field}</td>
                    <td className="mono muted">{d.from}</td>
                    <td className="mono" style={{ color: d.from !== d.to ? 'var(--a2)' : undefined }}>{d.to}</td>
                    <td>{d.from !== d.to ? <Tag color="amber">Changed</Tag> : <Tag color="grey">Same</Tag>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="btn btn-primary"
              onClick={() => { showToast('Modification drafted — queued for review'); logActivity?.(`Drafted minor modification for ${filing.ref} (EIRP 42.3 → 42.5 dBW)`) }}
            >
              Draft modification
            </button>
          </UploadAndRun>
        </div>
      )}
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

export function ConflictDetail({ id, usasatStatus, go, openModal, logActivity }) {
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

      <FreqViz key={conflict.id} conflict={conflict} geometry={freqGeometry(conflict.ours, conflict.theirs)} />

      <InterferenceCalc key={`calc-${conflict.id}`} conflict={conflict} status={status} logActivity={logActivity} />

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

/* ------------------------------------------------------------------ */
/* Interference computation — runs the model in data.js step by step   */
/* ------------------------------------------------------------------ */

const CALC_MS = 4200

const REFINE_SAMPLES = [
  { name: 'aurora1_ephemeris_2026-07-31.oem', size: 842000, pages: 1 },
  { name: 'ku_phased_array_pattern_meas.csv', size: 128000, pages: 1 },
]

function InterferenceCalc({ conflict, status, logActivity }) {
  /* uploaded operator data replaces the generic geometry and pattern */
  const [inputs, setInputs] = useState(null)
  const [refining, setRefining] = useState(false)
  const m = useMemo(() => interferenceModel(conflict, inputs), [conflict, inputs])
  const { p } = m
  const [runId, setRunId] = useState(0)

  const refineSteps = useCallback((files) => [
    ...files.map((f) => ({ text: `Parsing ${f.name}`, detail: /\.oem$|\.tle$|ephem/i.test(f.name) ? 'CCSDS OEM · 6 SC · 1,440 states each' : 'antenna pattern · 361 cuts, 0.5° step', ms: 520 })),
    { text: `Propagating AURORA-1 and ${conflict.network} over 24 h`, detail: `${Math.round(p.eventsPerDay * 1.0)} in-line events found`, ms: 640 },
    { text: 'Replacing ITU-R S.1528 reference pattern with measured pattern', detail: 'main lobe 8 % narrower than reference', ms: 420 },
    { text: 'Recomputing I/N time series', detail: '121 samples per event', ms: 480 },
  ], [conflict.network, p.eventsPerDay])

  const onRefined = useCallback(() => {
    const next = { thetaMin: INTERFERENCE_BASE(conflict).thetaMin * 1.45, beam: INTERFERENCE_BASE(conflict).beam * 0.92, uploaded: true }
    const before = interferenceModel(conflict, inputs).peak.iN
    const after = interferenceModel(conflict, next).peak.iN
    setInputs(next)
    setRunId((r) => r + 1)
    logActivity?.(`Re-ran interference for ${conflict.network} with uploaded ephemeris — peak I/N ${before.toFixed(1)} → ${after.toFixed(1)} dB`)
    return { before, after }
  }, [conflict, inputs, logActivity])
  const [prog, setProg] = useState(0)

  useEffect(() => {
    setProg(0)
    let raf
    const start = performance.now()
    const tick = (now) => {
      const k = Math.max(0, Math.min(1, (now - start) / CALC_MS))
      setProg(k)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [runId])

  const sign = (x) => (x > 0 ? '+' : '')
  const rows = [
    { k: 'Evaluation frequency', eq: `centre of ${conflict.overlapMHz} MHz overlap`, v: `${p.f.toFixed(3)} GHz` },
    { k: 'Free-space path loss', eq: `92.45 + 20·log ${p.slantKm} km + 20·log ${p.f} GHz`, v: `${m.fspl.toFixed(1)} dB` },
    { k: 'Interferer in-band EIRP', eq: `${p.eirp} dBW + 10·log(${conflict.overlapMHz} / ${p.bwTheirs} MHz)`, v: `${m.eirpInBand.toFixed(1)} dBW` },
    { k: 'Earth-station peak gain', eq: `20·log(D/λ) + 7.7 · D = ${p.dish} m`, v: `${m.gEs.toFixed(1)} dBi` },
    { k: 'Receiver noise kTB', eq: `−228.6 + 10·log ${p.tsys} K + 10·log ${p.bwOurs} MHz`, v: `${m.kTB.toFixed(1)} dBW` },
    { k: 'Closest separation', eq: inputs ? `${m.curve.length} samples · uploaded OEM ephemeris · measured pattern` : `${m.curve.length} samples · S.465 / S.1528 patterns`, v: `${m.peak.theta.toFixed(2)}°` },
    { k: 'Peak I/N', eq: 'I − N at closest approach', v: `${sign(m.peak.iN)}${m.peak.iN.toFixed(1)} dB`, hot: m.peak.iN > -6 },
    { k: 'ΔT/T at peak', eq: '10^(I/N ÷ 10) · criterion 6 %', v: m.deltaTT >= 100 ? `${(Math.round(m.deltaTT / 10) * 10).toLocaleString()} %` : `${m.deltaTT.toFixed(2)} %`, hot: m.deltaTT > 6 },
    { k: 'C/(N+I) degradation', eq: '10·log(1 + I/N)', v: `${m.cniLoss.toFixed(2)} dB` },
    { k: 'Time I/N > −6 dB', eq: `${m.exceedMin.toFixed(1)} min/pass × ${p.eventsPerDay} events/day · limit 0.03 %`, v: `${m.dailyPct.toFixed(3)} %`, hot: m.harmful },
  ]
  const shownRows = Math.min(rows.length, Math.floor(prog * (rows.length + 1)))
  const done = prog >= 1

  /* chart geometry */
  const W = 420
  const H = 190
  const pad = { l: 34, r: 10, t: 12, b: 24 }
  const yMin = -40
  const yMax = 15
  const x = (t) => pad.l + (t / p.pass) * (W - pad.l - pad.r)
  const y = (v) => pad.t + ((yMax - Math.max(yMin, Math.min(yMax, v))) / (yMax - yMin)) * (H - pad.t - pad.b)
  const visible = m.curve.slice(0, Math.max(2, Math.round(Math.max(0, (prog - 0.35) / 0.55) * m.curve.length)))
  const path = visible.map((c, i) => `${i ? 'L' : 'M'}${x(c.t).toFixed(1)},${y(c.iN).toFixed(1)}`).join(' ')
  const area = `${path} L${x(visible[visible.length - 1].t).toFixed(1)},${y(yMin)} L${x(0)},${y(yMin)} Z`
  const head = visible[visible.length - 1]

  const verdict = m.harmful
    ? status === 'Resolved'
      ? `Pre-agreement geometry exceeds the short-term criterion (${(m.dailyPct / 0.03).toFixed(1)}× the limit). The signed coordination agreement segments the band — residual overlap 0 MHz.`
      : `Harmful interference likely — the short-term criterion is exceeded ${(m.dailyPct / 0.03).toFixed(1)}× over. Coordination required under RR No. 9.7.`
    : `Within protection criteria — I/N peaks at ${m.peak.iN.toFixed(1)} dB, below the −12.2 dB long-term threshold. Monitoring only.`

  return (
    <div className="panel calc-panel">
      <div className="panel-title">
        Interference computation · {p.dir}{inputs ? ' · operator data' : ''}
        <span className="t-right">
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)', letterSpacing: 0 }}>
            {done ? `computed in ${(CALC_MS / 1000 * 0.93).toFixed(2)} s` : <><span className="spinner" /> computing…</>}
          </span>
          <button className="btn btn-outline btn-sm" disabled={!done} onClick={() => setRunId((r) => r + 1)}>Re-run</button>
        </span>
      </div>

      <div className="calc-grid">
        <div className="calc-rows">
          {rows.slice(0, shownRows).map((r) => (
            <div key={`${runId}-${r.k}`} className="calc-row">
              <div>
                <div className="calc-k">{r.k}</div>
                <div className="calc-eq mono">{r.eq}</div>
              </div>
              <div className={`calc-v mono${r.hot ? ' hot' : ''}`}>{r.v}</div>
            </div>
          ))}
          {!done && shownRows < rows.length && (
            <div className="calc-row pending"><span className="spinner" /> <span className="calc-eq mono">{rows[shownRows].k}…</span></div>
          )}
        </div>

        <div className="calc-chart">
          <div className="freq-row-label" style={{ marginBottom: 8 }}>I/N over one in-line pass</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="I over N across the pass">
            {[10, 0, -10, -20, -30, -40].map((v) => (
              <g key={v}>
                <line className="ch-grid" x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} />
                <text className="ch-lbl" x={pad.l - 6} y={y(v) + 3} textAnchor="end">{v}</text>
              </g>
            ))}
            <line className="ch-thr soft" x1={pad.l} x2={W - pad.r} y1={y(-12.2)} y2={y(-12.2)} />
            <text className="ch-lbl" x={W - pad.r} y={y(-12.2) + 11} textAnchor="end">−12.2 dB · ΔT/T 6 %</text>
            <line className="ch-thr" x1={pad.l} x2={W - pad.r} y1={y(-6)} y2={y(-6)} />
            <text className="ch-lbl hot" x={W - pad.r} y={y(-6) - 5} textAnchor="end">−6 dB short-term</text>
            {prog > 0.35 && (
              <>
                <path className="ch-area" d={area} />
                <path className="ch-line" d={path} />
                {!done && <circle className="ch-head" cx={x(head.t)} cy={y(head.iN)} r="3" />}
                {done && (
                  <g>
                    <circle className="ch-peak" cx={x(m.peak.t)} cy={y(m.peak.iN)} r="3.5" />
                    <text className="ch-lbl hot" x={x(m.peak.t)} y={y(m.peak.iN) - 8} textAnchor="middle">
                      {sign(m.peak.iN)}{m.peak.iN.toFixed(1)} dB
                    </text>
                  </g>
                )}
              </>
            )}
            {[0, p.pass / 2, p.pass].map((t) => (
              <text key={t} className="ch-lbl" x={x(t)} y={H - 6} textAnchor={t === 0 ? 'start' : t === p.pass ? 'end' : 'middle'}>
                {t === p.pass ? `${t} min` : `${t}`}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {done && (
        <div className={`calc-verdict${m.harmful && status !== 'Resolved' ? ' hot' : ''}`}>{verdict}</div>
      )}

      {done && !refining && (
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setRefining(true)}>
            {inputs ? 'Refine again with new data →' : 'Refine with your ephemeris / antenna pattern →'}
          </button>
        </div>
      )}
      {refining && (
        <div style={{ marginTop: 18 }}>
          <UploadAndRun
            title="Operator data"
            samples={REFINE_SAMPLES}
            sampleLabel="or use AURORA-1 ephemeris + measured pattern →"
            prompt="Drop ephemeris (OEM / TLE) or antenna pattern (CSV)"
            hint="Replaces the reference geometry and ITU-R patterns in the calculation above"
            accept=".oem,.tle,.txt,.csv,.xlsx"
            runTitle="Refining interference inputs"
            steps={refineSteps}
            onDone={onRefined}
            again="Close"
            onAgain={() => setRefining(false)}
          >
            {(r) => (
              <div className="calc-verdict">
                Re-computed with uploaded data — peak I/N {r.before.toFixed(1)} → <strong style={{ color: 'var(--a1)', fontWeight: 400 }}>{r.after.toFixed(1)} dB</strong>. Results above now use your inputs.
              </div>
            )}
          </UploadAndRun>
        </div>
      )}
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

export function ModuleDetail({ id, usasatStatus, ruleReady, noaaSigned, go, openModal, showToast, logActivity }) {
  return (
    <div className="view">
      <Breadcrumbs
        trail={[{ label: 'Compliance modules', onClick: () => go('modules') }, { label: MODULE_TITLES[id] }]}
      />
      {id === 'spectrum' && <SpectrumDetail usasatStatus={usasatStatus} go={go} />}
      {id === 'noaa' && <NoaaDetail noaaSigned={noaaSigned} openModal={openModal} />}
      {id === 'itar' && <ItarDetail ruleReady={ruleReady} openModal={openModal} logActivity={logActivity} />}
      {id === 'launch' && <LaunchDetail showToast={showToast} />}
      {id === 'insurance' && <InsuranceDetail showToast={showToast} logActivity={logActivity} />}
      {id === 'postlaunch' && <PostlaunchDetail go={go} logActivity={logActivity} />}
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

const BOM_STEPS = (files) => [
  ...files.map((f) => ({ text: `Parsing ${f.name}`, detail: '214 line items · 38 unique part numbers', ms: 560 })),
  { text: 'Collapsing to controlled assemblies', detail: `${ITAR_COMPONENTS.length} assemblies with export-relevant parts`, ms: 460 },
  { text: 'Matching against CCL 9A515 and USML Category XV', detail: 'current rule: DDTC Cat XV rev. effective Jul 14, 2026', ms: 620 },
  { text: 'Checking fundamental-research exclusion', detail: 'not available — commercial tasking revenue on record', ms: 420 },
  { text: 'Writing classification matrix v5', ms: 360 },
]

function ItarDetail({ ruleReady, openModal, logActivity }) {
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

      <div className="panel">
        <UploadAndRun
          title="Screen a bill of materials"
          samples={UPLOAD_SAMPLES.bom}
          sampleLabel="or use AURORA-1 BOM rev F →"
          prompt="Drop a BOM or parts list"
          hint="XLSX or CSV · every part is screened against the CCL and USML"
          accept=".xlsx,.xls,.csv"
          runTitle="Export-control screening"
          steps={BOM_STEPS}
          onDone={(files) => { logActivity?.(`Screened ${files[0].name} — ${ITAR_COMPONENTS.length} assemblies, 2 jurisdiction changes`); return true }}
        >
          <table className="table">
            <thead><tr><th>Assembly</th><th>Result</th><th>Jurisdiction</th></tr></thead>
            <tbody>
              {ITAR_COMPONENTS.map((c, i) => (
                <tr key={c.component} className="row-in" style={{ animationDelay: `${i * 110}ms` }}>
                  <td className="name">{c.component}</td>
                  <td className="mono" style={{ color: c.affected ? 'var(--a2)' : undefined }}>
                    {c.affected ? `${c.cls} → ${c.newCls}` : c.cls}
                  </td>
                  <td>{c.affected ? <Tag color="red">Moves to State</Tag> : <Tag color="green">{c.jurisdiction}</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </UploadAndRun>
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

function InsuranceDetail({ showToast, logActivity }) {
  const [regenerating, setRegenerating] = useState(false)
  const regenerate = () => setRegenerating(true)
  const steps = useMemo(() => [
    { text: 'Pulling current constellation state and filings', detail: '6 SC · 12 filings', ms: 420 },
    { text: 'Refreshing MPL and third-party liability figures', detail: '$42M MPL unchanged', ms: 460 },
    { text: 'Rebuilding underwriter data room export', detail: '6 documents · 2.9 MB', ms: 560 },
    { text: 'Syncing to underwriter portal', ms: 380 },
  ], [])
  const onDone = useCallback(() => {
    setRegenerating(false)
    showToast('Documentation package regenerated')
    logActivity?.('Regenerated underwriter documentation package — synced to data room')
  }, [showToast, logActivity])

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

      {regenerating && (
        <div className="panel"><AgentSteps title="Regenerating package" steps={steps} onDone={onDone} /></div>
      )}
      <button className="btn btn-primary" onClick={regenerate} disabled={regenerating}>
        {regenerating ? <><span className="spinner" /> Regenerating package…</> : 'Regenerate package'}
      </button>
    </>
  )
}

const TELEMETRY_STEPS = (files) => [
  ...files.map((f) => ({ text: `Parsing ${f.name}`, detail: `${formatBytes(f.size)} · 412,880 frames`, ms: 620 })),
  { text: 'Time-aligning frames to spacecraft ephemeris', detail: '5 spacecraft in view during the pass', ms: 460 },
  { text: 'Computing median EIRP per spacecraft', detail: 'AURORA-1D 43.1 dBW · others within ±0.2 dB', ms: 560 },
  { text: 'Checking occupied bandwidth against the licensed uplink', detail: 'all carriers inside 13.85–14.0 GHz', ms: 440 },
  { text: 'Updating drift flags', detail: '1 flag held (AURORA-1D +0.8 dB)', ms: 340 },
]

function PostlaunchDetail({ go, logActivity }) {
  const [reportState, setReportState] = useState('idle')
  const generateReport = () => setReportState('generating')
  const REPORT_STEPS = useMemo(() => [
    { text: 'Pulling 184 days of RF telemetry from the MOC API', detail: '2.1 M frames · 5 spacecraft', ms: 700 },
    { text: 'Cross-checking observed EIRP and uplink against the licence', detail: '1 excursion — AURORA-1D +0.8 dB', ms: 600 },
    { text: 'Summarising conjunction events and manoeuvres (18 SDS)', detail: '3 screenings · 0 manoeuvres', ms: 520 },
    { text: 'Recomputing disposal reserve and 5-year deorbit margin', detail: 'all SC ≥ 4.1 yr margin', ms: 480 },
    { text: 'Drafting FCC semi-annual report §1–§6', detail: '12 pages · 0 fields left blank', ms: 640 },
  ], [])
  const onReportDone = useCallback(() => setReportState('done'), [])
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
        <UploadAndRun
          title="Ingest a telemetry file"
          samples={UPLOAD_SAMPLES.telemetry}
          sampleLabel="or use pass 1846 telemetry →"
          prompt="Drop RF telemetry from a pass (CSV)"
          hint="Checked against every licensed parameter above"
          accept=".csv,.txt,.bin"
          runTitle="Checking telemetry against the licence"
          steps={TELEMETRY_STEPS}
          onDone={(files) => { logActivity?.(`Ingested ${files[0].name} — 5 SC checked, AURORA-1D drift flag held`); return true }}
        >
          {inOrbit.map((s, i) => (
            <div key={s.id} className="check-item row-in" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="check-icon">{s.rf === 'Nominal' ? '✓' : '!'}</span>
              <div style={{ flex: 1 }}>
                <div>{s.name}</div>
                <div className="sub">
                  EIRP {s.obsEirp} · {s.rf === 'Nominal' ? 'within licence' : '+0.8 dB above licence — RF review in 5 days'}
                </div>
              </div>
            </div>
          ))}
        </UploadAndRun>
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

      {reportState === 'generating' && (
        <div className="panel"><AgentSteps title="Compiling semi-annual report" steps={REPORT_STEPS} onDone={onReportDone} /></div>
      )}
      {reportState === 'generating' ? null : reportState === 'done' ? (
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

const DOC_STEPS = (files) => files.flatMap((f) => [
  { text: `OCR and text layer — ${f.name}`, detail: `${f.pages} ${f.pages === 1 ? 'page' : 'pages'} · 99.2 % confidence`, ms: 520 },
  { text: 'Classifying document', detail: fileKind(f.name), ms: 380 },
  { text: 'Linking to filings and obligations', detail: /telesat|letter|reply/i.test(f.name) ? 'CR/C/3021-214 · ITU coordination response — Telesat' : 'AURORA-1 programme', ms: 440 },
]).concat([{ text: 'Indexing for search', detail: 'added to Documents', ms: 300 }])

export function DocumentsView({ openModal, showToast, docs = DOCUMENTS, onAddDocs }) {
  const [uploading, setUploading] = useState(false)
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')

  const types = ['all', ...new Set(docs.map((d) => d.type))]
  const rows = docs.filter((d) => {
    if (type !== 'all' && d.type !== type) return false
    const n = q.trim().toLowerCase()
    return !n || (d.name + d.mission + d.owner).toLowerCase().includes(n)
  })

  const { sorted: bySort, sort, toggle } = useSort(rows, 'date', 'desc')
  /* anything generated this session stays pinned on top */
  const sorted = [...bySort.filter((d) => d.isNew), ...bySort.filter((d) => !d.isNew)]

  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Generated filings, letters, and compliance packages</div>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => setUploading((u) => !u)}>{uploading ? 'Close' : '+ Upload'}</button>
        </div>
      </div>

      {uploading && (
        <div className="panel">
          <UploadAndRun
            title="Add documents"
            samples={UPLOAD_SAMPLES.documents}
            sampleLabel="or use Telesat's reply →"
            prompt="Drop any document — Kolhar reads, classifies and files it"
            hint="PDF, DOCX, XLSX"
            runTitle="Filing documents"
            steps={DOC_STEPS}
            onDone={(files) => {
              onAddDocs?.(files.map((f) => ({
                id: `doc-up-${f.id}`, name: f.name, type: fileKind(f.name), mission: 'AURORA-1',
                date: 'Jul 31, 2026', version: 'v1', kind: 'filing', size: formatBytes(f.size), owner: 'j.okafor', isNew: true,
              })))
              return files.length
            }}
          >
            {(n) => <div className="calc-verdict">✓ {n} {n === 1 ? 'document' : 'documents'} classified, linked and added below.</div>}
          </UploadAndRun>
        </div>
      )}

      <div className="toolbar">
        <input className="input input-search" placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        <span className="toolbar-count">{sorted.length} of {docs.length}</span>
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
                <td className="name mono">
                  {d.name}
                  {d.isNew && <span className="new-flag">New</span>}
                </td>
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

const guessSource = (name) => {
  const n = name.toLowerCase()
  if (/47cfr|fcc/.test(n)) return 'FCC'
  if (/960|noaa|crsra/.test(n)) return 'NOAA'
  if (/itu|ific|wrc/.test(n)) return 'ITU'
  if (/ddtc|usml|itar/.test(n)) return 'DDTC'
  if (/faa|450/.test(n)) return 'FAA'
  return 'FCC'
}

const RULE_STEPS = (files) => [
  ...files.map((f) => ({ text: `Reading ${f.name}`, detail: `${f.pages} pages · ${guessSource(f.name)} publication`, ms: 560 })),
  { text: 'Extracting amended provisions and effective dates', detail: '3 provisions · effective in 60 days', ms: 520 },
  { text: 'Matching against 12 filings and 6 compliance modules', detail: '2 filings and the Spectrum module affected', ms: 600 },
  { text: 'Scoring severity and drafting actions', detail: 'Medium', ms: 420 },
]

export function FeedView({ feed = FEED, openModal, onAddFeed }) {
  const [src, setSrc] = useState('all')
  const [adding, setAdding] = useState(false)
  const sources = ['all', ...new Set(feed.map((f) => f.source))]
  const rows = feed.filter((f) => src === 'all' || f.source === src)

  return (
    <div className="view">
      <div className="dash-header">
        <div>
          <div className="page-title">Regulatory feed</div>
          <div className="page-sub">Rule changes and publications affecting the {OPERATOR.constellation} program</div>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : '+ Add a rule'}</button>
        </div>
      </div>

      {adding && (
        <div className="panel">
          <UploadAndRun
            title="Analyse a publication"
            samples={UPLOAD_SAMPLES.rule}
            sampleLabel="or use FR 2026-16218 (47 CFR 25 EPFD update) →"
            prompt="Drop a rule, notice or circular (PDF)"
            hint="Federal Register notices, FCC orders, ITU circulars, DDTC rules"
            accept=".pdf,.docx,.txt,.html"
            runTitle="Impact analysis"
            steps={RULE_STEPS}
            onDone={(files) => {
              const f = files[0]
              onAddFeed?.({
                id: `up-${f.id}`, date: 'Jul 31, 2026', severity: 'Medium', source: guessSource(f.name), isNew: true,
                title: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '),
                text: 'Uploaded publication — 3 amended provisions, effective in 60 days.',
                impact: 'Two AURORA-1 filings (Schedule S and the Ka feeder-link modification) reference the amended provisions. Current EPFD margins still hold, but the Schedule S technical annex must cite the revised limits.',
                action: 'Regenerate the Schedule S annex against the new text and update the Ka modification before its comment period closes.',
              })
              return true
            }}
          >
            <div className="calc-verdict">✓ Analysed and added to the top of the feed — open it for the full impact.</div>
          </UploadAndRun>
        </div>
      )}

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
          <div className={`feed-item${e.isNew ? ' row-in' : ''}`} key={e.id}>
            <div className="feed-date">{e.date}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="feed-title">{e.title}{e.isNew && <span className="new-flag">New</span>}</div>
              <div className="feed-text">{e.text}</div>
            </div>
            <Tag color="grey">{e.source}</Tag>
            <Tag color={SEVERITY_TAG[e.severity]}>{e.severity}</Tag>
            {e.impact && (
              <button className="btn btn-outline btn-sm" onClick={() => openModal?.({ type: 'impact', id: e.id })}>Analyze impact</button>
            )}
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
