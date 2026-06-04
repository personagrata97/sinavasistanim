"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white">
          Şifremi Unuttum
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 px-4">
          Hesabınıza kayıtlı e-posta adresini girin, size şifre sıfırlama bağlantısı gönderelim.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/[0.02] py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-white/[0.05]">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">E-posta Gönderildi</h3>
              <p className="text-sm text-slate-400 mb-6">
                Eğer sistemde <strong>{email}</strong> adresine ait bir hesap varsa, şifre sıfırlama bağlantısını içeren bir e-posta gönderdik. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.
              </p>
              <Link
                href="/login"
                className="w-full flex justify-center py-2.5 px-4 border border-white/10 rounded-lg shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-all"
              >
                Giriş Ekranına Dön
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  E-posta Adresi
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sıfırlama Bağlantısı Gönder"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Giriş ekranına dön
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
