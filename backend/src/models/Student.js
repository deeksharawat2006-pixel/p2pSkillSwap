import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  proficiency: { type: Number, min: 1, max: 5, default: 3 },
  targetProficiency: { type: Number, min: 1, max: 5, default: 3 }
}, { _id: false });

const availabilitySlotSchema = new mongoose.Schema({
  day: { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], required: true },
  slots: [{ type: String, match: /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/ }]
}, { _id: false });

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  college: { type: String, required: true, trim: true },
  branch: { type: String, required: true, trim: true },
  year: { type: Number, required: true, min: 1, max: 5 },
  bio: { type: String, maxlength: 500 },
  avatar: { type: String },
  skillsToTeach: [skillSchema],
  skillsToLearn: [skillSchema],
  availability: [availabilitySlotSchema],
  avgRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  credits: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
}, { timestamps: true });

studentSchema.index({ 'skillsToTeach.name': 'text', 'skillsToLearn.name': 'text' });
studentSchema.index({ college: 1, branch: 1 });

studentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('Student', studentSchema);