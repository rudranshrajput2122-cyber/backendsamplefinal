import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, SuccessBlock, Tag, AgentSteps, useTypewriter } from './ui.jsx'
import { LETTER_V1, LETTER_V2, DEADLINE_DETAILS, AMENDMENTS, DOC_VERSIONS, ITAR_COMPONENTS } from './data.js'

/* ------------------------------------------------------------------ */
/* Coordination letter                                                 */
/* ------------------------------------------------------------------ */

export function LetterModal({ onClose, onSent }) {
  const [text, setText] = useState(LETTER_V1)
  const [version, setVersion] = useState(1)
  /* opening the modal (and every regenerate) runs a short retrieval
     pass, then the draft streams in. The first pass keeps v1; each
     regenerate after that flips to the other draft. */
  const [regenerating, setRegenerating] = useState(true)
  const [drafted, setDrafted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sent, setSent] = useState(false)
  /* only a fresh draft streams; returning from Edit shows it whole */
  const [fresh, setFresh] = useState(false)
  const typing = useTypewriter(text, fresh, 6)
  const streaming = !regenerating && fresh && !typing.done

  const regenerate = () => {
    setEditing(false)
    setRegenerating(true)
  }

  const contextSteps = useMemo(() => [
    { text: 'Reading IFIC 3021 Part II-S — USASAT-NG 214 filing', detail: 'CR/C/3021-214 · 13.92–14.05 GHz', ms: 420 },
    { text: 'Pulling interference analysis', detail: 'peak I/N +10.0 dB · 0.49 % of time over −6 dB', ms: 380 },
    { text: 'Checking date priority and RR Art. 9.52 procedure', detail: 'AURORA-1 holds date priority', ms: 340 },
    { text: drafted ? 'Redrafting in a different register' : 'Drafting letter', ms: 300 },
  ], [drafted])

  const onStepsDone = useCallback(() => {
    if (drafted) {
      setText((t) => (t === LETTER_V1 ? LETTER_V2 : LETTER_V1))
      setVersion((v) => (v === 1 ? 2 : 1))
    }
    setDrafted(true)
    setFresh(true)
    setRegenerating(false)
  }, [drafted])

  const send = () => {
    setSent(true)
    setTimeout(onSent, 1400)
  }

  if (sent) {
    return (
      <Modal title="Coordination outreach" onClose={onSent}>
        <SuccessBlock title="Outreach sent" sub="Delivered to Telesat spectrum coordination · response window 6 days" />
      </Modal>
    )
  }

  return (
    <Modal
      title="Agent-drafted coordination outreach"
      wide
      onClose={onClose}
      footer={
        <>
          <span className="left mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
            {regenerating
              ? 'agent drafting…'
              : streaming
                ? `writing · ${typing.shown.length} / ${text.length} chars`
                : `draft v${version} · RR Art. 9.52 · ${text.length} chars`}
          </span>
          <button className="btn btn-outline" onClick={regenerate} disabled={regenerating || streaming}>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
          <button className="btn btn-outline" onClick={() => { setFresh(false); setEditing((e) => !e) }} disabled={regenerating || streaming}>
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button className="btn btn-primary" onClick={send} disabled={regenerating || streaming}>Send</button>
        </>
      }
    >
      {regenerating ? (
        <AgentSteps title="Drafting coordination outreach" steps={contextSteps} onDone={onStepsDone} />
      ) : editing ? (
        <textarea className="letter-edit" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      ) : (
        <div
          className="letter"
          key={version}
          onClick={() => setFresh(false)}
          title={streaming ? 'Click to skip' : undefined}
        >
          {typing.shown}
          {streaming && <span className="caret" />}
          {fresh && typing.done && <StreamEnd onEnd={() => setFresh(false)} />}
        </div>
      )}
    </Modal>
  )
}

/* flips `fresh` off once the stream has finished, outside render */
function StreamEnd({ onEnd }) {
  useEffect(() => { onEnd() }, [onEnd])
  return null
}

/* ------------------------------------------------------------------ */
/* Rule change — DDTC Category XV                                      */
/* ------------------------------------------------------------------ */

