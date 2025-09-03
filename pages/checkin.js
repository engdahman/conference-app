// pages/checkin.js
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

function AuthBar({ afterLogout = '/admin/login?next=/checkin' }) {
  const [user, setUser] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials:'include', headers:{Accept:'application/json'} })
        const d = await r.json().catch(() => null)
        if (!ignore && r.ok && d?.ok) setUser(d.user || null)
      } catch {}
    })()
    return () => { ignore = true }
  }, [])
  async function logout(){ setBusy(true); try{ await fetch('/api/auth/logout',{method:'POST',credentials:'include'}) }catch{} window.location.href = afterLogout }
  return (
    <div className="authbar" dir="rtl">
      <div className="info">
        {user ? (
          <>
            <span>مسجّل باسم:</span>
            <b style={{marginInlineStart:6}}>{user.email}</b>
            {Array.isArray(user.roles)&&user.roles.length ? <span className="roles"> — {user.roles.join(', ')}</span> : null}
          </>
        ) : (
          <>
            <span>غير مسجّل دخول.</span>
            <a className="btn" href="/admin/login?next=/checkin" style={{marginInlineStart:10}}>تسجيل الدخول</a>
          </>
        )}
      </div>
      <div className="actions">
        <a className="btn" href="/admin/login?next=/checkin">تبديل مستخدم</a>
        <button className="btn" onClick={logout} disabled={busy}>{busy?'...':'تسجيل الخروج'}</button>
      </div>
      <style jsx>{`
        .authbar{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;margin:0 auto 12px;max-width:720px}
        .btn{border:1px solid #d1d5db;background:#fff;padding:6px 10px;border-radius:8px;cursor:pointer;text-decoration:none}
        .btn:hover{background:#f3f4f6}
        .roles{color:#6b7280}
        .actions{display:flex;gap:8px;align-items:center}
      `}</style>
    </div>
  )
}

/* === استخراج الكود من أي نص/رابط ممسوح === */
function parseRawInput(raw) {
  if (!raw) return ''
  let s = String(raw).trim()
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      const q = u.searchParams.get('code') || u.searchParams.get('ticket') || u.searchParams.get('t')
      if (q) return q.trim()
      const parts = u.pathname.split('/').filter(Boolean)
      const last = parts[parts.length-1]
      if (last && /[A-Za-z0-9-]{4,}/.test(last)) return last
    }
  } catch {}
  const m1 = s.match(/(?:^|\s)(?:TICKET|CODE|TKT)\s*[:=]\s*([A-Za-z0-9-]{4,})/i)
  if (m1) return m1[1]
  const m2 = s.match(/(?:^|[^A-Z0-9-])(TKT-[A-Z0-9-]+|[A-Z0-9]{5,})(?:[^A-Z0-9-]|$)/i)
  if (m2) return m2[1]
  return s
}

/* ==================== ماسح QR عبر ZXing (CDN) ==================== */
function ZxingQrScanner({ onResult, zxingReady }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [supported, setSupported] = useState(false)
  const [libReady, setLibReady] = useState(false)
  const [err, setErr] = useState('')

  // تحقق من دعم HTTPS/الكاميرا
  useEffect(() => {
    const httpsOk = typeof window !== 'undefined' && (window.isSecureContext || ['localhost','127.0.0.1'].includes(location.hostname))
    const canCam  = !!navigator?.mediaDevices?.getUserMedia
    setSupported(httpsOk && canCam)
  }, [])

  // تتبّع جاهزية سكربت ZXing (من الـ prop أو من النافذة)
  useEffect(() => {
    if (zxingReady || window.ZXingBrowser || window.ZXing) setLibReady(true)
  }, [zxingReady])

  function getZX(){ return window.ZXingBrowser || window.ZXing || null }

  async function listCameras(ZX) {
    try { if (typeof ZX?.listVideoInputDevices === 'function') return await ZX.listVideoInputDevices() } catch {}
    try { if (typeof ZX?.BrowserCodeReader?.listVideoInputDevices === 'function') return await ZX.BrowserCodeReader.listVideoInputDevices() } catch {}
    const all = await navigator.mediaDevices.enumerateDevices()
    return all.filter(d => d.kind === 'videoinput')
  }

  async function start() {
    setErr('')
    if (!supported) { setErr('فتح الكاميرا يتطلب HTTPS (أو localhost) والسماح للكاميرا.'); return }
    const ZX = getZX()
    if (!ZX) { setErr('جاري تحميل الماسح… أعد المحاولة بعد لحظات.'); return }

    try {
      const ReaderClass = ZX.BrowserQRCodeReader || ZX.BrowserMultiFormatReader
      if (!ReaderClass) { setErr('تعذّر تهيئة الماسح. أعد تحميل الصفحة.'); return }
      readerRef.current = new ReaderClass()

      const devices = await listCameras(ZX)
      const preferBack =
        devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId ||
        devices[0]?.deviceId || undefined

      await readerRef.current.decodeFromVideoDevice(
        preferBack,
        videoRef.current,
        (result) => {
          if (result) {
            stop()
            const text = result.getText ? result.getText() : String(result)
            onResult?.(text)
          }
        }
      )
      setRunning(true)
    } catch (e) {
      setErr('تعذّر فتح الكاميرا: ' + (e?.message || e))
    }
  }

  function stop() {
    try { readerRef.current?.reset?.() } catch {}
    const stream = videoRef.current?.srcObject
    try { stream?.getTracks?.().forEach(t => t.stop()) } catch {}
    if (videoRef.current) videoRef.current.srcObject = null
    setRunning(false)
  }

  useEffect(() => () => stop(), [])

  return (
    <div style={{marginTop:10}}>
      <div className="row" style={{gap:8, marginBottom:8}}>
        {!running
          ? <button type="button" className="btn" onClick={start} disabled={!supported || !libReady}>تشغيل الكاميرا</button>
          : <button type="button" className="btn" onClick={stop}>إيقاف</button>}
      </div>
      <video ref={videoRef} playsInline muted autoPlay style={{width:'100%',borderRadius:10,border:'1px solid #e5e7eb',background:'#000'}} />
      {err && <div style={{marginTop:6,color:'#b91c1c',fontSize:13}}>{err}</div>}
      {!supported && <div className="muted" style={{marginTop:6}}>افتح الصفحة عبر HTTPS واسمح للكاميرا من إعدادات الموقع في Safari.</div>}
    </div>
  )
}

