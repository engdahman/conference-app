// pages/api/upload.js
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const form = formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024 })
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ success: false, message: err.message })

    const file = files.file
    if (!file) return res.status(400).json({ success: false, message: 'No file' })

    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.promises.mkdir(uploadsDir, { recursive: true })

      const ext = path.extname(file.originalFilename || '').toLowerCase() || '.png'
      const safeBase = (file.originalFilename || 'file')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .replace(/\.[^.]+$/, '')
      const name = `${Date.now()}-${safeBase}${ext}`

      const dest = path.join(uploadsDir, name)
      await fs.promises.copyFile(file.filepath, dest)

      // مهم: نعيد Path للويب
      return res.json({ success: true, path: `/uploads/${name}` })
    } catch (e) {
      return res.status(500).json({ success: false, message: 'File save failed: ' + e.message })
    }
  })
}
