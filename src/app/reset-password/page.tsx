"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { KeyRound, Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Bir hata oluştu")
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "İşlem sırasında bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-medium text-white mb-2">Geçersiz Bağlantı</h3>
        <p className="text-sm text-slate-400 mb-6">
          Şifre sıfırlama bağlantısı eksik veya hatalı. Lütfen e-postanızdaki bağlantıya tıkladığınızdan emin olun.
        </p>
        <Link
          href="/forgot-password"
          className="w-full flex justify-center py-2.5 px-4 border border-white/10 rounded-lg shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-all"
        >
          Yeniden Link İste
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/10 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Şifreniz Güncellendi!</h3>
        <p className="text-sm text-slate-400 mb-6">
          Yeni şifrenizle sisteme giriş yapabilirsiniz.
        </p>
        <Link
          href="/login"
          className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all"
        >
          Giriş Yap
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Link>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">
          Yeni Şifre
        </label>
        <div className="mt-1">
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-slate-300">
          Yeni Şifre (Tekrar)
        </label>
        <div className="mt-1">
          <input
            id="passwordConfirm"
            type="password"
            required
            minLength={6}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || !password || !passwordConfirm}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Şifremi Güncelle"}
        </button>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white">
          Yeni Şifre Belirle
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 px-4">
          Lütfen hesabınız için yeni ve güvenli bir şifre belirleyin.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/[0.02] py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-white/[0.05]">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
