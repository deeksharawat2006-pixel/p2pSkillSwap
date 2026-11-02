import express from 'express';
import Review from '../models/Review.js';
import Session from '../models/Session.js';
import Notification from '../models/Notification.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { sessionId, rating, comment, categories } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.requester.equals(req.user._id)) return res.status(403).json({ message: 'Only requester can review' });
    if (session.status !== 'completed') return res.status(400).json({ message: 'Session not completed' });

    const existing = await Review.findOne({ session: sessionId });
    if (existing) return res.status(400).json({ message: 'Already reviewed' });

    const review = new Review({
      session: sessionId,
      reviewer: req.user._id,
      reviewee: session.provider,
      rating,
      comment,
      categories
    });

    await review.save();

    await Notification.create({
      recipient: session.provider,
      sender: req.user._id,
      type: 'rating_received',
      title: 'New Rating Received',
      message: `${req.user.name} rated your ${session.skill} session ${rating}/5`,
      relatedSession: sessionId,
      relatedUser: req.user._id,
      actionUrl: `/sessions/${sessionId}/review`
    });

    const populated = await Review.findById(review._id)
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const review = await Review.findOne({ session: req.params.sessionId })
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar')
      .lean();

    if (!review) return res.status(404).json({ message: 'No review found' });
    res.json(review);
  } catch (err) {
    console.error('Get review error:', err);
    res.status(500).json({ message: 'Failed to get review' });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name avatar')
      .populate('session', 'skill scheduledAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments({ reviewee: req.params.userId });
    res.json({ reviews, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get user reviews error:', err);
    res.status(500).json({ message: 'Failed to get reviews' });
  }
});

router.get('/my-reviews', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const reviews = await Review.find({ reviewer: req.user._id })
      .populate('reviewee', 'name avatar')
      .populate('session', 'skill scheduledAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments({ reviewer: req.user._id });
    res.json({ reviews, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get my reviews error:', err);
    res.status(500).json({ message: 'Failed to get reviews' });
  }
});

export default router;