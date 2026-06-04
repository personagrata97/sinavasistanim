"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Target, Clock, BookOpen, ChevronRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState("")
  const [hours, setHours] = useState(2)
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, targetHours: hours }),
      })
      const data = await res.json()
      if (data.success) {
        // Force session refresh so middleware sees onboardingCompleted=true
        await update()
        window.location.href = "/dashboard"
      } else {
        console.error("Onboarding failed:", data.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[180px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-slate-800/30 blur-[160px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-xl p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.05] shadow-2xl backdrop-blur-xl"
      >
        {step === 1 && (
          <div className="space-y-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
              <Target className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-3">Hedefin Ne?</h1>
              <p className="text-slate-400">Sana en uygun çalışma programını hazırlamamız için hangi sınava hazırlandığını seç.</p>
            </div>
            
            <div className="grid gap-4">
              {["SPL Düzey 3", "MASAK Uyum Görevlisi Sınavı", "Bilgi Sistemleri Bağımsız Denetim", "YDS / YÖKDİL", "Genel Akademik"].map(item => (
                <button
                  key={item}
                  onClick={() => { setGoal(item); setStep(2) }}
                  className="flex items-center justify-between p-5 rounded-2xl border transition-all text-left bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-indigo-500/50"
                >
                  <div className="flex items-center gap-4">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span className="font-semibold">{item}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-3">Zaman Planı</h1>
              <p className="text-slate-400">Günde ortalama kaç saat çalışabilirsin?</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center text-4xl font-black text-indigo-400">
                <button onClick={() => setHours(Math.max(1, hours - 1))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white">-</button>
                <span>{hours} Saat</span>
                <button onClick={() => setHours(Math.min(8, hours + 1))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white">+</button>
              </div>

              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Kişisel Asistanımı Hazırla"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
