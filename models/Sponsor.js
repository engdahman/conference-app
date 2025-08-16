// models/Sponsor.js
import mongoose, { Schema } from 'mongoose'

const SponsorSchema = new Schema(
  {
    name: String,
    logo: String,           // <— مهم
    url: String,
    tier: String,
    description: String,
  },
  {
    timestamps: true,
    strict: false,
  }
)

export default mongoose.models.Sponsor || mongoose.model('Sponsor', SponsorSchema)
