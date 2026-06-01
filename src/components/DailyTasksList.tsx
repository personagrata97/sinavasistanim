"use client"

import { useState } from "react"
import { CheckCircle2, Circle, Clock, BookOpen, Brain, HelpCircle } from "lucide-react"
import { toggleTaskCompletion } from "@/lib/actions"
import { toast } from "sonner"
import Link from "next/link"

export default function DailyTasksList({ initialTasks }: { initialTasks: any[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggle = async (taskId: string, currentStatus: boolean) => {
    if (loading) return
    setLoading(taskId)
    
    // Optik iyimser güncelleme
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t))
    
    const res = await toggleTaskCompletion(taskId, !currentStatus)
    if (res.success) {
      if (!currentStatus) {
        toast.success("Görev tamamlandı! +50 XP kazandın! 🎉")
      }
    } else {
      // Geri al
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: currentStatus } : t))
      toast.error("Görev güncellenirken bir hata oluştu.")
    }
    
    setLoading(null)
  }

  if (tasks.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] text-center">
        <Clock className="w-8 h-8 text-slate-500 mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-bold text-slate-300 mb-1">Bugün için planlanmış görevin yok</h3>
        <p className="text-sm text-slate-500">
          Sınav tarihini belirleyerek kendine özel bir çalışma programı oluşturabilirsin.
        </p>
      </div>
    )
  }

  const completedCount = tasks.filter(t => t.completed).length
  const progress = Math.round((completedCount / tasks.length) * 100)

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-slate-900/40 border border-indigo-500/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Bugünün Görevleri
          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
            {completedCount}/{tasks.length}
          </span>
        </h2>
        <span className="text-sm font-bold text-indigo-400">%{progress} Tamamlandı</span>
      </div>

      <div className="w-full h-2 bg-white/5 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <div className="space-y-3">
        {tasks.map(task => {
          const isCompleted = task.completed
          
          let Icon = BookOpen
          let iconColor = "text-blue-400"
          let href = `/program/${task.course.program?.slug}/${task.course.slug}?tab=overview`
          
          if (task.type === "read") {
            Icon = BookOpen
            iconColor = "text-blue-400"
            href = `/program/${task.course.program?.slug}/${task.course.slug}?tab=notes`
          } else if (task.type === "flashcard") {
            Icon = Brain
            iconColor = "text-purple-400"
            href = `/program/${task.course.program?.slug}/${task.course.slug}?tab=flashcards`
          } else if (task.type === "question") {
            Icon = HelpCircle
            iconColor = "text-amber-400"
            href = `/program/${task.course.program?.slug}/${task.course.slug}?tab=questions`
          } else if (task.type === "mock_exam") {
            Icon = CheckCircle2
            iconColor = "text-emerald-400"
            href = `/program/${task.course.program?.slug}/${task.course.slug}?tab=mock_exam`
          }

          return (
            <div 
              key={task.id} 
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                isCompleted 
                  ? "bg-white/[0.01] border-white/[0.03] opacity-60" 
                  : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
              }`}
            >
              <button 
                onClick={() => handleToggle(task.id, isCompleted)}
                disabled={loading === task.id}
                className={`mt-0.5 flex-shrink-0 transition-colors ${loading === task.id ? 'opacity-50' : ''}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-500 hover:text-indigo-400" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold mb-1 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                  {task.task}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Icon className={`w-3.5 h-3.5 ${isCompleted ? 'text-slate-500' : iconColor}`} />
                    {task.duration}
                  </span>
                  <span>•</span>
                  <Link href={href} className="hover:text-indigo-400 hover:underline truncate">
                    {task.course.name}
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