export function RuleChangeModal({ onClose, ruleReady, onGenerated }) {
  const [state, setState] = useState(ruleReady ? 'done' : 'idle')
  const affected = ITAR_COMPONENTS.filter((c) => c.affected)

  const generate = () => setState('generating')
  const steps = useMemo(() => [
    { text: 'Diffing USML Cat XV (Jul 14 final rule) against classification matrix v4', detail: '7 components compared', ms: 520 },
    { text: 'Re-scoring jurisdiction per component', detail: '2 move EAR 9A515 → USML XV(e)', ms: 460 },
    { text: 'Checking fundamental-research exclusion against revenue records', detail: 'commercial tasking revenue — FRE not available', ms: 420 },
    { text: 'Drafting TAA-0912-26 amendment §3 (hardware) and §7 (technical data)', detail: '6 pages', ms: 560 },
    { text: 'Routing package to university export-control officer', detail: 'a.whitfield notified', ms: 320 },
  ], [])
  const onDone = useCallback(() => { setState('done'); onGenerated() }, [onGenerated])

  return (
    <Modal
      title="Regulatory change — DDTC USML Category XV"
      wide
      onClose={onClose}
      footer={
        state === 'done' ? (
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        ) : (
          <>
            <button className="btn btn-outline" onClick={onClose}>Dismiss</button>
            <button className="btn btn-primary" onClick={generate} disabled={state === 'generating'}>
              {state === 'generating' ? <><span className="spinner" /> Generating…</> : 'Generate updated package'}
            </button>
          </>
        )
      }
    >
      <div className="detail-block">
        <div className="detail-label">What changed</div>
        <div className="detail-text">
          DDTC amended USML Category XV effective <strong style={{ color: 'var(--a3)' }}>July 14, 2026</strong>.
          Two component classifications move from Commerce (EAR) to State (USML) jurisdiction. Because the
          program now books commercial tasking revenue, the fundamental-research exclusion does not apply.
        </div>
      </div>

      <table className="table" style={{ marginBottom: 16 }}>
        <thead>
          <tr><th>Component</th><th>Old</th><th>New</th><th>Jurisdiction</th><th>Status</th></tr>
        </thead>
        <tbody>
          {affected.map((c) => (
            <tr key={c.component}>
              <td className="name">{c.component}</td>
              <td className="mono muted">{c.cls}</td>
              <td className="mono" style={{ color: 'var(--a2)' }}>{c.newCls}</td>
              <td className="muted">Commerce → State</td>
              <td>
                <Tag color={state === 'done' ? 'green' : 'red'}>{state === 'done' ? 'Updated' : 'Action required'}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="detail-block" style={{ marginBottom: 0 }}>
        <div className="detail-label">Downstream effect</div>
        <div className="detail-text">
          Export authorizations referencing the old ECCNs need amendment before the next hardware
          shipment to the Svalbard gateway. Kolhar drafts the amended TAA-0912-26 package and routes
          it to the university export-control officer.
        </div>
      </div>

      {state === 'generating' && (
        <div style={{ marginTop: 20 }}><AgentSteps title="Building classification package" steps={steps} onDone={onDone} /></div>
      )}

      {state === 'done' && (
        <div className="success-block" style={{ padding: '16px 0 0' }}>
          <span className="tag tag-amber" style={{ fontSize: 12.5, padding: '7px 14px' }}>
            ✓ Classification package + TAA amendment ready for signature
          </span>
        </div>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* NOAA CRSRA attestation                                              */
/* ------------------------------------------------------------------ */

export function AttestModal({ onClose, onSubmitted }) {
  const [checks, setChecks] = useState({ a: false, b: false })
  const [state, setState] = useState('idle')
  const ready = checks.a && checks.b

  const submit = () => setState('submitting')
  const steps = useMemo(() => [
    { text: 'Signing attestations 4(a) and 7(b)', detail: 'PI signature · SHA-256 7c1e…04b2', ms: 420 },
    { text: 'Serialising 49 fields to CRSRA report schema', detail: 'schema v2026.1 · valid', ms: 460 },
    { text: 'Uploading to NOAA CRSRA portal', detail: '3.1 MB · TLS 1.3', ms: 620 },
    { text: 'Waiting for receipt', detail: 'NOAA-CRSRA-2026-018-R1', ms: 520 },
  ], [])
  const onDone = useCallback(() => { setState('done'); setTimeout(onSubmitted, 1100) }, [onSubmitted])

  if (state === 'done') {
    return (
      <Modal title="NOAA CRSRA annual report" onClose={onSubmitted}>
        <SuccessBlock title="Report submitted" sub="49 of 49 fields · confirmation NOAA-CRSRA-2026-018-R1" />
      </Modal>
    )
  }

  return (
    <Modal
      title="NOAA CRSRA annual report — attestations"
      wide
      onClose={onClose}
      footer={
        <>
          <span className="left mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
            47/49 auto-filled · 2 require signature
          </span>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!ready || state === 'submitting'}>
            {state === 'submitting' ? <><span className="spinner" /> Submitting…</> : 'Sign & submit'}
          </button>
        </>
      }
    >
      <div className="detail-block">
        <div className="detail-label">Report summary</div>
        <div className="detail-text">
          Kolhar assembled the 15 CFR 960 annual operational report from pass logs, tasking records,
          and the restricted-area screen. Two conditions require the principal investigator's
          attestation before submission.
        </div>
      </div>

      <div className="param-grid" style={{ marginBottom: 16 }}>
        <div className="param-cell"><div className="k">Tasks executed</div><div className="v">14,882</div></div>
        <div className="param-cell"><div className="k">Tasks rejected</div><div className="v">37</div></div>
        <div className="param-cell"><div className="k">Restricted hits</div><div className="v accent">0</div></div>
        <div className="param-cell"><div className="k">Shutter tests</div><div className="v">4 / 4</div></div>
      </div>

      {[
        ['a', 'Condition 4(a) — imaging resolution attestation', 'I attest that no imagery below the licensed 0.82 m GSD threshold was collected or distributed during the reporting period.'],
        ['b', 'Condition 7(b) — foreign data access attestation', 'I attest that ground-segment access at Svalbard and Awarua was logged and limited to authorized personnel.'],
      ].map(([k, title, body]) => (
        <div className="settings-row" key={k} style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{title}</div>
            <div style={{ color: 'var(--faint)', fontSize: 11.5, marginTop: 4, lineHeight: 1.5 }}>{body}</div>
          </div>
          <button
            className={`toggle${checks[k] ? ' on' : ''}`}
            onClick={() => setChecks((c) => ({ ...c, [k]: !c[k] }))}
            aria-label={title}
          />
        </div>
      ))}

      {state === 'submitting' && (
        <div style={{ marginTop: 20 }}><AgentSteps title="Submitting to NOAA" steps={steps} onDone={onDone} /></div>
      )}

      {!ready && (
        <div style={{ fontSize: 11.5, color: 'var(--a1)', marginTop: 12 }}>
          Both attestations must be signed before the report can be submitted.
        </div>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Deadline detail                                                     */
/* ------------------------------------------------------------------ */

export function DeadlineModal({ deadline, onClose, onReviewed, onDismiss, onOpenFiling }) {
  const detail = deadline && DEADLINE_DETAILS[deadline.id]
  if (!detail) return null

  return (
    <Modal
      title={deadline.title}
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost left" onClick={() => onDismiss(deadline.id)}>Dismiss obligation</button>
          <button className="btn btn-outline" onClick={() => onOpenFiling(detail.filingId)}>View filing →</button>
          <button className="btn btn-primary" onClick={() => onReviewed(deadline.id)}>Mark reviewed</button>
        </>
      }
    >
      <div className="param-grid" style={{ marginBottom: 16 }}>
        <div className="param-cell"><div className="k">Due in</div><div className="v accent">{deadline.days} days</div></div>
        <div className="param-cell"><div className="k">Owner</div><div className="v">{detail.owner}</div></div>
        <div className="param-cell"><div className="k">Filing</div><div className="v">{detail.filingId}</div></div>
      </div>

      <div className="detail-block">
        <div className="detail-label">What is required</div>
        <div className="detail-text">{detail.required}</div>
      </div>
      <div className="detail-block">
        <div className="detail-label">Current status</div>
        <div className="detail-text">{detail.status}</div>
      </div>
      <div className="detail-block" style={{ marginBottom: 0 }}>
        <div className="detail-label">Next action</div>
        <div className="detail-text">{detail.next}</div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Amendments                                                          */
/* ------------------------------------------------------------------ */

export function AmendmentsModal({ filing, onClose }) {
  return (
    <Modal
      title={`Amendments — ${filing.name}`}
      onClose={onClose}
      footer={<button className="btn btn-outline" onClick={onClose}>Close</button>}
    >
      {AMENDMENTS.map((a) => (
        <div className="check-item" key={a.name}>
          <span className="check-icon">✓</span>
          <div style={{ flex: 1 }}>
            <div>{a.name}</div>
            <div className="sub">{a.date}</div>
          </div>
          <Tag color={a.status === 'Accepted' ? 'green' : 'amber'}>{a.status}</Tag>
        </div>
      ))}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Document preview + version history                                  */
/* ------------------------------------------------------------------ */

export function DocPreviewModal({ doc, onClose, onDownload, onVersions }) {
  return (
    <Modal
      title={doc.name}
      wide
      onClose={onClose}
      footer={
        <>
          <span className="left mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
            {doc.size} · {doc.version} · {doc.owner}
          </span>
          <button className="btn btn-outline" onClick={onVersions}>Version history</button>
          <button className="btn btn-primary" onClick={onDownload}>Download</button>
        </>
      }
    >
      {doc.kind === 'letter' ? (
        <div className="letter">{LETTER_V1}</div>
      ) : (
        <div className="doc-preview" style={{ maxWidth: 480 }}>
          <div className="doc-title">{doc.name.replace(/[._]/g, ' ').replace(/\.(pdf|zip|xlsx)/i, '').toUpperCase()}</div>
          <div className="doc-row"><span>Type</span><span>{doc.type}</span></div>
          <div className="doc-row"><span>Linked</span><span>{doc.mission}</span></div>
          <div className="doc-row"><span>Generated</span><span>{doc.date}</span></div>
          <div className="doc-row"><span>Version</span><span>{doc.version}</span></div>
          <div className="doc-row"><span>Owner</span><span>{doc.owner}</span></div>
          <div className="doc-row"><span>Orbit</span><span>550 km SSO · 97.59°</span></div>
          <div className="doc-row"><span>Uplink band</span><span>13.85–14.0 GHz</span></div>
          <div className="doc-row"><span>Downlink band</span><span>10.7–10.95 GHz</span></div>
          <div className="doc-row"><span>Validation</span><span>Part 25 ✓ · App. 4 ✓</span></div>
        </div>
      )}
    </Modal>
  )
}

export function VersionsModal({ doc, onClose, showToast }) {
  return (
    <Modal
      title={`Version history — ${doc.name}`}
      onClose={onClose}
      footer={<button className="btn btn-outline" onClick={onClose}>Close</button>}
    >
      {DOC_VERSIONS.map((v, i) => (
        <div className="check-item" key={v.v}>
          <span className="check-icon">{i === 0 ? '●' : '○'}</span>
          <div style={{ flex: 1 }}>
            <div className="mono">{v.v}</div>
            <div className="sub">{v.note}</div>
          </div>
          <span className="mono" style={{ color: 'var(--faint)', fontSize: 11 }}>{v.date}</span>
          {i > 0 && (
            <button className="btn btn-outline btn-sm" onClick={() => showToast(`Restored ${v.v}`)}>Restore</button>
          )}
        </div>
      ))}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Regulatory feed impact analysis                                     */
/* ------------------------------------------------------------------ */

export function ImpactModal({ entry, onClose, go }) {
  const [state, setState] = useState('idle')

  const generate = () => setState('generating')
  const steps = useMemo(() => [
    { text: `Parsing ${entry.source} publication — ${entry.title}`, detail: 'full text + effective dates extracted', ms: 460 },
    { text: 'Matching against 12 filings and 6 compliance modules', detail: 'affected items identified', ms: 520 },
    { text: 'Drafting changes to affected filings', detail: entry.action, ms: 600 },
    { text: 'Scheduling new obligations and owners', ms: 360 },
  ], [entry])
  const onDone = useCallback(() => setState('done'), [])

  return (
    <Modal
      title={`Impact analysis — ${entry.title}`}
      wide
      onClose={onClose}
      footer={
        state === 'done' ? (
          <>
            <button className="btn btn-outline left" onClick={() => { onClose(); go('filings') }}>Open filings →</button>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <span className="left mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
              {entry.source} · {entry.date}
            </span>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={generate} disabled={state === 'generating'}>
              {state === 'generating' ? <><span className="spinner" /> Generating…</> : 'Generate compliance update'}
            </button>
          </>
        )
      }
    >
      <div className="detail-block">
        <div className="detail-label">Publication</div>
        <div className="detail-text">{entry.text}</div>
      </div>
      <div className="detail-block">
        <div className="detail-label">What changes for AURORA-1</div>
        <div className="detail-text">{entry.impact}</div>
      </div>
      <div className="detail-block" style={{ marginBottom: 0 }}>
        <div className="detail-label">Action needed</div>
        <div className="detail-text">{entry.action}</div>
      </div>
      {state === 'generating' && (
        <div style={{ marginTop: 20 }}><AgentSteps title="Impact analysis" steps={steps} onDone={onDone} /></div>
      )}
      {state === 'done' && (
        <div className="success-block" style={{ padding: '16px 0 0' }}>
          <span className="tag tag-amber" style={{ fontSize: 12.5, padding: '7px 14px' }}>
            ✓ Compliance update package ready
          </span>
        </div>
      )}
    </Modal>
  )
}
