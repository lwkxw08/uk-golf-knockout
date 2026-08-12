const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Get photos for a club (public)
router.get('/club/:clubId', async (req, res) => {
  try {
    const { holeNumber, featured, page = 1, limit = 20 } = req.query;
    const where = { clubId: req.params.clubId };
    if (holeNumber) where.holeNumber = Number(holeNumber);
    if (featured === 'true') where.isFeatured = true;

    const [photos, total] = await Promise.all([
      prisma.coursePhoto.findMany({
        where,
        include: {
          uploadedBy: { select: { firstName: true, lastName: true, avatarUrl: true } },
          club: { select: { name: true, par: true } },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: [{ isFeatured: 'desc' }, { likes: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.coursePhoto.count({ where }),
    ]);

    res.json({ photos, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Gallery fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Get photos grouped by hole for a club
router.get('/club/:clubId/by-hole', async (req, res) => {
  try {
    const photos = await prisma.coursePhoto.findMany({
      where: { clubId: req.params.clubId, holeNumber: { not: null } },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ holeNumber: 'asc' }, { isFeatured: 'desc' }, { likes: 'desc' }],
    });

    const byHole = {};
    photos.forEach((p) => {
      if (!byHole[p.holeNumber]) byHole[p.holeNumber] = [];
      byHole[p.holeNumber].push(p);
    });

    res.json({ byHole });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch photos by hole' });
  }
});

// Upload a photo (player or club manager)
router.post('/club/:clubId',
  authenticate,
  body('imageUrl').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      const { imageUrl, holeNumber, caption } = req.body;

      const photo = await prisma.coursePhoto.create({
        data: {
          clubId: req.params.clubId,
          imageUrl,
          holeNumber: holeNumber ? Number(holeNumber) : null,
          caption: caption || null,
          uploadedById: player?.id || null,
        },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      });

      res.status(201).json(photo);
    } catch (err) {
      console.error('Photo upload error:', err);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }
);

// Like a photo
router.post('/:photoId/like', optionalAuth, async (req, res) => {
  try {
    const photo = await prisma.coursePhoto.update({
      where: { id: req.params.photoId },
      data: { likes: { increment: 1 } },
    });
    res.json({ likes: photo.likes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to like photo' });
  }
});

// Feature/unfeature a photo (admin/club manager)
router.put('/:photoId/feature', authenticate, async (req, res) => {
  try {
    const photo = await prisma.coursePhoto.findUnique({ where: { id: req.params.photoId } });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    if (req.user.role !== 'ADMIN') {
      const mgr = await prisma.clubManager.findFirst({
        where: { userId: req.user.id, clubId: photo.clubId },
      });
      if (!mgr) return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.coursePhoto.update({
      where: { id: req.params.photoId },
      data: { isFeatured: !photo.isFeatured },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

// Delete a photo
router.delete('/:photoId', authenticate, async (req, res) => {
  try {
    const photo = await prisma.coursePhoto.findUnique({ where: { id: req.params.photoId } });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    const isOwner = player && photo.uploadedById === player.id;
    const isAdmin = req.user.role === 'ADMIN';
    const isMgr = await prisma.clubManager.findFirst({ where: { userId: req.user.id, clubId: photo.clubId } });

    if (!isOwner && !isAdmin && !isMgr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.coursePhoto.delete({ where: { id: req.params.photoId } });
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
