const { test, expect } = require('@playwright/test')

const customer = 'community.demo@mccbs.example'
const staff = 'staff.demo@mccbs.example'

async function signIn(page, email) {
  await page.locator('.desktop-navigation .nav-account').click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByLabel('Email address').fill(email)
  await page.locator('form.auth-form input[type="password"]').fill(process.env.DEMO_PASSWORD)
  await page.locator('form.auth-form button[type="submit"]').click()
}

async function signOut(page) {
  await page.locator('.desktop-navigation .nav-exit').click()
  await expect(page.locator('.desktop-navigation .nav-account')).toHaveText('Sign in')
}

test('desktop homepage and navigation preserve task focus', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900})
  await page.goto('http://localhost:5173/')
  await expect(page.getByRole('heading',{name:'Find and request community rooms in Melbourne.'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Find an available space'})).toBeVisible()
  await page.screenshot({ path:'test-results/screenshots/desktop-home.png', fullPage:true })
  await page.getByRole('button',{name:'Find an available space'}).click()
  await expect(page.getByRole('heading',{name:'Find a community space'})).toBeVisible()
  await expect(page.locator('.room-card')).toHaveCount(3)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  await page.locator('.desktop-navigation').getByRole('button',{name:'Community events'}).click()
  await expect(page.getByRole('heading',{name:'Find and promote local events.'})).toBeVisible()
})

test('community member submits booking and staff approves it', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900})
  await page.goto('http://localhost:5173/')
  await signIn(page,customer)
  await expect(page.getByRole('heading',{name:'Find a community space'})).toBeVisible()
  await expect(page.locator('.room-card')).toHaveCount(3)
  const room=page.locator('.room-card').filter({hasText:'Yarra Hall'})
  await room.getByRole('button',{name:'Request booking'}).click()
  await expect(page.getByRole('heading',{name:'Yarra Hall'})).toBeVisible()
  await page.getByLabel('Booking purpose').fill('UI browser test booking - room availability and staff review')
  await page.getByRole('button',{name:'Send booking request'}).click()
  await expect(page.getByRole('heading',{name:'My booking requests'})).toBeVisible()
  await expect(page.locator('.booking-table tbody')).toContainText('Pending')
  await page.screenshot({path:'test-results/screenshots/customer-pending.png',fullPage:true})
  await signOut(page)
  await signIn(page,staff)
  await expect(page.getByRole('heading',{name:'Booking review dashboard'})).toBeVisible()
  await page.locator('.booking-table tbody').getByRole('button',{name:'Approve'}).first().click()
  await expect(page.locator('.booking-table tbody')).toContainText('Approved')
  await page.screenshot({path:'test-results/screenshots/staff-approved.png',fullPage:true})
})

test('community event promotion requires staff review', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900})
  await page.goto('http://localhost:5173/')
  await signIn(page,customer)
  await page.locator('.desktop-navigation').getByRole('button',{name:'Community events'}).click()
  const unique='MCCBS browser test workshop '+Date.now()
  await page.getByRole('button',{name:'Post a free event'}).click()
  await page.getByLabel('Event title').fill(unique)
  await page.getByLabel('Location').fill('South Melbourne Community Centre')
  await page.getByLabel('Description').fill('An automated test workshop demonstrating staff moderation and approved public community events.')
  await page.getByRole('button',{name:'Send event for review'}).click()
  await expect(page.locator('.my-promos')).toContainText(unique)
  await signOut(page)
  await signIn(page,staff)
  await expect(page.getByRole('heading',{name:'Booking review dashboard'})).toBeVisible()
  const listing=page.locator('.review-card').filter({hasText:unique})
  await expect(listing).toBeVisible()
  await listing.getByRole('button',{name:'Approve event'}).click()
  await page.locator('.desktop-navigation').getByRole('button',{name:'Community events'}).click()
  await expect(page.locator('.event-card').filter({hasText:unique})).toBeVisible()
  await page.screenshot({path:'test-results/screenshots/public-approved-event.png',fullPage:true})
})

for (const width of [375,768]) {
  test('responsive navigation and no horizontal overflow at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:812})
    await page.goto('http://localhost:5173/')
    await expect(page.getByRole('heading',{name:'Find and request community rooms in Melbourne.'})).toBeVisible()
    await expect(page.locator('.mobile-bottom-nav')).toBeVisible()
    const number=await page.locator('.mobile-bottom-nav button').count()
    expect(number).toBeLessThanOrEqual(5)
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({path:'test-results/screenshots/mobile-'+width+'.png',fullPage:true})
    await page.locator('.mobile-bottom-nav').getByRole('button',{name:'Find a space'}).click()
    await expect(page.getByRole('heading',{name:'Find a community space'})).toBeVisible()
    await expect(page.locator('.room-card')).toHaveCount(3)
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1)
  })
}
