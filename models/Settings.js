import mongoose, { Schema } from 'mongoose'

const SettingsSchema = new Schema(
  {
    siteName: String,
    eventTitle: String,
    tagline: String,
    eventDateRangeText: String,
    eventLocationText: String,
    eventAddress: String,

    websiteUrl: String,
    socialX: String,
    socialFacebook: String,

    orgLogo: String,     // /uploads/xxxx.png
    eventLogo: String,   // /uploads/xxxx.png

    bannerEnabled: { type: Boolean, default: false },
    bannerImage: String, // /uploads/xxxx.png
    bannerLink: String,

    eventStartISO: String,
    eventEndISO: String,
    timezone: String,
  },
  {
    timestamps: true,
    strict: false,       // عدم رمي خطأ لو أرسلت حقول إضافية
  }
)

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema)
