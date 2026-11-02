import express from 'express';
import Student from '../models/Student.js';
import CreditTransaction from '../models/CreditTransaction.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/balance', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.user._id).select('credits');
    res.json({ credits: student.credits });
  } catch (err) {
    console.error('Get credits error:', err);
    res.status(500).json({ message: 'Failed to get credits' });
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { user: req.user._id };
    if (type) query.type = type;

    const transactions = await CreditTransaction.find(query)
      .populate('relatedSession', 'skill scheduledAt')
      .populate('relatedUser', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await CreditTransaction.countDocuments(query);

    res.json({ transactions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ message: 'Failed to get transactions' });
  }
});

router.post('/add-bonus', auth, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const student = await Student.findById(req.user._id);
    student.credits += amount;
    await student.save();

    await CreditTransaction.create({
      user: req.user._id,
      type: 'bonus_signup',
      amount,
      balanceAfter: student.credits,
      description: description || 'Bonus credits'
    });

    res.json({ credits: student.credits });
  } catch (err) {
    console.error('Add bonus error:', err);
    res.status(500).json({ message: 'Failed to add bonus' });
  }
});

export default router;