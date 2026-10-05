import { expect, test, type Page } from '@playwright/test';
const root = '/admin/lawyer-matching';
const existing = { userId: 42, name: 'Existing Client', email: 'existing@example.test' };
const other = { userId: 43, name: 'Other Client', email: 'other@example.test' };
const result = { workflowId: 'intake', clientId: 42, status: 'AWAITING_APPROVAL', reviewStage: 'MATCHES', userRequirement: 'I have a dispute about ownership of my land.', date: null,
  parsedRequirement: { categoryId: 4, categoryName: 'Real Estate & Property Law', legalServiceId: 91, legalServiceName: 'Title review' },
  recommendations: [{ lawyerId: 'lawyer-1', fullName: 'Verified Practitioner', practiceArea: 'Real Estate & Property Law', yearsExperience: 12, score: 12, reason: 'Correct Practice Area and recorded experience.' }], warnings: [], trace: [] };
async function setup(page: Page, failRegister = false) {
  let saved: Record<string, unknown> = { ...result }; let analyses = 0; let registrations = 0; let approvals = 0;
  const clients = [existing, other]; const searches: string[] = [];
  await page.addInitScript(() => { localStorage.setItem('legalease_staff_user', JSON.stringify({ userId: 1, name: 'Admin', role: 'Admin' })); localStorage.setItem('token', 'test-token'); });
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const url = new URL(route.request().url()); const path = url.pathname; const method = route.request().method(); let body: unknown = [];
    if (path === '/api/clients/search') { const search = url.searchParams.get('search') || ''; searches.push(search); body = clients.filter(c => `${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase())); }
    if (/^\/api\/clients\/\d+\/summary$/.test(path)) body = clients.find(c => c.userId === Number(path.split('/')[3]));
    if (path === '/api/clients' && method === 'POST') {
      registrations++; const r = route.request().postDataJSON(); expect(r).not.toHaveProperty('role'); expect(r).not.toHaveProperty('phone');
      if (failRegister) { await route.fulfill({ status: 400, json: { message: 'Client registration could not be completed.' } }); return; }
      const client = { userId: 44, name: r.fullName, email: r.email }; clients.push(client); body = client;
    }
    if (path === '/api/lawyer-recommendations' && method === 'POST') {
      analyses++; const r = route.request().postDataJSON(); expect(r.clientId).toBeTruthy(); expect(r).not.toHaveProperty('email'); expect(r).not.toHaveProperty('name');
      saved = { ...result, clientId: r.clientId, date: r.date || null }; body = saved;
    }
    if (path === '/api/lawyer-recommendations/intake') body = saved;
    if (path.endsWith('/review')) { const r = route.request().postDataJSON(); saved = { ...saved, clientId: r.clientId, selectedLawyerId: r.lawyerId, selectedSlotId: r.slotId, bookingDate: r.bookingDate, reviewStage: r.stage }; body = saved; }
    if (path.endsWith('/available-slots')) body = { date: url.searchParams.get('date'), workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: [{ slotId: 'real-slot', start: '09:00:00', end: '09:30:00' }] };
    if (path.endsWith('/approve')) { approvals++; const r = route.request().postDataJSON(); expect(r.customerId).toBe('00000000-0000-0000-0000-00000000002a'); saved = { ...saved, status: 'ACTION_COMPLETED', approvedLawyerId: r.lawyerId, appointmentId: 'normal-appointment' }; body = saved; }
    if (path === '/api/appointments/normal-appointment') body = { appointmentId: 'normal-appointment', customerName: existing.name, lawyerName: 'Verified Practitioner', date: '2030-01-07', startTime: '09:00', endTime: '09:30', appointmentSource: 'AI_FRONT_DESK' };
    await route.fulfill({ json: body });
  });
  return { get analyses() { return analyses; }, get registrations() { return registrations; }, get approvals() { return approvals; }, searches };
}
async function select(page: Page) { await page.getByRole('button', { name: 'Select client Existing Client', exact: true }).click(); }
async function analyse(page: Page) { await page.getByLabel('Legal requirement').fill(result.userRequirement); await page.getByRole('button', { name: 'Analyse Requirement', exact: true }).click(); await expect(page.getByRole('button', { name: 'Select Lawyer', exact: true })).toBeVisible(); }
async function appointment(page: Page) { await page.getByRole('button', { name: 'Select Lawyer', exact: true }).click(); await page.getByRole('button', { name: 'Continue to Appointment' }).click(); await page.getByLabel('Appointment date', { exact: true }).fill('2030-01-07'); await page.getByLabel('Available slot', { exact: true }).selectOption('real-slot'); }

test('AI Lawyer Matching starts with client identification and requires a selected client', async ({ page }) => {
  const stats = await setup(page); await page.goto(root);
  await expect(page.getByRole('heading', { name: 'AI Lawyer Matching', exact: true })).toBeVisible();
  await expect(page.getByLabel('Legal requirement')).toBeDisabled(); await expect(page.getByRole('button', { name: 'Analyse Requirement', exact: true })).toBeDisabled();
  expect(await page.getByRole('region', { name: 'Client intake' }).evaluate(el => !!(el.compareDocumentPosition(document.querySelector('#requirement-analysis')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await page.getByLabel('Search existing client', { exact: true }).fill('existing@example.test'); await select(page);
  await expect(page.getByRole('region', { name: 'Client intake' })).toContainText('Selected Client'); await expect(page.getByLabel('Legal requirement')).toBeEnabled();
  expect(stats.searches).toContain('existing@example.test'); expect(stats.analyses).toBe(0);
});
test('quick registration creates and automatically selects a normal client', async ({ page }) => {
  const stats = await setup(page); await page.goto(root); await page.getByRole('button', { name: '+ Register New Client' }).click();
  await page.getByLabel('Full Name', { exact: false }).fill('Walk-in Client'); await page.getByLabel('Email', { exact: true }).fill('new@example.test'); await page.getByLabel('Account Password').fill('test-account-password');
  await page.getByRole('button', { name: 'Register & Select Client' }).click();
  await expect(page.getByRole('region', { name: 'Client intake' })).toContainText('Walk-in Client'); await expect(page.getByRole('button', { name: 'Change Client' })).toBeVisible();
  expect(stats.registrations).toBe(1); await analyse(page); expect(stats.analyses).toBe(1);
  await page.reload(); await expect(page.getByRole('region', { name: 'Client intake' })).toContainText('Walk-in Client'); expect(stats.analyses).toBe(1);
});
test('duplicate email offers existing client without creating another account', async ({ page }) => {
  const stats = await setup(page); await page.goto(root); await page.getByRole('button', { name: '+ Register New Client' }).click();
  await page.getByLabel('Email', { exact: true }).fill('EXISTING@example.test'); await page.getByLabel('Account Password').fill('test-password'); await page.getByRole('button', { name: 'Register & Select Client' }).click();
  await expect(page.getByText('Possible Existing Client', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Use Existing Client' }).click();
  await expect(page.getByRole('region', { name: 'Client intake' })).toContainText('Selected Client'); expect(stats.registrations).toBe(0);
});
test('registration failure stays actionable and cannot start matching', async ({ page }) => {
  const stats = await setup(page, true); await page.goto(root); await page.getByRole('button', { name: '+ Register New Client' }).click();
  await page.getByLabel('Email', { exact: true }).fill('new@example.test'); await page.getByLabel('Account Password').fill('test-password'); await page.getByRole('button', { name: 'Register & Select Client' }).click();
  await expect(page.getByRole('alert')).toContainText('Client registration could not be completed.'); await expect(page.getByRole('button', { name: 'Analyse Requirement', exact: true })).toBeDisabled(); expect(stats.registrations).toBe(1); expect(stats.analyses).toBe(0);
});
test('client, lawyer, date and slot restore from server without browser storage', async ({ page }) => {
  const stats = await setup(page); await page.goto(root); await select(page); await analyse(page); await appointment(page);
  await page.evaluate(() => sessionStorage.clear()); await page.reload();
  await expect(page.getByRole('region', { name: 'Client intake' })).toContainText(existing.name);
  await expect(page.getByLabel('Appointment date', { exact: true })).toHaveValue('2030-01-07'); await expect(page.getByLabel('Available slot', { exact: true })).toHaveValue('real-slot');
  await expect(page.getByRole('button', { name: 'Approve & Create Appointment' })).toBeEnabled(); expect(stats.analyses).toBe(1);
  await expect(page.getByLabel('Search existing client', { exact: true })).toHaveCount(0); await expect(page.getByLabel('Customer', { exact: true })).toHaveCount(0);
});
test('changing client after appointment review requires confirmation and a new slot review', async ({ page }) => {
  const stats = await setup(page); await page.goto(root); await select(page); await analyse(page); await appointment(page);
  await page.getByRole('button', { name: 'Change Client' }).click(); await page.getByRole('button', { name: 'Select client Other Client', exact: true }).click();
  const confirmation = page.getByRole('group', { name: 'Confirm client change' }); await expect(confirmation).toBeVisible();
  await expect(page.getByRole('region', { name: 'Client intake' })).toContainText(existing.name); await confirmation.getByRole('button', { name: 'Confirm Client Change', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Administrator review' })).toContainText(other.name); await expect(page.getByRole('button', { name: 'Approve & Create Appointment' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue to Appointment' }).click(); await expect(page.getByLabel('Available slot', { exact: true })).toHaveValue('');
  expect(stats.analyses).toBe(1); expect(stats.approvals).toBe(0);
});
test('human approval creates standard appointment, exposes normal route and resets intake', async ({ page }) => {
  const stats = await setup(page); await page.goto(root); await select(page); await analyse(page); await appointment(page);
  await page.getByRole('button', { name: 'Approve & Create Appointment' }).click();
  const complete = page.getByRole('region', { name: 'Appointment created', exact: true }); await expect(complete).toContainText('Front Desk · AI Assisted'); await expect(complete).toContainText(existing.name);
  await expect(page.getByRole('link', { name: 'View Appointment' })).toHaveAttribute('href', '/admin/appointments?appointment=normal-appointment');
  expect(stats.approvals).toBe(1); await page.getByRole('button', { name: 'Start New Client Intake' }).click();
  await expect(page).toHaveURL(root); await expect(page.getByLabel('Legal requirement')).toHaveValue(''); await expect(page.getByLabel('Legal requirement')).toBeDisabled(); await expect(page.getByLabel('Search existing client', { exact: true })).toBeVisible();
});
for (const width of [1440, 1024, 768, 375, 320]) test(`client intake and registration fit ${width}px`, async ({ page }, info) => {
  await setup(page); await page.setViewportSize({ width, height: 1000 }); await page.goto(root);
  await expect(page.getByRole('button', { name: 'Select client Existing Client', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath(`client-intake-${width}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: '+ Register New Client' }).click();
  await page.screenshot({ path: info.outputPath(`client-registration-${width}.png`), fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
