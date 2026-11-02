import mongoose from 'mongoose';

const creditTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: {
    type: String,
    enum: ['earned_teaching', 'spent_learning', 'bonus_signup', 'bonus_referral', 'refund_cancelled', 'admin_adjustment'],
    required: true
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  relatedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  description: { type: String, required: true }
}, { timestamps: true });

creditTransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('CreditTransaction', creditTransactionSchema);