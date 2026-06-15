const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { uploadFile, isStorageConfigured } = require('../services/uploadService');

const router = express.Router();

// Multer config for media uploads (images: 5MB, videos: 50MB)
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM'));
  },
});

// ─── MEDIA UPLOAD ENDPOINT ────────────────────────────────────────────────

router.post('/upload-media', authenticate, mediaUpload.array('media', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const urls = [];
    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith('video/');
      const folder = isVideo ? 'social/videos' : 'social/images';

      // Try R2 first, fallback to base64
      let url;
      if (isStorageConfigured()) {
        url = await uploadFile(file, folder);
      } else {
        // Base64 fallback for dev mode
        const base64 = file.buffer.toString('base64');
        url = `data:${file.mimetype};base64,${base64}`;
      }

      urls.push({
        url,
        type: isVideo ? 'video' : 'image',
        name: file.originalname,
        size: file.size,
      });
    }

    res.json({ media: urls });
  } catch (err) {
    console.error('Media upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload media' });
  }
});

// ─── PLAYER POSTS ─────────────────────────────────────────────────────────

// Create a post
router.post('/posts',
  authenticate,
  body('content').isString().isLength({ min: 1, max: 2000 }),
  body('images').optional().isArray(),
  body('media').optional().isArray(),
  body('taggedClubId').optional().isUUID(),
  body('taggedTournamentId').optional().isUUID(),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      // Support both legacy 'images' (array of URLs) and new 'media' (array of {url, type})
      let mediaData = null;
      if (req.body.media && req.body.media.length > 0) {
        mediaData = req.body.media; // [{url, type, name, size}]
      } else if (req.body.images && req.body.images.length > 0) {
        mediaData = req.body.images.map(url => ({ url, type: 'image' }));
      }

      const post = await prisma.playerPost.create({
        data: {
          playerId: player.id,
          content: req.body.content,
          images: mediaData,
          taggedClubId: req.body.taggedClubId || null,
          taggedTournamentId: req.body.taggedTournamentId || null,
        },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } },
        },
      });

      res.status(201).json(post);
    } catch (err) {
      console.error('Create post error:', err);
      res.status(500).json({ error: 'Failed to create post' });
    }
  }
);

