'use strict'
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const nodemailer = require('nodemailer')
const { generateCode, hashCode, codeMatches } = require('./lib/verification')
const { bcrypt, issueToken, requireAuth, requireRole } = require('./lib/auth')
const { positiveInteger, validEmail, requiredText, parseTimeRange, validateBooking, statusCanChange } = require('./lib/rules')

const app = express()
const staffRoles = ['BOOKING_STAFF', 'CENTRE_MANAGER', 'SYSTEM_ADMIN']
const secret = process.env.JWT_SECRET
if (!secret || secret.length < 32 || secret.includes('REPLACE')) {
  console.error('JWT_SECRET must contain at least 32 characters. See backend/.env.example')
  process.exit(1)
}
const pool = new Pool({
  host: process.env.PGHOST || 'localhost', port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'mccbs_task3', user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || process.env.PG_PASSWORD || ''
})
const port = Number(process.env.PORT || 3001)
const origin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin }))
app.use(express.json({ limit: '24kb' }))
const auth = requireAuth(secret)
const staff = requireRole(...staffRoles)

function errorResponse(res, error) {
  console.error(error)
  const pg = error?.code
  if (pg === '23P01' || pg === '23505') return res.status(409).json({ error: 'Room booking conflict or duplicate record.' })
  if (pg === '23503') return res.status(409).json({ error: 'This record is linked to another record.' })
  return res.status(500).json({ error: 'Server operation failed.' })
}
async function logAction(client, userId, entityType, entityId, action) {
  await client.query('INSERT INTO audit_logs (actor_user_id,entity_type,entity_id,action) VALUES ($1,$2,$3,$4)', [userId, entityType, String(entityId), action])
}
async function enqueueNotice(client, bookingId, userId, type) {
  await client.query('INSERT INTO notifications(booking_id,user_id,notification_type) VALUES ($1,$2,$3)', [bookingId,userId,type])
}
async function roomConflict(client, roomId, start, end, ignoreBookingId = null) {
  const result = await client.query(`
    SELECT EXISTS(SELECT 1 FROM bookings WHERE room_id=$1 AND status='APPROVED'
      AND start_time < $3 AND end_time > $2 AND ($4::uuid IS NULL OR booking_id <> $4))
      OR EXISTS(SELECT 1 FROM room_blocks WHERE room_id=$1 AND start_time < $3 AND end_time > $2) AS conflict`,
    [roomId,start,end,ignoreBookingId])
  return result.rows[0].conflict
}

app.get('/api/test', async (_req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS time')
    res.json({ status: 'Database connected', time: r.rows[0].time, application: 'MCCBS Task 3' })
  } catch (error) { errorResponse(res, error) }
})
app.get('/api/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }) }
  catch(e) { res.status(503).json({ ok:false, database:'unavailable' }) }
})

const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
const developmentMode = process.env.NODE_ENV !== 'production'
async function deliverVerificationCode(address, code) {
  if (smtpReady) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    })
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: address,
      subject: 'MCCBS | Verify your email address',
      text: `Your Melbourne Community Centre Booking System verification code is ${code}. It expires in 15 minutes. If you did not register, ignore this message.`
    })
    return 'EMAIL'
  }
  if (!developmentMode) throw new Error('Email delivery is not configured')
  // Local academic demo only. Never print codes in production.
  console.log(`[LOCAL VERIFICATION CODE] ${address}: ${code} (valid 15 minutes)`)
  return 'DEVELOPMENT_CONSOLE'
}
async function saveVerificationCode(client, userId, email) {
  const code = generateCode()
  const hashed = hashCode(email, code, secret)
  await client.query(`INSERT INTO email_verification_challenges(user_id,code_hash,expires_at)
    VALUES($1,$2,NOW()+INTERVAL '15 minutes') ON CONFLICT(user_id)
    DO UPDATE SET code_hash=EXCLUDED.code_hash,created_at=NOW(),
      expires_at=EXCLUDED.expires_at,attempt_count=0`, [userId, hashed])
  return code
}

