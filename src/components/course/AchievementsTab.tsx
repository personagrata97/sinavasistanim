"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Trophy, Lock, Target, FileText, BookOpen, Dumbbell, Crown, Diamond, Flame, Zap, Brain, ClipboardList, CheckCircle, Award, Sprout, GraduationCap, Medal, Crosshair, Swords, Heart, Star, Sparkles } from "lucide-react"
import { LoadingSkeleton } from "./shared"

// ==================== LEVEL SYSTEM ====================
const LEVEL_NAMES = [
  { min: 1, name: "Çaylak", iconName: "Sprout", color: "text-slate-400" },
  { min: 2, name: "Öğrenci", iconName: "BookOpen", color: "text-blue-400" },
  { min: 5, name: "Uzman", iconName: "Target", color: "text-indigo-400" },
  { min: 10, name: "Profesör", iconName: "GraduationCap", color: "text-amber-400" },
  { min: 20, name: "Efsane", iconName: "Crown", color: "text-emerald-400" },
]

const LEVEL_ICON_MAP: Record<string, any> = {
  Sprout, BookOpen, Target, GraduationCap, Crown
}

const ACHIEVEMENT_ICON_MAP: Record<string, any> = {
  "🎯": Crosshair, "📝": FileText, "📚": BookOpen, "🦾": Dumbbell, "👑": Crown,
  "💎": Diamond, "🔥": Flame, "💪": Swords, "⚡": Zap, "🃏": Star,
  "🧠": Brain, "📋": ClipboardList, "✅": CheckCircle, "🏆": Trophy, "💯": Medal,
  "🌱": Sprout, "📖": BookOpen,
}

export function getLevelInfo(level: number) {
  let info = LEVEL_NAMES[0]
  for (const l of LEVEL_NAMES) {
    if (level >= l.min) info = l
  }
  return info
}

// ==================== USER LEVEL BADGE ====================
export function UserLevelBadge() {
  const [data, setData] = useState<{ totalXP: number; level: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { getUserAchievements } = await import("@/lib/actions")
      const res = await getUserAchievements()
      setData({ totalXP: res.totalXP, level: res.level })
    }
    load()
  }, [])

  if (!data) return null

  const info = getLevelInfo(data.level)
  const xpInLevel = data.totalXP % 500
  const xpProgress = (xpInLevel / 500) * 100

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
        {(() => { const IconComp = LEVEL_ICON_MAP[info.iconName]; return IconComp ? <IconComp className={`w-6 h-6 ${info.color}`} /> : null })()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-bold ${info.color}`}>Seviye {data.level}: {info.name}</span>
          <span className="text-[10px] text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">{data.totalXP} XP</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-slate-600">{xpInLevel}/500 XP</span>
          <span className="text-[9px] text-slate-600">Sonraki seviye</span>
        </div>
      </div>
    </div>
  )
}

// ==================== ACHIEVEMENTS TAB ====================
export default function AchievementsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { getUserAchievements } = await import("@/lib/actions")
      const res = await getUserAchievements()
      setData(res)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingSkeleton />
  if (!data) return null

  const earned = data.allDefinitions?.filter((d: any) => d.earned) || []
  const locked = data.allDefinitions?.filter((d: any) => !d.earned) || []
  const info = getLevelInfo(data.level)

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/15 text-center">
          <div className="text-3xl font-bold text-indigo-400">{data.level}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">SEVİYE</div>
          <div className={`text-xs font-bold mt-1 flex items-center justify-center gap-1 ${info.color}`}>{(() => { const IC = LEVEL_ICON_MAP[info.iconName]; return IC ? <IC className="w-3.5 h-3.5" /> : null })()} {info.name}</div>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/15 text-center">
          <div className="text-3xl font-bold text-amber-400">{data.totalXP}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">TOPLAM XP</div>
          <div className="text-xs text-slate-600 mt-1">{500 - (data.totalXP % 500)} XP sonraki seviye</div>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 text-center">
          <div className="text-3xl font-bold text-emerald-400">{earned.length}/{data.allDefinitions?.length || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">ROZET</div>
          <div className="text-xs text-slate-600 mt-1">{locked.length} adet kilitli</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Seviye {data.level}</span>
          <span>Seviye {data.level + 1}</span>
        </div>
        <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(data.totalXP % 500) / 5}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-full"
          />
        </div>
      </div>

      {/* Earned Achievements */}
      {earned.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Kazanılan Rozetler ({earned.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {earned.map((a: any) => (
              <motion.div
                key={a.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 text-center"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  {(() => { const IC = ACHIEVEMENT_ICON_MAP[a.icon]; return IC ? <IC className="w-5 h-5 text-amber-400" /> : <Trophy className="w-5 h-5 text-amber-400" /> })()}
                </div>
                <div className="text-xs font-bold text-white">{a.title}</div>
                <div className="text-[10px] text-slate-500 mt-1">{a.description}</div>
                <div className="text-[9px] text-amber-400/80 mt-2 font-bold">+{a.xp} XP</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Kilitli Rozetler ({locked.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {locked.map((a: any) => (
              <div
                key={a.key}
                className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] text-center opacity-50"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/5 flex items-center justify-center">
                  {(() => { const IC = ACHIEVEMENT_ICON_MAP[a.icon]; return IC ? <IC className="w-5 h-5 text-slate-500" /> : <Lock className="w-5 h-5 text-slate-600" /> })()}
                </div>
                <div className="text-xs font-bold text-slate-500">{a.title}</div>
                <div className="text-[10px] text-slate-600 mt-1">{a.description}</div>
                <div className="text-[9px] text-slate-600 mt-2 font-bold">+{a.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
