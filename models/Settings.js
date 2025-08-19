// models/Settings.js
import mongoose from 'mongoose'

const SettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: '' },

  eventTitle: { type: String, default: '' },
  tagline: { type: String, default: '' },

  eventDateRangeText: { type: String, default: '' },
  eventLocationText: { type: String, default: '' },
  eventAddress: { type: String, default: '' },

  orgLogo: { type: String, default: '' },
  eventLogo: { type: String, default: '' },

  bannerEnabled: { type: Boolean, default: false },
  bannerImage: { type: String, default: '' },
  bannerLink:   { type: String, default: '' },

  // ✅ حقول زر "سجّل الآن"
  registrationMode: {
    type: String,
    enum: ['internal', 'external'],
    default: 'internal'
  },
  registrationUrl:   { type: String, default: '' },
  registrationNewTab:{ type: Boolean, default: false },

}, { timestamps: true })

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema)
