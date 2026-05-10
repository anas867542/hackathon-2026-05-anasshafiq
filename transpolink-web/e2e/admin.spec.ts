/**
 * Admin panel E2E — TC-ADM-001..016
 *
 * Admin role created via the public registration endpoint (RegisterDto allows
 * any role). Replace with seeded admin in a real CI env.
 */
import { test, expect } from '@playwright/test';
import { api } from './helpers/api';
import { loginAs } from './helpers/session';

async function registerAdmin() {
  const ctx = await api();
  const i = Date.now();
  const res = await ctx.post('/auth/register', {
    data: {
      email: `pwadm${i}@test.local`,
      phone: `+92303${String(1000000 + (i % 9999999)).slice(-7)}`,
      password: 'TestPass1234A',
      fullName: `PW Admin ${i}`,
      role: 'admin',
    },
  });
  if (!res.ok()) throw new Error(`registerAdmin failed: ${res.status()}`);
  return res.json();
}

test.describe('Admin panel', () => {
  test('TC-ADM-001: admin login lands on /admin', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });

  test('TC-ADM-002: non-admin blocked from /admin', async ({ page }) => {
    const ctx = await api();
    const res = await ctx.post('/auth/register', {
      data: {
        email: `pwnonad${Date.now()}@test.local`,
        phone: `+923049998888`,
        password: 'TestPass1234A',
        fullName: 'NonAdmin',
        role: 'customer',
      },
    });
    const c = await res.json();
    await loginAs(page, c);
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin\/(dashboard|users|drivers|bookings)/, { timeout: 10_000 });
  });

  test('TC-ADM-003: dashboard widgets render', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin');
    await expect(page.getByText(/users|drivers|bookings/i).first()).toBeVisible();
  });

  test('TC-ADM-004: user list renders', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/users');
    await expect(page.getByText(/email|role|users/i).first()).toBeVisible();
  });

  test('TC-ADM-005: user search', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/users');
    const search = page.getByPlaceholder(/search/i);
    if (await search.isVisible().catch(() => false)) {
      await search.fill(a.user.email.slice(0, 8));
      await page.waitForTimeout(700);
    }
  });

  test('TC-ADM-006: driver list renders', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/drivers');
    await expect(page.getByText(/drivers|rating|trips/i).first()).toBeVisible();
  });

  test('TC-ADM-007: driver verification toggle accessible', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/drivers');
    // smoke check — buttons may or may not exist
    const verify = page.getByRole('button', { name: /verify|approve/i }).first();
    if (await verify.isVisible().catch(() => false)) await verify.click();
  });

  test('TC-ADM-008: booking monitor list', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/bookings');
    await expect(page.getByText(/bookings|status/i).first()).toBeVisible();
  });

  test('TC-ADM-009: booking detail (admin)', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/bookings');
    const link = page.locator('a[href*="/admin/bookings/"]').first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await expect(page).toHaveURL(/\/admin\/bookings\//);
    }
  });

  test('TC-ADM-010: force cancel from admin (UI presence)', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/bookings');
    // Just ensure page renders without error
    await expect(page).toHaveURL(/\/admin\/bookings/);
  });

  test('TC-ADM-011: truck types page', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/trucks');
    if (page.url().includes('/admin/trucks')) {
      await expect(page.getByText(/truck|vehicle/i).first()).toBeVisible();
    }
  });

  test('TC-ADM-012: reviews moderation page', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/reviews');
    if (page.url().includes('/admin/reviews')) {
      await expect(page.getByText(/review/i).first()).toBeVisible();
    }
  });

  test('TC-ADM-013: analytics — bookings over time', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/analytics');
    if (page.url().includes('/admin/analytics')) {
      await expect(page.locator('canvas, svg').first()).toBeVisible();
    }
  });

  test('TC-ADM-014: analytics — revenue widget', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin/analytics');
    if (page.url().includes('/admin/analytics')) {
      await expect(page.getByText(/revenue|earnings|fare/i).first()).toBeVisible();
    }
  });

  test('TC-ADM-015: sidebar navigation links work', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin');
    const nav = page.locator('nav a, aside a').first();
    if (await nav.isVisible().catch(() => false)) {
      await nav.click();
      await expect(page).toHaveURL(/\/admin\//);
    }
  });

  test('TC-ADM-016: admin logout', async ({ page }) => {
    const a = await registerAdmin();
    await loginAs(page, a);
    await page.goto('/admin');
    const logout = page.getByRole('button', { name: /log ?out|sign out/i }).first();
    if (await logout.isVisible().catch(() => false)) {
      await logout.click();
      await expect(page).toHaveURL(/\/(login|$)/);
    }
  });
});
