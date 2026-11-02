import express from 'express';
import Student from '../models/Student.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  res.json(req.user);
});

router.put('/', auth, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'bio', 'avatar', 'college', 'branch', 'year', 'skillsToTeach', 'skillsToLearn', 'availability'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
    }

    const student = await Student.findByIdAndUpdate(req.user.id, filteredUpdates, { new: true, runValidators: true }).select('-password');
    res.json(student);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.put('/skills/teach', auth, async (req, res) => {
  try {
    const { skillsToTeach } = req.body;
    const student = await Student.findByIdAndUpdate(req.user.id, { skillsToTeach }, { new: true, runValidators: true }).select('-password');
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update teaching skills' });
  }
});

router.put('/skills/learn', auth, async (req, res) => {
  try {
    const { skillsToLearn } = req.body;
    const student = await Student.findByIdAndUpdate(req.user.id, { skillsToLearn }, { new: true, runValidators: true }).select('-password');
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update learning skills' });
  }
});

router.put('/availability', auth, async (req, res) => {
  try {
    const { availability } = req.body;
    const student = await Student.findByIdAndUpdate(req.user.id, { availability }, { new: true, runValidators: true }).select('-password');
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update availability' });
  }
});

export default router;