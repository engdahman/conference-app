import mongoose from 'mongoose'

const AgendaItemSchema = new mongoose.Schema({
  day:     { type: String, required: true, trim: true },    // مثال: "المحطة الأولى — الجلسة الافتتاحية"
  date:    { type: String, default: '', trim: true },       // نص حر للتاريخ (اختياري)
  time:    { type: String, required: true, trim: true },    // "09:55 – 10:10"
  type:    { type: String, default: 'جلسة', trim: true },   // محاضرة/جلسة حوارية/استراحة...
  title:   { type: String, required: true, trim: true },    // عنوان الجلسة
  room:    { type: String, default: '', trim: true },
  speaker: { type: String, default: '', trim: true },
  order:   { type: Number, default: 0 },                    // للفرز اليدوي إن لزم
}, { timestamps: true, versionKey: false })

AgendaItemSchema.index({ day: 1, time: 1, order: 1 })

export default mongoose.models.AgendaItem || mongoose.model('AgendaItem', AgendaItemSchema)
