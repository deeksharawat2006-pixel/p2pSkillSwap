import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  skill: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'rescheduled', 'cancelled', 'completed'],
    default: 'pending'
  },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 60, min: 15, max: 180 },
  credits: { type: Number, default: 10, min: 1 },
  meetingLink: { type: String },
  notes: { type: String },
  cancellationReason: { type: String },
  rescheduleHistory: [{
    from: Date,
    to: Date,
    reason: String,
    at: { type: Date, default: Date.now }
  }],
  completedAt: { type: Date }
}, { timestamps: true });

sessionSchema.index({ requester: 1, status: 1 });
sessionSchema.index({ provider: 1, status: 1 });
sessionSchema.index({ scheduledAt: 1 });

sessionSchema.pre('save', async function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

export default mongoose.model('Session', sessionSchema);