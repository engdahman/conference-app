import { useRef, useState } from 'react'

function Uploader({ onUploaded }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const upload = async () => {
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      let payload = null
      try { payload = await r.json() } catch (_) {}

      if (!r.ok || !payload?.success) {
        const statusMsg = (() => {
          switch (r.status) {
            case 401: return 'غير مصرح: تأكد من تسجيل الدخول/الصلاحيات'
            case 413: return 'الملف كبير جدًا. صغّر الصورة أو قلل الجودة.'
            case 415: return 'نوع الملف غير مدعوم.'
            case 500: return 'خطأ في الخادم أثناء الحفظ.'
            default:  return null
          }
        })()

        const msg = payload?.message || statusMsg || r.statusText || 'فشل الرفع'
        alert('فشل الرفع: ' + msg)
        return
      }

      onUploaded && onUploaded(payload.path)

      // إعادة ضبط الحقل بعد النجاح
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      alert('فشل الرفع: ' + (e.message || 'تعذّر الاتصال بالخادم'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button className="btn" onClick={upload} disabled={loading || !file}>
        {loading ? 'جاري الرفع…' : 'رفع'}
      </button>
    </div>
  )
}

export default Uploader
