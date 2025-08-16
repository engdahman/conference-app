// models/Attendee.js
import mongoose, { Schema } from 'mongoose';

const AttendeeSchema = new Schema({
  fullName: { type: String, required: true },
  phone:    { type: String, required: true },
  email:    { type: String, required: true, lowercase: true, trim: true },
  workStatus: { type: String, enum: ['employed','unemployed','student'], default: 'unemployed' },
  jobTitle:  String,
  org:       String,
  sector:    String,
  gender:    { type: String, enum: ['male','female','other'], default: 'male' },
  birthDate: Date,
  gradYear:  String,

  // حضور
  checkedIn: { type: Boolean, default: false },
  checkinAt: Date,

  // رمز تتبّع بسيط في الـQR
  qrToken:   { type: String, index: true },

  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

// فريد بالبريد لتفادي التكرار
AttendeeSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.Attendee || mongoose.model('Attendee', AttendeeSchema);
