import { expect, test, type Page } from '@playwright/test';
const matching = '/admin/lawyer-matching';
const workforce = '/admin/lawyer-services/workforce-hiring';
async function fixture(page: Page) {
  await page.addInitScript(() => localStorage.setItem('legalease_staff_user', JSON.stringify({ userId: 1, name: 'Admin', role: 'Admin' })));
  const requests: string[] = [];
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    let json: unknown = [];
    if (path === '/api/lawyers/search') json = { items: [], totalItems: 0, totalLawyers: 0, totalPages: 1, page: 1, pageSize: 10 };
    if (path.endsWith('/summary')) json = { activeLawyers: 0, totalLawyers: 0, practiceAreas: 0, legalServices: 0, coverage: [] };
    if (path === '/api/lawyer-recommendations/saved-match') json = { workflowId: 'saved-match', status: 'NO_MATCH', userRequirement: 'Saved requirement', recommendations: [], warnings: [], trace: [], parsedRequirement: { categoryName: 'Property Law' } };
    if (path === '/api/workforce-analysis') json = { generatedAt: new Date().toISOString(), recentWindowDays: 30, futureWindowDays: 30, practiceAreas: [], limitations: [] };
    if (path.endsWith('/suggestions/saved-hiring')) json = { workflowId: 'saved-hiring', status: 'CAREER_OPENING_CREATED', careerOpeningId: 14, approvedTitle: 'Saved Opening', snapshot: { practiceAreaId: 1, practiceAreaName: 'Property Law', status: 'HEALTHY' }, draft: { suggestedTitle: 'Saved Opening', summary: 'Saved proposal', responsibilities: [], focusAreas: [] } };
    await route.fulfill({ json });
  });
  return requests;
}
test('sidebar order, independent active state and focused matching page', async ({ page }) => {
  const requests = await fixture(page);
  await page.goto(workforce);
  const nav = page.getByRole('complementary', { name: 'Admin navigation' });
  const labels = await nav.getByRole('link').allTextContents();
  expect(labels.indexOf('AI Lawyer Matching')).toBe(labels.indexOf('Lawyer & Legal Services') + 1);
  const tabs = page.getByRole('navigation', { name: 'Lawyer and legal service sections' });
  await expect(tabs.getByRole('link')).toHaveText(['Lawyers', 'Practice Areas', 'Legal Services', 'Workforce & Hiring']);
  await expect(tabs.getByRole('link', { name: 'Workforce & Hiring' })).toHaveAttribute('href', workforce);
  await expect(page.getByRole('heading', { name: 'AI Operations', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Workforce & Hiring Intelligence' })).toBeVisible();
  await expect(page).toHaveTitle('Workforce & Hiring | LegalEase Admin');
  requests.length = 0;
  await nav.getByRole('link', { name: 'AI Lawyer Matching', exact: true }).click();
  await expect(page).toHaveURL(matching);
  await expect(nav.getByRole('link', { name: 'AI Lawyer Matching', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Lawyer & Legal Services', exact: true })).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'AI Lawyer Matching', exact: true })).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Operational summary' })).toHaveCount(0);
  await expect(tabs).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Lawyer & Legal Service Management' })).toHaveCount(0);
  await expect(page).toHaveTitle('AI Lawyer Matching | LegalEase Admin');
  expect(requests).not.toContain('/api/lawyer-services/summary');
});
for (const legacy of ['/admin/lawyer-services/recommendations', '/admin/lawyer-services/ai-recommendation', '/admin/lawyer-management/recommendation-test']) {
  test(`${legacy} preserves query and hash and restores matching`, async ({ page }) => {
    const requests = await fixture(page);
    await page.goto(legacy + '?workflow=saved-match&context=a%20b&context=c#review');
    await expect(page).toHaveURL(matching + '?workflow=saved-match&context=a%20b&context=c#review');
    await expect(page.getByRole('heading', { name: 'No Eligible Lawyers Found' })).toBeVisible();
    expect(requests).toContain('/api/lawyer-recommendations/saved-match');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'No Eligible Lawyers Found' })).toBeVisible();
  });
}
test('legacy workforce URL preserves hiring ID and restores Careers completion', async ({ page }) => {
  const requests = await fixture(page);
  await page.goto('/admin/lawyer-services/ai-operations?hiring=saved-hiring&context=a%20b#proposal');
  await expect(page).toHaveURL(workforce + '?hiring=saved-hiring&context=a%20b#proposal');
  await expect(page.getByRole('link', { name: 'View in Careers' })).toHaveAttribute('href', /\/admin\/careers/);
  expect(requests).toContain('/api/workforce-analysis/suggestions/saved-hiring');
  await page.reload();
  await expect(page.getByRole('link', { name: 'View in Careers' })).toBeVisible();
});
for (const width of [320, 390]) {
  test(`mobile matching navigation closes and keeps active state at ${width}px`, async ({ page }, info) => {
    await fixture(page); await page.setViewportSize({ width, height: 900 }); await page.goto(workforce);
    const toggle = page.getByRole('button', { name: 'Toggle sidebar' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.focus(); await page.keyboard.press('Enter');
    const link = page.getByRole('link', { name: 'AI Lawyer Matching', exact: true });
    await expect(link).toBeVisible(); await link.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(matching); await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await toggle.click(); await expect(link).toHaveAttribute('aria-current', 'page');
    await page.getByRole('link', { name: 'Lawyer & Legal Services', exact: true }).click();
    const workforceTab = page.getByRole('link', { name: 'Workforce & Hiring', exact: true });
    await workforceTab.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(workforce); await expect(workforceTab).toHaveAttribute('aria-current', 'page');
    await page.goto(matching); await page.screenshot({ path: info.outputPath(`matching-${width}.png`), fullPage: true });
  });
}
test('canonical and legacy workflow routes require Admin', async ({ page }) => {
  for (const route of [matching, '/admin/lawyer-services/recommendations', workforce, '/admin/lawyer-services/ai-operations']) {
    await page.goto(route); await expect(page).toHaveURL('/login');
  }
});
