import { expect, test } from '@playwright/test';
test('rescheduling clears old times and rejects delayed response from a previous date', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.addInitScript(() => { localStorage.setItem('legalease_staff_user', JSON.stringify({ userId: 1, name: 'Admin', role: 'Admin' })); localStorage.setItem('token', 'test-token'); });
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const url = new URL(route.request().url()); let body: unknown = [];
    if (url.pathname === '/api/appointments') body = [{ appointmentId: 'appt-1', customerName: 'Customer', lawyerId: 'lawyer-1', lawyerName: 'Practitioner', date: '2030-01-14', startTime: '09:00', endTime: '09:30', status: 'Confirmed', consultationType: 'Online' }];
    if (url.pathname === '/api/lawyers') body = [{ lawyerId: 'lawyer-1', name: 'Practitioner' }];
    if (url.pathname.endsWith('/available-slots')) {
      const date = url.searchParams.get('date'); if (date === '2030-01-15') await gate;
      body = { date, workingDay: true, appointmentDurationMinutes: 30, timeZone: 'Asia/Colombo', availableSlots: [{ slotId: 'slot-' + date, start: date === '2030-01-16' ? '11:00:00' : '10:00:00', end: date === '2030-01-16' ? '11:30:00' : '10:30:00' }] };
    }
    await route.fulfill({ json: body });
  });
  await page.goto('/admin/appointments'); await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
  await expect(page.getByRole('button', { name: /10:00.*10:30/ })).toBeVisible();
  await page.getByRole('button', { name: /10:00.*10:30/ }).click();
  await page.getByLabel('Reschedule date').fill('2030-01-15'); await expect(page.getByRole('button', { name: /10:00.*10:30/ })).toHaveCount(0);
  await page.getByLabel('Reschedule date').fill('2030-01-16'); await expect(page.getByRole('button', { name: /11:00.*11:30/ })).toBeVisible();
  release(); await expect(page.getByRole('button', { name: /10:00.*10:30/ })).toHaveCount(0);
  await page.getByLabel('Reschedule date').fill(''); await expect(page.getByRole('button', { name: /11:00.*11:30/ })).toHaveCount(0);
});
