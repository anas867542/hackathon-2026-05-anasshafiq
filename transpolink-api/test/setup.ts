// Per-test cleanup hook. Imported by jest-e2e.json setupFilesAfterEach.
// Kept intentionally light — heavy lifting is in test/utils/app.ts.
import { resetDb } from './utils/db';

afterEach(async () => {
  if (process.env.SKIP_DB_RESET === '1') return;
  try {
    await resetDb();
  } catch {
    /* DB not initialised in unit-only specs — ignore */
  }
});