app.post('/api/auth/register', async (req,res) => {
  const { firstName, lastName, email, password } = req.body || {}
  if (!requiredText(firstName,80) || !requiredText(lastName,80) || !validEmail(email) || typeof password !== 'string' || password.length < 10 || password.length > 72)
    return res.status(400).json({ error:'Enter your names, a valid email and a password of 10 to 72 characters.' })
  if (!smtpReady && !developmentMode) return res.status(503).json({ error:'Account verification email service is temporarily unavailable.' })
  const address=email.toLowerCase().trim()
  const client=await pool.connect()
  try {
    await client.query('BEGIN')
    const hash=await bcrypt.hash(password,12)
    const r=await client.query(`INSERT INTO users(role_id,first_name,last_name,email,password_hash)
      SELECT role_id,$1,$2,$3,$4 FROM roles WHERE role_name='COMMUNITY_USER'
      RETURNING user_id,email,first_name`,[firstName.trim(),lastName.trim(),address,hash])
    const code=await saveVerificationCode(client,r.rows[0].user_id,address)
    await client.query('COMMIT')
    try {
      const delivery=await deliverVerificationCode(address,code)
      res.status(201).json({ message:'Account created. Enter the six-digit verification code to activate your account.', delivery })
    } catch (mailError) {
      console.error('Verification delivery failed:',mailError.message)
      res.status(201).json({ message:'Account created, but verification delivery failed. Configure email and request a new code.', delivery:'NOT_SENT' })
    }
  } catch(e) {await client.query('ROLLBACK'); errorResponse(res,e)} finally {client.release()}
})
app.post('/api/auth/resend-verification', async (req,res) => {
  const address=String(req.body?.email||'').toLowerCase().trim()
  if (!validEmail(address)) return res.status(400).json({error:'Enter a valid email address.'})
  if (!smtpReady && !developmentMode) return res.status(503).json({error:'Verification email service unavailable.'})
  try {
    const r=await pool.query(`SELECT u.user_id,u.email,u.email_verified_at,ev.created_at FROM users u
      LEFT JOIN email_verification_challenges ev ON ev.user_id=u.user_id WHERE u.email=$1`,[address])
    if (!r.rowCount || r.rows[0].email_verified_at) return res.json({message:'If this account needs verification, a new code has been requested.'})
    if (r.rows[0].created_at && Date.now()-new Date(r.rows[0].created_at).getTime()<60000)
      return res.status(429).json({error:'Please wait one minute before requesting another code.'})
    const code=await saveVerificationCode(pool,r.rows[0].user_id,address)
    await deliverVerificationCode(address,code)
    res.json({message:'A new verification code has been sent.'})
  } catch(e){errorResponse(res,e)}
})
app.post('/api/auth/verify', async (req,res) => {
  const address=String(req.body?.email||'').toLowerCase().trim()
  const code=String(req.body?.code||'').trim()
  if (!validEmail(address) || !/^\d{6}$/.test(code))return res.status(400).json({error:'Enter your email and the six-digit code.'})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const r=await client.query(`SELECT u.user_id,u.email_verified_at,ev.code_hash,ev.expires_at,ev.attempt_count
      FROM users u LEFT JOIN email_verification_challenges ev ON ev.user_id=u.user_id
      WHERE u.email=$1 FOR UPDATE OF u`,[address])
    const row=r.rows[0]
    if (!row || row.email_verified_at || !row.code_hash || row.attempt_count>=5 || new Date(row.expires_at)<=new Date()){
      await client.query('ROLLBACK')
      return res.status(400).json({error:'Code invalid or expired. Request a new code if needed.'})
    }
    if (!codeMatches(address,code,row.code_hash,secret)){
      await client.query(`UPDATE email_verification_challenges SET attempt_count=attempt_count+1 WHERE user_id=$1`,[row.user_id])
      await client.query('COMMIT')
      return res.status(400).json({error:'Code invalid or expired. Please check and try again.'})
    }
    await client.query('UPDATE users SET email_verified_at=NOW() WHERE user_id=$1',[row.user_id])
    await client.query('DELETE FROM email_verification_challenges WHERE user_id=$1',[row.user_id])
    await client.query('COMMIT')
    res.json({message:'Email verified. You can now sign in.'})
  }catch(e){await client.query('ROLLBACK');errorResponse(res,e)}finally{client.release()}
})
app.post('/api/auth/login', async (req,res) => {
  if (!validEmail(req.body?.email) || typeof req.body?.password !== 'string') return res.status(400).json({ error:'Enter your email and password.' })
  try {
    const q = await pool.query(`SELECT u.user_id,u.email,u.first_name,u.last_name,u.password_hash,u.email_verified_at,r.role_name
      FROM users u JOIN roles r ON u.role_id=r.role_id WHERE lower(u.email)=$1 AND u.is_active=TRUE`,[req.body.email.toLowerCase().trim()])
    const found = q.rows[0]
    if (!found || !(await bcrypt.compare(req.body.password,found.password_hash))) return res.status(401).json({ error:'Incorrect email or password.' })
    if (!found.email_verified_at) return res.status(403).json({error:'Please verify your email before signing in.', verificationRequired:true})
    const {password_hash: _, email_verified_at: __, ...user} = found
    res.json({token:issueToken(user,secret),user})
  } catch(e) { errorResponse(res,e) }
})
app.get('/api/auth/me',auth,async (req,res) => {
  try {
    const r = await pool.query(`SELECT u.user_id,u.email,u.first_name,u.last_name,r.role_name FROM users u JOIN roles r USING (role_id)
      WHERE u.user_id=$1 AND u.is_active=TRUE`,[req.user.sub])
    if (!r.rowCount) return res.status(401).json({error:'Account no longer active.'})
    res.json(r.rows[0])
  } catch(e) { errorResponse(res,e) }
})
app.get('/api/rooms', async (req,res) => {
  const minCapacity = req.query.minCapacity ? positiveInteger(req.query.minCapacity) : null
  if (req.query.minCapacity && !minCapacity) return res.status(400).json({error:'Invalid capacity filter.'})
  let dates = null
  if (req.query.startTime || req.query.endTime) {
    dates = parseTimeRange(req.query.startTime,req.query.endTime)
    if (dates.error) return res.status(400).json({error:dates.error})
  }
  try {
    const q = await pool.query(`SELECT r.room_id,r.room_name,r.capacity,r.description,c.centre_name,c.suburb,
      COALESCE((SELECT json_agg(f.facility_name ORDER BY f.facility_name) FROM room_facilities rf
        JOIN facilities f USING(facility_id) WHERE rf.room_id=r.room_id),'[]'::json) AS facilities
      FROM rooms r JOIN community_centres c USING (centre_id)
      WHERE r.is_active=TRUE AND c.is_active=TRUE AND ($1::integer IS NULL OR r.capacity >= $1)
      AND ($2::timestamptz IS NULL OR NOT EXISTS
        (SELECT 1 FROM bookings b WHERE b.room_id=r.room_id AND b.status='APPROVED' AND b.start_time<$3 AND b.end_time>$2)
        AND NOT EXISTS (SELECT 1 FROM room_blocks rb WHERE rb.room_id=r.room_id AND rb.start_time<$3 AND rb.end_time>$2))
      ORDER BY c.centre_name,r.room_name`,[minCapacity,dates?.startTime||null, dates?.endTime||null])
    res.json(q.rows)
  } catch(e) { errorResponse(res,e) }
})
app.post('/api/bookings',auth,async (req,res) => {
  const v = validateBooking(req.body)
  if (v.error) return res.status(400).json({error:v.error})
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)',[v.roomId])
    const room = await client.query('SELECT capacity,is_active FROM rooms WHERE room_id=$1 FOR SHARE',[v.roomId])
    if (!room.rowCount || !room.rows[0].is_active) { await client.query('ROLLBACK'); return res.status(404).json({error:'Room not found.'}) }
    if (v.attendees > room.rows[0].capacity) { await client.query('ROLLBACK'); return res.status(400).json({error:'Attendee count exceeds room capacity.'}) }
    if (await roomConflict(client,v.roomId,v.startTime,v.endTime)) { await client.query('ROLLBACK'); return res.status(409).json({error:'Room is already booked or blocked at this time.'}) }
    const q=await client.query(`INSERT INTO bookings(user_id,room_id,purpose,start_time,end_time,attendees,status)
      VALUES($1,$2,$3,$4,$5,$6,'PENDING') RETURNING booking_id,status,requested_at`,[req.user.sub,v.roomId,v.purpose,v.startTime,v.endTime,v.attendees])
    await enqueueNotice(client,q.rows[0].booking_id,req.user.sub,'REQUEST_RECEIVED')
    await logAction(client,req.user.sub,'BOOKING',q.rows[0].booking_id,'REQUESTED')
    await client.query('COMMIT')
    res.status(201).json({...q.rows[0],attendees:v.attendees})
  } catch(e) { await client.query('ROLLBACK'); errorResponse(res,e) } finally { client.release() }
})
app.get('/api/bookings/mine',auth,async (req,res) => {
  try {
    const q=await pool.query(`SELECT b.booking_id,b.purpose,b.status,b.start_time,b.end_time,b.attendees,b.requested_at,
      r.room_name,c.centre_name FROM bookings b JOIN rooms r USING(room_id) JOIN community_centres c USING(centre_id)
      WHERE b.user_id=$1 ORDER BY b.requested_at DESC`,[req.user.sub]);res.json(q.rows)
  } catch(e) {errorResponse(res,e)}
})
app.patch('/api/bookings/:id/cancel',auth,async (req,res) => {
  const client=await pool.connect()
  try {
    await client.query('BEGIN')
    const b=await client.query(`SELECT * FROM bookings WHERE booking_id=$1 AND user_id=$2 FOR UPDATE`,[req.params.id,req.user.sub])
    if (!b.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Booking not found.'})}
    if (!['PENDING','APPROVED'].includes(b.rows[0].status) || new Date(b.rows[0].start_time)<=new Date()){
      await client.query('ROLLBACK');return res.status(409).json({error:'This booking can no longer be cancelled.'})}
    const q=await client.query(`UPDATE bookings SET status='CANCELLED',cancelled_at=NOW() WHERE booking_id=$1 RETURNING booking_id,status`,[req.params.id])
    await logAction(client,req.user.sub,'BOOKING',req.params.id,'CANCELLED')
    await enqueueNotice(client,req.params.id,req.user.sub,'CANCELLED')
    await client.query('COMMIT');res.json(q.rows[0])
  } catch(e) {await client.query('ROLLBACK');errorResponse(res,e)} finally{client.release()}
})
app.get('/api/staff/bookings',auth,staff,async (req,res) => {
  try {
    const q=await pool.query(`SELECT b.booking_id,b.purpose,b.status,b.start_time,b.end_time,b.attendees,b.requested_at,
      r.room_name,c.centre_name,u.first_name,u.last_name,u.email
      FROM bookings b JOIN rooms r USING(room_id) JOIN community_centres c USING(centre_id)
      JOIN users u USING(user_id) ORDER BY b.requested_at DESC LIMIT 100`)
    res.json(q.rows)
  }catch(e){errorResponse(res,e)}
})
app.patch('/api/staff/bookings/:id/decision',auth,staff,async (req,res) => {
  const target=req.body?.status
  if (!['APPROVED','REJECTED'].includes(target))return res.status(400).json({error:'Choose APPROVED or REJECTED.'})
  const client=await pool.connect()
  try {
    await client.query('BEGIN')
    const q=await client.query('SELECT * FROM bookings WHERE booking_id=$1 FOR UPDATE',[req.params.id])
    if (!q.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Booking not found.'})}
    const b=q.rows[0]
    if (!statusCanChange(b.status,target)){await client.query('ROLLBACK');return res.status(409).json({error:'Only Pending bookings can be decided.'})}
    await client.query('SELECT pg_advisory_xact_lock($1)',[Number(b.room_id)])
    if (target==='APPROVED' && await roomConflict(client,b.room_id,b.start_time,b.end_time,b.booking_id)){
      await client.query('ROLLBACK');return res.status(409).json({error:'Cannot approve: conflicting approved booking or room block.'})}
    const u=await client.query('UPDATE bookings SET status=$1,decided_at=NOW(),decided_by=$2 WHERE booking_id=$3 RETURNING booking_id,status,decided_at',
      [target,req.user.sub,b.booking_id])
    await logAction(client,req.user.sub,'BOOKING',b.booking_id,target)
    await enqueueNotice(client,b.booking_id,b.user_id,target)
    await client.query('COMMIT');res.json(u.rows[0])
  }catch(e){await client.query('ROLLBACK');errorResponse(res,e)}finally{client.release()}
})
app.get('/api/staff/summary',auth,staff,async(_req,res) => {
  try {
    const q=await pool.query(`SELECT COUNT(*) FILTER(WHERE status='PENDING')::integer AS pending,
      COUNT(*) FILTER(WHERE status='APPROVED')::integer AS approved,
      COUNT(*) FILTER(WHERE status='REJECTED')::integer AS rejected
      FROM bookings`)
    const blocks=await pool.query('SELECT COUNT(*)::integer AS blocks FROM room_blocks WHERE end_time>NOW()')
    res.json({...q.rows[0],activeBlocks:blocks.rows[0].blocks})
  }catch(e){errorResponse(res,e)}
})
app.post('/api/staff/room-blocks',auth,staff,async(req,res)=>{
  const roomId=positiveInteger(req.body?.roomId)
  const range=parseTimeRange(req.body?.startTime,req.body?.endTime)
  if (!roomId || range.error || !requiredText(req.body?.reason,250))return res.status(400).json({error:range.error||'Room and reason required.'})
  const client=await pool.connect()
  try {
    await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock($1)',[roomId])
    if (await roomConflict(client,roomId,range.startTime,range.endTime)){
      await client.query('ROLLBACK');return res.status(409).json({error:'Room has a conflicting booking or block.'})}
    const q=await client.query(`INSERT INTO room_blocks(room_id,start_time,end_time,reason,created_by)
      VALUES($1,$2,$3,$4,$5) RETURNING block_id,reason`,[roomId,range.startTime,range.endTime,req.body.reason.trim(),req.user.sub])
    await logAction(client,req.user.sub,'ROOM_BLOCK',q.rows[0].block_id,'CREATED');await client.query('COMMIT');res.status(201).json(q.rows[0])
  }catch(e){await client.query('ROLLBACK');errorResponse(res,e)}finally{client.release()}
})
app.patch('/api/staff/rooms/:id',auth,staff,async(req,res)=>{
  const id=positiveInteger(req.params.id)
  const capacity=req.body?.capacity===undefined?null:positiveInteger(req.body.capacity)
  if(!id || (req.body.capacity!==undefined && !capacity) || (req.body.isActive!==undefined && typeof req.body.isActive!=='boolean'))
    return res.status(400).json({error:'Invalid room or update.'})
  try {
    const q=await pool.query(`UPDATE rooms SET capacity=COALESCE($2,capacity),is_active=COALESCE($3,is_active)
      WHERE room_id=$1 RETURNING room_id,room_name,capacity,is_active`,[id,capacity,req.body.isActive??null])
    if(!q.rowCount)return res.status(404).json({error:'Room not found.'})
    res.json(q.rows[0])
  }catch(e){errorResponse(res,e)}
})

// Free community noticeboard. Submissions require a verified account and staff moderation.
app.get('/api/promotions', async (_req,res) => {
  try{
    const q=await pool.query(`SELECT promotion_id,title,description,event_date::text AS event_date,location,category
      FROM community_promotions WHERE status='APPROVED' AND event_date >= CURRENT_DATE
      ORDER BY event_date ASC, promotion_id DESC LIMIT 80`)
    res.json(q.rows)
  }catch(e){errorResponse(res,e)}
})
app.post('/api/promotions',auth,async(req,res)=>{
  const { title,description,eventDate,location,category }=req.body||{}
  const allowed=['Workshop','Community Event','Class','Meetup']
  if (!requiredText(title,120) || !requiredText(description,1000) || String(description).trim().length<30 ||
    !requiredText(location,150) || !allowed.includes(category) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(eventDate||'')) || !Number.isFinite(Date.parse(eventDate)) ||
    new Date(`${eventDate}T23:59:59`)<new Date())
    return res.status(400).json({error:'Enter a title, a description of at least 30 characters, a future date, location and category.'})
  try{
    const q=await pool.query(`INSERT INTO community_promotions(created_by,title,description,event_date,location,category)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING promotion_id,status`,[req.user.sub,title.trim(),description.trim(),eventDate,location.trim(),category])
    res.status(201).json({...q.rows[0],message:'Promotion submitted for staff review. Posting is free.'})
  }catch(e){errorResponse(res,e)}
})
app.get('/api/promotions/mine',auth,async(req,res)=>{
  try{const q=await pool.query(`SELECT promotion_id,title,event_date::text AS event_date,status FROM community_promotions
    WHERE created_by=$1 ORDER BY created_at DESC LIMIT 50`,[req.user.sub]);res.json(q.rows)}
  catch(e){errorResponse(res,e)}
})
app.get('/api/staff/promotions',auth,staff,async(_req,res)=>{
  try{const q=await pool.query(`SELECT p.promotion_id,p.title,p.description,p.event_date::text AS event_date,p.location,p.category,p.status,
    u.first_name,u.last_name FROM community_promotions p JOIN users u ON u.user_id=p.created_by
    WHERE p.status='PENDING' ORDER BY p.created_at LIMIT 100`);res.json(q.rows)}
  catch(e){errorResponse(res,e)}
})
app.patch('/api/staff/promotions/:id',auth,staff,async(req,res)=>{
  const status=req.body?.status
  if(!['APPROVED','REJECTED'].includes(status) || !positiveInteger(req.params.id))
    return res.status(400).json({error:'Invalid moderation decision.'})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const q=await client.query(`UPDATE community_promotions SET status=$1,reviewed_at=NOW(),reviewed_by=$2
      WHERE promotion_id=$3 AND status='PENDING' RETURNING promotion_id,status`,[status,req.user.sub,req.params.id])
    if(!q.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Promotion not found or already reviewed.'})}
    await logAction(client,req.user.sub,'PROMOTION',q.rows[0].promotion_id,status)
    await client.query('COMMIT');res.json(q.rows[0])
  }catch(e){await client.query('ROLLBACK');errorResponse(res,e)}finally{client.release()}
})
app.use((_req,res)=>res.status(404).json({error:'Endpoint not found.'}))
if(require.main===module){app.listen(port,'127.0.0.1',()=>console.log(`MCCBS Task 3 API running at http://localhost:${port}`))}
module.exports={app,pool}
