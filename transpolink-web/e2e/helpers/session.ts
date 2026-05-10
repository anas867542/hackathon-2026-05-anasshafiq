/**
 * Inject API session tokens into localStorage so we skip the UI login flow.
 * Mirrors the keys used by transpolink-web/src/lib/auth/session.ts.
 */
import { Page } from '@playwright/test';
import type { AuthBundle } from './api';

export async function loginAs(page: Page, bundle: AuthBundle) {
  await page.addInitScript((b) => {
    window.localStorage.setItem('tl.accessToken', b.accessToken);
    window.localStorage.setItem('tl.refreshToken', b.refreshToken);
    window.localStorage.setItem('tl.user', JSON.stringify(b.user));
  }, bundle);
}
