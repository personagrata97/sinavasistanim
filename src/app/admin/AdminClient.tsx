"use client"

import { useState, useTransition, useEffect } from "react"
import { Users, Activity, Target, Clock, ShieldAlert, Flame, AlertTriangle, CheckCircle2, BookOpen, Check, ChevronLeft, ChevronRight, Search, ShieldCheck, FileText, AlertCircle, Sparkles, X } from "lucide-react"
import { resolveQuestion } from "@/lib/actions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Modal } from "@/components/course/shared"
import { SectionQualityModal } from "@/components/admin/SectionQualityModal"

interface AdminClientProps {
  users: Array<{
    id: string
    name: string | null
    email: string | null
    role: string
    createdAt: Date
    lastActiveAt: Date
    currentStreak: number
    _count: {
      mockResults: number
      questionAnswers: number
    }
  }>
  reportedQuestions: Array<{
    id: string
    text: string
    options: string
    correct: string
    explanation: string | null
    course: { slug: string; name: string; program: { slug: string; name: string } | null } | null
    section: { title: string; module: string | null } | null
  }>
  sectionsQuality: Array<{
    id: string
    title: string
    module: string | null
    course: { slug: string; name: string; program: { slug: string; name: string } | null } | null
    processed: boolean
    verificationScore: number | null
    verificationIssues: string | null
  }>
  stats: {
    totalUsers: number
    activeToday: number
    totalMockExams: number
  }
}

type TabType = "users" | "reported" | "quality"

