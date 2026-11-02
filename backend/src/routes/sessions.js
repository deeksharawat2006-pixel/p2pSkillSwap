import express from 'express';
import Session from '../models/Session.js';
import Student from '../models/Student.js';
import Notification from '../models/Notification.js';
import CreditTransaction from '../models/CreditTransaction.js';
import auth from '../middleware/auth.js';

const router = express.Router();

const createNotification = async (recipientId, senderId, type, title, message, relatedSession, relatedUser, actionUrl) => {
  await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    relatedSession,
    relatedUser,
    actionUrl
  });
};

const createCreditTransaction = async (userId, type, amount, balanceAfter, relatedSession, relatedUser, description) => {
  await CreditTransaction.create({
    user: userId,
    type,
    amount,
    balanceAfter,
    relatedSession,
    relatedUser,
    description
  });
};

router.post('/', auth, async (req, res) => {
  try {
    const { providerId, skill, scheduledAt, duration, credits, notes } = req.body;

    if (!providerId || !skill || !scheduledAt) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const provider = await Student.findById(providerId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (provider._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot book session with yourself' });
    }

    const requester = await Student.findById(req.user._id);
    if (requester.credits < (credits || 10)) {
      return res.status(400).json({ message: 'Insufficient credits' });
    }

    const scheduled = new Date(scheduledAt);
    if (scheduled < new Date()) {
      return res.status(400).json({ message: 'Cannot schedule in the past' });
    }

    const existingSession = await Session.findOne({
      $or: [
        { requester: req.user._id, provider: providerId },
        { requester: providerId, provider: req.user._id }
      ],
      status: { $in: ['pending', 'accepted', 'rescheduled'] },
      scheduledAt: {
        $gte: new Date(scheduled.getTime() - duration * 60000),
        $lte: new Date(scheduled.getTime() + duration * 60000)
      }
    });

    if (existingSession) {
      return res.status(400).json({ message: 'Time slot conflicts with existing session' });
    }

    const session = new Session({
      requester: req.user._id,
      provider: providerId,
      skill,
      scheduledAt: scheduled,
      duration: duration || 60,
      credits: credits || 10,
      notes,
      meetingLink: `https://meet.peerlearn.app/session/${Date.now()}`
    });

    await session.save();

    requester.credits -= session.credits;
    await requester.save();

    await createCreditTransaction(
      req.user._id,
      'spent_learning',
      -session.credits,
      requester.credits,
      session._id,
      providerId,
      `Booked session to learn ${skill} from ${provider.name}`
    );

    await createNotification(
      providerId,
      req.user._id,
      'session_request',
      'New Session Request',
      `${requester.name} wants to learn ${skill} from you`,
      session._id,
      req.user._id,
      `/sessions/${session._id}`
    );

    const populated = await Session.findById(session._id)
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ message: 'Failed to create session' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {
      $or: [{ requester: req.user._id }, { provider: req.user._id }]
    };
    if (status) query.status = status;

    const sessions = await Session.find(query)
      .populate('requester', 'name avatar college branch')
      .populate('provider', 'name avatar college branch')
      .sort({ scheduledAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Session.countDocuments(query);

    res.json({ sessions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ message: 'Failed to get sessions' });
  }
});

router.get('/upcoming', auth, async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [{ requester: req.user._id }, { provider: req.user._id }],
      status: { $in: ['accepted', 'rescheduled'] },
      scheduledAt: { $gte: new Date() }
    })
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar')
      .sort({ scheduledAt: 1 })
      .limit(10)
      .lean();

    res.json(sessions);
  } catch (err) {
    console.error('Get upcoming sessions error:', err);
    res.status(500).json({ message: 'Failed to get upcoming sessions' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('requester', 'name avatar email college branch skillsToTeach skillsToLearn')
      .populate('provider', 'name avatar email college branch skillsToTeach skillsToLearn')
      .lean();

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.requester._id.equals(req.user._id) && !session.provider._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(session);
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ message: 'Failed to get session' });
  }
});

router.put('/:id/accept', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.provider.equals(req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    if (session.status !== 'pending') return res.status(400).json({ message: 'Session not pending' });

    session.status = 'accepted';
    await session.save();

    await createNotification(
      session.requester,
      req.user._id,
      'session_accepted',
      'Session Accepted',
      `${req.user.name} accepted your session request for ${session.skill}`,
      session._id,
      req.user._id,
      `/sessions/${session._id}`
    );

    const populated = await Session.findById(session._id)
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar');
    res.json(populated);
  } catch (err) {
    console.error('Accept session error:', err);
    res.status(500).json({ message: 'Failed to accept session' });
  }
});

