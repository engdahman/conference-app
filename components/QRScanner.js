import { useEffect, useRef, useState } from 'react'

export default function QRScanner({ onResult }){
  const videoRef = useRef(null)
  const [supported,setSupported]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{
    const ok = 'BarcodeDetector' in window
    setSupported(ok)
    if(!ok) return
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    let stream, raf
    async function start(){
      try{
        stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
        if(videoRef.current){
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          loop()
        }
      }catch(e){ setError('لا يمكن الوصول للكاميرا') }
    }
    async function loop(){
      if(!videoRef.current) return
      try{
        const bitmap = await createImageBitmap(videoRef.current)
        const codes = await detector.detect(bitmap)
        if(codes?.[0]){ onResult && onResult(codes[0].rawValue); stop(); return }
      }catch{}
      raf = requestAnimationFrame(loop)
    }
    function stop(){
      stream?.getTracks()?.forEach(t=>t.stop())
      cancelAnimationFrame(raf)
    }
    start()
    return ()=> stop()
  },[])

  if(!supported) return <div className="alert">جهازك لا يدعم الماسح، استخدم البحث اليدوي.</div>
  return <video ref={videoRef} style={{width:'100%',borderRadius:10,border:'1px solid #334155'}}/>
}
