import { test, expect, type Page } from '@playwright/test';
const api = /^https?:\/\/[^/]+\/api\//;
const days = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isWorkingDay: dayOfWeek > 0 && dayOfWeek < 6, startTime: '09:00:00', endTime: '17:00:00' }));
async function setup(page: Page, conflict = false, load: 'ok' | 'missing' | 'schedule-error' | 'leave-error' | 'timeout' | 'save-error' = 'ok') {
  let scheduleReads = 0; let leaveReads = 0;
  let saves = 0; let schedule: unknown; let leaves = [{ id: 'leave-1', startDateTime: '2030-01-08T09:00:00', endDateTime: '2030-01-08T13:00:00', reason: 'Court Appearance', isFullDay: false }];
  await page.addInitScript(() => { localStorage.setItem('legalease_staff_user', JSON.stringify({ userId: 1, name: 'Admin', role: 'Admin' })); localStorage.setItem('token', 'test-token'); });
  await page.route(api, async request => {
    const path = new URL(request.request().url()).pathname; const method = request.request().method(); let body: unknown = [];
    if (path.endsWith('/summary')) body = { activeLawyers: 1, totalLawyers: 1, practiceAreas: 1, legalServices: 1, coverage: [] };
    if (path === '/api/specializations') body = [{ specializationId: 1, name: 'Property', lawyerCount: 1, legalServiceCount: 1 }];
    if (path === '/api/lawyers/search') body = { items: [{ lawyerId: 'lawyer-1', name: 'Practitioner', email: 'lawyer@test.local', licenseNumber: 'TEST-1', status: 'Active', experience: 10, specializations: [{ specializationId: 1, name: 'Property' }] }], totalItems: 1, totalLawyers: 1, page: 1, pageSize: 10, totalPages: 1 };
    if (path.endsWith('/working-schedule')) {
      body = { appointmentDurationMinutes: 30, days, timeZone: 'Asia/Colombo', hasConfiguredSchedule: true };
      if (method === 'GET') {
        scheduleReads++;
        if (load === 'schedule-error' && scheduleReads === 1) { await request.fulfill({ status: 503, json: { message: 'Scheduling database is unavailable. Please retry.' } }); return; }
        if (load === 'timeout' && scheduleReads === 1) return; // Keep request pending to exercise the actual Axios timeout.
        if (load === 'missing') body = { appointmentDurationMinutes: 30, days: [], hasConfiguredSchedule: false };
      }
      if (method === 'PUT') {
        if (load === 'save-error') { await request.fulfill({ status: 409, json: { message: 'The schedule change conflicts with existing appointments. Resolve them first.' } }); return; }
        saves++; schedule = request.request().postDataJSON(); body = { ...request.request().postDataJSON(), hasConfiguredSchedule: true };
      }
    }
    if (path.includes('/unavailability')) {
      if (method === 'POST' || method === 'PUT') {
        if (conflict) { await request.fulfill({ status: 409, json: { title: 'This unavailable period conflicts with 1 existing appointment.', conflicts: [{ appointmentId: '8a6074db-23f1-4eb2-81d3-123b2e4d9f6a', date: '2030-01-08', startTime: '10:00', endTime: '10:30' }] } }); return; }
        const row = { id: 'leave-2', ...request.request().postDataJSON() }; leaves = method === 'PUT' ? [row] : [...leaves, row]; body = row;
      } else if (method === 'DELETE') { leaves = leaves.filter(row => !path.endsWith(row.id)); await request.fulfill({ status: 204 }); return; } else {
        leaveReads++;
        if (load === 'leave-error' && leaveReads === 1) { await request.fulfill({ status: 503, json: { detail: 'Unable to load leave records. Please retry.' } }); return; }
        body = leaves;
      }
    }
    await request.fulfill({ json: body });
  });
  await page.goto('/admin/lawyer-services/lawyers'); await page.getByRole('button', { name: 'Edit', exact: true }).click();
  if (load !== 'schedule-error' && load !== 'timeout') await expect(page.getByRole('button', { name: 'Save Schedule' })).toBeVisible();
  return { get saves() { return saves; }, get schedule() { return schedule; }, get leaves() { return leaves; } };
}
test('schedule API failure ends loading, shows backend message and retries', async ({ page }) => {
  await setup(page, false, 'schedule-error');
  await expect(page.getByRole('alert')).toContainText('Scheduling database is unavailable. Please retry.');
  await expect(page.getByText('Loading working schedule...')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry working schedule' }).click();
  await expect(page.getByRole('button', { name: 'Save Schedule' })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('hung schedule request times out and can recover', async ({ page }) => {
  await setup(page, false, 'timeout');
  await expect(page.getByRole('alert')).toContainText('The scheduling request timed out. Please retry.', { timeout: 15000 });
  await expect(page.getByText('Loading working schedule...')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry working schedule' }).click();
  await expect(page.getByRole('button', { name: 'Save Schedule' })).toBeEnabled();
});
test('leave failure does not block schedule save or discard schedule edits on retry', async ({ page }) => {
  const f = await setup(page, false, 'leave-error');
  await expect(page.getByRole('alert')).toContainText('Unable to load leave records. Please retry.');
  await page.getByLabel('Monday start').fill('10:00');
  await page.getByRole('button', { name: 'Retry unavailability' }).click();
  await expect(page.getByLabel('Monday start')).toHaveValue('10:00');
  await page.getByRole('button', { name: 'Save Schedule' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Working schedule saved' })).toBeVisible(); expect(f.saves).toBe(1);
});
test('missing schedule shows editable defaults and saves for existing lawyer', async ({ page }) => {
  const f = await setup(page, false, 'missing');
  await expect(page.getByText('No saved working schedule.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Monday working')).toBeChecked(); await expect(page.getByLabel('Sunday working')).not.toBeChecked();
  await page.getByLabel('Appointment Duration (minutes)').fill('60');
  await page.getByRole('button', { name: 'Save Schedule' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Working schedule saved' })).toBeVisible();
  await expect(page.getByText('No saved working schedule.', { exact: false })).toHaveCount(0);
  expect(f.schedule).toMatchObject({ appointmentDurationMinutes: 60, days });
});
test('schedule save shows controlled backend message and retains edits', async ({ page }) => {
  await setup(page, false, 'save-error'); await page.getByLabel('Tuesday start').fill('10:00');
  await page.getByRole('button', { name: 'Save Schedule' }).click();
  await expect(page.getByRole('alert')).toContainText('The schedule change conflicts with existing appointments. Resolve them first.');
  await expect(page.getByLabel('Tuesday start')).toHaveValue('10:00'); await expect(page.getByRole('button', { name: 'Save Schedule' })).toBeEnabled();
});
test('weekly schedule renders seven days, duration and office timezone', async ({ page }) => { await setup(page); for (const day of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) await expect(page.getByLabel(`${day} working`, { exact: true })).toBeVisible(); await expect(page.getByLabel('Appointment Duration (minutes)')).toHaveValue('30'); await expect(page.getByRole('region', { name: 'Working schedule' })).toContainText('Asia/Colombo'); });
test('off days disable times and can be enabled', async ({ page }) => { await setup(page); await expect(page.getByLabel('Saturday start')).toBeDisabled(); await page.getByLabel('Saturday working').check(); await expect(page.getByLabel('Saturday start')).toBeEnabled(); await page.getByLabel('Monday working').uncheck(); await expect(page.getByLabel('Monday end')).toBeDisabled(); });
test('invalid hours reject save without API mutation', async ({ page }) => { const f = await setup(page); await page.getByLabel('Monday start').fill('18:00'); await page.getByRole('button', { name: 'Save Schedule' }).click(); await expect(page.getByRole('alert')).toContainText('Start time must be before end time'); expect(f.saves).toBe(0); });
test('duration validates limits and saves edited values', async ({ page }) => { const f = await setup(page); await page.getByLabel('Appointment Duration (minutes)').fill('10'); await page.getByRole('button', { name: 'Save Schedule' }).click(); await expect(page.getByRole('alert')).toContainText('15–240'); expect(f.saves).toBe(0); await page.getByLabel('Appointment Duration (minutes)').fill('45'); await page.getByLabel('Tuesday start').fill('10:00'); await page.getByRole('button', { name: 'Save Schedule' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Working schedule saved' })).toContainText('Working schedule saved'); expect(f.saves).toBe(1); expect(f.schedule).toMatchObject({ appointmentDurationMinutes: 45 }); });
test('new lawyer has editable UI defaults', async ({ page }) => { await setup(page); await page.getByLabel('Close lawyer form').click(); await page.getByRole('button', { name: 'Add New Lawyer', exact: true }).click(); await expect(page.getByLabel('Monday working')).toBeChecked(); await expect(page.getByLabel('Sunday working')).not.toBeChecked(); await page.getByLabel('Friday working').uncheck(); await expect(page.getByLabel('Friday start')).toBeDisabled(); });
test('leave list and full-day save use exclusive midnight boundary', async ({ page }) => { const f = await setup(page); await expect(page.getByRole('region', { name: 'Leave and unavailability' })).toContainText('Court Appearance'); await page.getByRole('button', { name: '+ Add Unavailability' }).click(); await page.getByLabel('Full Day', { exact: true }).check(); await page.getByLabel('Leave start').fill('2030-01-09'); await page.getByLabel('Leave end').fill('2030-01-09'); await page.getByLabel('Leave reason').fill('Annual Leave'); await page.getByRole('button', { name: 'Save Unavailability' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Unavailability saved' })).toContainText('Unavailability saved'); expect(f.leaves[1]).toMatchObject({ startDateTime: '2030-01-09T00:00:00', endDateTime: '2030-01-10T00:00:00', isFullDay: true }); });
test('leave edit and delete update list', async ({ page }) => { const f = await setup(page); const section = page.getByRole('region', { name: 'Leave and unavailability' }); await section.getByRole('button', { name: 'Edit', exact: true }).click(); await page.getByLabel('Leave reason').fill('Training'); await page.getByRole('button', { name: 'Save Unavailability' }).click(); await expect(section).toContainText('Training'); await section.getByRole('button', { name: 'Delete', exact: true }).click(); await expect(section).toContainText('No upcoming unavailability'); expect(f.leaves).toHaveLength(0); });
test('leave conflict displays appointment and keeps form', async ({ page }) => { await page.setViewportSize({ width: 390, height: 900 }); await setup(page, true); await page.getByRole('button', { name: '+ Add Unavailability' }).click(); await page.getByLabel('Leave start').fill('2030-01-08T09:00'); await page.getByLabel('Leave end').fill('2030-01-08T13:00'); await page.getByLabel('Leave reason').fill('Court'); await page.getByRole('button', { name: 'Save Unavailability' }).click(); const error = page.getByRole('alert'); await expect(error).toContainText('Appointment #8a6074db-23f1-4eb2-81d3-123b2e4d9f6a'); await expect(error).toContainText('10:00–10:30'); await expect(error).toContainText('Resolve or reschedule'); await expect(page.getByLabel('Leave reason')).toHaveValue('Court'); expect(await error.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true); await page.screenshot({ path: '../docs/evidence/recurring-scheduling/leave-conflict-390.png', fullPage: true }); });
for (const width of [390, 1280]) test(`schedule fits viewport at ${width}px`, async ({ page }) => { await page.setViewportSize({ width, height: 900 }); await setup(page); await page.getByRole('button', { name: 'Save Schedule' }).scrollIntoViewIfNeeded(); const dialog = page.getByRole('dialog'); const dimensions = await dialog.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth })); expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1); await page.screenshot({ path: `../docs/evidence/recurring-scheduling/schedule-${width}.png`, fullPage: true }); });