export default function CheckInPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('idle')
  const [msg, setMsg] = useState('')
  const [att, setAtt] = useState(null)
  const inputRef = useRef(null)

  // ✅ الحالة التي تُبلغ الماسح بأن مكتبة ZXing أصبحت جاهزة
  const [zxingReady, setZxingReady] = useState(false)

  function onChange(e){ setQ(e.target.value); if (status!=='busy'){ setStatus('idle'); setMsg('') } }
  function onKeyDown(e){ if (e.key==='Enter') submit(e) }

  async function submit(e, overrideValue) {
    if (e?.preventDefault) e.preventDefault()
    let code = parseRawInput((overrideValue ?? q) || '')
    code = code.trim()
    if (code && !code.includes('@') && !/^\+?\d{6,}$/.test(code)) code = code.toUpperCase()
    setAtt(null); setMsg('')
    if (!code){ setStatus('missing'); setMsg('أدخل الكود أو الإيميل/الجوال أولاً'); return }

    setStatus('busy')
    try{
      const r = await fetch('/api/checkin', {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ code })
      })
      const d = await r.json().catch(()=>({}))
      if (!r.ok || !d?.success) {
        if (d?.error==='not_found') setStatus('notfound'), setMsg('لا يوجد سجل مطابق')
        else if (['missing','missing_code','bad_input'].includes(d?.error)) setStatus('missing'), setMsg('المدخل غير صالح أو مفقود')
        else if (r.status===401 || r.status===403 || d?.error==='forbidden') setStatus('error'), setMsg('يلزم تسجيل الدخول كـ Admin/Staff')
        else setStatus('error'), setMsg(d?.error || 'خطأ غير متوقع')
        return
      }
      setAtt(d.attendee)
      setStatus(d.already ? 'already' : 'ok')
      setMsg(d.already ? 'تم تسجيل الدخول مسبقًا' : 'تم تسجيل الدخول بنجاح ✓')
      setQ(''); inputRef.current?.focus()
    } catch (e2) {
      setStatus('error'); setMsg(e2.message || 'network_error')
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    const codeParam = u.searchParams.get('code') || u.searchParams.get('ticket') || u.searchParams.get('t')
    if (codeParam) {
      const val = parseRawInput(decodeURIComponent(codeParam))
      window.history.replaceState({}, '', u.pathname)
      submit(null, val)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main dir="rtl" className="page">
      {/* تحميل مكتبة ZXing (UMD) وإبلاغنا عند الجاهزية */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@zxing/browser@latest/umd/index.min.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => setZxingReady(true)}
      />

      <AuthBar afterLogout="/admin/login?next=/checkin" />

      <form onSubmit={submit} className="panel">
        <h3 style={{marginTop:0}}>(Check-in) واجهة تسجيل الدخول</h3>
        <div className="muted" style={{marginBottom:8,fontSize:13}}>امسح QR أو اكتب الكود/الإيميل/الجوال ثم اضغط تأكيد.</div>

        <div className="row">
          <input
            ref={inputRef}
            className="input"
            placeholder="مثال: 9665… أو email@x.com أو TICKET:ABC123"
            value={q}
            onChange={onChange}
            onKeyDown={onKeyDown}
            autoFocus
            style={{flex:1}}
          />
          <button className="btn primary" type="submit" disabled={status==='busy'}>
            {status==='busy' ? 'جاري التحقق…' : 'تأكيد'}
          </button>
        </div>

        <ZxingQrScanner
          zxingReady={zxingReady}
          onResult={(raw) => {
            const val = parseRawInput(raw)
            setQ(val)
            submit(null, val)
          }}
        />

        {status!=='idle' && msg && (
          <div style={{marginTop:10, color: (status==='ok'||status==='already') ? '#15803d' : '#b91c1c'}}>
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
      </form>

      <style jsx>{`
        .page{display:grid;place-items:flex-start;justify-content:center;min-height:100vh;padding:16px;background:#f7fafc}
        .panel{background:#fff;border:1px solid #eee;border-radius:12px;padding:16px;min-width:320px;max-width:720px;width:100%;margin:0 auto}
        .row{display:flex; gap:8px; align-items:center}
        .input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin:6px 0}
        .btn{border:1px solid #d1d5db;background:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
        .btn.primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
        .btn:disabled{opacity:.7;cursor:default}
        .muted{color:#6b7280}
      `}</style>
    </main>
  )
}
