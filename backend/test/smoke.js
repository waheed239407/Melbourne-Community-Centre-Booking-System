'use strict'
// Live smoke test, deliberately opt-in. Run after PostgreSQL seed and backend start.
require('dotenv').config()
const assert=require('node:assert/strict')
const BASE=process.env.SMOKE_URL || 'http://localhost:3001'
const demoPassword=process.env.DEMO_PASSWORD
if(!demoPassword || demoPassword.startsWith('REPLACE')) {console.error('Set DEMO_PASSWORD in .env before smoke test.');process.exit(1)}
let number=0
async function send(path,method='GET',body=null,token=null,expected=200) {
  const r=await fetch(BASE+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const data=await r.json().catch(()=>({}))
  assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(data)}`)
  return data
}
function check(label,truth){assert.ok(truth,label);number++;console.log(`PASS S${String(number).padStart(2,'0')}: ${label}`)}
async function main(){
  const health=await send('/api/health');check('Database health',health.database==='connected')
  const rooms=await send('/api/rooms');check('Three seeded rooms retrieved',rooms.length>=3)
  const community=await send('/api/auth/login','POST',{email:'community.demo@mccbs.example',password:demoPassword})
  check('Community login and role',community.user.role_name==='COMMUNITY_USER')
  const staff=await send('/api/auth/login','POST',{email:'staff.demo@mccbs.example',password:demoPassword})
  check('Staff login and role',staff.user.role_name==='BOOKING_STAFF')
  await send('/api/staff/bookings','GET',null,community.token,403);check('Community cannot list staff bookings',true)
  const time=new Date(Date.now()+60*86400000)
  time.setUTCHours(10,0,0,0)
  const end=new Date(time.getTime()+2*3600000)
  const body={roomId:rooms[0].room_id,purpose:'Task 3 live smoke test',attendees:1,startTime:time.toISOString(),endTime:end.toISOString()}
  const b1=await send('/api/bookings','POST',body,community.token,201)
  check('Booking request saved as Pending',b1.status==='PENDING')
  const mine=await send('/api/bookings/mine','GET',null,community.token)
  check('Own booking is retrievable',mine.some(x=>x.booking_id===b1.booking_id))
  const decision=await send(`/api/staff/bookings/${b1.booking_id}/decision`,'PATCH',{status:'APPROVED'},staff.token)
  check('Staff approval persists',decision.status==='APPROVED')
  await send('/api/bookings','POST',body,community.token,409)
  check('Conflicting approved booking rejected',true)
  const cancelled=await send(`/api/bookings/${b1.booking_id}/cancel`,'PATCH',null,community.token)
  check('Owner cancellation persists',cancelled.status==='CANCELLED')
  const b2=await send('/api/bookings','POST',body,community.token,201)
  check('Room becomes bookable after cancellation',b2.status==='PENDING')
  const rejected=await send(`/api/staff/bookings/${b2.booking_id}/decision`,'PATCH',{status:'REJECTED'},staff.token)
  check('Staff rejection persists',rejected.status==='REJECTED')
  const summary=await send('/api/staff/summary','GET',null,staff.token)
  check('Dashboard summary derives from database',Number.isInteger(summary.approved))
  const eventDate = new Date(Date.now()+75*86400000).toISOString().slice(0,10)
  const promotion=await send('/api/promotions','POST',{
    title:`Smoke test event ${Date.now()}`,
    description:'A demonstration community workshop to verify public promotion review and publication.',
    eventDate,location:'South Melbourne Community Centre',category:'Workshop'
  },community.token,201)
  check('Free event promotion created as Pending',promotion.status==='PENDING')
  const minePromos=await send('/api/promotions/mine','GET',null,community.token)
  check('My pending promotion is visible',minePromos.some(x=>x.promotion_id===promotion.promotion_id))
  const queue=await send('/api/staff/promotions','GET',null,staff.token)
  check('Pending promotion reaches staff queue',queue.some(x=>x.promotion_id===promotion.promotion_id))
  await send(`/api/staff/promotions/${promotion.promotion_id}`,'PATCH',{status:'APPROVED'},staff.token)
  check('Staff can approve promotion',true)
  const listings=await send('/api/promotions')
  check('Approved promotion appears publicly',listings.some(x=>x.promotion_id===promotion.promotion_id))
  console.log(`LIVE SMOKE TEST: ${number} passed, 0 failed. Test rows remain for audit evidence.`)
}
main().catch(e=>{console.error(e);process.exit(1)})
