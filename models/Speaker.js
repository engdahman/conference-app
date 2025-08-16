// models/Speaker.js
import mongoose, { Schema } from 'mongoose'

const SpeakerSchema = new Schema(
  {
    name: String,
    title: String,
    talk: String,
    bio: String,
    photo: String,          // <— مهم
  },
  {
    timestamps: true,
    strict: false,          // يسمح بأي حقول إضافية مستقبلًا
  }
)

export default mongoose.models.Speaker || mongoose.model('Speaker', SpeakerSchema)
