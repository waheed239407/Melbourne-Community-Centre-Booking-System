'use strict'

const VALID_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])

function positiveInteger(value) {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function requiredText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
}

function parseTimeRange(start, end, now = new Date()) {
  if (typeof start !== 'string' || typeof end !== 'string') return { error: 'Start and end times are required.' }
  if (!/(Z|[+-]\d\d:\d\d)$/.test(start) || !/(Z|[+-]\d\d:\d\d)$/.test(end)) {
    return { error: 'Send ISO date-times with a timezone offset.' }
  }
  const a = new Date(start)
  const b = new Date(end)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return { error: 'Invalid date and time.' }
  if (a.getTime() < now.getTime()) return { error: 'Bookings must start in the future.' }
  if (b.getTime() <= a.getTime()) return { error: 'End time must be after start time.' }
  if (b.getTime() - a.getTime() > 12 * 60 * 60 * 1000) return { error: 'Booking duration cannot exceed 12 hours.' }
  return { startTime: a.toISOString(), endTime: b.toISOString() }
}

function rangesOverlap(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA)
}

function validateBooking(body, now = new Date()) {
  const roomId = positiveInteger(body?.roomId)
  const attendees = positiveInteger(body?.attendees)
  if (!roomId) return { error: 'Choose a valid room.' }
  if (!attendees || attendees > 1000) return { error: 'Enter an attendee count from 1 to 1000.' }
  if (!requiredText(body?.purpose, 250)) return { error: 'Enter a booking purpose, at most 250 characters.' }
  const range = parseTimeRange(body?.startTime, body?.endTime, now)
  if (range.error) return range
  return { roomId, attendees, purpose: body.purpose.trim(), ...range }
}

function statusCanChange(current, next) {
  if (!VALID_STATUSES.has(current) || !VALID_STATUSES.has(next)) return false
  if (current !== 'PENDING' || !['APPROVED', 'REJECTED'].includes(next)) return false
  return true
}

module.exports = { positiveInteger, validEmail, requiredText, parseTimeRange, rangesOverlap, validateBooking, statusCanChange }