export default function AdminClient({ users, reportedQuestions, sectionsQuality, stats }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("users")
  const [userSearch, setUserSearch] = useState("")
  const [questionSearch, setQuestionSearch] = useState("")
  const [sectionSearch, setSectionSearch] = useState("")
  
  // Pagination States
  const [userPage, setUserPage] = useState(1)
  const [questionPage, setQuestionPage] = useState(1)
  const [sectionPage, setSectionPage] = useState(1)
  const itemsPerPage = 5

  const [activeSectionForHistory, setActiveSectionForHistory] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Handle reported question resolution
  const handleResolve = async (id: string) => {
    if (confirm("Bu sorunun hatalı işaretini kaldırmak istediğinize emin misiniz?")) {
      startTransition(async () => {
        const res = await resolveQuestion(id)
        if (res.success) {
          router.refresh()
        } else {
          alert("Hata: " + res.error)
        }
      })
    }
  }

  // Filter lists based on search
  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredQuestions = reportedQuestions.filter(q =>
    q.text.toLowerCase().includes(questionSearch.toLowerCase()) ||
    (q.course?.name || "").toLowerCase().includes(questionSearch.toLowerCase()) ||
    (q.section?.title || "").toLowerCase().includes(questionSearch.toLowerCase())
  )

  const filteredSections = sectionsQuality.filter(s =>
    s.title.toLowerCase().includes(sectionSearch.toLowerCase()) ||
    (s.course?.name || "").toLowerCase().includes(sectionSearch.toLowerCase())
  )

  // Paginated Slices
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage)
  const paginatedQuestions = filteredQuestions.slice((questionPage - 1) * itemsPerPage, questionPage * itemsPerPage)
  const paginatedSections = filteredSections.slice((sectionPage - 1) * itemsPerPage, sectionPage * itemsPerPage)

  // Page Counts
  const userTotalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const questionTotalPages = Math.ceil(filteredQuestions.length / itemsPerPage) || 1
  const sectionTotalPages = Math.ceil(filteredSections.length / itemsPerPage) || 1

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-indigo-400" />
              Yönetici Paneli
            </h1>
            <p className="text-slate-400 mt-2">Platformdaki tüm kullanıcıların, soruların ve ders notlarının kalite durumu.</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium">
            ← Platforma Dön
          </Link>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
            <Users className="w-6 h-6 text-indigo-400 mb-4" />
            <div className="text-4xl font-bold">{stats.totalUsers}</div>
            <div className="text-sm text-slate-400 mt-1">Toplam Kullanıcı</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
            <Activity className="w-6 h-6 text-emerald-400 mb-4" />
            <div className="text-4xl font-bold">{stats.activeToday}</div>
            <div className="text-sm text-slate-400 mt-1">Bugün Aktif Kullanıcılar</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
            <Target className="w-6 h-6 text-amber-400 mb-4" />
            <div className="text-4xl font-bold">{stats.totalMockExams}</div>
            <div className="text-sm text-slate-400 mt-1">Çözülen Toplam Deneme</div>
          </div>
        </div>

        {/* Sekme Menüsü (Tabs) */}
        <div className="flex border-b border-white/10 p-1 bg-white/[0.01] rounded-xl max-w-md">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "users"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <Users className="w-4 h-4" />
            Öğrenciler
          </button>

          <button
            onClick={() => setActiveTab("reported")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${activeTab === "reported"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Hatalı Sorular
            {reportedQuestions.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-950">
                {reportedQuestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("quality")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "quality"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <BookOpen className="w-4 h-4" />
            Not Kalitesi
          </button>
        </div>

        {/* SEKMELİ İÇERİK ALANLARI */}
        <div className="space-y-6">

          {/* TAB 1: ÖĞRENCİLER */}
          {activeTab === "users" && (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-xl font-bold">Öğrenci Listesi</h2>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-indigo-500 transition-colors w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="Öğrenci ara..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="bg-transparent w-full text-sm text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-sm">
                      <th className="py-3 px-4 font-medium">Kullanıcı</th>
                      <th className="py-3 px-4 font-medium">Rol</th>
                      <th className="py-3 px-4 font-medium">Çalışma Serisi</th>
                      <th className="py-3 px-4 font-medium">Çözülen Soru</th>
                      <th className="py-3 px-4 font-medium">Son Görülme</th>
                      <th className="py-3 px-4 font-medium">Kayıt Tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">Kullanıcı bulunamadı.</td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-bold">{user.name || "İsimsiz"}</div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === "admin" ? "bg-indigo-500/20 text-indigo-400" : "bg-white/10 text-slate-400"
                              }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1">
                              <Flame className="w-4 h-4 text-amber-400" />
                              <span className="font-bold">{user.currentStreak} gün</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-sm">{user._count.questionAnswers}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(user.lastActiveAt).toLocaleDateString("tr-TR")}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500">
                            {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {userTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-xs text-slate-400">Sayfa {userPage} / {userTotalPages} ({filteredUsers.length} öğrenci)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUserPage(p => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                      disabled={userPage === userTotalPages}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HATALI SORULAR */}
          {activeTab === "reported" && (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <h2 className="text-xl font-bold">Bildirilen Soru İhbarları ({reportedQuestions.length})</h2>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-indigo-500 transition-colors w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="Soru veya ders ara..."
                    value={questionSearch}
                    onChange={(e) => { setQuestionSearch(e.target.value); setQuestionPage(1); }}
                    className="bg-transparent w-full text-sm text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-sm">
                      <th className="py-3 px-4 font-medium">Bölüm / Ders</th>
                      <th className="py-3 px-4 font-medium w-1/3">Soru Açıklaması</th>
                      <th className="py-3 px-4 font-medium">Seçenekler & Doğru Cevap</th>
                      <th className="py-3 px-4 font-medium text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">Herhangi bir soru ihbarı bulunamadı.</td>
                      </tr>
                    ) : (
                      paginatedQuestions.map((q) => {
                        let parsedOptions: string[] = []
                        try {
                          parsedOptions = JSON.parse(q.options)
                        } catch {
                          parsedOptions = []
                        }
                        return (
                          <tr key={q.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-4 text-sm">
                              {q.course?.program?.slug && q.course?.slug ? (
                                <Link
                                  href={`/program/${q.course.program.slug}/${q.course.slug}`}
                                  className="hover:underline hover:text-indigo-400 group flex flex-col"
                                >
                                  <span className="font-bold text-indigo-300 group-hover:text-indigo-200">
                                    {q.course.name} {q.section?.module && `• ${q.section.module}`} {q.course.program.name && `• ${q.course.program.name}`}
                                  </span>
                                  <span className="text-xs text-slate-500 mt-1">{q.section?.title || "Bilinmeyen Bölüm"}</span>
                                </Link>
                              ) : (
                                <>
                                  <div className="font-bold text-indigo-300">
                                    {q.course?.name || "Bilinmeyen Ders"} {q.section?.module && `• ${q.section.module}`} {q.course?.program?.name && `• ${q.course.program.name}`}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">{q.section?.title || "Bilinmeyen Bölüm"}</div>
                                </>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm font-semibold">{q.text}</p>
                              {q.explanation && (
                                <p className="text-xs text-slate-400 mt-2 bg-slate-900/50 p-2 rounded border border-white/[0.03] italic">
                                  {q.explanation}
                                </p>
                              )}
                            </td>
                            <td className="py-4 px-4 text-xs space-y-1">
                              {parsedOptions.map((opt, oIdx) => (
                                <div key={oIdx} className={`p-1 rounded ${opt.startsWith(q.correct) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400'}`}>
                                  {opt}
                                </div>
                              ))}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleResolve(q.id)}
                                disabled={isPending}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-medium text-xs disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Düzeltildi
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {questionTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-xs text-slate-400">Sayfa {questionPage} / {questionTotalPages} ({filteredQuestions.length} soru)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setQuestionPage(p => Math.max(1, p - 1))}
                      disabled={questionPage === 1}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setQuestionPage(p => Math.min(questionTotalPages, p + 1))}
                      disabled={questionPage === questionTotalPages}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOT KALİTESİ */}
          {activeTab === "quality" && (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-xl font-bold">Ders Notu Kalite & Kontrolör Takip Paneli</h2>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-indigo-500 transition-colors w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="Bölüm veya ders ara..."
                    value={sectionSearch}
                    onChange={(e) => { setSectionSearch(e.target.value); setSectionPage(1); }}
                    className="bg-transparent w-full text-sm text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-sm">
                      <th className="py-3 px-4 font-medium">Bölüm / Ders</th>
                      <th className="py-3 px-4 font-medium text-center">Durum</th>
                      <th className="py-3 px-4 font-medium text-center">Denetim Skorları</th>
                      <th className="py-3 px-4 font-medium">Tespit Edilen Kılcal Eksikler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSections.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">Bölüm bulunamadı.</td>
                      </tr>
                    ) : (
                      paginatedSections.map((sec) => {
                        let issuesObj: any = {}
                        try {
                          issuesObj = JSON.parse(sec.verificationIssues || "{}")
                        } catch {
                          issuesObj = {}
                        }

                        const score = sec.verificationScore ?? -1
                        const isOK = score >= 95
                        const issuesList = [
                          ...(issuesObj.missingTopics || []).map((t: string) => `Eksik: ${t}`),
                          ...(issuesObj.issues || []).map((i: string) => `Hata: ${i}`),
                          ...(issuesObj.auditResult?.missingDetails || []).map((d: string) => `Detay Eksiği: ${d}`),
                          ...(issuesObj.auditResult?.contradictions || []).map((c: string) => `Çelişki: ${c}`)
                        ]

                        return (
                          <tr key={sec.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-4">
                              {sec.course?.program?.slug && sec.course?.slug ? (
                                <Link
                                  href={`/program/${sec.course.program.slug}/${sec.course.slug}`}
                                  className="hover:underline hover:text-indigo-400 group flex flex-col"
                                >
                                  <span className="font-bold text-sm text-slate-200 group-hover:text-indigo-300">
                                    {sec.title}
                                  </span>
                                  <span className="text-xs text-slate-500 mt-1">
                                    {sec.course.name} {sec.module && `• ${sec.module}`} {sec.course.program.name && `• ${sec.course.program.name}`}
                                  </span>
                                </Link>
                              ) : (
                                <>
                                  <div className="font-bold text-sm text-slate-200">{sec.title}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {sec.course?.name} {sec.module && `• ${sec.module}`} {sec.course?.program?.name && `• ${sec.course.program.name}`}
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sec.processed
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}>
                                {sec.processed ? "Onaylandı" : "İşleniyor"}
                              </span>
                            </td>
                            <td 
                              className={`py-4 px-4 text-center font-mono font-bold select-none transition-all ${
                                score !== -1 
                                  ? "cursor-pointer hover:bg-white/[0.04] active:scale-95" 
                                  : ""
                              }`}
                              onClick={() => {
                                if (score !== -1) {
                                  setActiveSectionForHistory(sec)
                                }
                              }}
                              title={score !== -1 ? "Detaylı Zaman Tüneli Raporunu Aç" : undefined}
                            >
                              {score === -1 ? (
                                <span className="text-slate-600 text-xs">Puanlanmadı</span>
                              ) : (
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`text-xs ${isOK ? 'text-emerald-400' : 'text-rose-400'} flex items-center gap-1`}>
                                    🔍 Kontrolör: %{score}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-sans tracking-wide font-bold ${
                                    issuesObj.auditResult?.passed 
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  }`}>
                                    Müfettiş: {issuesObj.auditResult?.passed ? "PASS" : "FAIL"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td 
                              className={`py-4 px-4 text-xs text-slate-400 select-none transition-all ${
                                issuesList.length > 0 
                                  ? "cursor-pointer hover:bg-white/[0.04] active:scale-95" 
                                  : ""
                              }`}
                              onClick={() => {
                                if (issuesList.length > 0) {
                                  setActiveSectionForHistory(sec)
                                } else if (score !== -1) {
                                  setActiveSectionForHistory(sec)
                                }
                              }}
                              title={issuesList.length > 0 ? "Eksik Bulgu Raporunu Aç" : undefined}
                            >
                              {score === -1 ? (
                                <div className="flex items-center gap-1 text-slate-500 font-medium italic">
                                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                                  Eksik analizi bekleniyor...
                                </div>
                              ) : issuesList.length === 0 ? (
                                <div className="flex items-center gap-1 text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Kusursuz (Eksik Yok)
                                </div>
                              ) : (
                                <ul className="list-disc pl-4 space-y-1 text-slate-400 max-w-md">
                                  {issuesList.slice(0, 3).map((item, idx) => (
                                    <li key={idx} className="truncate">{item}</li>
                                  ))}
                                  {issuesList.length > 3 && (
                                    <li className="text-indigo-400 font-semibold list-none pl-0 mt-1">
                                      + {issuesList.length - 3} adet daha bulgu mevcut.
                                    </li>
                                  )}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {sectionTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-xs text-slate-400">Sayfa {sectionPage} / {sectionTotalPages} ({filteredSections.length} bölüm)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSectionPage(p => Math.max(1, p - 1))}
                      disabled={sectionPage === 1}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSectionPage(p => Math.min(sectionTotalPages, p + 1))}
                      disabled={sectionPage === sectionTotalPages}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Zaman Tüneli & Rapor Detay Modalı */}
      {mounted && createPortal(
        <AnimatePresence>
          {activeSectionForHistory && (
            <SectionQualityModal
              section={activeSectionForHistory}
              onClose={() => setActiveSectionForHistory(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
