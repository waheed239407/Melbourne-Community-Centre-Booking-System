'use strict'
require('dotenv').config()
const { Pool }=require('pg')
const bcrypt=require('bcryptjs')
const password=process.env.DEMO_PASSWORD
if(!password || password.length<10 || password.startsWith('REPLACE')) { console.error('Set DEMO_PASSWORD in backend/.env to at least 10 characters.');process.exit(1) }
const pool=new Pool({ host:process.env.PGHOST||'localhost',port:Number(process.env.PGPORT||5432),database:process.env.PGDATABASE||'mccbs_task3',user:process.env.PGUSER||'postgres',password:process.env.PGPASSWORD||''})
async function main(){
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    for(const [name,suburb,postcode] of [
      ['South Melbourne Community Centre','South Melbourne','3205'],['Port Melbourne Community Centre','Port Melbourne','3207'],['St Kilda Community Centre','St Kilda','3182']]){
      await client.query(`INSERT INTO community_centres(centre_name,address_line,suburb,postcode)
      VALUES($1,'Demonstration address only',$2,$3) ON CONFLICT(centre_name) DO NOTHING`,[name,suburb,postcode])
    }
    for(const [name,centre,capacity] of [
      ['Banksia Room','South Melbourne Community Centre',40],['Yarra Hall','Port Melbourne Community Centre',80],['Garden Studio','St Kilda Community Centre',24]]){
      await client.query(`INSERT INTO rooms(room_name,centre_id,capacity,description)
        SELECT $1,centre_id,$3,'Task 3 demonstrator room' FROM community_centres WHERE centre_name=$2
        ON CONFLICT(centre_id,room_name) DO NOTHING`,[name,centre,capacity])
    }
    for(const name of ['Projector','Accessible Entry','Kitchen','Stage','Whiteboard']){
      await client.query('INSERT INTO facilities(facility_name) VALUES($1) ON CONFLICT(facility_name) DO NOTHING',[name])
    }
    for(const [room,facility] of [['Banksia Room','Projector'],['Banksia Room','Kitchen'],['Banksia Room','Accessible Entry'],
      ['Yarra Hall','Projector'],['Yarra Hall','Stage'],['Yarra Hall','Accessible Entry'],['Garden Studio','Whiteboard'],['Garden Studio','Accessible Entry']]){
      await client.query(`INSERT INTO room_facilities(room_id,facility_id)
        SELECT r.room_id,f.facility_id FROM rooms r JOIN facilities f ON f.facility_name=$2 WHERE r.room_name=$1
        ON CONFLICT DO NOTHING`,[room,facility])
    }
    const hash=await bcrypt.hash(password,12)
    for(const [first,last,email,role] of [['Demo','Community','community.demo@mccbs.example','COMMUNITY_USER'],['Demo','Staff','staff.demo@mccbs.example','BOOKING_STAFF']]){
      await client.query(`INSERT INTO users(first_name,last_name,email,password_hash,role_id,email_verified_at)
        SELECT $1,$2,$3,$4,role_id,NOW() FROM roles WHERE role_name=$5
        ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,email_verified_at=NOW()`,[first,last,email,hash,role])
    }
    await client.query('COMMIT')
    console.log('Seed complete: three rooms and two demo accounts.')
    console.log('Demo user: community.demo@mccbs.example')
    console.log('Demo staff: staff.demo@mccbs.example')
    console.log('Both accounts use the DEMO_PASSWORD from backend/.env. Do not share it publicly.')
  }catch(e){await client.query('ROLLBACK');console.error(e);process.exitCode=1}finally{client.release();await pool.end()}
}
main()
