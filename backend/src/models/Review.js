import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  categories: {
    clarity: { type: Number, min: 1, max: 5 },
    patience: { type: Number, min: 1, max: 5 },
    knowledge: { type: Number, min: 1, max: 5 },
    punctuality: { type: Number, min: 1, max: 5 }
  }
}, { timestamps: true });

reviewSchema.index({ reviewee: 1, createdAt: -1 });

reviewSchema.post('save', async function() {
  const Student = mongoose.model('Student');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { reviewee: this.reviewee } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  if (stats.length > 0) {
    await Student.findByIdAndUpdate(this.reviewee, {
      avgRating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count
    });
  }
});

export default mongoose.model('Review', reviewSchema);