require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@ukgolfknockout.com',
  },
  r2: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT_URL,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  courseDataProvider: process.env.COURSE_DATA_PROVIDER || 'golfcourseapi',
  golfCourseApiKey: process.env.GOLF_COURSE_API_KEY,
  englandGolfClientToken: process.env.ENGLAND_GOLF_CLIENT_TOKEN,
};
