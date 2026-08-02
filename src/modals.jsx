import { useState } from 'react'
import { Modal, SuccessBlock, Tag } from './ui.jsx'
import { LETTER_V1, LETTER_V2, DEADLINE_DETAILS, AMENDMENTS, DOC_VERSIONS, ITAR_COMPONENTS } from './data.js'

/* ------------------------------------------------------------------ */
/* Coordination letter                                                 */
/* ------------------------------------------------------------------ */

export function LetterModal({ onClose, onSent }) {
  const [text, setText] = useState(LETTER_V1)
  const [version, setVersion] = useState(1)
  const [regenerating, setRegenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sent, setSent] = useState(false)

  const regenerate = () => {
    setEditing(false)
    setRegenerating(true)
    setTimeout(() => {
      setText(version === 1 ? LETTER_V2 : LETTER_V1)
      setVersion((v) => (v === 1 ? 2 : 1))
      setRegenerating(false)
    }, 1400)
  }

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
            draft v{version} · RR Art. 9.52 · {text.length} chars
          </span>
          <button className="btn btn-outline" onClick={regenerate} disabled={regenerating}>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
          <button className="btn btn-outline" onClick={() => setEditing((e) => !e)} disabled={regenerating}>
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button className="btn btn-primary" onClick={send} disabled={regenerating}>Send</button>
        </>
      }
    >
      {regenerating ? (
        <div className="shimmer-lines">
          {[92, 100, 96, 88, 100, 94, 78, 97, 90, 60].map((w, i) => (
            <div key={i} className="shimmer-line" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : editing ? (
        <textarea className="letter-edit" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      ) : (
        <div className="letter" key={version}>{text}</div>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Rule change — DDTC Category XV                                      */
/* ------------------------------------------------------------------ */

export function RuleChangeModal({ onClose, ruleReady, onGenerated }) {
  const [state, setState] = useState(ruleReady ? 'done' : 'idle')
  const affected = ITAR_COMPONENTS.filter((c) => c.affected)

  const generate = () => {
    setState('generating')
    setTimeout(() => { setState('done'); onGenerated() }, 1800)
  }

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

  const submit = () => {
    setState('submitting')
    setTimeout(() => { setState('done'); setTimeout(onSubmitted, 1100) }, 1600)
  }

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

  const generate = () => {
    setState('generating')
    setTimeout(() => setState('done'), 1800)
  }

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
