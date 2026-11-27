import React, { useMemo, useState } from 'react'

const fmt = value => value ? new Date(value).toLocaleString('en-AU', {dateStyle:'medium', timeStyle:'short'}) : '—'
const shortId = id => (id || '').slice(0,8).toUpperCase()
const statusTone = s => s === 'APPROVED' ? 'ok' : s === 'REJECTED' || s === 'CANCELLED' ? 'neutral' : 'warn'

export function BookingStatus({status}) {
  return <span className={`status ${statusTone(status)}`}>{status === 'PENDING' ? 'Pending' : status === 'APPROVED' ? 'Approved' : status === 'REJECTED' ? 'Rejected' : status === 'CANCELLED' ? 'Cancelled' : status}</span>
}

/** A single accessible data model shown as a table or contextual mobile cards. */
export default function BookingTable({ rows, staff = false, busy = false, onApprove, onReject, onCancel, onEmptyAction }) {
  const [density, setDensity] = useState('default')
  const [sort, setSort] = useState('start_time')
  const [direction, setDirection] = useState('desc')
  const sorted = useMemo(() => [...rows].sort((a,b) => {
    const av = String(a[sort] || '').toLowerCase()
    const bv = String(b[sort] || '').toLowerCase()
    return av.localeCompare(bv, undefined, {numeric:true}) * (direction === 'asc' ? 1 : -1)
  }), [rows, sort, direction])
  const changeSort = key => { if (sort === key) setDirection(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(key); setDirection('asc') } }
  const sortOptions = [ ['start_time','Date'], ['room_name','Room'], ['status','Status'], ...(staff ? [['first_name','Requester']] : []) ]
  const action = b => staff ? (b.status === 'PENDING' ? <div className="booking-actions">
      <button className="secondary small" disabled={busy} onClick={() => onApprove(b.booking_id)}>Approve</button>
      <button className="text-danger small" disabled={busy} onClick={() => onReject(b.booking_id)}>Reject</button>
    </div> : <span className="muted">—</span>) : (['PENDING','APPROVED'].includes(b.status) ?
      <button className="text-danger small" disabled={busy} onClick={() => onCancel(b.booking_id)}>Cancel booking</button> : <span className="muted">—</span>)
  return <div className={`booking-table-shell density-${density}`}>
    <div className="table-toolbar">
      <label>Row spacing <select value={density} onChange={e => setDensity(e.target.value)} aria-label="Table row spacing">
        <option value="compact">Compact</option><option value="default">Default</option><option value="comfortable">Comfortable</option>
      </select></label>
      <label className="mobile-sort">Sort by <select value={sort} onChange={e => {setSort(e.target.value);setDirection('asc')}}>
        {sortOptions.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <span className="muted table-count" aria-live="polite">{rows.length} {rows.length === 1 ? 'booking' : 'bookings'}</span>
    </div>
    {rows.length === 0 ? <div className="empty-state table-empty">
      <h3>No bookings to show</h3><p>{staff ? 'Requests will appear here when residents submit them.' : 'Search community spaces and request your first booking.'}</p>
      {!staff && onEmptyAction && <button className="primary" onClick={onEmptyAction}>Find a space</button>}
    </div> : <>
      <div className="booking-table-scroll" role="region" aria-label="Bookings table" tabIndex="0">
        <table className="booking-table"><thead><tr>
          {[['room_name','Room'],['start_time','Date and time'],[staff?'first_name':'purpose',staff?'Requested by':'Purpose'],['status','Status']].map(([key,label]) =>
            <th key={key} scope="col" aria-sort={sort === key ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}>
              <button className="sort-button" onClick={() => changeSort(key)}>{label}{sort === key && <span aria-hidden="true"> {direction === 'asc' ? '↑' : '↓'}</span>}</button>
            </th>)}
          <th scope="col">Action</th>
        </tr></thead><tbody>
          {sorted.map(b => <tr key={b.booking_id}>
            <th scope="row" className="booking-identity"><div className="cell-identity"><strong title={b.room_name}>{b.room_name}</strong><span title={b.booking_id}>Ref {shortId(b.booking_id)}</span></div></th>
            <td className="numeric">{fmt(b.start_time)}</td>
            <td className="cell-truncate" title={staff ? `${b.first_name} ${b.last_name}` : b.purpose}>{staff ? `${b.first_name} ${b.last_name}` : (b.purpose || '—')}</td>
            <td><BookingStatus status={b.status}/></td>
            <td className="action-cell">{action(b)}</td>
          </tr>)}
        </tbody></table>
      </div>
      <div className="booking-mobile-cards" aria-label="Bookings">
        {sorted.map(b => <article className="booking-mobile-card" key={b.booking_id}>
          <div className="mobile-card-leading"><div><h3>{b.room_name}</h3><small>{fmt(b.start_time)}</small></div><BookingStatus status={b.status}/></div>
          <p className="mobile-card-detail" title={staff ? `${b.first_name} ${b.last_name}` : b.purpose}>
            {staff ? `Requested by ${b.first_name} ${b.last_name}` : b.purpose || 'No purpose provided'}
          </p>
          <div className="mobile-card-bottom"><span>Ref {shortId(b.booking_id)}</span>{action(b)}</div>
        </article>)}
      </div>
    </>}
  </div>
}
