import { expect, type Page } from '@playwright/test';
export const existingClient = { userId: 42, name: 'Existing Customer', email: 'customer@example.test' };
export async function frontDeskFixture(page: Page, getResult: () => object) {
  let review: object = {};
  await page.route('**/api/clients/search*', route => route.fulfill({ json: [existingClient] }));
  await page.route('**/api/clients/42/summary', route => route.fulfill({ json: existingClient }));
  await page.route('**/api/lawyer-recommendations/*/review', async route => {
    const request = route.request().postDataJSON();
    review = { clientId: request.clientId, selectedLawyerId: request.lawyerId, selectedSlotId: request.slotId, bookingDate: request.bookingDate, reviewStage: request.stage };
    await route.fulfill({ json: { ...getResult(), ...review } });
  });
  // Real backend restoration persists review fields; emulate the same server state.
  await page.route('**/api/lawyer-recommendations/*', async route => {
    if (route.request().method() === 'GET' && Object.keys(review).length) await route.fulfill({ json: { ...getResult(), ...review } });
    else await route.fallback();
  });
}
export async function selectIntakeClient(page: Page) {
  const select = page.getByRole('button', { name: 'Select client Existing Customer', exact: true });
  await expect(select).toBeVisible(); await select.click();
}
