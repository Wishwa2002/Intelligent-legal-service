import { expect, test, type Page } from '@playwright/test';
const root = '/admin/lawyer-services/workforce-hiring';
const defaults = { practiceAreaId: 70, practiceAreaName: 'Criminal Law', minimumActiveLawyers: 0, targetActiveLawyers: 0, minimumFutureSlots: 0, highDemandThreshold: 5, watchCapacityRatio: .75, source: 'DEFAULT' };
async function fixture(page: Page, development = true) {
  await page.addInitScript(() => { localStorage.setItem('legalease_staff_user', JSON.stringify({ userId: 1, name: 'Admin', role: 'Admin' })); localStorage.setItem('token', 'test-token'); });
  let setting = { ...defaults }; let scenario = 'RECRUITMENT_NEEDED'; let error = false; let demoConflict = false;
  const stats = { saves: 0, resets: 0, applies: 0, demoResets: 0, analyses: 0, generates: 0 };
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const path = new URL(route.request().url()).pathname; const method = route.request().method(); let json: unknown = []; let status = 200;
    if (path.endsWith('/summary')) json = { activeLawyers: 4, totalLawyers: 4, practiceAreas: 1, legalServices: 5, coverage: [] };
    if (path === '/api/workforce-settings') json = [setting];
    if (path === '/api/workforce-settings/70') {
      if (method === 'PUT') { stats.saves++; if (error) { status = 400; json = { errors: { targetActiveLawyers: ['Target must be at least minimum.'] } }; } else { setting = { ...setting, ...route.request().postDataJSON(), source: 'CUSTOM' }; json = setting; } }
      if (method === 'DELETE') { stats.resets++; setting = { ...defaults }; json = setting; }
    }
    if (path === '/api/dev/workforce-demo') { status = development ? 200 : 404; json = { available: development }; }
    if (path === '/api/dev/workforce-demo/apply') { stats.applies++; scenario = route.request().postDataJSON().scenario; expect(route.request().postDataJSON().practiceAreaId).toBe(70); json = { scenario, practiceAreaId: 72, message: 'Isolated demo updated.' }; if (demoConflict) { status = 409; json = { title: 'An Admin-created opening already exists in this demo area. Review Careers before demonstrating new recruitment.' }; } }
    if (path === '/api/dev/workforce-demo/reset') { stats.demoResets++; scenario = 'HEALTHY_COVERAGE'; json = { scenario, practiceAreaId: 72, message: 'Demo baseline restored.' }; }
    if (path === '/api/workforce-analysis') { stats.analyses++; const healthy = scenario === 'HEALTHY_COVERAGE'; const recruitment = scenario === 'EXISTING_RECRUITMENT'; json = { generatedAt: '2026-10-04T08:00:00Z', recentWindowDays: 30, futureWindowDays: 30, unmappedCareerOpeningCount: 0, limitations: [], practiceAreas: [{ practiceAreaId: 72, practiceAreaName: '[Demo] Criminal Law', activeLawyerCount: healthy ? 6 : 2, legalServiceCount: 0, recentDemandCount: healthy ? 0 : 12, recentAppointmentCount: 0, futureAvailableSlotCount: healthy ? 12 : 0, openCareerOpeningCount: recruitment ? 1 : 0, openings: recruitment ? [{ careerId: 4, jobTitle: '[Demo] Criminal Law Practitioner' }] : [], status: healthy ? 'HEALTHY' : 'CAPACITY_CONCERN', reasons: healthy ? ['CAPACITY_WITHIN_CONFIGURED_RULES'] : ['BELOW_MINIMUM_LAWYERS'], planningRules: setting }] }; }
    if (path.endsWith('/suggestions')) stats.generates++;
    await route.fulfill({ status, json });
  });
  return { stats, failSave: () => { error = true; }, conflictDemo: () => { demoConflict = true; } };
}
test('settings load real defaults save custom rules reset and refetch analysis', async ({ page }) => {
  const { stats } = await fixture(page); await page.goto(root);
  await expect(page.getByRole('button', { name: 'Run Workforce Analysis' })).toBeVisible(); await page.getByRole('button', { name: 'Workforce Settings', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog.getByText('Default', { exact: true })).toBeVisible(); await expect(dialog.getByLabel('High Demand Threshold')).toHaveValue('5');
  await dialog.getByLabel('Minimum Active Lawyers').fill('4'); await dialog.getByLabel('Target Active Lawyers').fill('6'); await dialog.getByLabel('Minimum Future Slots').fill('12'); await dialog.getByLabel('High Demand Threshold').fill('10'); await dialog.getByLabel('Watch Capacity Ratio (%)').fill('80');
  await dialog.getByRole('button', { name: 'Save Settings' }).click(); await expect(dialog.getByRole('status')).toContainText('Workforce settings saved'); await expect(dialog.getByText('Custom', { exact: true })).toBeVisible(); expect(stats.saves).toBe(1); await expect.poll(() => stats.analyses).toBe(1);
  await dialog.getByRole('button', { name: 'Reset to Defaults' }).click(); await expect(dialog.getByText('Default', { exact: true })).toBeVisible(); await expect(dialog.getByLabel('Watch Capacity Ratio (%)')).toHaveValue('75'); expect(stats.resets).toBe(1);
  await dialog.getByRole('button', { name: 'Close workforce settings' }).click(); await expect(dialog).toBeHidden(); await expect(page.getByRole('button', { name: 'Workforce Settings', exact: true })).toBeFocused();
});
test('local and backend validation errors do not claim a save', async ({ page }) => {
  const { stats, failSave } = await fixture(page); await page.goto(root); await page.getByRole('button', { name: 'Workforce Settings', exact: true }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Minimum Active Lawyers').fill('4'); await dialog.getByLabel('Target Active Lawyers').fill('3'); await dialog.getByRole('button', { name: 'Save Settings' }).click(); await expect(dialog.getByRole('alert')).toContainText('target at least the minimum'); expect(stats.saves).toBe(0);
  await dialog.getByLabel('Target Active Lawyers').fill('6'); failSave(); await dialog.getByRole('button', { name: 'Save Settings' }).click(); await expect(dialog.getByRole('alert')).toContainText('Target must be at least minimum');
});
test('standard Admin page never exposes or invokes development scenario controls', async ({ page }) => {
  const { stats } = await fixture(page); const demoRequests: string[] = []; page.on('request', request => { if (request.url().includes('/api/dev/workforce-demo')) demoRequests.push(request.url()); }); await page.goto(root);
  await expect(page.getByText(/Development Only|Demo Scenarios/i)).toHaveCount(0); await expect(page.getByRole('button', { name: 'Apply Demo Scenario' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Run Workforce Analysis' }).click(); await expect(page.getByRole('button', { name: 'Prepare Hiring Proposal' })).toBeEnabled(); await expect(page.getByText(/Development Only|Demo Scenarios/i)).toHaveCount(0);
  expect(stats.applies).toBe(0); expect(stats.demoResets).toBe(0); expect(demoRequests).toEqual([]);
});
test('a nondevelopment backend never exposes demo controls', async ({ page }) => {
  await fixture(page, false); await page.goto(root); await page.getByRole('button', { name: 'Workforce Settings', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('button', { name: 'Apply Demo Scenario' })).toHaveCount(0); await expect(page.getByText('Demo Scenarios', { exact: false })).toHaveCount(0);
});
test('settings dialog fits supported widths with keyboard access', async ({ page }, info) => {
  await fixture(page); await page.goto(root);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto(root); const open = page.getByRole('button', { name: 'Workforce Settings', exact: true }); await open.focus(); await page.keyboard.press('Enter'); const dialog = page.getByRole('dialog'); await expect(dialog.getByLabel('Minimum Active Lawyers')).toBeVisible();
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true); await page.screenshot({ path: info.outputPath(`settings-${width}.png`), fullPage: true }); await page.keyboard.press('Escape'); await expect(open).toBeFocused();
    await expect(page.getByText(/Development Only|Demo Scenarios/i)).toHaveCount(0); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
