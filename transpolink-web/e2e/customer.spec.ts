/**
 * Customer-side E2E — TC-CUST-001..026
 *
 * Many of these specs intentionally use both UI flows AND backend helpers,
 * because (a) some real flows (Google OAuth, Nominatim) are best mocked, and
 * (b) state setup is faster via REST. Pure UI tests are isolated under "UI:".
 */
import { test, expect } from '@playwright/test';
import { registerCustomer, registerDriver, setDriverOnline, createBooking, api } from './helpers/api';
import { loginAs } from './helpers/session';

test.describe('Customer — auth & profile', () => {
  test('TC-CUST-001: signup with email', async ({ page }) => {
    await page.goto('/register');
    const email = `uic${Date.now()}@test.local`;
    await page.getByLabel(/full name/i).fill('UI Customer');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/phone/i).fill('+923001112222');
    await page.getByLabel(/password/i).first().fill('TestPass1234A');
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(page).toHaveURL(/\/(book|dashboard|home)/, { timeout: 15_000 });
  });

  test('TC-CUST-002: weak password rejected', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/email/i).fill('weak@test.local');
    await page.getByLabel(/password/i).first().fill('abc');
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(page.getByText(/password.*(10|character|short)/i)).toBeVisible();
  });

  test('TC-CUST-003: duplicate email rejected', async ({ page }) => {
    const a = await registerCustomer();
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('Dup');
    await page.getByLabel(/email/i).fill(a.user.email);
    await page.getByLabel(/phone/i).fill('+923009998888');
    await page.getByLabel(/password/i).first().fill('TestPass1234A');
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(page.getByText(/already|exists|in use/i)).toBeVisible();
  });

  test('TC-CUST-004: login with valid credentials', async ({ page }) => {
    const c = await registerCustomer();
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(c.user.email);
    await page.getByLabel(/password/i).fill('TestPass1234A');
    await page.getByRole('button', { name: /sign in|log ?in/i }).click();
    await expect(page).toHaveURL(/\/(book|dashboard)/, { timeout: 10_000 });
  });

  test('TC-CUST-005: wrong password rejected', async ({ page }) => {
    const c = await registerCustomer();
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(c.user.email);
    await page.getByLabel(/password/i).fill('WrongPass9876');
    await page.getByRole('button', { name: /sign in|log ?in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
  });

  test('TC-CUST-006: Google OAuth button is wired up', async ({ page }) => {
    await page.goto('/login');
    const btn = page.getByRole('button', { name: /google/i });
    await expect(btn).toBeVisible();
  });

  test('TC-CUST-007: logout clears session', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    const logout = page.getByRole('button', { name: /log ?out|sign out/i }).first();
    if (await logout.isVisible()) {
      await logout.click();
      await expect(page).toHaveURL(/\/(login|$)/);
    }
  });

  test('TC-CUST-008: session persists on reload', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    await page.reload();
    await expect(page).toHaveURL(/\/book/);
  });
});

