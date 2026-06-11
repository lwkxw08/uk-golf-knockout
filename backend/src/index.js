const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const config = require('./config');
const { startDrawScheduler } = require('./services/drawScheduler');
const { startNotificationScheduler } = require('./services/notificationScheduler');

const app = express();
const server = http.createServer(app);

// Socket.io for live draws
const io = new Server(server, {
  cors: { origin: config.clientUrl, methods: ['GET', 'POST'] },
});

app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('combined'));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join draw room for live updates
  socket.on('draw:join', (tournamentId) => {
    socket.join(`draw-${tournamentId}`);
    console.log(`${socket.id} joined draw room: draw-${tournamentId}`);
  });

  socket.on('draw:leave', (tournamentId) => {
    socket.leave(`draw-${tournamentId}`);
  });

  // Join live match room for real-time hole-by-hole updates
  socket.on('match:join', (matchId) => {
    socket.join(`match-${matchId}`);
    console.log(`${socket.id} joined match room: match-${matchId}`);
  });

  socket.on('match:leave', (matchId) => {
    socket.leave(`match-${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
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
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startDrawScheduler(io);
  startNotificationScheduler();
});

module.exports = { app, server, io };
