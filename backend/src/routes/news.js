const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Get published articles (public) or all articles (admin)
router.get('/', async (req, res) => {
  try {
    const showAll = req.query.all === 'true';
    let where = { published: true };

    if (showAll && req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        if (decoded.role === 'ADMIN') {
          where = {};
        }
      } catch {}
    }

    const articles = await prisma.newsArticle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ articles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const article = await prisma.newsArticle.findUnique({ where: { id: req.params.id } });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Create article (admin only)
router.post('/', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    const { title, summary, content, category, published } = req.body;
    const article = await prisma.newsArticle.create({
      data: {
        title,
        summary: summary || null,
        content,
        category: category || 'Announcement',
        published: published !== false,
        publishedAt: published !== false ? new Date() : null,
        authorId: req.user.id,
      }
    });
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Update article (admin only)
router.put('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    const { title, summary, content, category, published } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (summary !== undefined) data.summary = summary;
    if (content !== undefined) data.content = content;
    if (category !== undefined) data.category = category;
    if (published !== undefined) {
      data.published = published;
      if (published) data.publishedAt = new Date();
    }
    const article = await prisma.newsArticle.update({
      where: { id: req.params.id },
      data,
    });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete article (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    await prisma.newsArticle.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;