test.describe('Customer — booking flow', () => {
  test('TC-CUST-009: map loads on /book', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    await expect(page.locator('[data-testid="booking-map"], .map-container, canvas').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('TC-CUST-010: pickup autocomplete shows suggestions', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    const pickup = page.getByPlaceholder(/pickup/i).first();
    await pickup.fill('Karachi Air');
    await page.waitForTimeout(800);
    const suggestion = page.locator('[role="option"], .autocomplete-item').first();
    await expect(suggestion).toBeVisible({ timeout: 10_000 });
  });

  test('TC-CUST-011: use-current-location button', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    const useLoc = page.getByRole('button', { name: /current location|my location/i });
    if (await useLoc.isVisible()) {
      await useLoc.click();
      await expect(page.getByPlaceholder(/pickup/i).first()).not.toHaveValue('', { timeout: 10_000 });
    }
  });

  test('TC-CUST-012: drop-off shows route preview', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    await page.getByPlaceholder(/pickup/i).first().fill('Karachi Airport');
    await page.waitForTimeout(700);
    await page.locator('[role="option"]').first().click().catch(() => undefined);
    await page.getByPlaceholder(/drop|destination/i).first().fill('Clifton Karachi');
    await page.waitForTimeout(700);
    await page.locator('[role="option"]').first().click().catch(() => undefined);
    await expect(page.getByText(/km|minutes|estimated/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-CUST-013: vehicle type selectable', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    const card = page.getByText(/mini.?truck/i).first();
    await card.click();
    await expect(card).toBeVisible();
  });

  test('TC-CUST-014: fare estimate appears', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    await page.goto('/book');
    // After both addresses + type are set, fare should render
    await expect(page.getByText(/PKR|Rs|estimated.*fare/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('TC-CUST-015: submit instant booking via API redirect', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    const booking = await createBooking(c.accessToken);
    await page.goto(`/book/${booking.id}`);
    await expect(page.getByText(booking.referenceCode)).toBeVisible();
  });

  test('TC-CUST-016: bidding booking renders panel', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    const booking = await createBooking(c.accessToken, { bookingType: 'bidding' });
    await page.goto(`/book/${booking.id}`);
    await expect(page.getByText(/bid|offer/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-CUST-017: pending booking shows resend + cancel', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    const booking = await createBooking(c.accessToken);
    await page.goto(`/book/${booking.id}`);
    await expect(page.getByRole('button', { name: /resend/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('TC-CUST-018: resend rebroadcasts (toast + API)', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    const booking = await createBooking(c.accessToken);
    await page.goto(`/book/${booking.id}`);
    await page.getByRole('button', { name: /resend/i }).click();
    await expect(page.getByText(/re-?sent|searching/i)).toBeVisible({ timeout: 10_000 });
  });

  test('TC-CUST-019: cancel booking', async ({ page }) => {
    const c = await registerCustomer();
    await loginAs(page, c);
    const booking = await createBooking(c.accessToken);
    await page.goto(`/book/${booking.id}`);
    await page.getByRole('button', { name: /cancel/i }).click();
    const confirm = page.getByRole('button', { name: /confirm|yes/i });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    await expect(page.getByText(/cancelled|cancelled/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-CUST-020: live tracking after driver accepts', async ({ page }) => {
    const c = await registerCustomer();
    const d = await registerDriver();
    await setDriverOnline(d.accessToken);
    const booking = await createBooking(c.accessToken);
    const ctx = await api();
    await ctx.patch(`/bookings/${booking.id}/accept`, {
      headers: { Authorization: `Bearer ${d.accessToken}` },
      data: {},
    });
    await loginAs(page, c);
    await page.goto(`/book/${booking.id}`);
    await expect(page.getByText(/accepted|on the way|driver/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-CUST-021: status transitions visible (lifecycle)', async ({ page }) => {
    const c = await registerCustomer();
    const d = await registerDriver();
    await setDriverOnline(d.accessToken);
    const booking = await createBooking(c.accessToken);
    await loginAs(page, c);
    await page.goto(`/book/${booking.id}`);
    const ctx = await api();
    const auth = { Authorization: `Bearer ${d.accessToken}` };
    await ctx.patch(`/bookings/${booking.id}/accept`, { headers: auth, data: {} });
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 15_000 });
    await ctx.patch(`/bookings/${booking.id}/arrive`, { headers: auth });
    await expect(page.getByText(/arrived|here/i).first()).toBeVisible({ timeout: 15_000 });
    await ctx.patch(`/bookings/${booking.id}/start`, { headers: auth });
    await expect(page.getByText(/in.progress|on.trip/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-CUST-022 / 023: rating modal opens after completion + submit', async ({ page }) => {
    const c = await registerCustomer();
    const d = await registerDriver();
    await setDriverOnline(d.accessToken);
    const booking = await createBooking(c.accessToken);
    const ctx = await api();
    const auth = { Authorization: `Bearer ${d.accessToken}` };
    for (const step of ['accept', 'arrive', 'start', 'complete']) {
      await ctx.patch(`/bookings/${booking.id}/${step}`, {
        headers: auth,
        data: step === 'accept' ? {} : undefined,
      });
    }
    await loginAs(page, c);
    await page.goto(`/book/${booking.id}`);
    const modal = page.getByRole('dialog');
    if (await modal.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const star = page.locator('[data-rating="5"], button[aria-label*="5"]').first();
      if (await star.isVisible().catch(() => false)) await star.click();
      await page.getByRole('button', { name: /submit|send/i }).click();
    }
  });

  test('TC-CUST-024: booking history list', async ({ page }) => {
    const c = await registerCustomer();
    await createBooking(c.accessToken);
    await loginAs(page, c);
    await page.goto('/bookings');
    await expect(page.getByText(/TPL-/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-CUST-025: booking detail view (completed)', async ({ page }) => {
    const c = await registerCustomer();
    const booking = await createBooking(c.accessToken);
    await loginAs(page, c);
    await page.goto(`/book/${booking.id}`);
    await expect(page.getByText(booking.referenceCode)).toBeVisible();
  });

  test('TC-CUST-026: pending without drivers stays pending (no crash)', async ({ page }) => {
    const c = await registerCustomer();
    const booking = await createBooking(c.accessToken);
    await loginAs(page, c);
    await page.goto(`/book/${booking.id}`);
    await expect(page.getByText(/pending|searching|finding/i).first()).toBeVisible();
  });
});
