const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const config = require('./config');
const { validateEnv } = require('./config/validateEnv');
const { startDrawScheduler } = require('./services/drawScheduler');
const { startNotificationScheduler } = require('./services/notificationScheduler');

// Validate environment variables
const envStatus = validateEnv();

// Sentry error monitoring (if configured)
let Sentry = null;
if (config.sentry.dsn) {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

// Pino structured logging
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
});

const app = express();
const server = http.createServer(app);

// Socket.io with optional Redis adapter
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis adapter for multi-instance WebSocket support
if (config.redis.url) {
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { Redis } = require('ioredis');
  const pubClient = new Redis(config.redis.url);
  const subClient = pubClient.duplicate();
  Promise.all([
    new Promise(r => pubClient.on('ready', r)),
    new Promise(r => subClient.on('ready', r)),
  ]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter connected');
  }).catch(err => {
    logger.warn({ err: err.message }, 'Redis adapter failed — falling back to in-memory');
  });
}

app.set('io', io);
app.set('logger', logger);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
app.use(cors({ origin: true, credentials: true }));

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      logger.info({ method: req.method, path: req.path, status: res.statusCode, duration: `${duration}ms` });
    }
  });
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Stripe webhook needs raw body — mount before json parser
const paymentsRouter = require('./routes/payments');
app.use('/api/payments', paymentsRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/tournaments', require('./routes/entries'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/draws', require('./routes/draws'));
app.use('/api/players', require('./routes/players'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/memberships', require('./routes/memberships'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/scoring', require('./routes/scoring'));
app.use('/api/league', require('./routes/league'));
app.use('/api/live-match', require('./routes/liveMatch'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/chat', require('./routes/matchChat'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/tee-time', require('./routes/teeTime'));
app.use('/api/sponsor-ads', require('./routes/sponsorAds'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/programme', require('./routes/programme'));
app.use('/api/video-highlights', require('./routes/videoHighlights'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/search', require('./routes/search'));
app.use('/api/audit-log', require('./routes/auditLog'));

// Enhanced health check
app.get('/api/health', async (req, res) => {
  const prisma = require('./config/prisma');
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    services: {
      database: dbStatus,
      stripe: envStatus.hasStripe ? 'configured' : 'not configured',
      email: envStatus.hasSendGrid ? 'configured' : 'not configured',
      storage: envStatus.hasR2 ? 'configured' : 'fallback (base64)',
      websockets: envStatus.hasRedis ? 'redis adapter' : 'in-memory',
      monitoring: envStatus.hasSentry ? 'sentry' : 'console only',
    },
  });
});

// Socket.io connections
io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, 'Client connected');

  socket.on('draw:join', (tournamentId) => {
    socket.join(`draw-${tournamentId}`);
  });

  socket.on('draw:leave', (tournamentId) => {
    socket.leave(`draw-${tournamentId}`);
  });

  socket.on('match:join', (matchId) => {
    socket.join(`match-${matchId}`);
  });

  socket.on('match:leave', (matchId) => {
    socket.leave(`match-${matchId}`);
  });

  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'Client disconnected');
  });
});

// Serve frontend static files in production/preview
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err: err.message, stack: err.stack, path: req.path });
  if (Sentry) Sentry.captureException(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});

server.listen(config.port, () => {
  logger.info({ port: config.port }, 'Server running');
  logger.info({ ...envStatus }, 'Service status');
  startDrawScheduler(io);
  startNotificationScheduler();
});

module.exports = { app, server, io };
