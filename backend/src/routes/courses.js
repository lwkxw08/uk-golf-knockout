const express = require('express');
const router = express.Router();
const courseData = require('../services/courseDataProvider');

// GET /courses/search?q=...
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    const results = await courseData.searchCourses(q);
    res.json({ courses: results, provider: courseData.getProviderName() });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /courses/:courseId
router.get('/:courseId', async (req, res) => {
  try {
    const course = await courseData.getCourse(req.params.courseId);
    res.json({ ...course, provider: courseData.getProviderName() });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /courses/:courseId/tees
router.get('/:courseId/tees', async (req, res) => {
  try {
    const tees = await courseData.getCourseTees(req.params.courseId);
    res.json({ tees, provider: courseData.getProviderName() });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /courses/golfer/:golferID — WHS golfer lookup (England Golf only)
router.get('/golfer/:golferID', async (req, res) => {
  try {
    const result = await courseData.lookupGolfer(req.params.golferID);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
