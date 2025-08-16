// pages/checkin.js
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'

export default function CheckInPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('idle') // idle | busy | ok | already | notfound | missing | error
  const [msg, setMsg] = useState('')
  const [att, setAtt] = useState(null)

  // ماسح QR
  const [scanOn, setScanOn] = useState(false)
  const [scanErr, setScanErr] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)

  const inputRef = useRef(null)

  function onChange(e) {
    setQ(e.target.value)
    if (status !== 'busy') { setStatus('idle'); setMsg('') }
  }
  function onKeyDown(e) {
    if (e.key === 'Enter') submit(e)
  }

  // داخل submit
async function submit(e, overrideValue) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault()
  const code = String(((overrideValue ?? q) || '')).trim()
  setAtt(null); setMsg('')

    if (!code) {
      setStatus('missing')
      setMsg('أدخل الكود أو الإيميل/الجوال أولاً')
      return
    }

    setStatus('busy')
    try {
      const r = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      })
      const d = await r.json().catch(() => ({}))

      if (!r.ok || !d?.success) {
        if (d?.error === 'not_found') {
          setStatus('notfound'); setMsg('لا يوجد سجل مطابق')
        } else if (d?.error === 'missing' || d?.error === 'missing_code' || d?.error === 'bad_input') {
          setStatus('missing'); setMsg('المدخل غير صالح أو مفقود')
        } else if (r.status === 401 || r.status === 403 || d?.error === 'forbidden') {
          setStatus('error'); setMsg('يلزم تسجيل الدخول كـ Admin/Staff')
        } else {
          setStatus('error'); setMsg(d?.error || 'خطأ غير متوقع')
        }
        return
      }

      setAtt(d.attendee)
      setStatus(d.already ? 'already' : 'ok')
      setMsg(d.already ? 'تم تسجيل الدخول مسبقًا' : 'تم تسجيل الدخول بنجاح ✓')
      setQ('')
      inputRef.current?.focus()
    } catch (e2) {
      setStatus('error'); setMsg(e2.message || 'network_error')
    }
  }

  // ➊ التلقّط من رابط عند فتحه من الكاميرا (بدون HTTPS)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    const codeParam =
      u.searchParams.get('code') ||
      u.searchParams.get('ticket') ||
      u.searchParams.get('t')
    if (codeParam) {
      const val = decodeURIComponent(codeParam)
      // نظّف الاستعلام كي لا يُعاد التنفيذ عند الرجوع
      window.history.replaceState({}, '', u.pathname)
      // نفّذ التحقق مباشرة
      submit(null, val)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ➋ ماسح QR داخل الصفحة (يحتاج HTTPS أو localhost)
  async function startScan() {
    setScanErr('')
    if (!navigator?.mediaDevices?.getUserMedia) {
      setScanErr('المتصفح لا يدعم الكاميرا')
      return
    }
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setScanErr('فتح الكاميرا يتطلب HTTPS أو localhost')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanOn(true)

      // استخدم BarcodeDetector إن توفر
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const loop = async () => {
          if (!videoRef.current || !scanOn) return
          try {
            const codes = await detector.detect(videoRef.current)
            const raw = codes?.[0]?.rawValue
            if (raw) {
              await stopScan()
              setQ(raw)
              submit(null, raw)
              return
            }
          } catch {}
          rafRef.current = requestAnimationFrame(loop)
        }
        loop()
      } else {
        setScanErr('ماسح QR غير مدعوم في هذا المتصفح. استخدم الكاميرا العادية لمسح رابط الكود.')
      }
    } catch (e) {
      setScanErr(e?.message || 'تعذر فتح الكاميرا')
    }
  }

  async function stopScan() {
    cancelAnimationFrame(rafRef.current)
    setScanOn(false)
    try {
      const tracks = streamRef.current?.getTracks?.() || []
      tracks.forEach(t => t.stop())
    } catch {}
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => () => { stopScan() }, []) // تنظيف عند الخروج

  return (
    <main dir="rtl" style={{display:'grid',placeItems:'center',minHeight:'80vh',padding:16}}>
      <form onSubmit={submit} style={{background:'#fff',border:'1px solid #eee',borderRadius:12,padding:16,minWidth:320, maxWidth:560}}>
        <h3 style={{marginTop:0}}>(Check-in) واجهة تسجيل الدخول</h3>
        <div className="muted" style={{marginBottom:8,fontSize:13}}>
          امسح QR أو اكتب الكود/الإيميل/الجوال ثم اضغط تأكيد.
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input
            ref={inputRef}
            className="input"
            placeholder="مثال: 9665… أو email@x.com أو TKT-ABC0123"
            value={q}
            onChange={onChange}
            onKeyDown={onKeyDown}
            autoFocus
            style={{flex:1}}
          />
          {!scanOn
            ? <button type="button" className="btn" onClick={startScan}>مسح QR</button>
            : <button type="button" className="btn" onClick={stopScan}>إيقاف</button>
          }
        </div>

        {scanOn && (
          <div style={{marginTop:10}}>
            <video ref={videoRef} playsInline muted style={{width:'100%',borderRadius:10,border:'1px solid #e5e7eb'}} />
            {scanErr && <div style={{marginTop:6,color:'#b91c1c',fontSize:13}}>{scanErr}</div>}
          </div>
        )}

        <button className="btn primary" type="submit" disabled={status==='busy'} style={{marginTop:10}}>
          {status==='busy' ? 'جاري التحقق…' : 'تأكيد'}
        </button>

        {status!=='idle' && msg && (
          <div style={{marginTop:10, color: status==='ok' || status==='already' ? '#15803d' : '#b91c1c'}}>
            {msg}
          </div>
        )}

        {att && (
          <div style={{marginTop:10, background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:10, padding:10}}>
            <div><strong>الاسم:</strong> {att.fullName || '—'}</div>
            <div><strong>الكود:</strong> {att.ticketCode || '—'}</div>
            <div><strong>الدخول:</strong> {att.checkedIn ? '✓' : '—'}</div>
          </div>
        )}

        <style jsx>{`
          .input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin:6px 0}
          .btn{border:1px solid #d1d5db;background:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
          .btn.primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
          .btn:disabled{opacity:.7;cursor:default}
          .muted{color:#6b7280}
        `}</style>
      </form>
    </main>
  )
}
