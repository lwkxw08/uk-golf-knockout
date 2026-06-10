const express = require('express');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const crypto = require('crypto');

const router = express.Router();

// Generate QR code data for a match (returns a signed token)
router.get('/:matchId/qr',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: req.params.matchId },
        include: {
          tournament: { select: { name: true } },
          playerA: { select: { id: true, firstName: true, lastName: true } },
          playerB: { select: { id: true, firstName: true, lastName: true } },
          venueClub: { select: { id: true, name: true } },
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      // Generate a check-in token (HMAC signed)
      const secret = process.env.JWT_SECRET || 'default-secret';
      const payload = `${match.id}:${Date.now()}`;
      const token = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);

      const qrData = JSON.stringify({
        type: 'match-checkin',
        matchId: match.id,
        token,
        tournament: match.tournament.name,
        playerA: `${match.playerA?.firstName} ${match.playerA?.lastName}`,
        playerB: `${match.playerB?.firstName} ${match.playerB?.lastName}`,
        venue: match.venueClub?.name,
      });

      res.json({
        qrData,
        matchId: match.id,
        match,
      });
    } catch (err) {
      console.error('QR generation error:', err);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  }
);

// Check in to a match (scan QR at club)
router.post('/:matchId/checkin',
  authenticate,
  param('matchId').isUUID(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({
        where: { id: req.params.matchId },
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true } },
          playerB: { select: { id: true, firstName: true, lastName: true } },
          venueClub: { select: { id: true, name: true } },
          checkIns: true,
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can check in' });
      }

      // Create or update check-in
      const checkIn = await prisma.matchCheckIn.upsert({
        where: { matchId_playerId: { matchId: match.id, playerId: player.id } },
        update: {
          checkedInAt: new Date(),
          latitude: req.body.latitude || null,
          longitude: req.body.longitude || null,
          clubId: match.venueClubId,
        },
        create: {
          matchId: match.id,
          playerId: player.id,
          clubId: match.venueClubId,
          latitude: req.body.latitude || null,
          longitude: req.body.longitude || null,
        },
      });

      // Check if both players have checked in
      const allCheckIns = await prisma.matchCheckIn.findMany({
        where: { matchId: match.id },
      });

      const bothCheckedIn = allCheckIns.length >= 2;

      // Auto-start match if both players checked in and match is PENDING/SCHEDULED
      if (bothCheckedIn && ['PENDING', 'SCHEDULED'].includes(match.status)) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            status: 'IN_PROGRESS',
            matchStartedAt: new Date(),
            currentHole: 1,
          },
        });

        const io = req.app.get('io');
        if (io) {
          io.to(`match-${match.id}`).emit('match:started', {
            matchId: match.id,
            startedAt: new Date(),
            playerA: match.playerA,
            playerB: match.playerB,
            autoStarted: true,
          });
        }
      }

      // Emit check-in event
      const io = req.app.get('io');
      if (io) {
        io.to(`match-${match.id}`).emit('match:checkin', {
          matchId: match.id,
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          bothCheckedIn,
        });
      }

      res.json({
        checkIn,
        bothCheckedIn,
        matchAutoStarted: bothCheckedIn && ['PENDING', 'SCHEDULED'].includes(match.status),
      });
    } catch (err) {
      console.error('Check-in error:', err);
      res.status(500).json({ error: 'Failed to check in' });
    }
  }
);

// Get check-in status for a match
router.get('/:matchId/status',
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const checkIns = await prisma.matchCheckIn.findMany({
        where: { matchId: req.params.matchId },
        include: {
          player: { select: { id: true, firstName: true, lastName: true } },
          club: { select: { name: true } },
        },
        orderBy: { checkedInAt: 'asc' },
      });

      res.json({
        checkIns,
        bothCheckedIn: checkIns.length >= 2,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get check-in status' });
    }
  }
);

module.exports = router;
