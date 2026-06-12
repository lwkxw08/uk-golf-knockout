/**
 * Validates required environment variables at startup.
 * Exits with clear error messages if critical vars are missing.
 */
function validateEnv() {
  const errors = [];
  const warnings = [];

  // Critical — app won't function without these
  const required = [
    { key: 'DATABASE_URL', hint: 'PostgreSQL connection string, e.g. postgresql://user:pass@host:5432/dbname' },
    { key: 'JWT_SECRET', hint: 'Random secret for signing auth tokens. Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"' },
  ];

  for (const { key, hint } of required) {
    const val = process.env[key];
    if (!val || val === 'dev-secret-change-me') {
      if (key === 'JWT_SECRET' && process.env.NODE_ENV !== 'production') {
        warnings.push(`${key} is using default value. Set a proper secret before production. ${hint}`);
      } else if (!val) {
        errors.push(`Missing required env var: ${key}\n   ${hint}`);
      }
    }
  }

  // Optional but recommended for production
  const recommended = [
    { key: 'SENDGRID_API_KEY', feature: 'Email delivery (verification, password reset, notifications)' },
    { key: 'STRIPE_SECRET_KEY', feature: 'Payment processing (entry fees, memberships)' },
    { key: 'STRIPE_WEBHOOK_SECRET', feature: 'Stripe webhook verification' },
    { key: 'CLOUDFLARE_R2_ACCESS_KEY_ID', feature: 'File storage (avatars, photos)' },
    { key: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', feature: 'File storage (avatars, photos)' },
    { key: 'CLOUDFLARE_R2_ENDPOINT_URL', feature: 'File storage (avatars, photos)' },
    { key: 'CLOUDFLARE_R2_BUCKET_NAME', feature: 'File storage (avatars, photos)' },
    { key: 'REDIS_URL', feature: 'WebSocket scaling (Socket.io adapter for multiple instances)' },
    { key: 'SENTRY_DSN', feature: 'Error monitoring and alerting' },
  ];

  if (process.env.NODE_ENV === 'production') {
    for (const { key, feature } of recommended) {
      if (!process.env[key]) {
        warnings.push(`${key} not set — ${feature} will be disabled`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('\n=== STARTUP FAILED: Missing required environment variables ===\n');
    errors.forEach(e => console.error(`  ERROR: ${e}\n`));
    if (warnings.length > 0) {
      console.warn('\n--- Warnings ---\n');
      warnings.forEach(w => console.warn(`  WARN: ${w}`));
    }
    console.error('\nSet these variables in your .env file or Railway environment settings.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n--- Environment Warnings ---');
    warnings.forEach(w => console.warn(`  WARN: ${w}`));
    console.warn('');
  }

  return {
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasSendGrid: !!process.env.SENDGRID_API_KEY,
    hasR2: !!(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_ENDPOINT_URL),
    hasRedis: !!process.env.REDIS_URL,
    hasSentry: !!process.env.SENTRY_DSN,
  };
}

module.exports = { validateEnv };
