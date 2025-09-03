import mongoose, { Schema } from 'mongoose'

const CommitteeMemberSchema = new Schema({
  name:  { type: String, required: true, trim: true },
  title: { type: String, trim: true }, // الصفة/الدور
  bio:   { type: String, trim: true },
  photo: { type: String, trim: true }, // يُخزن كمسار جذري /uploads/...
  order: { type: Number, default: 0 }, // ترتيب اختياري للفرز
}, { timestamps: true })

export default mongoose.models.CommitteeMember
  || mongoose.model('CommitteeMember', CommitteeMemberSchema)
