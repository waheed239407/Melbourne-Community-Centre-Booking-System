'use strict'
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

function issueToken(user, secret) {
  return jwt.sign({ sub: user.user_id, role: user.role_name, email: user.email }, secret, {
    algorithm: 'HS256', expiresIn: '3h', issuer: 'mccbs-task3', audience: 'mccbs-demo'
  })
}
function requireAuth(secret) {
  return (req, res, next) => {
    const raw = req.headers.authorization || ''
    if (!raw.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in first.' })
    try {
      req.user = jwt.verify(raw.slice(7), secret, { algorithms: ['HS256'], issuer: 'mccbs-task3', audience: 'mccbs-demo' })
      next()
    } catch (_) { res.status(401).json({ error: 'Your session has expired. Please sign in again.' }) }
  }
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Staff access is required.' })
}
module.exports = { jwt, bcrypt, issueToken, requireAuth, requireRole }
