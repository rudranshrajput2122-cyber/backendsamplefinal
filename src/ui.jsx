/* Shared UI primitives for the Kolhar console */

import { useEffect, useMemo, useState } from 'react'

export function Tag({ color, children }) {
  return <span className={`tag tag-${color}`}>{children}</span>
}

export function Dot({ color }) {
  return <span className={`dot dot-${color}`} />
}

export function Check() {
  return <span className="check-icon">✓</span>
}

export function Meter({ pct, tone = '' }) {
  return (
    <div className="meter">
      <div className={`meter-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/* A stat is a number set in the display face — no tile, no meter, no chrome */
export function Stat({ label, value, unit, foot, onClick }) {
  const El = onClick ? 'button' : 'div'
  return (
    <El className="stat" onClick={onClick}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {foot && <div className="stat-foot">{foot}</div>}
    </El>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={`seg-btn${value === o.value ? ' on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count != null && <span className="n">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sortable table plumbing                                             */
/* ------------------------------------------------------------------ */

export function useSort(rows, initialKey, initialDir = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir })

  const sorted = useMemo(() => {
    if (!sort.key) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, sort])

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  return { sorted, sort, toggle }
}

export function Th({ label, sortKey, sort, onSort, num }) {
  if (!sortKey) return <th className={num ? 'num' : ''}>{label}</th>
  const on = sort.key === sortKey
  return (
    <th className={`sortable${on ? ' on' : ''}${num ? ' num' : ''}`} onClick={() => onSort(sortKey)}>
      {label}
      <span className="sort-arrow">{on ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </th>
  )
}

/* ------------------------------------------------------------------ */

export function Modal({ title, wide, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Breadcrumbs({ trail }) {
  return (
    <div className="breadcrumbs">
      {trail.map((t, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span>/</span>}
          {t.onClick ? (
            <button className="crumb" onClick={t.onClick}>{t.label}</button>
          ) : (
            <span className="crumb-current">{t.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function WorkingBar({ label }) {
  return (
    <div className="progress-wrap">
      <div className="working-label">
        <span className="spinner" /> {label}
      </div>
      <div className="progress-track">
        <div className="progress-fill" />
      </div>
    </div>
  )
}

export function SuccessBlock({ title, sub, children }) {
  return (
    <div className="success-block">
      <div className="success-icon">✓</div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ color: 'var(--faint)', fontSize: 12.5, marginBottom: 16 }}>{sub}</div>}
      {children}
    </div>
  )
}

export function FreqViz({ conflict, geometry, ourLabel = 'AURORA-1' }) {
  const { pct, min, max, overlap } = geometry
  const mid1 = min + (max - min) / 3
  const mid2 = min + ((max - min) * 2) / 3
  const unit = 'GHz'
  const fmt = (f) => f.toFixed(2)
  return (
    <div className="freq-viz">
      <div className="freq-rows">
        <div>
          <div className="freq-row-label">
            {ourLabel} · {fmt(conflict.ours[0])}–{fmt(conflict.ours[1])} {unit} · licensed
          </div>
          <div className="freq-track">
            <div
              className="freq-bar freq-bar-a"
              style={{ left: `${pct(conflict.ours[0])}%`, width: `${pct(conflict.ours[1]) - pct(conflict.ours[0])}%` }}
            >
              {ourLabel}
            </div>
          </div>
        </div>
        <div>
          <div className="freq-row-label">
            {conflict.network} · {fmt(conflict.theirs[0])}–{fmt(conflict.theirs[1])} {unit} · {conflict.ific}
          </div>
          <div className="freq-track">
            <div
              className="freq-bar freq-bar-b"
              style={{ left: `${pct(conflict.theirs[0])}%`, width: `${pct(conflict.theirs[1]) - pct(conflict.theirs[0])}%` }}
            >
              {conflict.network}
            </div>
          </div>
        </div>
        {overlap && (
          <div
            className="freq-overlap"
            style={{ left: `${pct(overlap[0])}%`, width: `${pct(overlap[1]) - pct(overlap[0])}%` }}
          >
            <span className="freq-overlap-label">{conflict.overlapMHz} MHz overlap</span>
          </div>
        )}
      </div>
      <div className="freq-axis">
        <span>{fmt(min)}</span>
        <span>{fmt(mid1)}</span>
        <span>{fmt(mid2)}</span>
        <span>{fmt(max)} {unit}</span>
      </div>
    </div>
  )
}

export function Lifecycle({ stages, current }) {
  return (
    <div className="lifecycle">
      {stages.map((s, i) => (
        <span key={s} style={{ display: 'contents' }}>
          {i > 0 && <span className={`stage-connector${i <= current ? ' done' : ''}`} />}
          <span className={`stage${i < current ? ' done' : i === current ? ' current' : ''}`}>
            <span className="stage-dot">{i < current ? '✓' : ''}</span>
            <span className="stage-label">{s}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>
}
