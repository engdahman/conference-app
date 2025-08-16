// pages/api/settings.js
import { dbConnect } from '@/lib/db'
import Settings from '@/models/Settings'

const normalizeWebPath = (v='') => {
  if (!v) return ''
  return v
    .toString()
    .trim()
    .replace(/\\/g, '/')                         // ويندوز -> '/'
    .replace(/^.*\/public(\/uploads\/)/, '$1')   // شطب أي public/
    .replace(/^https?:\/\/[^/]+(\/uploads\/)/, '$1') // شطب الهوست لو انحفظ مطلق
    .replace(/^uploads\//, '/uploads/')          // تأكيد البداية بـ /uploads/
}

const toPlain = (doc={}) => {
  if (!doc || typeof doc !== 'object') return doc
  const obj = { ...doc }
  if (obj._id?.toString) obj._id = obj._id.toString()
  for (const k in obj) if (obj[k] instanceof Date) obj[k] = obj[k].toISOString()
  return obj
}

export default async function handler(req, res) {
  await dbConnect()

  if (req.method === 'GET') {
    const doc = await Settings.findOne({}).lean()
    return res.json({ success: true, settings: doc ? toPlain(doc) : {} })
  }

  if (req.method === 'PUT') {
    const b = req.body || {}
    const update = {
      siteName: b.siteName || '',
      eventTitle: b.eventTitle || '',
      tagline: b.tagline || '',
      eventDateRangeText: b.eventDateRangeText || '',
      eventLocationText: b.eventLocationText || '',
      eventAddress: b.eventAddress || '',

      websiteUrl: b.websiteUrl || '',
      socialX: b.socialX || '',
      socialFacebook: b.socialFacebook || '',

      orgLogo: normalizeWebPath(b.orgLogo || ''),
      eventLogo: normalizeWebPath(b.eventLogo || ''),

      bannerEnabled: !!b.bannerEnabled,
      bannerImage: normalizeWebPath(b.bannerImage || ''),
      bannerLink: b.bannerLink || '',

      eventStartISO: b.eventStartISO || '',
      eventEndISO: b.eventEndISO || '',
      timezone: b.timezone || ''
    }

    const doc = await Settings.findOneAndUpdate({}, update, { upsert: true, new: true })
    return res.json({ success: true, settings: toPlain(doc.toObject()) })
  }

  return res.status(405).json({ success:false, message:'Method Not Allowed' })
}
