import express from 'express';
import { findMatches } from '../services/matchingService.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/matches', auth, async (req, res) => {
  try {
    const { limit = 10, minScore = 0.15 } = req.query;
    const matches = await findMatches(req.user.id, parseInt(limit));
    const filtered = matches.filter(m => m.matchScore >= parseFloat(minScore));
    res.json(filtered);
  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ message: 'Failed to find matches' });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const { skill, college, branch, page = 1, limit = 20 } = req.query;
    const query = { _id: { $ne: req.user.id }, isActive: true };

    if (skill) {
      query['skillsToTeach.name'] = { $regex: skill, $options: 'i' };
    }
    if (college) query.college = college;
    if (branch) query.branch = branch;

    const students = await Student.find(query)
      .select('-password -blockedUsers')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json(students);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search failed' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password').lean();
    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(student);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

export default router;