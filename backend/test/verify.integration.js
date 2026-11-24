'use strict'
// End-to-end account verification test using a temporary development server.
// Only synthetic accounts and the CI/local test database are used.
const assert = require('node:assert/strict')
const { once } = require('node:events')
require('dotenv').config()

// Do not send email during this test. The application emits its local test code
// to console.log and the test observes it, without exposing an HTTP backdoor.
if (process.env.SMTP_HOST) throw new Error('SMTP_HOST must be empty for this test')
if (process.env.NODE_ENV === 'production') throw new Error('Verification test requires development mode')

const { app, pool } = require('../server')
const email = 'mccbs.verify.' + Date.now() + '@example.test'
const password = process.env.DEMO_PASSWORD
assert.ok(password && password.length >= 10, 'DEMO_PASSWORD must be configured')
let verificationCode
let passed = 0
const oldLog = console.log
console.log = (...args) => {
  const line = args.join(' ')
  const marker = '[LOCAL VERIFICATION CODE] ' + email + ': '
  if (line.startsWith(marker)) verificationCode = line.slice(marker.length).split(' ')[0]
  // Do not print the actual one-time verification code in CI logs.
  if (!line.startsWith('[LOCAL VERIFICATION CODE]')) oldLog(...args)
}
const check = (label, condition) => {
  assert.ok(condition, label)
  passed++
  oldLog('PASS V' + String(passed).padStart(2, '0') + ': ' + label)
}
const server = app.listen(0, '127.0.0.1')

async function send(base, path, body, expected) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await response.json()
  assert.equal(response.status, expected, path + ' returned ' + response.status + ': ' + JSON.stringify(data))
  return data
}

async function main() {
  try {
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + server.address().port
    const registration = await send(base, '/api/auth/register', {
      firstName: 'Verification', lastName: 'Test', email, password
    }, 201)
    check('Registration creates an unverified account', registration.delivery === 'DEVELOPMENT_CONSOLE')

    await send(base, '/api/auth/login', { email, password }, 403)
    check('Unverified account cannot sign in', true)

    check('Verification code generated', /^\d{6}$/.test(verificationCode || ''))
    await send(base, '/api/auth/verify', { email, code: '000000' === verificationCode ? '000001' : '000000' }, 400)
    check('Incorrect verification code is rejected', true)

    const verified = await send(base, '/api/auth/verify', { email, code: verificationCode }, 200)
    check('Correct verification code activates account', /verified/i.test(verified.message))

    const login = await send(base, '/api/auth/login', { email, password }, 200)
    check('Verified account receives a session token', Boolean(login.token && login.user.role_name === 'COMMUNITY_USER'))

    oldLog('ACCOUNT VERIFICATION INTEGRATION TEST: ' + passed + ' passed, 0 failed.')
  } finally {
    console.log = oldLog
    await new Promise((resolve) => server.close(resolve))
    await pool.end()
  }
}
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
