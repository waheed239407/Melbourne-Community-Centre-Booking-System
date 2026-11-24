import { useCallback, useEffect, useState } from 'react'
import './styles.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const staffRoles = ['BOOKING_STAFF', 'CENTRE_MANAGER', 'SYSTEM_ADMIN']
const initialDate = () => {
  const d = new Date(Date.now() + 2 * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const displayDate = (value) => value ? new Date(value).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short'}) : '-'

async function api(path, { method='GET', body, token } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? {'Content-Type':'application/json'} : {}),
      ...(token ? {Authorization:`Bearer ${token}`} : {})
    },
    ...(body ? {body:JSON.stringify(body)} : {})
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

function Header({view,setView,user,logout}) {
  const primary=[['home','Home'],['search','Find a Space'],['promotions','Community Events']]
  return <header className="topbar">
    <button className="brand-link" onClick={()=>setView('home')} aria-label="MCCBS home">
      <span className="brand-icon" aria-hidden="true">M</span>
      <span><span className="brand">MCCBS</span><span className="subbrand">Melbourne Community Spaces</span></span>
    </button>
    <nav aria-label="Primary navigation">
      {primary.map(([key,title])=><button key={key} className={view===key?'nav active':'nav'} onClick={()=>setView(key)}>{title}</button>)}
      {user&&<button className={view==='mine'?'nav active':'nav'} onClick={()=>setView('mine')}>My Bookings</button>}
      {staffRoles.includes(user?.role_name)&&<button className={view==='staff'?'nav active':'nav'} onClick={()=>setView('staff')}>Staff</button>}
      <button className="nav-account" onClick={()=>setView('account')}>{user?`Hi, ${user.first_name}`:'Sign In'}</button>
      {!user&&<button className="nav-join" onClick={()=>setView('register')}>Create Account</button>}
      {user&&<button className="nav-exit" onClick={logout} aria-label="Sign out">Sign Out</button>}
    </nav>
  </header>
}
function HomeView({setView}) {
  return <main>
    <section className="landing-hero">
      <div className="landing-grid">
        <div className="landing-copy">
          <span className="landing-kicker"><span className="kicker-dot"/> Made for Melbourne communities</span>
          <h1>Great spaces bring <em>people together.</em></h1>
          <p>Find the right community room, organise your next gathering, and share local events. One welcoming place for the people and ideas that make a neighbourhood thrive.</p>
          <div className="hero-actions"><button className="btn-light" onClick={()=>setView('search')}>Explore community spaces <span aria-hidden="true">↗</span></button><button className="btn-outline-light" onClick={()=>setView('promotions')}>Discover local events</button></div>
          <div className="hero-stats"><span><strong>3</strong> featured spaces</span><span><strong>Easy</strong> booking requests</span><span><strong>Free</strong> event promotion</span></div>
        </div>
        <div className="landing-art" aria-label="Community room booking preview">
          <div className="art-pattern"/>
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="preview-card"><div className="preview-card-head"><span className="preview-dot"/> ROOM HIGHLIGHT <span className="preview-pill">Open for enquiries</span></div>
          <div className="preview-visual"><div className="visual-sun"/><div className="visual-window"><span/><span/><span/></div><div className="visual-desk"/></div>
          <div className="preview-card-body"><span className="preview-overline">COMMUNITY SPACE</span><strong>Banksia Room</strong><span>South Melbourne · Up to 40 guests</span><div className="preview-chips"><small>Workshops</small><small>Meetups</small><small>Community events</small></div></div>
          </div><div className="art-note"><strong>Make room for good things.</strong><span>Local spaces. Stronger communities.</span></div>
        </div>
      </div>
    </section>
    <section className="home-below page">
      <div className="eyebrow">HOW IT WORKS</div><div className="section-heading"><h2>From your idea to your next gathering</h2><p>Simple steps to bring your plans to life.</p></div>
      <div className="steps-grid"><article><span className="step-index">01</span><h3>Discover a space</h3><p>Browse local rooms by capacity, date and facilities to find a suitable setting.</p></article><article><span className="step-index">02</span><h3>Request your time</h3><p>Sign in and submit the details. Your request is reviewed by centre staff.</p></article><article><span className="step-index">03</span><h3>Bring people together</h3><p>Track your booking and share your upcoming community event at no cost.</p></article></div>
      <div className="feature-banner"><div><span className="eyebrow">FREE COMMUNITY NOTICEBOARD</span><h2>Your next great event deserves to be seen.</h2><p>Post local workshops, classes and gatherings. Every submission is reviewed before it appears on our public noticeboard.</p><button className="primary" onClick={()=>setView('promotions')}>Explore free event promotion <span aria-hidden="true">↗</span></button></div><div className="banner-typography" aria-hidden="true">HELLO<br/>MELBOURNE<span>.</span></div></div>
    </section>
  </main>
}
function LoginView({mode='login',onLogin,onRegister,onVerify,onResend,setView}) {
  const [screen,setScreen]=useState(mode)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [firstName,setFirstName]=useState('')
  const [lastName,setLastName]=useState('')
  const [code,setCode]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [success,setSuccess]=useState(false)
  useEffect(()=>{setScreen(mode);setMessage('');setSuccess(false)},[mode])
  async function submit(event){
    event.preventDefault();setBusy(true);setMessage('');setSuccess(false)
    try {
      if(screen==='register'){
        const r=await onRegister({firstName,lastName,email,password})
        setMessage(r.message+(r.delivery==='DEVELOPMENT_CONSOLE'?' For the local demo, find the code in the backend terminal.':''))
        setScreen('verify');setSuccess(true)
      }else if(screen==='verify'){
        const r=await onVerify(email,code)
        setMessage(r.message);setSuccess(true);setScreen('login');setPassword('')
      }else await onLogin(email,password)
    }catch(e){setMessage(e.message);if(/verify your email/i.test(e.message))setScreen('verify')}
    finally{setBusy(false)}
  }
  async function resend(){
    setBusy(true);setMessage('');try{const r=await onResend(email);setMessage(r.message);setSuccess(true)}catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  return <main className="auth-shell"><section className="auth-welcome">
      <div className="auth-welcome-content"><span className="landing-kicker"><span className="kicker-dot"/> A place for every gathering</span><h2>Where Melbourne <em>comes together.</em></h2><p>Discover a space, make a booking, and connect with your local community.</p><div className="auth-graphic"><div className="auth-circle circle-a"/><div className="auth-circle circle-b"/><span>GOOD<br/>THINGS<br/>HAPPEN<br/>HERE.</span></div></div>
    </section><section className="auth-main"><div className="auth-form-shell"><button className="text-back" onClick={()=>setView('home')}>← Back to home</button>
      <p className="eyebrow">{screen==='login'?'WELCOME BACK':screen==='register'?'JOIN THE COMMUNITY':'ONE MORE STEP'}</p>
      <h1>{screen==='login'?'Sign in to your account':screen==='register'?'Create your free account':'Verify your email'}</h1>
      <p className="auth-subtitle">{screen==='login'?'Access your bookings and community updates.':screen==='register'?'Book spaces and promote your local events.':'Enter the six-digit code sent to your email.'}</p>
      <div className="auth-switch" role="group" aria-label="Account options"><button className={screen==='login'?'selected':''} onClick={()=>{setScreen('login');setMessage('')}}>Sign in</button><button className={screen==='register'?'selected':''} onClick={()=>{setScreen('register');setMessage('')}}>Create account</button></div>
      <form onSubmit={submit} className="auth-form">
        {screen==='register'&&<div className="two-inputs"><label>First name<input autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name" required/></label><label>Last name<input autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name" required/></label></div>}
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
        {screen==='verify'?<label>Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="6-digit code" required/></label>:<label>Password<div className="password-field"><input type={showPassword?'text':'password'} autoComplete={screen==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={screen==='register'?'Minimum 10 characters':'Enter your password'} minLength={screen==='register'?10:1} required/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Hide':'Show'}</button></div></label>}
        {message&&<div className={success?'inline-feedback success':'inline-feedback'} role="status">{message}</div>}
        <button className="primary full-width" disabled={busy}>{busy?'Please wait...':screen==='register'?'Create account':screen==='verify'?'Verify account':'Sign in'} <span aria-hidden="true">→</span></button>
      </form>
      {screen==='verify'&&<div className="auth-bottom"><button className="text-link" disabled={busy||!email} onClick={resend}>Resend verification code</button><p>For local demonstrations without SMTP, the code appears in the backend terminal.</p></div>}
      <div className="auth-bottom"><p>{screen==='login'?"New to MCCBS?":"Already have an account?"} <button className="text-link" onClick={()=>{setScreen(screen==='login'?'register':'login');setMessage('')}}>{screen==='login'?'Create an account':'Sign in'}</button></p></div>
    </div></section></main>
}
function SearchView({user,token,onBook,setView}){
  const [date,setDate]=useState(initialDate())
  const [start,setStart]=useState('18:00')
  const [end,setEnd]=useState('20:00')
  const [people,setPeople]=useState(25)
  const [rooms,setRooms]=useState([])
  const [busy,setBusy]=useState(true)
  const [error,setError]=useState('')
  const loadRooms=useCallback(async ({filter=false}={})=>{
    setBusy(true);setError('')
    try{
      const query = filter ? `?minCapacity=${encodeURIComponent(people)}&startTime=${encodeURIComponent(new Date(`${date}T${start}`).toISOString())}&endTime=${encodeURIComponent(new Date(`${date}T${end}`).toISOString())}`:''
      setRooms(await api(`/api/rooms${query}`))
    }catch(e){setError(e.message)}finally{setBusy(false)}
  },[date,start,end,people])
  useEffect(()=>{loadRooms()},[]) // Load all active rooms when the view opens.
  const choose=(room)=>{
    if(!user){setView('account');return}
    onBook({room,date,start,end,people})
  }
  return <main className="page">
    <section className="hero"><p className="eyebrow">Community rooms made easier</p><h1>Find an available room</h1>
      <p>Find a welcoming space for your next workshop, meeting or celebration. Filter by date, time and group size.</p></section>
    <form className="filter-card" onSubmit={e=>{e.preventDefault();loadRooms({filter:true})}}>
      <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
      <label>Start time<input type="time" value={start} onChange={e=>setStart(e.target.value)} required/></label>
      <label>End time<input type="time" value={end} onChange={e=>setEnd(e.target.value)} required/></label>
      <label>People<input type="number" min="1" max="1000" value={people} onChange={e=>setPeople(Number(e.target.value))} required/></label>
      <button className="primary" type="submit" disabled={busy}>Search rooms</button>
    </form>
    <div className="section-head"><h2>Available rooms</h2><span>{busy?'Loading...':`${rooms.length} results`}</span></div>
    {error&&<div role="alert" className="notice">{error}</div>}
    {rooms.length===0&&!busy&&!error&&<div className="notice">No matching rooms. Try another date or smaller group.</div>}
    <section className="room-grid" aria-label="Available rooms">
    {rooms.map(r=><article className="room-card" key={r.room_id}>
      <div className="room-image">{r.room_name.charAt(0)}</div>
      <div className="room-body"><span className="status ok">Available</span><h3>{r.room_name}</h3><p>{r.centre_name}</p>
        <dl><div><dt>Capacity</dt><dd>{r.capacity} people</dd></div><div><dt>Facilities</dt><dd>{r.facilities?.join(', ')||'Standard room'}</dd></div></dl>
        <button className="secondary" onClick={()=>choose(r)}>Request this room</button>
      </div>
    </article>)}
    </section>

  </main>
}
function PromotionsView({user,token,setView}){
  const [events,setEvents]=useState([])
  const [mine,setMine]=useState([])
  const [category,setCategory]=useState('All')
  const [open,setOpen]=useState(false)
  const [form,setForm]=useState({title:'',description:'',eventDate:initialDate(),location:'',category:'Workshop'})
  const [status,setStatus]=useState('')
  const [loading,setLoading]=useState(false)
  const reload=useCallback(async()=>{
    try{setEvents(await api('/api/promotions'));if(token)setMine(await api('/api/promotions/mine',{token}))}
    catch(e){setStatus(e.message)}
  },[token])
  useEffect(()=>{reload()},[reload])
  async function submit(e){
    e.preventDefault();setLoading(true);setStatus('')
    try{const result=await api('/api/promotions',{method:'POST',token,body:form});setStatus(result.message);setForm({title:'',description:'',eventDate:initialDate(),location:'',category:'Workshop'});setOpen(false);await reload()}
    catch(e){setStatus(e.message)}finally{setLoading(false)}
  }
  const visible=events.filter(e=>category==='All'||e.category===category)
  return <main><section className="promo-hero"><div className="page promo-intro"><div><span className="landing-kicker"><span className="kicker-dot"/> THE COMMUNITY NOTICEBOARD</span><h1>Good events deserve <em>great company.</em></h1><p>Discover what is happening in your neighbourhood, or share your next community event with Melbourne. Creating a listing is free.</p><button className="btn-light" onClick={()=>user?setOpen(true):setView('register')}>+ Promote your event for free</button></div><div className="promo-poster" aria-hidden="true"><span>THIS<br/>IS<br/>YOUR<br/>CITY<span className="poster-star">✳</span></span><small>Find your people. Make a difference.</small></div></div></section>
    <div className="page promo-content"><div className="section-heading"><div><p className="eyebrow">LOCAL HAPPENINGS</p><h2>Explore upcoming events</h2></div><label className="category-picker">Browse by type <select value={category} onChange={e=>setCategory(e.target.value)}>{['All','Workshop','Community Event','Class','Meetup'].map(c=><option key={c}>{c}</option>)}</select></label></div>
      {status&&<div className="inline-feedback success" role="status">{status}</div>}
      {visible.length?<section className="event-grid">{visible.map(event=><article className="event-card" key={event.promotion_id}><div className="event-visual"><span>{event.category}</span><strong>{new Date(event.event_date+'T00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'}).toUpperCase()}</strong></div><div className="event-content"><p className="eyebrow">{event.category.toUpperCase()}</p><h3>{event.title}</h3><p>{event.description}</p><div className="event-location">⌖ {event.location}</div></div></article>)}</section>:<div className="empty-state"><strong>The noticeboard is ready for your community.</strong><p>Approved events will appear here. Be the first to share a workshop or gathering.</p><button className="secondary" onClick={()=>user?setOpen(true):setView('register')}>Post an event for free</button></div>}
      {user&&mine.length>0&&<section className="my-promos"><p className="eyebrow">YOUR SUBMISSIONS</p><h2>My promotion requests</h2><div className="event-list">{mine.map(p=><div key={p.promotion_id}><strong>{p.title}</strong><span>{p.event_date?.slice(0,10)} · <b className="status warn">{p.status}</b></span></div>)}</div></section>}
      {open&&user&&<section className="panel promo-submit"><div className="section-head"><div><p className="eyebrow">FREE EVENT PROMOTION</p><h2>Share your next event</h2><p className="muted">Every listing is checked by our staff before going live.</p></div><button className="secondary small" onClick={()=>setOpen(false)}>Close</button></div><form className="form-grid" onSubmit={submit}><label>Event title<input maxLength="120" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="Community gardening workshop"/></label><label>Event date<input type="date" min={initialDate()} value={form.eventDate} onChange={e=>setForm({...form,eventDate:e.target.value})} required/></label><label>Location<input maxLength="150" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} required placeholder="Community centre or local venue"/></label><label>Type<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Workshop','Community Event','Class','Meetup'].map(c=><option key={c}>{c}</option>)}</select></label><label className="full">Description<textarea maxLength="1000" minLength="30" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required placeholder="Tell people what to expect, who can attend, and how to take part."/></label><div className="actions full"><button className="primary" disabled={loading}>{loading?'Submitting...':'Submit for review'}</button></div></form></section>}
    </div></main>
}
function StaffPromotions({token}){
  const [rows,setRows]=useState([])
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const reload=useCallback(async()=>{try{setRows(await api('/api/staff/promotions',{token}))}catch(e){setMessage(e.message)}},[token])
  useEffect(()=>{reload()},[reload])
  async function review(id,status){setBusy(true);setMessage('');try{await api(`/api/staff/promotions/${id}`,{method:'PATCH',token,body:{status}});await reload();setMessage(`Promotion ${status.toLowerCase()}.`)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  return <section className="panel staff-promotions"><div className="section-head"><div><p className="eyebrow">COMMUNITY NOTICEBOARD</p><h2>Event promotion approvals</h2></div><button className="secondary small" onClick={reload}>Refresh</button></div>
  {message&&<div className="inline-feedback" role="status">{message}</div>}
  {rows.length?<div className="event-list">{rows.map(p=><div className="review-card" key={p.promotion_id}><div><span className="eyebrow">{p.category} · {p.event_date?.slice(0,10)}</span><h3>{p.title}</h3><p>{p.description}</p><small>{p.location} · Submitted by {p.first_name} {p.last_name}</small></div><div className="review-actions"><button className="primary small" disabled={busy} onClick={()=>review(p.promotion_id,'APPROVED')}>Approve</button><button className="secondary small" disabled={busy} onClick={()=>review(p.promotion_id,'REJECTED')}>Reject</button></div></div>)}</div>:<p className="muted">No promotions awaiting review.</p>}
  </section>
}
function BookingView({selection,token,onDone,setView}){
  const [purpose,setPurpose]=useState('Community workshop')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  if(!selection)return <main className="page narrow"><div className="notice">Choose a room from Find a Room first.</div></main>
  const {room,date,start,end,people}=selection
  async function submit(e){
    e.preventDefault();setBusy(true);setMessage('')
    try {
      const result=await api('/api/bookings',{method:'POST',token,body:{
        roomId:room.room_id,attendees:Number(people),purpose,
        startTime:new Date(`${date}T${start}`).toISOString(),endTime:new Date(`${date}T${end}`).toISOString()
      }})
      onDone(result.booking_id)
    }catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  return <main className="page narrow"><div className="breadcrumb">Find a Room / {room.room_name} / Request</div>
    <section className="panel"><p className="eyebrow">Booking request</p><h1>{room.room_name}</h1>
      <div className="summary-strip"><div><strong>{date}</strong><span>Date</span></div><div><strong>{start} to {end}</strong><span>Time</span></div><div><strong>{people}</strong><span>People</span></div></div>
      <form onSubmit={submit} className="form-grid"><label className="full">Booking purpose<input value={purpose} maxLength={250} onChange={e=>setPurpose(e.target.value)} required/></label>
        <div className="notice full">Bookings start as Pending. Staff must approve them. Double bookings are checked again on the server.</div>
        {message&&<div className="notice full" role="alert">{message}</div>}
        <div className="actions full"><button className="secondary" type="button" onClick={()=>setView('search')}>Back</button><button className="primary" disabled={busy}>{busy?'Submitting...':'Submit booking request'}</button></div>
      </form>
    </section></main>
}
function MineView({token,user}) {
  const [bookings,setBookings]=useState([])
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const load=useCallback(async()=>{
    if(!token)return
    try{setBookings(await api('/api/bookings/mine',{token}));setError('')}
    catch(e){setError(e.message)}
  },[token])
  useEffect(()=>{load()},[load])
  async function cancel(id){
    if(!window.confirm('Cancel this booking?'))return
    setBusy(true)
    try{await api(`/api/bookings/${id}/cancel`,{method:'PATCH',token});await load()}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  if(!user)return <main className="page"><div className="notice">Sign in to see your bookings.</div></main>
  return <main className="page"><div className="section-head"><div><p className="eyebrow">Community user</p><h1>My booking requests</h1></div><button className="secondary" onClick={load}>Refresh</button></div>
    {error&&<div className="notice" role="alert">{error}</div>}
    <div className="panel table-wrap"><table><thead><tr><th>Reference</th><th>Room</th><th>Date and time</th><th>Purpose</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {bookings.map(b=><tr key={b.booking_id}><td>{b.booking_id.slice(0,8).toUpperCase()}</td><td>{b.room_name}</td>
        <td>{displayDate(b.start_time)}</td><td>{b.purpose}</td><td><span className={`status ${b.status==='APPROVED'?'ok':'warn'}`}>{b.status}</span></td>
        <td>{['PENDING','APPROVED'].includes(b.status)?<button className="secondary small" disabled={busy} onClick={()=>cancel(b.booking_id)}>Cancel</button>:'-'}</td></tr>)}
      {bookings.length===0&&<tr><td colSpan="6">No bookings yet.</td></tr>}
    </tbody></table></div>
  </main>
}
function StaffView({token}){
  const [rows,setRows]=useState([])
  const [summary,setSummary]=useState({pending:0,approved:0,rejected:0,activeBlocks:0})
  const [filter,setFilter]=useState('ALL')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [blockOpen,setBlockOpen]=useState(false)
  const [roomId,setRoomId]=useState('1')
  const [date,setDate]=useState(initialDate())
  const [reason,setReason]=useState('Maintenance')
  const load=useCallback(async()=>{
    try {const [b,s]=await Promise.all([api('/api/staff/bookings',{token}),api('/api/staff/summary',{token})]);setRows(b);setSummary(s);setError('')}
    catch(e){setError(e.message)}
  },[token])
  useEffect(()=>{load()},[load])
  async function decision(id,status){
    setBusy(true);setError('')
    try{await api(`/api/staff/bookings/${id}/decision`,{token,method:'PATCH',body:{status}});await load()}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function block(e){
    e.preventDefault();setBusy(true)
    try{await api('/api/staff/room-blocks',{token,method:'POST',body:{
      roomId:Number(roomId),reason,startTime:new Date(`${date}T09:00`).toISOString(),endTime:new Date(`${date}T10:00`).toISOString()
    }});setBlockOpen(false);await load()}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const visible=rows.filter(r=>filter==='ALL'||r.status===filter)
  return <main className="page"><div className="section-head"><div><p className="eyebrow">Staff workspace</p><h1>Booking review dashboard</h1></div>
    <button className="primary" onClick={()=>setBlockOpen(!blockOpen)}>{blockOpen?'Close block form':'+ Block room time'}</button></div>
    <section className="metrics"><div><strong>{summary.pending}</strong><span>Pending requests</span></div>
      <div><strong>{summary.approved}</strong><span>Approved bookings</span></div><div><strong>{summary.rejected}</strong><span>Rejected requests</span></div>
      <div><strong>{summary.activeBlocks}</strong><span>Active room blocks</span></div></section>
    {blockOpen&&<form className="filter-card" onSubmit={block}>
      <label>Room ID<input type="number" min="1" value={roomId} onChange={e=>setRoomId(e.target.value)} required/></label>
      <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
      <label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} required/></label>
      <button className="primary" disabled={busy}>Block 9 to 10 AM</button></form>}
    {error&&<div className="notice" role="alert">{error}</div>}
    <section className="panel table-wrap"><div className="section-head"><h2>Recent booking requests</h2>
      <label className="inline">Status <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
      <button className="secondary small" onClick={load}>Refresh</button></div>
      <table><thead><tr><th>Reference</th><th>Room</th><th>Date and time</th><th>Requested by</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {visible.map(b=><tr key={b.booking_id}><td><strong>{b.booking_id.slice(0,8).toUpperCase()}</strong></td><td>{b.room_name}</td>
        <td>{displayDate(b.start_time)}</td><td>{b.first_name} {b.last_name}</td><td><span className={`status ${b.status==='APPROVED'?'ok':'warn'}`}>{b.status}</span></td>
        <td>{b.status==='PENDING'?<div className="row-actions"><button disabled={busy} className="secondary small" onClick={()=>decision(b.booking_id,'APPROVED')}>Approve</button>
          <button disabled={busy} className="secondary small" onClick={()=>decision(b.booking_id,'REJECTED')}>Reject</button></div>:'-'}</td></tr>)}
        {visible.length===0&&<tr><td colSpan="6">No bookings in this category.</td></tr>}
      </tbody></table></section>

  </main>
}
export default function App(){
  const [view,setView]=useState('home')
  const [token,setToken]=useState(()=>sessionStorage.getItem('mccbs-token')||'')
  const [user,setUser]=useState(()=>{try{return JSON.parse(sessionStorage.getItem('mccbs-user')||'null')}catch{return null}})
  const [selection,setSelection]=useState(null)
  const [notice,setNotice]=useState('')
  function logout(){setUser(null);setToken('');sessionStorage.removeItem('mccbs-token');sessionStorage.removeItem('mccbs-user');setView('home');setNotice('Signed out.')}
  async function login(email,password){
    const result=await api('/api/auth/login',{method:'POST',body:{email,password}})
    setUser(result.user);setToken(result.token);sessionStorage.setItem('mccbs-token',result.token);sessionStorage.setItem('mccbs-user',JSON.stringify(result.user));setView(staffRoles.includes(result.user.role_name)?'staff':'search');setNotice(`Signed in as ${result.user.first_name}.`)
  }
  async function register(body){return api('/api/auth/register',{method:'POST',body})}
  async function verify(email,code){return api('/api/auth/verify',{method:'POST',body:{email,code}})}
  async function resend(email){return api('/api/auth/resend-verification',{method:'POST',body:{email}})}
  return <>
    <Header view={view} setView={setView} user={user} logout={logout}/>
    {notice&&<div className="global-message" role="status" onClick={()=>setNotice('')}>{notice} <span>×</span></div>}
    {view==='home'&&<HomeView setView={setView}/>}
    {view==='promotions'&&<PromotionsView user={user} token={token} setView={setView}/>}
    {view==='search'&&<SearchView user={user} token={token} onBook={s=>{setSelection(s);setView('booking')}} setView={setView}/>}
    {view==='booking'&&<BookingView selection={selection} token={token} setView={setView} onDone={id=>{setView('mine');setNotice(`Booking request ${id.slice(0,8).toUpperCase()} created as Pending.`)}}/>}
    {(view==='account'||view==='register'||view==='verify')&&<LoginView mode={view==='register'?'register':view==='verify'?'verify':'login'} onLogin={login} onRegister={register} onVerify={verify} onResend={resend} setView={setView}/>}
    {view==='mine'&&<MineView token={token} user={user}/>}
    {view==='staff'&& (staffRoles.includes(user?.role_name) ? <StaffView token={token}/> : <main className="page"><div className="notice">Staff access required.</div></main>)}
    <footer className="site-footer"><div><strong>MCCBS</strong><span>Making space for the moments that matter.</span></div><p>Community spaces · Local connections · Melbourne</p><small>Academic project demonstration · Not an official council service</small></footer>
  </>
}
