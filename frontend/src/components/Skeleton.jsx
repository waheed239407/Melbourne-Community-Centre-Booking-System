import React from 'react'

/** Reserve the final component's space while its data loads. */
export function RoomSkeleton() {
  return <div className="room-grid" aria-label="Loading rooms" aria-busy="true">
    {[0, 1, 2].map(i => <article className="room-card room-skeleton" key={i}>
      <div className="skeleton skeleton-photo" />
      <div className="room-body">
        <div className="skeleton skeleton-tag" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-button" />
      </div>
    </article>)}
  </div>
}

export function TableSkeleton({ rows = 4 }) {
  return <div className="table-skeleton" aria-label="Loading bookings" aria-busy="true">
    {Array.from({ length: rows }, (_, i) => <div className="skeleton-table-row" key={i}>
      <div className="skeleton skeleton-row-title" />
      <div className="skeleton skeleton-row-date" />
      <div className="skeleton skeleton-row-status" />
    </div>)}
  </div>
}
