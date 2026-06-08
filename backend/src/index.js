const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');

const app = express();
const server = http.createServer(app);

// Socket.io for live draws
const io = new Server(server, {
  cors: { origin: config.clientUrl, methods: ['GET', 'POST'] },
});

app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({ origin: config.clientUrl }));
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

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

module.exports = { app, server, io };
