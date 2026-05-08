const PLACEHOLDER_SECRETS = new Set([
  'replace-me-with-strong-secret',
  'replace-me-with-another-strong-secret',
  'replace-me-with-strong-secret-min-32-chars-aaaaaa',
  'replace-me-with-another-strong-secret-min-32-chars',
  'change-me',
  'secret',
]);

const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  // ── Required variables ────────────────────────────────────────────────────
  for (const key of REQUIRED) {
    if (!config[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  // ── NODE_ENV ──────────────────────────────────────────────────────────────
  const nodeEnv = String(config.NODE_ENV ?? 'development');
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(
      `NODE_ENV must be "development", "production", or "test" (got "${nodeEnv}")`,
    );
  }
  const isProd = nodeEnv === 'production';

  // ── PORT ──────────────────────────────────────────────────────────────────
  if (config.PORT !== undefined) {
    const port = Number(config.PORT);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new Error(`PORT must be an integer in [1024, 65535] (got ${config.PORT})`);
    }
  }

  // ── JWT secrets ───────────────────────────────────────────────────────────
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = String(config[key]);
    if (value.length < 32) {
      throw new Error(`${key} must be at least 32 characters (got ${value.length})`);
    }
    if (PLACEHOLDER_SECRETS.has(value)) {
      throw new Error(
        `${key} is using a placeholder value — generate a real secret (openssl rand -hex 32)`,
      );
    }
  }

  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }

  // ── CORS_ORIGIN ───────────────────────────────────────────────────────────
  if (config.CORS_ORIGIN) {
    const origins = String(config.CORS_ORIGIN)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    if (isProd && origins.includes('*')) {
      throw new Error(
        'CORS_ORIGIN must not be a wildcard (*) in production — specify exact origins',
      );
    }
  }

  // ── BCRYPT_ROUNDS ─────────────────────────────────────────────────────────
  const rounds = config.BCRYPT_ROUNDS ? Number(config.BCRYPT_ROUNDS) : 12;
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
    throw new Error(`BCRYPT_ROUNDS must be an integer in [10, 15] (got ${config.BCRYPT_ROUNDS})`);
  }

  return config;
}