// Get posts feed (following + own posts, or global)
router.get('/posts/feed', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(400).json({ error: 'Player profile required' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get IDs of people I follow
    const following = await prisma.playerFollow.findMany({
      where: { followerId: player.id },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);
    followingIds.push(player.id); // Include own posts

    const [posts, total] = await Promise.all([
      prisma.playerPost.findMany({
        where: { playerId: { in: followingIds } },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } },
          likes: { where: { playerId: player.id }, select: { id: true } },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.playerPost.count({ where: { playerId: { in: followingIds } } }),
    ]);

    const enriched = posts.map(p => ({ ...p, isLiked: p.likes.length > 0 }));
    res.json({ posts: enriched, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to load feed' });
  }
});

// Get global/discover posts
router.get('/posts/discover', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
      prisma.playerPost.findMany({
        include: {
          player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } },
          comments: {
            take: 2,
            orderBy: { createdAt: 'desc' },
            include: { player: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.playerPost.count(),
    ]);

    res.json({ posts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

// Get posts by player (for their profile page)
router.get('/posts/player/:playerId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
      prisma.playerPost.findMany({
        where: { playerId: req.params.playerId },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.playerPost.count({ where: { playerId: req.params.playerId } }),
    ]);

    res.json({ posts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

// Like/unlike a post
router.post('/posts/:id/like', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(400).json({ error: 'Player profile required' });

    const existing = await prisma.postLike.findUnique({
      where: { postId_playerId: { postId: req.params.id, playerId: player.id } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      await prisma.playerPost.update({ where: { id: req.params.id }, data: { likesCount: { decrement: 1 } } });
      return res.json({ liked: false });
    }

    await prisma.postLike.create({ data: { postId: req.params.id, playerId: player.id } });
    await prisma.playerPost.update({ where: { id: req.params.id }, data: { likesCount: { increment: 1 } } });
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Comment on a post
router.post('/posts/:id/comment',
  authenticate,
  body('content').isString().isLength({ min: 1, max: 500 }),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const comment = await prisma.postComment.create({
        data: { postId: req.params.id, playerId: player.id, content: req.body.content },
        include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      });

      await prisma.playerPost.update({ where: { id: req.params.id }, data: { commentsCount: { increment: 1 } } });
      res.status(201).json(comment);
    } catch (err) {
      res.status(500).json({ error: 'Failed to comment' });
    }
  }
);

// Get all comments for a post
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const comments = await prisma.postComment.findMany({
      where: { postId: req.params.id },
      include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// Delete a post (own post only)
router.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    const post = await prisma.playerPost.findUnique({ where: { id: req.params.id } });
    if (!post || post.playerId !== player?.id) return res.status(403).json({ error: 'Not your post' });

    await prisma.playerPost.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ─── FOLLOW SYSTEM ────────────────────────────────────────────────────────

// Follow a player
router.post('/follow/:playerId', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(400).json({ error: 'Player profile required' });
    if (player.id === req.params.playerId) return res.status(400).json({ error: 'Cannot follow yourself' });

    const existing = await prisma.playerFollow.findUnique({
      where: { followerId_followingId: { followerId: player.id, followingId: req.params.playerId } },
    });

    if (existing) {
      await prisma.playerFollow.delete({ where: { id: existing.id } });
      return res.json({ following: false });
    }

    await prisma.playerFollow.create({ data: { followerId: player.id, followingId: req.params.playerId } });
    res.json({ following: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to follow/unfollow' });
  }
});

// Get my following list
router.get('/following', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.json({ following: [] });

    const following = await prisma.playerFollow.findMany({
      where: { followerId: player.id },
      include: { following: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true, homeClub: { select: { name: true } } } } },
    });
    res.json({ following: following.map(f => f.following) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load following' });
  }
});

// Get my followers
router.get('/followers', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.json({ followers: [] });

    const followers = await prisma.playerFollow.findMany({
      where: { followingId: player.id },
      include: { follower: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true, homeClub: { select: { name: true } } } } },
    });
    res.json({ followers: followers.map(f => f.follower) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load followers' });
  }
});

// ─── PLAYER PUBLIC PROFILE ────────────────────────────────────────────────

router.get('/profile/:playerId', async (req, res) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.playerId },
      select: {
        id: true, firstName: true, lastName: true, avatarUrl: true,
        handicapIndex: true, rankingPoints: true, membershipType: true, createdAt: true,
        homeClub: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Stats
    const [matchesPlayed, matchesWon, followersCount, followingCount, postsCount] = await Promise.all([
      prisma.match.count({ where: { OR: [{ playerAId: player.id }, { playerBId: player.id }], status: 'COMPLETED' } }),
      prisma.match.count({ where: { winnerId: player.id } }),
      prisma.playerFollow.count({ where: { followingId: player.id } }),
      prisma.playerFollow.count({ where: { followerId: player.id } }),
      prisma.playerPost.count({ where: { playerId: player.id } }),
    ]);

    // Recent match results (last 5)
    const recentMatches = await prisma.match.findMany({
      where: { OR: [{ playerAId: player.id }, { playerBId: player.id }], status: 'COMPLETED' },
      include: {
        playerA: { select: { id: true, firstName: true, lastName: true } },
        playerB: { select: { id: true, firstName: true, lastName: true } },
        tournament: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Check if authenticated user is following
    let isFollowing = false;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const viewer = await prisma.player.findUnique({ where: { userId: decoded.id } });
        if (viewer && viewer.id !== player.id) {
          const follow = await prisma.playerFollow.findUnique({
            where: { followerId_followingId: { followerId: viewer.id, followingId: player.id } },
          });
          isFollowing = !!follow;
        }
      } catch {}
    }

    res.json({
      ...player,
      stats: { matchesPlayed, matchesWon, winRate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0, followersCount, followingCount, postsCount },
      recentMatches,
      isFollowing,
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Search players (for follow discovery)
router.get('/players/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ players: [] });

    const players = await prisma.player.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true, homeClub: { select: { name: true } } },
      take: 20,
    });
    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── OPEN TEE TIMES (Share a Round) ──────────────────────────────────────

// Create open tee time
router.post('/tee-times',
  authenticate,
  body('teeTime').isISO8601(),
  body('courseName').optional().isString(),
  body('clubId').optional().isUUID(),
  body('spotsAvailable').optional().isInt({ min: 1, max: 3 }),
  body('greenFeePence').optional().isInt({ min: 0 }),
  body('notes').optional().isString().isLength({ max: 500 }),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const teeTime = await prisma.openTeeTime.create({
        data: {
          posterId: player.id,
          clubId: req.body.clubId || null,
          courseName: req.body.courseName || null,
          teeTime: new Date(req.body.teeTime),
          spotsAvailable: req.body.spotsAvailable || 1,
          greenFeePence: req.body.greenFeePence || null,
          notes: req.body.notes || null,
        },
        include: {
          poster: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } },
          club: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(teeTime);
    } catch (err) {
      console.error('Create tee time error:', err);
      res.status(500).json({ error: 'Failed to create tee time' });
    }
  }
);

// List open tee times
router.get('/tee-times', async (req, res) => {
  try {
    const { page = 1, limit = 20, clubId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'OPEN', teeTime: { gt: new Date() } };
    if (clubId) where.clubId = clubId;

    const [teeTimes, total] = await Promise.all([
      prisma.openTeeTime.findMany({
        where,
        include: {
          poster: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } },
          club: { select: { id: true, name: true } },
          interests: {
            include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } } },
          },
        },
        orderBy: { teeTime: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.openTeeTime.count({ where }),
    ]);

    res.json({ teeTimes, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load tee times' });
  }
});

// Express interest in a tee time
router.post('/tee-times/:id/interest',
  authenticate,
  body('message').optional().isString().isLength({ max: 300 }),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const teeTime = await prisma.openTeeTime.findUnique({ where: { id: req.params.id } });
      if (!teeTime) return res.status(404).json({ error: 'Tee time not found' });
      if (teeTime.posterId === player.id) return res.status(400).json({ error: 'Cannot express interest in your own tee time' });
      if (teeTime.status !== 'OPEN') return res.status(400).json({ error: 'Tee time is no longer open' });

      const existing = await prisma.teeTimeInterest.findUnique({
        where: { teeTimeId_playerId: { teeTimeId: req.params.id, playerId: player.id } },
      });
      if (existing) return res.status(409).json({ error: 'Already expressed interest' });

      const interest = await prisma.teeTimeInterest.create({
        data: { teeTimeId: req.params.id, playerId: player.id, message: req.body.message || null },
        include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } } },
      });

      res.status(201).json(interest);
    } catch (err) {
      res.status(500).json({ error: 'Failed to express interest' });
    }
  }
);

// Accept an interest (poster only)
router.post('/tee-times/:id/accept/:interestId', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(400).json({ error: 'Player profile required' });

    const teeTime = await prisma.openTeeTime.findUnique({ where: { id: req.params.id } });
    if (!teeTime || teeTime.posterId !== player.id) return res.status(403).json({ error: 'Not your tee time' });

    // Accept the interest
    await prisma.teeTimeInterest.update({
      where: { id: req.params.interestId },
      data: { status: 'ACCEPTED' },
    });

    // Decline all other pending interests
    await prisma.teeTimeInterest.updateMany({
      where: { teeTimeId: req.params.id, id: { not: req.params.interestId }, status: 'PENDING' },
      data: { status: 'DECLINED' },
    });

    // Check if all spots filled
    const acceptedCount = await prisma.teeTimeInterest.count({
      where: { teeTimeId: req.params.id, status: 'ACCEPTED' },
    });

    if (acceptedCount >= teeTime.spotsAvailable) {
      await prisma.openTeeTime.update({ where: { id: req.params.id }, data: { status: 'FILLED' } });
    }

    res.json({ message: 'Interest accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept' });
  }
});

// Cancel a tee time (poster only)
router.post('/tee-times/:id/cancel', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    const teeTime = await prisma.openTeeTime.findUnique({ where: { id: req.params.id } });
    if (!teeTime || teeTime.posterId !== player?.id) return res.status(403).json({ error: 'Not your tee time' });

    await prisma.openTeeTime.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json({ message: 'Tee time cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// Get my tee times (posted by me)
router.get('/tee-times/mine', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.json({ teeTimes: [] });

    const teeTimes = await prisma.openTeeTime.findMany({
      where: { posterId: player.id },
      include: {
        club: { select: { id: true, name: true } },
        interests: {
          include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, handicapIndex: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ teeTimes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load' });
  }
});

module.exports = router;
