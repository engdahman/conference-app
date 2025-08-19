// pages/api/settings.js
import { dbConnect } from '@/lib/db'
import Settings from '@/models/Settings'

function asBool(v){
  const s = String(v ?? '').trim().toLowerCase()
  return v === true || v === 1 || v === '1' || s === 'true' || s === 'on' || s === 'yes'
}
function rootPath(src=''){
  if (!src) return ''
  let s = String(src).trim().replace(/\\/g,'/')
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('/')) return s
  return '/' + s.replace(/^\.?\/+/, '')
}

export default async function handler(req, res){
  await dbConnect()

  if (req.method === 'GET') {
    const doc = await Settings.findOne({}).lean()
    return res.json({ success: true, settings: doc || {} })
  }

  if (req.method === 'PUT') {
    try {
      const b = req.body || {}

      // نسمح فقط بهذه الحقول (تجاهُل أي شيء غريب)
      const clean = {
        siteName: String(b.siteName || ''),
        eventTitle: String(b.eventTitle || ''),
        tagline: String(b.tagline || ''),

        eventDateRangeText: String(b.eventDateRangeText || ''),
        eventLocationText: String(b.eventLocationText || ''),
        eventAddress: String(b.eventAddress || ''),

        orgLogo: rootPath(b.orgLogo || ''),
        eventLogo: rootPath(b.eventLogo || ''),

        bannerEnabled: asBool(b.bannerEnabled),
        bannerImage: rootPath(b.bannerImage || ''),
        bannerLink: String(b.bannerLink || ''),

        // ✅ الحقول الجديدة
        registrationMode: (String(b.registrationMode || 'internal').toLowerCase() === 'external') ? 'external' : 'internal',
        registrationUrl: String(b.registrationUrl || '').trim(),
        registrationNewTab: asBool(b.registrationNewTab),
      }

      // إن لم يكن الرابط صالحًا، اجبر الوضع على داخلي
      if (clean.registrationMode === 'external' && !/^https?:\/\//i.test(clean.registrationUrl)) {
        clean.registrationMode = 'internal'
      }

      const saved = await Settings.findOneAndUpdate(
        {},
        { $set: clean },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean()

      return res.json({ success: true, settings: saved })
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message || 'server_error' })
    }
  }

  res.setHeader('Allow', ['GET','PUT'])
  return res.status(405).json({ success:false, error: 'method_not_allowed' })
}
