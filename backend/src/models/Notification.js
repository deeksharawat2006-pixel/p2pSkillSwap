import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  type: {
    type: String,
    enum: [
      'session_request', 'session_accepted', 'session_declined',
      'session_rescheduled', 'session_cancelled', 'session_reminder',
      'session_completed', 'new_message', 'rating_received', 'credit_earned'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  read: { type: Boolean, default: false },
  actionUrl: { type: String }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);