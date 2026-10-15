import { expect, test, type Page } from '@playwright/test';

const shots = process.env.SCREENSHOT_DIR;
async function snap(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png`, fullPage: true });
}

test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:4010/__reset');
});

test('list renders server-side and filters through the URL', async ({ page }) => {
  await page.goto('/items');
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(20);
  await snap(page, 'list');

  await page.getByLabel('Category').selectOption('kitchen');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/category=kitchen/);
  const cards = page.getByRole('list', { name: 'Items' }).getByRole('listitem');
  await expect(cards.first()).toContainText('Kitchen');
  for (const card of await cards.all()) await expect(card).toContainText('Kitchen');
});

test('detail page opens from the list', async ({ page }) => {
  await page.goto('/items');
  const first = page.getByRole('list', { name: 'Items' }).getByRole('link').first();
  const name = (await first.textContent())!.trim();
  await first.click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page).toHaveTitle(`${name} · Catalog`);
  await expect(page.getByText(/viewing now \(simulated\)/)).toBeVisible();
  await snap(page, 'detail');
});

test('unknown item answers 404', async ({ page }) => {
  const response = await page.goto('/items/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible();
});

test('server failure shows an error with retry', async ({ page }) => {
  await page.goto('/items/broken');
  // Scoped to main: Next's route announcer is also an alert region.
  const alert = page.getByRole('main').getByRole('alert');
  await expect(alert).toContainText('The service had a problem', { timeout: 15_000 });
  await expect(alert).toContainText(/Reference: req-/);
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await snap(page, 'error');
});

test('editor creates an item with validation feedback', async ({ page }) => {
  await page.goto('/items');
  await page.getByLabel('Demo identity').selectOption('editor');
  await page.getByRole('button', { name: 'Switch' }).click();
  await page.getByRole('link', { name: 'New item' }).click();

  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Use between 2 and 80 characters.')).toBeVisible();
  await expect(page.getByText('Pick a category.')).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true');
  await snap(page, 'form-errors');

  await page.getByLabel('Name').fill('Smoke test planter');
  await page.getByLabel('Category').selectOption('outdoor');
  await page.getByLabel('Tags (comma separated)').fill('smoke, test');
  await page.getByRole('button', { name: 'Create item' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Smoke test planter' })).toBeVisible();
  await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible();
});
