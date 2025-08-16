import { useEffect, useState } from 'react'

export default function Badges(){
  const [rows,setRows]=useState([])
  useEffect(()=>{
    fetch('/api/attendees').then(async r=>{
      if(r.status!==200){ alert('تحتاج لتسجيل الدخول كأدمن/موظف'); location.href='/admin'; return }
      const d=await r.json(); setRows(d.attendees||[])
    })
  },[])
  return (<div className="container rtl">
    <div className="no-print" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h2>بطاقات المشاركين</h2>
      <button className="btn" onClick={()=>window.print()}>طباعة</button>
    </div>
    <div className="badges">
      {rows.map(a=>(
        <div className="badge" key={a._id}>
          <div className="logos">
            <img src={process.env.NEXT_PUBLIC_LOGO_EVENT} alt="event"/>
            <img src={process.env.NEXT_PUBLIC_LOGO_ORG} alt="org"/>
          </div>
          <div className="name">{a.fullName}</div>
          <div className="qr">
            {a.qrPng ? <img src={a.qrPng} alt={a.qrCode} style={{height:'24mm'}}/> : <div className="small">{a.qrCode}</div>}
          </div>
        </div>
      ))}
    </div>
  </div>)
}
