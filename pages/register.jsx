// pages/register.jsx
import { useState } from 'react'

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    employmentStatus: '',
    jobTitle: '',
    employer: '',
    sector: '',
    gender: '',
    birthDate: '',
    gradYear: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null) // {qrDataUrl, ticketCode}

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const r = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok || !d?.success) throw new Error(d?.message || 'فشل التسجيل')
      setDone({ qrDataUrl: d.qrDataUrl, ticketCode: d.ticketCode })
    } catch (err) {
      alert(err.message || 'فشل التسجيل')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="page rtl">
        <div className="card success">
          <h2>تم التسجيل بنجاح 🎉</h2>
          <p>احتفظ بهذا الكود وأحضره عند الحضور.</p>
          <div className="qr">
            {done.qrDataUrl ? <img src={done.qrDataUrl} alt="QR" /> : <div>—</div>}
            <div className="code">{done.ticketCode}</div>
          </div>
          <a className="btn" href="/">العودة للصفحة الرئيسية</a>
        </div>
        <style jsx>{styles}</style>
      </main>
    )
  }

  return (
    <main className="page rtl">
      <form className="card form" onSubmit={submit}>
        <h2>التسجيل</h2>

        <label>الاسم الرباعي</label>
        <input name="fullName" required value={form.fullName} onChange={onChange} />

        <div className="row">
          <div>
            <label>البريد الإلكتروني</label>
            <input type="email" name="email" required value={form.email} onChange={onChange} />
          </div>
          <div>
            <label>رقم الهاتف</label>
            <input name="phone" required value={form.phone} onChange={onChange} />
          </div>
        </div>

        <label>حالة العمل</label>
        <select name="employmentStatus" required value={form.employmentStatus} onChange={onChange}>
          <option value="">اختر…</option>
          <option value="employed">يعمل</option>
          <option value="unemployed">لا يعمل</option>
          <option value="student">طالب</option>
        </select>

        {form.employmentStatus === 'employed' && (
          <>
            <div className="row">
              <div>
                <label>المسمى الوظيفي</label>
                <input name="jobTitle" value={form.jobTitle} onChange={onChange} />
              </div>
              <div>
                <label>مكان العمل</label>
                <input name="employer" value={form.employer} onChange={onChange} />
              </div>
            </div>
            <label>القطاع</label>
            <input name="sector" value={form.sector} onChange={onChange} />
          </>
        )}

        <div className="row">
          <div>
            <label>الجنس</label>
            <select name="gender" required value={form.gender} onChange={onChange}>
              <option value="">اختر…</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </div>
          <div>
            <label>تاريخ الميلاد</label>
            <input type="date" name="birthDate" value={form.birthDate} onChange={onChange} />
          </div>
          <div>
            <label>سنة التخرج</label>
            <input type="number" name="gradYear" value={form.gradYear} onChange={onChange} />
          </div>
        </div>

        <button className="btn primary" type="submit" disabled={submitting}>
          {submitting ? 'جاري الإرسال…' : 'تسجيل'}
        </button>
      </form>
      <style jsx>{styles}</style>
    </main>
  )
}

const styles = `
.page{min-height:100vh;display:grid;place-items:center;background:#f7f9fc;padding:20px}
.rtl{direction:rtl}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 6px 18px rgba(15,23,42,.06);padding:18px;max-width:860px;width:100%}
.card h2{margin:0 0 12px}
.form label{font-size:.95rem;color:#334155;margin-top:10px;display:block}
.form input,.form select{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-top:6px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.btn{display:inline-block;padding:10px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;text-decoration:none;color:#0f172a}
.btn.primary{background:#0ea5e9;border-color:#0ea5e9;color:#fff}
.success .qr{display:grid;place-items:center;margin:12px 0;gap:6px}
.success .qr img{width:180px;height:180px;object-fit:contain}
.success .code{font-family:ui-monospace, SFMono-Regular, Menlo, monospace;font-size:1.1rem}
@media(max-width:640px){.row{grid-template-columns:1fr}}
`
