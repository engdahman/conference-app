// pages/admin/index.js
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

/* ===================== أدوات مساعدة ===================== */
// تُرجِع مسارًا جذريًا فقط بدون basePath (لتخزينه في DB)
function toRootPath(src = '') {
  if (!src) return ''
  let s = String(src).trim().replace(/\\/g, '/')
  if (/^https?:\/\//i.test(s)) return s // خارجي يُترك كما هو
  if (s.startsWith('/')) return s
  if (s.startsWith('uploads/')) return '/' + s
  return '/' + s.replace(/^\.?\/+/, '')
}
// للعرض فقط: تضيف basePath لو موجود (لا تغيّر الروابط الخارجية)
function resolveForView(src = '', basePath = '') {
  if (!src) return ''
  if (/^https?:\/\//i.test(src)) return src
  const root = toRootPath(src)
  return (basePath || '') + root
}
function cx(...a){ return a.filter(Boolean).join(' ') }

/* ====== مغلّف fetch: تحويل تلقائي عند 401 ====== */
function useApi401Redirect() {
  const [needLogin, setNeedLogin] = useState(false)
  const redirectedRef = useRef(false)

  const gotoLogin = () => {
    if (typeof window === 'undefined' || redirectedRef.current) return
    redirectedRef.current = true
    const next = encodeURIComponent(
      window.location.pathname + window.location.search + window.location.hash
    )
    window.location.replace(`/admin/login?next=${next}`)
  }

  async function api(url, init = {}) {
    const r = await fetch(url, { credentials: 'include', ...init })
    if (r.status === 401) {
      setNeedLogin(true)
      gotoLogin()
      throw new Error('unauthorized')
    }
    return r
  }

  return { api, needLogin, gotoLogin }
}

/* ===================== رافع ملفات مشترك ===================== */
function Uploader({ onUploaded, api }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef(null)

  async function upload() {
    setErr('')
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const fetcher = api ?? ((url, init)=>fetch(url, { credentials:'include', ...init }))
      const r = await fetcher('/api/upload', { method: 'POST', body: fd })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d?.success && d?.path) {
        onUploaded?.(toRootPath(d.path)) // نخزّن جذريًا فقط
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
      } else {
        setErr('فشل الرفع: ' + (d?.error || d?.message || r.statusText))
      }
    } catch (e) {
      setErr('فشل الرفع: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="row">
      <input ref={inputRef} type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button className="btn" onClick={upload} disabled={busy || !file}>{busy ? '...' : 'رفع'}</button>
      {err && <div className="text-err">{err}</div>}
      <style jsx>{`
        .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .text-err{color:#b91c1c;font-size:13px}
      `}</style>
    </div>
  )
}

/* ===================== تبويب: الإعدادات ===================== */
function SettingsTab({ api, basePath }) {
  const [form, setForm] = useState({
    siteName:'', eventTitle:'', tagline:'',
    eventDateRangeText:'', eventLocationText:'', eventAddress:'',
    orgLogo:'', eventLogo:'',
    bannerEnabled:false, bannerImage:'', bannerLink:''
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const r = await api('/api/settings')
    const d = await r.json()
    const s = d?.settings || {}
    setForm({
      siteName: s.siteName||'',
      eventTitle: s.eventTitle||'',
      tagline: s.tagline||'',
      eventDateRangeText: s.eventDateRangeText||'',
      eventLocationText: s.eventLocationText||'',
      eventAddress: s.eventAddress||'',
      orgLogo: toRootPath(s.orgLogo||''),
      eventLogo: toRootPath(s.eventLogo||''),
      bannerEnabled: !!s.bannerEnabled,
      bannerImage: toRootPath(s.bannerImage||''),
      bannerLink: s.bannerLink||'',
    })
  }
  useEffect(()=>{ load() },[])

  async function save() {
    setBusy(true); setMsg('')
    try {
      const payload = {
        ...form,
        orgLogo: toRootPath(form.orgLogo),
        eventLogo: toRootPath(form.eventLogo),
        bannerImage: toRootPath(form.bannerImage),
      }
      const r = await api('/api/settings', {
        method:'PUT',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      })
      const d = await r.json()
      setMsg(d?.success ? 'تم الحفظ ✓' : ('تعذر الحفظ: ' + (d?.error || d?.message || '')))
    } finally { setBusy(false) }
  }

  return (
    <div className="card">
      <h3>إعدادات المؤتمر</h3>

      <label>اسم الموقع</label>
      <input className="input" value={form.siteName} onChange={e=>setForm({...form, siteName:e.target.value})} />

      <label>عنوان المؤتمر</label>
      <input className="input" value={form.eventTitle} onChange={e=>setForm({...form, eventTitle:e.target.value})} />

      <label>العبارة التعريفية</label>
      <input className="input" value={form.tagline} onChange={e=>setForm({...form, tagline:e.target.value})} />

      <div className="grid2">
        <div>
          <label>نطاق التاريخ</label>
          <input className="input" value={form.eventDateRangeText} onChange={e=>setForm({...form, eventDateRangeText:e.target.value})} />
        </div>
        <div>
          <label>الموقع</label>
          <input className="input" value={form.eventLocationText} onChange={e=>setForm({...form, eventLocationText:e.target.value})} />
        </div>
      </div>

      <label>العنوان التفصيلي</label>
      <input className="input" value={form.eventAddress} onChange={e=>setForm({...form, eventAddress:e.target.value})} />

      <div className="grid2">
        <div>
          <label>شعار المؤسسة</label>
          <div className="row">
            <input className="input" value={form.orgLogo} onChange={e=>setForm({...form, orgLogo:e.target.value})} placeholder="/uploads/org.png" />
            <Uploader api={api} onUploaded={p=>setForm({...form, orgLogo:p})} />
          </div>
          {form.orgLogo && <img className="preview" src={resolveForView(form.orgLogo, basePath)} alt="org" />}
        </div>
        <div>
          <label>شعار المؤتمر</label>
          <div className="row">
            <input className="input" value={form.eventLogo} onChange={e=>setForm({...form, eventLogo:e.target.value})} placeholder="/uploads/event.png" />
            <Uploader api={api} onUploaded={p=>setForm({...form, eventLogo:p})} />
          </div>
          {form.eventLogo && <img className="preview" src={resolveForView(form.eventLogo, basePath)} alt="event" />}
        </div>
      </div>

      <div className="hr" />

      <label className="row">
        <input type="checkbox" checked={form.bannerEnabled} onChange={e=>setForm({...form, bannerEnabled:e.target.checked})} />
        تفعيل البانر أعلى الصفحة
      </label>

      <label>صورة البانر</label>
      <div className="row">
        <input className="input" value={form.bannerImage} onChange={e=>setForm({...form, bannerImage:e.target.value})} placeholder="/uploads/banner.jpg" />
        <Uploader api={api} onUploaded={p=>setForm({...form, bannerImage:p})} />
      </div>
      {form.bannerImage && <img className="preview" src={resolveForView(form.bannerImage, basePath)} alt="banner" />}

      <label>رابط عند الضغط على البانر (اختياري)</label>
      <input className="input" value={form.bannerLink} onChange={e=>setForm({...form, bannerLink:e.target.value})} placeholder="https://..." />

      <div className="row" style={{marginTop:12}}>
        <button className="btn primary" disabled={busy} onClick={save}>{busy?'...':'حفظ'}</button>
        {msg && <div className="muted">{msg}</div>}
      </div>

      <style jsx>{`
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .hr{height:1px;background:#eee;margin:14px 0}
        .preview{max-height:80px;margin-top:6px;background:#fff;border:1px solid #eee;border-radius:8px;padding:6px}
      `}</style>
    </div>
  )
}

/* ===================== تبويب: المتحدثون ===================== */
function SpeakersTab({ api, basePath }) {
  const empty = { name:'', title:'', talk:'', bio:'', photo:'' }
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loadErr, setLoadErr] = useState('')

  async function load(){
    setLoadErr('')
    try{
      const r = await api('/api/speakers')
      const d = await r.json()
      if (!d?.success) throw new Error(d?.error || d?.message || 'failed')
      setRows(d.speakers||[])
    }catch(e){
      setLoadErr('تعذر تحميل القائمة: '+(e.message||''))
    }
  }
  useEffect(()=>{ load() },[])

  async function save(){
    setBusy(true)
    try{
      const method = editingId ? 'PUT' : 'POST'
      const qs = editingId ? ('?id='+editingId) : ''
      const r = await api('/api/admin/speakers'+qs, {
        method,
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, photo: toRootPath(form.photo) })
      })
      const d = await r.json().catch(()=>null)
      if (!d?.success) {
        alert('فشل الحفظ: ' + (d?.error || d?.message || ''))
        return
      }
      cancelEdit()
      await load()
    } finally { setBusy(false) }
  }
  function startEdit(row){ setEditingId(row._id); setForm({
    name:row.name||'', title:row.title||'', talk:row.talk||'', bio:row.bio||'',
    photo: toRootPath(row.photo||'')
  }) }
  function cancelEdit(){ setEditingId(null); setForm(empty) }

  async function del(id){
    if(!confirm('حذف هذا المتحدث؟')) return
    const r = await api('/api/admin/speakers?id='+id, { method:'DELETE' })
    const d = await r.json().catch(()=>null)
    if (!d?.success) { alert('فشل الحذف: '+(d?.error || d?.message || '')); return }
    await load()
  }

  return (
    <>
      <div className="card">
        <h3>{editingId ? 'تحرير متحدث' : 'إضافة متحدث'}</h3>

        <label>الاسم</label>
        <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />

        <label>الوظيفة/اللقب</label>
        <input className="input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />

        <label>عنوان المحاضرة</label>
        <input className="input" value={form.talk} onChange={e=>setForm({...form, talk:e.target.value})} />

        <label>نبذة</label>
        <textarea className="textarea" rows={3} value={form.bio} onChange={e=>setForm({...form, bio:e.target.value})} />

        <label>الصورة (رابط) أو ارفع</label>
        <div className="row">
          <input className="input" value={form.photo} onChange={e=>setForm({...form, photo:e.target.value})} placeholder="/uploads/speaker.jpg" />
          <Uploader api={api} onUploaded={p=>setForm({...form, photo:p})} />
        </div>
        {form.photo && <img className="preview" src={resolveForView(form.photo, basePath)} alt="speaker" />}

        <div className="row" style={{marginTop:12}}>
          <button className="btn primary" disabled={busy} onClick={save}>{busy?'...':(editingId?'تحديث':'حفظ')}</button>
          {editingId && <button className="btn" onClick={cancelEdit}>إلغاء</button>}
        </div>
        {loadErr && <div className="muted" style={{marginTop:8,color:'#b91c1c'}}>{loadErr}</div>}
      </div>

      <div className="cards">
        {rows.map(r=>(
          <div key={r._id} className="card">
            <div className="row" style={{gap:12,alignItems:'center'}}>
              {r.photo && <img src={resolveForView(r.photo, basePath)} alt={r.name} style={{width:64,height:64,objectFit:'cover',borderRadius:8,border:'1px solid #eee'}}/>}
              <div>
                <div style={{fontWeight:800}}>{r.name}</div>
                {r.title && <div className="muted">{r.title}</div>}
                {r.talk && <div className="tag" style={{marginTop:6}}>{r.talk}</div>}
              </div>
            </div>
            <div className="row" style={{marginTop:10}}>
              <button className="btn" onClick={()=>startEdit(r)}>تحرير</button>
              <button className="btn" onClick={()=>del(r._id)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ===================== تبويب: الرعاة ===================== */
function SponsorsTab({ api, basePath }){
  const empty = { name:'', logo:'', url:'', tier:'', description:'' }
  const [rows,setRows] = useState([])
  const [form,setForm] = useState(empty)
  const [busy,setBusy] = useState(false)
  const [editingId,setEditingId] = useState(null)

  async function load(){
    const r = await api('/api/admin/sponsors')
    const d = await r.json()
    setRows(d?.sponsors||[])
  }
  useEffect(()=>{ load() },[])

  async function saveOrUpdate(){
    setBusy(true)
    try{
      const method = editingId ? 'PUT' : 'POST'
      const qs = editingId ? ('?id='+editingId) : ''
      const r = await api('/api/admin/sponsors'+qs, {
        method,
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, logo: toRootPath(form.logo) })
      })
      const d = await r.json()
      if(d?.success){ cancelEdit(); await load() }
      else alert('فشل الحفظ/التحديث: ' + (d?.error || d?.detail || ''))
    } finally { setBusy(false) }
  }

  function startEdit(row){
    setEditingId(row._id)
    setForm({
      name:row.name||'',
      logo:toRootPath(row.logo||''),
      url:row.url||'',
      tier:row.tier||'',
      description:row.description||'',
    })
    window?.scrollTo?.({ top:0, behavior:'smooth' })
  }
  function cancelEdit(){ setEditingId(null); setForm(empty) }

  async function delItem(id){
    if(!confirm('حذف هذا الراعي؟')) return
    const r = await api('/api/admin/sponsors?id='+id, { method:'DELETE' })
    const d = await r.json()
    if(d?.success) await load()
  }

  return (
    <>
      <div className="card">
        <h3>{editingId ? 'تحرير راعٍ' : 'إضافة راعٍ'}</h3>

        <label>اسم الراعي</label>
        <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />

        <label>نوع الرعاية (Tier)</label>
        <input className="input" value={form.tier} onChange={e=>setForm({...form, tier:e.target.value})} placeholder="ذهبي / فضي / شريك..." />

        <label>الموقع الإلكتروني</label>
        <input className="input" value={form.url} onChange={e=>setForm({...form, url:e.target.value})} placeholder="https://..." />

        <label>نبذة</label>
        <textarea className="textarea" rows={3} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />

        <label>الشعار (رابط) أو ارفع</label>
        <div className="row">
          <input className="input" value={form.logo} onChange={e=>setForm({...form, logo:e.target.value})} placeholder="/uploads/logo.png" />
          <Uploader api={api} onUploaded={p=>setForm({...form, logo:p})} />
        </div>
        {form.logo && <img className="preview" src={resolveForView(form.logo, basePath)} alt="logo" />}

        <div className="row" style={{marginTop:10}}>
          <button className="btn primary" disabled={busy} onClick={saveOrUpdate}>{busy?'...':(editingId?'تحديث':'حفظ')}</button>
          {editingId && <button className="btn" onClick={cancelEdit}>إلغاء</button>}
        </div>
      </div>

      <div className="cards">
        {rows.map(r=>(
          <div key={r._id} className="card" style={{textAlign:'center'}}>
            <div className="logo-wrap">
              {r.logo ? <img src={resolveForView(r.logo, basePath)} alt={r.name} /> : <div className="logo-ph">{r.name}</div>}
            </div>
            <div style={{fontWeight:800,marginTop:8}}>{r.name}</div>
            {r.tier && <div className="tag" style={{marginTop:6}}>{r.tier}</div>}
            {r.description && <p className="muted" style={{marginTop:6}}>{r.description}</p>}
            <div className="row" style={{justifyContent:'center',marginTop:8}}>
              <a className="btn" href={r.url||'#'} target="_blank" rel="noreferrer">الموقع</a>
              <button className="btn" onClick={()=>startEdit(r)}>تحرير</button>
              <button className="btn" onClick={()=>delItem(r._id)}>حذف</button>
            </div>
            <style jsx>{`
              .logo-wrap{background:#fff;border:1px solid #eee;border-radius:12px;min-height:92px;display:flex;align-items:center;justify-content:center;padding:10px}
              .logo-wrap img{max-width:100%;max-height:60px;object-fit:contain}
              .logo-ph{color:#333}
            `}</style>
          </div>
        ))}
      </div>
    </>
  )
}

/* ===================== تبويب: الأجندة ===================== */
function AgendaTab({ api }){
  const empty = { day:'اليوم الأول', date:'', time:'09:00', type:'محاضرة', title:'', room:'', speaker:'' }
  const [rows,setRows] = useState([])
  const [form,setForm] = useState(empty)
  const [busy,setBusy] = useState(false)

  async function load(){
    const r = await api('/api/admin/agenda')
    const d = await r.json()
    setRows(d?.items||[])
  }
  useEffect(()=>{ load() },[])

  async function save(){
    setBusy(true)
    try{
      const r = await api('/api/admin/agenda', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form)
      })
      const d = await r.json()
      if(d?.success){ setForm({...empty, day:form.day}); await load() }
      else alert('خطأ في الحفظ: ' + (d?.error || d?.detail || ''))
    } finally { setBusy(false) }
  }
  async function delItem(id){
    if(!confirm('حذف هذا البند؟')) return
    const r = await api('/api/admin/agenda?id='+id, { method:'DELETE' })
    const d = await r.json()
    if(d?.success) await load()
  }

  const sorted = useMemo(()=>[...rows].sort((a,b)=>(a.day||'').localeCompare(b.day||'') || (a.time||'').localeCompare(b.time||'')),[rows])

  return (
    <>
      <div className="card">
        <h3>إضافة/تعديل أجندة</h3>
        <label>اليوم</label>
        <input className="input" value={form.day} onChange={e=>setForm({...form, day:e.target.value})} placeholder="اليوم الأول" />
        <div className="grid2">
          <div>
            <label>التاريخ (اختياري)</label>
            <input className="input" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} placeholder="10 سبتمبر 2025" />
          </div>
          <div>
            <label>الوقت</label>
            <input className="input" value={form.time} onChange={e=>setForm({...form, time:e.target.value})} placeholder="09:00" />
          </div>
        </div>
        <div className="grid2">
          <div>
            <label>نوع الجلسة</label>
            <input className="input" value={form.type} onChange={e=>setForm({...form, type:e.target.value})} placeholder="افتتاحية / حوارية / محاضرة" />
          </div>
          <div>
            <label>المكان/القاعة</label>
            <input className="input" value={form.room} onChange={e=>setForm({...form, room:e.target.value})} />
          </div>
        </div>
        <label>عنوان الجلسة</label>
        <input className="input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
        <label>المتحدث/الأسماء</label>
        <input className="input" value={form.speaker} onChange={e=>setForm({...form, speaker:e.target.value})} placeholder="الميسّر — المتحدثون" />

        <div className="row" style={{marginTop:12}}>
          <button className="btn primary" disabled={busy} onClick={save}>{busy?'...':'حفظ'}</button>
        </div>
      </div>

      <div className="cards">
        {sorted.map(r=>(
          <div key={r._id} className="card">
            <strong>{r.day}{r.date?` — ${r.date}`:''}</strong>
            <div className="tag" style={{marginTop:6}}>{r.time} · {r.type||'جلسة'}</div>
            <div style={{marginTop:6}}>{r.title}</div>
            {(r.room||r.speaker) && <div className="muted" style={{marginTop:6}}>{[r.room, r.speaker].filter(Boolean).join(' — ')}</div>}
            <div className="row" style={{marginTop:8}}>
              <button className="btn" onClick={()=>delItem(r._id)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ===================== تبويب: الحضور ===================== */
function AttendeesTab({ api }){
  const [rows,setRows] = useState([])
  const [q,setQ] = useState('')
  const [err,setErr] = useState('')
  const [selected, setSelected] = useState(new Set())

  async function load(){
    setErr('')
    try{
      const r = await api('/api/attendees')
      const d = await r.json()
      if (!d?.success) throw new Error(d?.error || d?.message || 'failed')
      setRows(d.attendees||[])
    }catch(e){
      setErr('تعذر تحميل القائمة: ' + (e.message||''))
    }
  }
  useEffect(()=>{ load() },[])

  function exportCsv(){
    const header = [
      'fullName','email','phone','employmentStatus','jobTitle','employer','sector',
      'gender','birthDate','gradYear','ticketCode','checkedIn','checkinAt'
    ]
    const csv = [header.join(',')].concat(
      rows.map(r => header.map(h => {
        const v = r[h] == null ? '' : String(r[h])
        return `"${v.replace(/"/g,'""')}"`
      }).join(','))
    ).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'attendees.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = useMemo(()=>{
    const s = (q||'').toLowerCase()
    return !s ? rows : rows.filter(r => JSON.stringify(r).toLowerCase().includes(s))
  },[rows,q])

  function toggle(id){ setSelected(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n }) }
  function selectAll(){ setSelected(new Set(filtered.map(r=>r._id))) }
  function clearSel(){ setSelected(new Set()) }
  async function deleteSelected(){
    if(!selected.size) return
    if(!confirm('حذف العناصر المحددة؟')) return
    const r = await api('/api/admin/attendees', {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ids: Array.from(selected) })
    })
    const d = await r.json().catch(()=>null)
    if(d?.success){ clearSel(); await load() }
    else alert('فشل الحذف')
  }

  return (
    <div className="card">
      <div className="row" style={{justifyContent:'space-between',marginBottom:10}}>
        <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث..." style={{maxWidth:320}} />
        <div className="row">
          <button className="btn" onClick={load}>تحديث</button>
          <button className="btn" onClick={exportCsv} disabled={!rows.length}>تصدير CSV</button>
          <Link className="btn" href="/checkin">واجهة تسجيل الدخول (Check-in)</Link>
          <button className="btn" onClick={deleteSelected} disabled={!selected.size}>حذف المحدد</button>
        </div>
      </div>

      {err && <div className="muted" style={{color:'#b91c1c', marginBottom:8}}>{err}</div>}

      <div className="table">
        <div className="thead">
          <div><input type="checkbox" onChange={e=> e.target.checked ? selectAll() : clearSel()} /></div>
          <div>الاسم</div><div>البريد</div><div>الهاتف</div>
          <div>الحالة</div><div>المسمى</div><div>جهة العمل</div>
          <div>القطاع</div><div>الجنس</div><div>سنة التخرج</div>
          <div>الكود</div><div>الدخول</div>
        </div>
        {filtered.map(r=>(
          <div key={r._id} className="tr">
            <div><input type="checkbox" checked={selected.has(r._id)} onChange={()=>toggle(r._id)} /></div>
            <div>{r.fullName||'—'}</div>
            <div>{r.email||'—'}</div>
            <div>{r.phone||'—'}</div>
            <div>{r.employmentStatus||'—'}</div>
            <div>{r.jobTitle||'—'}</div>
            <div>{r.employer||'—'}</div>
            <div>{r.sector||'—'}</div>
            <div>{r.gender||'—'}</div>
            <div>{r.gradYear||'—'}</div>
            <div>{r.ticketCode||'—'}</div>
            <div>{r.checkedIn?'✓':'—'}</div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .table{display:grid;gap:6px}
        .thead,.tr{
          display:grid;
          grid-template-columns:
            0.45fr 1.3fr 1.6fr 1fr 0.9fr 1fr 1fr 0.9fr 0.7fr 0.7fr 0.8fr 0.5fr;
          gap:8px;align-items:center
        }
        .thead{font-weight:700;color:#222}
        .tr{background:#fff;border:1px solid #eee;border-radius:10px;padding:8px}
      `}</style>
    </div>
  )
}

/* ===================== تبويب: المستخدمون (staff) ===================== */
function UsersTab({ api }){
  const [rows,setRows]=useState([])
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')

  async function load(){ const r=await api('/api/admin/users'); const d=await r.json(); setRows(d.users||[]) }
  useEffect(()=>{ load() },[])

  async function add(){
    const r=await api('/api/admin/users',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password, role:'staff' })
    })
    const d=await r.json()
    if(d?.success){ setEmail(''); setPassword(''); load() } else alert(d?.error||'فشل الإضافة')
  }
  async function del(id){
    if(!confirm('حذف هذا المستخدم؟')) return
    await api('/api/admin/users?id='+id,{ method:'DELETE' })
    load()
  }

  return (
    <div className="card">
      <h3>المستخدمون (صلاحية Check-in)</h3>
      <div className="row" style={{marginBottom:10}}>
        <input className="input" placeholder="staff@domain.com" value={email} onChange={e=>setEmail(e.target.value)} style={{maxWidth:260}}/>
        <input className="input" placeholder="كلمة المرور" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{maxWidth:220}}/>
        <button className="btn primary" onClick={add} disabled={!email||!password}>إضافة كـ Staff</button>
      </div>
      <div className="cards">
        {rows.map(u=>(
          <div key={u._id} className="card">
            <div><b>{u.email}</b></div>
            <div className="tag" style={{marginTop:6}}>{u.role}</div>
            <div className="row" style={{marginTop:8}}>
              <button className="btn" onClick={()=>del(u._id)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===================== صفحة الأدمن ===================== */
const TABS = ['settings','speakers','sponsors','agenda','attendees','users']

function AdminPage(){
  const router = useRouter()
  const basePath = router.basePath || ''
  const { api, needLogin, gotoLogin } = useApi401Redirect()
  const [tab, setTab] = useState('settings')
  const [authChecked, setAuthChecked] = useState(false)
  const authOnce = useRef(false)
  const initOnceRef = useRef(false)

  // حارس الجلسة
  useEffect(() => {
    if (authOnce.current) return
    authOnce.current = true

    ;(async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials:'include' })
        const d = await r.json().catch(()=>null)
        if (r.ok && d?.ok) {
          setAuthChecked(true)
        } else {
          const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)
          window.location.replace(`/admin/login?next=${next}`)
        }
      } catch {
        const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)
        window.location.replace(`/admin/login?next=${next}`)
      }
    })()
  }, [])

  // ضبط التبويب مرة واحدة
  useEffect(() => {
    if (!router.isReady || !authChecked || initOnceRef.current) return
    initOnceRef.current = true

    let qtab = router.query.tab
    if (Array.isArray(qtab)) qtab = qtab[0]

    let fromHash = ''
    if (typeof window !== 'undefined' && window.location.hash) {
      fromHash = window.location.hash.replace('#', '')
    }

    let fromLS = ''
    if (typeof window !== 'undefined') {
      fromLS = localStorage.getItem('admin_tab') || ''
    }

    let next = [qtab, fromHash, fromLS].find(t => TABS.includes(t)) || 'speakers'
    setTab(next)

    const query = next === 'settings' ? {} : { tab: next }
    const desired = '/admin' + (query.tab ? `?tab=${encodeURIComponent(query.tab)}` : '')
    const current = router.asPath.split('#')[0]
    if (current !== desired) {
      router.replace({ pathname: '/admin', query }, undefined, { shallow: true })
    }
  }, [router.isReady, authChecked])

  function switchTab(t){
    if (!TABS.includes(t)) t = 'settings'
    setTab(t)
    if (typeof window !== 'undefined') localStorage.setItem('admin_tab', t)

    const query = t === 'settings' ? {} : { tab: t }
    const desired = '/admin' + (query.tab ? `?tab=${encodeURIComponent(query.tab)}` : '')
    const current = typeof window !== 'undefined'
      ? (window.location.pathname + window.location.search)
      : router.asPath
    if (current !== desired) {
      router.replace({ pathname: '/admin', query }, undefined, { shallow: true })
    }
  }

  if (!authChecked) {
    return (
      <main dir="rtl" className="page" style={{display:'grid',placeItems:'center',minHeight:'60vh'}}>
        جارِ التحقق من الجلسة...
      </main>
    )
  }

  return (
    <main dir="rtl" className="page">
      <div className="container">
        <header className="top">
          <h2>لوحة التحكم</h2>
          <div className="row">
            <Link className="btn" href="/">العودة للموقع</Link>
            <button
              className="btn"
              onClick={async ()=>{ try{ await fetch('/api/auth/logout',{method:'POST',credentials:'include'}) }catch{} window.location.href='/admin/login' }}
            >
              تسجيل الخروج
            </button>
          </div>
        </header>

        {needLogin && (
          <div className="login-alert">
            انتهت جلسة تسجيل الدخول. <button className="btn" onClick={gotoLogin}>تسجيل الدخول مجددًا</button>
          </div>
        )}

        <nav className="tabs">
          <button className={cx('tab', tab==='settings'&&'active')} onClick={()=>switchTab('settings')}>الإعدادات</button>
          <button className={cx('tab', tab==='speakers'&&'active')} onClick={()=>switchTab('speakers')}>المتحدثون</button>
          <button className={cx('tab', tab==='sponsors'&&'active')} onClick={()=>switchTab('sponsors')}>الرعاة</button>
          <button className={cx('tab', tab==='agenda'&&'active')} onClick={()=>switchTab('agenda')}>الأجندة</button>
          <button className={cx('tab', tab==='attendees'&&'active')} onClick={()=>switchTab('attendees')}>الحضور</button>
          <button className={cx('tab', tab==='users'&&'active')} onClick={()=>switchTab('users')}>المستخدمون</button>
        </nav>

        {tab==='settings'  && <SettingsTab api={api} basePath={basePath}/>}
        {tab==='speakers'  && <SpeakersTab api={api} basePath={basePath}/>}
        {tab==='sponsors'  && <SponsorsTab api={api} basePath={basePath}/>}
        {tab==='agenda'    && <AgendaTab api={api}/>}
        {tab==='attendees' && <AttendeesTab api={api}/>}
        {tab==='users'     && <UsersTab api={api}/>}
      </div>

      <style jsx>{`
        .page{padding:24px 0;background:#f7fafc;min-height:100vh}
        .container{max-width:1150px;margin:0 auto;padding:0 16px}
        .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
        .tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
        .tab{border:1px solid #e3e8ef;background:#fff;padding:8px 14px;border-radius:10px;cursor:pointer}
        .tab.active{background:#e9f5ff;border-color:#c7e5ff}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px}
        .input,.textarea{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin:6px 0 10px;background:#fff}
        .btn{border:1px solid #d1d5db;background:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
        .btn:hover{background:#f3f4f6}
        .btn.primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
        .btn.primary:hover{filter:brightness(.95)}
        .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:12px}
        .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .muted{color:#6b7280}
        .tag{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;padding:4px 8px;border-radius:8px}
        img{display:block}
        .login-alert{
          background:#fff4e6;border:1px solid #ffd8a8;border-radius:10px;
          padding:10px 12px;margin-bottom:12px;color:#9a6200;display:flex;gap:8px;align-items:center;flex-wrap:wrap
        }
      `}</style>
    </main>
  )
}

export default AdminPage

/* ======== SSR Guard ======== */
export async function getServerSideProps(ctx) {
  const cookieHeader = ctx.req?.headers?.cookie || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(s=>{
      const i = s.indexOf('=')
      if (i === -1) return [s.trim(), '']
      const k = s.slice(0,i).trim()
      const v = decodeURIComponent(s.slice(i+1).trim())
      return [k, v]
    }).filter(([k])=>k)
  )
  const token = cookies.admin_token || cookies.token || ''

  let ok = false
  if (token && process.env.JWT_SECRET) {
    try {
      const jwt = require('jsonwebtoken')
      jwt.verify(token, process.env.JWT_SECRET)
      ok = true
    } catch {}
  }

  if (!ok) {
    const next = '/admin' + (ctx.query?.tab ? `?tab=${encodeURIComponent(String(ctx.query.tab))}` : '')
    return {
      redirect: { destination: `/admin/login?next=${encodeURIComponent(next)}`, permanent: false }
    }
  }

  return { props: {} }
}
