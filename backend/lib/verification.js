'use strict'
const { createHash, randomInt, timingSafeEqual } = require('node:crypto')
function generateCode() {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}
function hashCode(email, code, secret) {
  return createHash('sha256').update(`${String(email).toLowerCase().trim()}:${String(code)}:${secret}`).digest('hex')
}
function codeMatches(email, submitted, expectedHash, secret) {
  if (!/^\d{6}$/.test(String(submitted || '')) || !/^[0-9a-f]{64}$/i.test(String(expectedHash || ''))) return false
  const supplied = Buffer.from(hashCode(email, submitted, secret), 'hex')
  const stored = Buffer.from(expectedHash, 'hex')
  return timingSafeEqual(supplied, stored)
}
module.exports = { generateCode, hashCode, codeMatches }
