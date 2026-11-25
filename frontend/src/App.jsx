import { useCallback, useEffect, useState } from 'react'
import BookingTable, { BookingStatus } from './components/BookingTable'
import { RoomSkeleton, TableSkeleton } from './components/Skeleton'
import VerificationCode from './components/VerificationCode'
import dashboardScreenshot from './assets/staff-booking-dashboard.svg'
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
  const mainLinks = [['home','Home'],['search','Find a space'],['promotions','Community events']]
  const accountLink = user ? ['account','Profile'] : ['account','Sign in']
  const contextLinks = user ? [staffRoles.includes(user.role_name) ? ['staff','Staff'] : ['mine','My bookings']] : []
  const links = [...mainLinks, ...contextLinks, accountLink]
  return <>
    <header className="topbar">
      <button className="brand-link" onClick={() => setView('home')} aria-label="MCCBS home">
        <span className="brand-icon" aria-hidden="true">M</span>
        <span className="brand-lockup"><span className="brand">MCCBS</span><span className="subbrand">Melbourne community spaces</span></span>
      </button>
      <nav className="desktop-navigation" aria-label="Primary navigation">
        {mainLinks.map(([key,title]) => <button key={key} className={`nav ${view === key ? 'active' : ''}`} aria-current={view === key ? 'page' : undefined} data-text={title} onClick={() => setView(key)}><span>{title}</span></button>)}
        {user && <button className={`nav ${view === 'mine' ? 'active' : ''}`} data-text="My bookings" onClick={() => setView('mine')}><span>My bookings</span></button>}
        {staffRoles.includes(user?.role_name) && <button className={`nav ${view === 'staff' ? 'active' : ''}`} data-text="Staff" onClick={() => setView('staff')}><span>Staff</span></button>}
        {user ? <><button className="nav-account" onClick={() => setView('account')}>{user.first_name}'s account</button><button className="nav-exit" onClick={logout}>Sign out</button></> : <><button className="nav-account" onClick={() => setView('account')}>Sign in</button><button className="primary small" onClick={() => setView('register')}>Create account</button></>}
      </nav>
      <div className="mobile-header-actions">
        {user ? <button onClick={logout} className="secondary small">Sign out</button> : <button className="secondary small" onClick={() => setView('register')}>Create account</button>}
      </div>
    </header>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {links.map(([key,title]) => <button key={key} className={view === key ? 'active' : ''} aria-current={view === key ? 'page' : undefined} onClick={() => setView(key)}><span>{title}</span></button>)}
    </nav>
  </>
}
function HomeView({setView}) {
  return <main>
    <section className="landing-hero">
      <div className="landing-grid page">
        <div className="landing-copy">
          <p className="section-label">Community centre room bookings</p>
          <h1>Find and request community rooms in Melbourne.</h1>
          <p>Compare available spaces, send a booking request and track staff approval in one place. Community events can also be promoted free of charge.</p>
          <div className="hero-actions"><button className="primary" onClick={() => setView('search')}>Find an available space</button><button className="text-on-dark" onClick={() => setView('promotions')}>Browse community events <span aria-hidden="true">→</span></button></div>
          <p className="hero-disclaimer">Student prototype. Not an official council booking service.</p>
        </div>
        <figure className="product-preview"><div className="product-preview-top"><span className="preview-brand">MCCBS</span><span>Working prototype screenshot</span></div>
          <img src={dashboardScreenshot} alt="Actual MCCBS staff booking dashboard showing one approved Yarra Hall booking and zero pending requests."/>
          <figcaption className="preview-annotations"><span>1. Staff booking list</span><span>2. Status summary</span><span>3. Approval result</span></figcaption>
        </figure>
      </div>
    </section>
    <section className="home-below page" aria-labelledby="process-heading">
      <div className="section-heading"><div><p className="section-label">Booking process</p><h2 id="process-heading">A clear process from search to approval</h2></div><p>Bookings are reviewed by centre staff before they are confirmed.</p></div>
      <ol className="process-list"><li><strong>Find a suitable room</strong><span>Search by date, time, group size and facilities.</span></li><li><strong>Request a booking</strong><span>Sign in, confirm the details and send your request.</span></li><li><strong>Follow the decision</strong><span>Check your booking status or cancel when needed.</span></li></ol>
      <section className="feature-banner" aria-label="Community promotion"><div><h2>Promote a community event for free</h2><p>Submit a workshop, class or local gathering to the community noticeboard. Staff review every listing before publication.</p></div><button className="secondary" onClick={() => setView('promotions')}>Explore community events</button></section>
    </section>
  </main>
}
function LoginView({mode = 'login',onLogin,onRegister,onVerify,onResend,setView}) {
  const [screen,setScreen] = useState(mode)
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [firstName,setFirstName] = useState('')
  const [lastName,setLastName] = useState('')
  const [code,setCode] = useState('')
  const [showPassword,setShowPassword] = useState(false)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [success,setSuccess] = useState(false)
  const [verifyState,setVerifyState] = useState('idle')
  useEffect(() => {setScreen(mode);setMessage('');setSuccess(false)},[mode])
  async function submit(event) {
    event.preventDefault()
    if (screen === 'verify') return
    setBusy(true);setMessage('');setSuccess(false)
    try {
      if(screen === 'register') {
        const r = await onRegister({firstName,lastName,email,password})
        setMessage(r.message + (r.delivery === 'DEVELOPMENT_CONSOLE' ? ' Find the code in your local backend terminal.' : ''))
        setScreen('verify');setCode('');setSuccess(true);setVerifyState('idle')
      } else await onLogin(email,password)
    } catch(e) {setMessage(e.message);if(/verify your email/i.test(e.message)){setScreen('verify');setCode('')}}
    finally {setBusy(false)}
  }
  async function checkCode(next) {
    setCode(next)
    setMessage('');setSuccess(false)
    if(next.length !== 6 || busy || verifyState === 'checking') {setVerifyState('idle');return}
    setBusy(true);setVerifyState('checking')
    try {
      const r = await onVerify(email,next)
      setVerifyState('verified');setMessage(r.message);setSuccess(true);setScreen('login');setPassword('')
    } catch(e) {setVerifyState('error');setMessage(e.message)}
    finally {setBusy(false)}
  }
  async function resend() {
    setBusy(true);setMessage('');setCode('');setVerifyState('idle')
    try {const r=await onResend(email);setMessage(r.message);setSuccess(true)}
    catch(e){setMessage(e.message);setSuccess(false)} finally {setBusy(false)}
  }
  function changeScreen(next){setScreen(next);setMessage('');setVerifyState('idle');setCode('');setSuccess(false)}
  return <main className="auth-shell">
    <aside className="auth-welcome"><div className="auth-welcome-content">
      <p className="section-label">Your local spaces</p><h2>Manage community bookings in one place.</h2>
      <p>Check availability, view your booking requests and follow staff decisions.</p>
      <div className="auth-feature"><strong>What you can do</strong><ul><li>Request community rooms</li><li>Track your booking status</li><li>Submit free community event listings</li></ul></div>
    </div></aside>
    <section className="auth-main"><div className="auth-form-shell">
      <button className="text-back" type="button" onClick={()=>setView('home')}>← Back to home</button>
      <h1>{screen==='login'?'Sign in':screen==='register'?'Create an account':'Verify your email'}</h1>
      <p className="auth-subtitle">{screen==='login'?'Access your bookings and community submissions.':screen==='register'?'Use your account to request rooms and post events.':`Enter the six-digit code for ${email || 'your email address'}.`}</p>
      {screen !== 'verify' && <div className="auth-switch" role="group" aria-label="Account options">
        {['login','register'].map(key => <button key={key} type="button" className={screen===key?'selected':''} aria-pressed={screen===key} data-text={key==='login'?'Sign in':'Create account'} onClick={()=>changeScreen(key)}><span>{key==='login'?'Sign in':'Create account'}</span></button>)}
      </div>}
      {(screen==='register'||screen==='verify') && <div className="account-stepper" aria-label="Account creation progress">
        <span className={screen==='register'?'current':'completed'} aria-current={screen==='register'?'step':undefined}>Account details</span>
        <i aria-hidden="true"/>
        <span className={screen==='verify'?'current':''} aria-current={screen==='verify'?'step':undefined}>Verify email</span>
      </div>}
      <form key={screen} onSubmit={submit} className={`auth-form screen-${screen}`}>
        {screen==='register' && <div className="two-inputs"><label>First name<input autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} required/></label><label>Last name<input autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} required/></label></div>}
        {screen!=='verify' && <><label>Email address<input type="email" inputMode="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label>
        <label>Password<div className="password-field"><input type={showPassword?'text':'password'} autoComplete={screen==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={screen==='register'?10:1} required placeholder={screen==='register'?'At least 10 characters':'Enter your password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></label></>}
        {screen==='verify' && <VerificationCode value={code} onChange={checkCode} disabled={busy} error={verifyState==='error'} state={verifyState}/>}
        {message && <div className={success?'inline-feedback success':'inline-feedback error'} role={success?'status':'alert'}>{message}</div>}
        {screen !== 'verify' && <button className="primary full-width" disabled={busy} type="submit">{busy?'Working…':screen==='register'?'Create account':'Sign in'}</button>}
      </form>
      {screen==='verify' && <div className="auth-bottom"><button className="text-link" disabled={busy||!email} onClick={resend}>Send a new code</button><p>In the local demo, your code appears in the backend terminal if email delivery is not configured.</p><button className="text-back" onClick={()=>changeScreen('login')}>← Back to sign in</button></div>}
      {screen==='login' && <div className="auth-bottom">Need an account? <button className="text-link" onClick={()=>changeScreen('register')}>Create account</button></div>}
    </div></section>
  </main>
}
function SearchView({user,onBook,setView}) {
  const [date,setDate]=useState(initialDate())
  const [start,setStart]=useState('18:00')
  const [end,setEnd]=useState('20:00')
  const [people,setPeople]=useState(10)
  const [rooms,setRooms]=useState([])
  const [busy,setBusy]=useState(true)
  const [error,setError]=useState('')
  const loadRooms=useCallback(async()=>{
    if(start >= end){setError('The end time must be after the start time.');setBusy(false);return}
    setBusy(true);setError('')
    try {
      const query=`?minCapacity=${encodeURIComponent(people)}&startTime=${encodeURIComponent(new Date(`${date}T${start}`).toISOString())}&endTime=${encodeURIComponent(new Date(`${date}T${end}`).toISOString())}`
      setRooms(await api(`/api/rooms${query}`))
    } catch(e){setError(e.message);setRooms([])} finally {setBusy(false)}
  },[date,start,end,people])
  useEffect(()=>{loadRooms()},[]) // Initial availability check uses the displayed search values.
  const choose=room=>{if(!user){setView('account');return}onBook({room,date,start,end,people})}
  return <main className="page">
    <section className="hero"><p className="section-label">Room availability</p><h1>Find a community space</h1><p>Search available rooms by date, time and group size. Booking requests are reviewed by staff.</p></section>
    <form className="filter-card" onSubmit={e=>{e.preventDefault();loadRooms()}}>
      <label>Date<input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)} required/></label>
      <label>Start time<input type="time" value={start} onChange={e=>setStart(e.target.value)} required/></label>
      <label>End time<input type="time" value={end} onChange={e=>setEnd(e.target.value)} required/></label>
      <label>People<input type="number" inputMode="numeric" min="1" max="1000" value={people} onChange={e=>setPeople(Number(e.target.value))} required/></label>
      <button className="primary" type="submit" disabled={busy}>{busy?'Checking rooms…':'Search rooms'}</button>
    </form>
    <div className="section-head"><h2>Available rooms</h2><span aria-live="polite">{busy?'Checking availability':`${rooms.length} ${rooms.length===1?'result':'results'}`}</span></div>
    {error&&<div role="alert" className="notice error">{error}<button className="text-link" onClick={loadRooms}>Try again</button></div>}
    {busy ? <RoomSkeleton/> : rooms.length === 0 && !error ? <div className="empty-state"><h3>No rooms match this search</h3><p>Try another date, time or smaller group size.</p><button className="secondary" onClick={()=>{setDate(initialDate());setPeople(10);setStart('18:00');setEnd('20:00')}}>Reset search</button></div> : <section className="room-grid" aria-label="Available rooms">
      {rooms.map(r=><article className="room-card" key={r.room_id}>
        <div className="room-image" aria-hidden="true"><span>{r.room_name.charAt(0)}</span></div>
        <div className="room-body"><span className="status ok">Available</span><h3>{r.room_name}</h3><p>{r.centre_name}</p>
          <dl><div><dt>Capacity</dt><dd>{r.capacity} people</dd></div><div><dt>Facilities</dt><dd title={r.facilities?.join(', ') || 'Standard room'}>{r.facilities?.join(', ') || 'Standard room'}</dd></div></dl>
          <button className="secondary" onClick={()=>choose(r)}>Request booking</button>
        </div>
      </article>)}
    </section>}
  </main>
}
function PromotionsView({user,token,setView}) {
  const [events,setEvents]=useState([])
  const [mine,setMine]=useState([])
  const [category,setCategory]=useState('All')
  const [open,setOpen]=useState(false)
  const [form,setForm]=useState({title:'',description:'',eventDate:initialDate(),location:'',category:'Workshop'})
  const [status,setStatus]=useState('')
  const [statusError,setStatusError]=useState(false)
  const [loading,setLoading]=useState(false)
  const [pageLoading,setPageLoading]=useState(true)
  const reload=useCallback(async()=>{
    setPageLoading(true)
    try{setEvents(await api('/api/promotions'));if(token)setMine(await api('/api/promotions/mine',{token}));setStatusError(false)}
    catch(e){setStatus(e.message);setStatusError(true)}finally{setPageLoading(false)}
  },[token])
  useEffect(()=>{reload()},[reload])
  async function submit(e){
    e.preventDefault();setLoading(true);setStatus('')
    try {const result=await api('/api/promotions',{method:'POST',token,body:form});setStatus(result.message);setStatusError(false);setForm({title:'',description:'',eventDate:initialDate(),location:'',category:'Workshop'});setOpen(false);await reload()}
    catch(e){setStatus(e.message);setStatusError(true)}finally{setLoading(false)}
  }
  const visible=events.filter(e=>category==='All'||e.category===category)
  return <main>
    <section className="promo-hero"><div className="page promo-intro"><div><p className="section-label">Community noticeboard</p><h1>Find and promote local events.</h1><p>Browse upcoming workshops, classes and gatherings. Community event listings are free and reviewed before publication.</p><button className="primary" onClick={()=>user?setOpen(true):setView('register')}>Post a free event</button></div></div></section>
    <div className="page promo-content"><div className="section-heading"><div><h2>Upcoming community events</h2><p>Only staff-approved listings appear publicly.</p></div><label className="category-picker">Event type <select value={category} onChange={e=>setCategory(e.target.value)}>{['All','Workshop','Community Event','Class','Meetup'].map(c=><option key={c}>{c}</option>)}</select></label></div>
      {status&&<div className={`inline-feedback ${statusError?'error':'success'}`} role={statusError?'alert':'status'}>{status}</div>}
      {pageLoading ? <div className="event-grid" aria-busy="true">{[0,1,2].map(i=><div className="event-card" key={i}><div className="skeleton skeleton-event-image"/><div className="event-content"><div className="skeleton skeleton-title"/><div className="skeleton skeleton-line"/><div className="skeleton skeleton-line short"/></div></div>)}</div>
      : visible.length ? <section className="event-grid" aria-label="Community events">{visible.map(event=><article className="event-card" key={event.promotion_id}><div className="event-visual"><span>{event.category}</span><strong>{new Date(event.event_date+'T00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</strong></div><div className="event-content"><h3 title={event.title}>{event.title}</h3><p>{event.description}</p><div className="event-location">{event.location}</div></div></article>)}</section>
      : <div className="empty-state"><h3>No approved events in this category</h3><p>Try another event type or submit a community event for staff review.</p><button className="secondary" onClick={()=>user?setOpen(true):setView('register')}>Post a free event</button></div>}
      {user&&mine.length>0&&<section className="my-promos"><h2>My event submissions</h2><div className="event-list">{mine.map(p=><div key={p.promotion_id}><strong>{p.title}</strong><span>{p.event_date?.slice(0,10)} · <BookingStatus status={p.status}/></span></div>)}</div></section>}
      {open&&user&&<section className="panel promo-submit" aria-labelledby="post-event-heading"><div className="section-head"><div><h2 id="post-event-heading">Post a community event</h2><p className="muted">Staff will review your listing before it becomes public.</p></div><button className="text-close" aria-label="Close event form" onClick={()=>setOpen(false)}>×</button></div>
        <form className="form-grid" onSubmit={submit}><label>Event title<input maxLength="120" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="Community gardening workshop"/></label><label>Event date<input type="date" min={initialDate()} value={form.eventDate} onChange={e=>setForm({...form,eventDate:e.target.value})} required/></label><label>Location<input maxLength="150" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} required placeholder="Community centre or local venue"/></label><label>Event type<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Workshop','Community Event','Class','Meetup'].map(c=><option key={c}>{c}</option>)}</select></label><label className="full">Description<textarea maxLength="1000" minLength="30" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required placeholder="What can people expect and who can attend?"/></label><div className="actions full"><button className="primary" disabled={loading}>{loading?'Sending for review…':'Send event for review'}</button></div></form>
      </section>}
    </div>
  </main>
}
function StaffPromotions({token}) {
  const [rows,setRows]=useState([])
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const reload=useCallback(async()=>{setLoading(true);try{setRows(await api('/api/staff/promotions',{token}));setMessage('')}catch(e){setMessage(e.message)}finally{setLoading(false)}},[token])
  useEffect(()=>{reload()},[reload])
  async function review(id,status){
    setBusy(true);setMessage('')
    const previous=rows
    setRows(current=>current.filter(p=>p.promotion_id!==id))
    try{await api(`/api/staff/promotions/${id}`,{method:'PATCH',token,body:{status}});await reload();setMessage(`Event ${status.toLowerCase()}.`)}
    catch(e){setRows(previous);setMessage(e.message)}finally{setBusy(false)}
  }
  return <section className="panel staff-promotions"><div className="section-head"><div><h2>Community event reviews</h2><p className="muted">Approve events before they are shown publicly.</p></div><button className="secondary small" onClick={reload}>Refresh</button></div>
    {message&&<div className="inline-feedback" role="status">{message}</div>}
    {loading ? <TableSkeleton rows={2}/> : rows.length ? <div className="event-list">{rows.map(p=><article className="review-card" key={p.promotion_id}><div><span className="muted">{p.category} · {p.event_date?.slice(0,10)}</span><h3>{p.title}</h3><p>{p.description}</p><small>{p.location} · Submitted by {p.first_name} {p.last_name}</small></div><div className="review-actions"><button className="secondary small" disabled={busy} onClick={()=>review(p.promotion_id,'APPROVED')}>Approve event</button><button className="text-danger small" disabled={busy} onClick={()=>review(p.promotion_id,'REJECTED')}>Reject event</button></div></article>)}</div>
    : <div className="empty-state"><h3>No events awaiting review</h3><p>New community submissions will appear here automatically when received.</p><button className="secondary" onClick={reload}>Refresh reviews</button></div>}
  </section>
}
function BookingView({selection,token,onDone,setView}) {
  const [purpose,setPurpose]=useState('Community workshop')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  if(!selection)return <main className="page narrow"><div className="empty-state"><h2>No room selected</h2><p>Choose an available room before making a booking request.</p><button className="primary" onClick={()=>setView('search')}>Find a space</button></div></main>
  const {room,date,start,end,people}=selection
  async function submit(e) {
    e.preventDefault();setBusy(true);setMessage('')
    try {
      const result=await api('/api/bookings',{method:'POST',token,body:{
        roomId:room.room_id,attendees:Number(people),purpose,
        startTime:new Date(`${date}T${start}`).toISOString(),endTime:new Date(`${date}T${end}`).toISOString()
      }})
      onDone(result.booking_id)
    }catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  return <main className="page narrow">
    <button className="text-back" onClick={()=>setView('search')}>← Back to available rooms</button>
    <section className="panel booking-panel"><p className="section-label">Booking request</p><h1>{room.room_name}</h1>
      <div className="summary-strip"><div><span>Date</span><strong>{date}</strong></div><div><span>Time</span><strong>{start} to {end}</strong></div><div><span>People</span><strong className="numeric">{people}</strong></div></div>
      <form onSubmit={submit} className="form-grid"><label className="full">Booking purpose<input value={purpose} maxLength="250" onChange={e=>setPurpose(e.target.value)} required/></label>
        <p className="inline-information full">Your request will appear as <strong>Pending</strong> until staff approve it. Availability is rechecked before it is saved.</p>
        {message&&<div className="inline-feedback error full" role="alert">{message}</div>}
        <div className="actions full"><button className="primary" disabled={busy}>{busy?'Sending request…':'Send booking request'}</button><button className="text-back" type="button" onClick={()=>setView('search')}>Back to rooms</button></div>
      </form>
    </section>
  </main>
}
function MineView({token,user,setView}) {
  const [bookings,setBookings]=useState([])
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const load=useCallback(async()=>{
    if(!token)return
    setLoading(true)
    try{setBookings(await api('/api/bookings/mine',{token}));setError('')}
    catch(e){setError(e.message)}finally{setLoading(false)}
  },[token])
  useEffect(()=>{load()},[load])
  async function cancel(id){
    if(!window.confirm('Cancel this booking request?'))return
    const previous=bookings
    setBookings(current=>current.map(b=>b.booking_id===id?{...b,status:'CANCELLED'}:b))
    setBusy(true);setError('')
    try{await api(`/api/bookings/${id}/cancel`,{method:'PATCH',token});await load()}
    catch(e){setBookings(previous);setError(e.message)}finally{setBusy(false)}
  }
  if(!user)return <main className="page"><div className="empty-state"><h2>Sign in to see your bookings</h2><p>Booking history is available to the account that submitted each request.</p><button className="primary" onClick={()=>setView('account')}>Sign in</button></div></main>
  return <main className="page"><div className="section-head"><div><p className="section-label">Your bookings</p><h1>My booking requests</h1><p className="muted">See your requests, staff decisions and cancellations.</p></div><button className="secondary" onClick={load}>Refresh bookings</button></div>
    {error&&<div className="inline-feedback error" role="alert">{error}</div>}
    <section className="panel booking-list-panel">{loading ? <TableSkeleton/> : <BookingTable rows={bookings} busy={busy} onCancel={cancel} onEmptyAction={()=>setView('search')}/>}</section>
  </main>
}
function StaffView({token}) {
  const [rows,setRows]=useState([])
  const [summary,setSummary]=useState({pending:0,approved:0,rejected:0,activeBlocks:0})
  const [filter,setFilter]=useState('ALL')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [blockOpen,setBlockOpen]=useState(false)
  const [roomId,setRoomId]=useState('1')
  const [date,setDate]=useState(initialDate())
  const [reason,setReason]=useState('Maintenance')
  const load=useCallback(async()=>{
    setLoading(true)
    try {const [b,s]=await Promise.all([api('/api/staff/bookings',{token}),api('/api/staff/summary',{token})]);setRows(b);setSummary(s);setError('')}
    catch(e){setError(e.message)}finally{setLoading(false)}
  },[token])
  useEffect(()=>{load()},[load])
  async function decision(id,status){
    const previous=rows
    setRows(current=>current.map(b=>b.booking_id===id?{...b,status}:b))
    setBusy(true);setError('')
    try{await api(`/api/staff/bookings/${id}/decision`,{token,method:'PATCH',body:{status}});await load()}
    catch(e){setRows(previous);setError(e.message)}finally{setBusy(false)}
  }
  async function block(e){
    e.preventDefault();setBusy(true);setError('')
    try{await api('/api/staff/room-blocks',{token,method:'POST',body:{
      roomId:Number(roomId),reason,startTime:new Date(`${date}T09:00`).toISOString(),endTime:new Date(`${date}T10:00`).toISOString()
    }});setBlockOpen(false);await load()}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const visible=rows.filter(r=>filter==='ALL'||r.status===filter)
  return <main className="page staff-page">
    <div className="section-head staff-title"><div><p className="section-label">Staff workspace</p><h1>Booking review dashboard</h1><p className="muted">Review requests and manage room availability.</p></div>
      <button className="secondary" onClick={()=>setBlockOpen(!blockOpen)} aria-expanded={blockOpen} aria-controls="room-block-form">{blockOpen?'Close room block form':'Block room time'}</button></div>
    <section className="metrics" aria-label="Booking overview">
      <div className="metric-primary"><span>Pending requests</span><strong className="numeric">{summary.pending}</strong><small>Requests awaiting a decision</small></div>
      <div className="metric-secondary"><strong className="numeric">{summary.approved}</strong><span>Approved bookings</span></div>
      <div className="metric-secondary"><strong className="numeric">{summary.rejected}</strong><span>Rejected requests</span></div>
      <div className="metric-secondary"><strong className="numeric">{summary.activeBlocks}</strong><span>Active room blocks</span></div>
    </section>
    {blockOpen&&<form id="room-block-form" className="filter-card room-block-form" onSubmit={block}>
      <label>Room ID<input type="number" inputMode="numeric" min="1" value={roomId} onChange={e=>setRoomId(e.target.value)} required/></label>
      <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
      <label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} required/></label>
      <button className="primary" disabled={busy}>Block 9:00–10:00 am</button>
    </form>}
    {error&&<div className="inline-feedback error" role="alert">{error}</div>}
    <section className="panel booking-list-panel"><div className="section-head table-section-head"><h2>Booking requests</h2><div className="table-section-actions"><label className="inline">Status <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><button className="secondary small" onClick={load}>Refresh</button></div></div>
      {loading ? <TableSkeleton/> : <BookingTable staff rows={visible} busy={busy} onApprove={id=>decision(id,'APPROVED')} onReject={id=>decision(id,'REJECTED')}/>}
    </section>
    <StaffPromotions token={token}/>
  </main>
}
function AccountView({user,setView,logout}) {
  return <main className="page narrow"><div className="section-head"><div><p className="section-label">Your account</p><h1>Account details</h1></div></div>
    <section className="panel account-panel"><dl><div><dt>Name</dt><dd>{user.first_name} {user.last_name}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Account type</dt><dd>{user.role_name === 'COMMUNITY_USER' ? 'Community member' : 'Booking staff'}</dd></div></dl>
    <div className="account-actions"><button className="primary" onClick={()=>setView(staffRoles.includes(user.role_name)?'staff':'mine')}>{staffRoles.includes(user.role_name)?'Open staff dashboard':'View my bookings'}</button><button className="text-danger" onClick={logout}>Sign out</button></div></section>
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
    {notice&&<div className="global-message" role="status">{notice}<button type="button" aria-label="Dismiss notice" onClick={()=>setNotice('')}>×</button></div>}
    {view==='home'&&<HomeView setView={setView}/>}
    {view==='promotions'&&<PromotionsView user={user} token={token} setView={setView}/>}
    {view==='search'&&<SearchView user={user} token={token} onBook={s=>{setSelection(s);setView('booking')}} setView={setView}/>}
    {view==='booking'&&<BookingView selection={selection} token={token} setView={setView} onDone={id=>{setView('mine');setNotice(`Booking request ${id.slice(0,8).toUpperCase()} created as Pending.`)}}/>}
    {view==='account'&&user&&<AccountView user={user} setView={setView} logout={logout}/>}
    {(view==='register'||view==='verify'||(view==='account'&&!user))&&<LoginView mode={view==='register'?'register':view==='verify'?'verify':'login'} onLogin={login} onRegister={register} onVerify={verify} onResend={resend} setView={setView}/>}
    {view==='mine'&&<MineView token={token} user={user} setView={setView}/>}
    {view==='staff'&& (staffRoles.includes(user?.role_name) ? <StaffView token={token}/> : <main className="page"><div className="notice">Staff access required.</div></main>)}
    <footer className="site-footer"><div><strong>MCCBS</strong><span>Room requests and community events, in one place.</span></div><p>Melbourne Community Centre Booking System</p><small>Academic project demonstration · Not an official council service</small></footer>
  </>
}