router.put('/:id/decline', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.provider.equals(req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    if (session.status !== 'pending') return res.status(400).json({ message: 'Session not pending' });

    session.status = 'declined';
    await session.save();

    await createNotification(
      session.requester,
      req.user._id,
      'session_declined',
      'Session Declined',
      `${req.user.name} declined your session request for ${session.skill}`,
      session._id,
      req.user._id,
      `/matches`
    );

    const populated = await Session.findById(session._id)
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar');
    res.json(populated);
  } catch (err) {
    console.error('Decline session error:', err);
    res.status(500).json({ message: 'Failed to decline session' });
  }
});

router.put('/:id/reschedule', auth, async (req, res) => {
  try {
    const { scheduledAt, reason } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isRequester = session.requester.equals(req.user._id);
    const isProvider = session.provider.equals(req.user._id);
    if (!isRequester && !isProvider) return res.status(403).json({ message: 'Not authorized' });
    if (!['pending', 'accepted', 'rescheduled'].includes(session.status)) {
      return res.status(400).json({ message: 'Cannot reschedule this session' });
    }

    const scheduled = new Date(scheduledAt);
    if (scheduled < new Date()) return res.status(400).json({ message: 'Cannot schedule in the past' });

    session.rescheduleHistory.push({
      from: session.scheduledAt,
      to: scheduled,
      reason
    });
    session.scheduledAt = scheduled;
    session.status = 'rescheduled';
    await session.save();

    const otherId = isRequester ? session.provider : session.requester;
    await createNotification(
      otherId,
      req.user._id,
      'session_rescheduled',
      'Session Rescheduled',
      `${req.user.name} rescheduled your ${session.skill} session`,
      session._id,
      req.user._id,
      `/sessions/${session._id}`
    );

    const populated = await Session.findById(session._id)
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar');
    res.json(populated);
  } catch (err) {
    console.error('Reschedule session error:', err);
    res.status(500).json({ message: 'Failed to reschedule session' });
  }
});

router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isRequester = session.requester.equals(req.user._id);
    const isProvider = session.provider.equals(req.user._id);
    if (!isRequester && !isProvider) return res.status(403).json({ message: 'Not authorized' });
    if (session.status === 'completed') return res.status(400).json({ message: 'Cannot cancel completed session' });
    if (session.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

    session.status = 'cancelled';
    session.cancellationReason = reason;
    await session.save();

    const otherId = isRequester ? session.provider : session.requester;
    await createNotification(
      otherId,
      req.user._id,
      'session_cancelled',
      'Session Cancelled',
      `${req.user.name} cancelled your ${session.skill} session`,
      session._id,
      req.user._id,
      `/matches`
    );

    if (session.status === 'accepted' && isRequester) {
      const requester = await Student.findById(req.user._id);
      requester.credits += session.credits;
      await requester.save();

      await createCreditTransaction(
        req.user._id,
        'refund_cancelled',
        session.credits,
        requester.credits,
        session._id,
        session.provider,
        `Refund for cancelled session: ${session.skill}`
      );
    }

    const populated = await Session.findById(session._id)
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar');
    res.json(populated);
  } catch (err) {
    console.error('Cancel session error:', err);
    res.status(500).json({ message: 'Failed to cancel session' });
  }
});

router.put('/:id/complete', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.provider.equals(req.user._id)) return res.status(403).json({ message: 'Only provider can complete' });
    if (session.status !== 'accepted' && session.status !== 'rescheduled') {
      return res.status(400).json({ message: 'Session not in progress' });
    }

    session.status = 'completed';
    await session.save();

    const provider = await Student.findById(session.provider);
    const requester = await Student.findById(session.requester);

    provider.credits += session.credits;
    await provider.save();

    await createCreditTransaction(
      session.provider,
      'earned_teaching',
      session.credits,
      provider.credits,
      session._id,
      session.requester,
      `Earned credits for teaching ${session.skill} to ${requester.name}`
    );

    await createNotification(
      session.requester,
      req.user._id,
      'session_completed',
      'Session Completed',
      `Your ${session.skill} session with ${req.user.name} is complete`,
      session._id,
      req.user._id,
      `/sessions/${session._id}/review`
    );

    await createNotification(
      session.provider,
      req.user._id,
      'credit_earned',
      'Credits Earned',
      `You earned ${session.credits} credits for teaching ${session.skill}`,
      session._id,
      req.user._id,
      `/profile`
    );

    const populated = await Session.findById(session._id)
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar');
    res.json(populated);
  } catch (err) {
    console.error('Complete session error:', err);
    res.status(500).json({ message: 'Failed to complete session' });
  }
});

export default router;