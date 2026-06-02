"use client"

import { ReactNode, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LucideIcon, AlertCircle } from "lucide-react"

// ==================== DESIGN SYSTEM COMPONENTS ====================
// Tüm sayfalarda tutarlı tasarım dili sağlayan merkezi bileşenler

// --- Card: Standart kart wrapper ---
export function Card({ 
  children, 
  className = "", 
  hover = true,
  onClick 
}: { 
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] ${
        hover ? "hover:bg-white/[0.05] transition-colors" : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  )
}

// --- StatBox: İstatistik kutusu ---
export function StatBox({ 
  icon: Icon,
  value, 
  label,
  color = "blue",
  className = ""
}: { 
  icon?: LucideIcon
  value: string | number
  label: string
  color?: "blue" | "green" | "amber" | "red" | "violet" | "sky" | "emerald" | "indigo"
  className?: string
}) {
  const colorMap = {
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", icon: "text-blue-500" },
    green: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", icon: "text-emerald-500" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "text-amber-500" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: "text-red-500" },
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", icon: "text-violet-500" },
    sky: { bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-400", icon: "text-sky-500" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", icon: "text-emerald-500" },
    indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", icon: "text-indigo-500" },
  }
  const c = colorMap[color]

  return (
    <div className={`p-4 rounded-xl ${c.bg} border ${c.border} text-center ${className}`}>
      {Icon && <Icon className={`w-4 h-4 ${c.icon} mx-auto mb-1`} />}
      <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

// --- Badge: Etiket rozeti ---
export function Badge({
  children,
  color = "blue",
  className = ""
}: {
  children: ReactNode
  color?: "blue" | "green" | "amber" | "red" | "violet" | "indigo" | "slate"
  className?: string
}) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colorMap[color]} ${className}`}>
      {children}
    </span>
  )
}

// --- ActionButton: Gradient ana buton ---
export function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className = ""
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "danger"
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30",
    secondary: "bg-white/5 hover:bg-white/10 text-slate-400 border border-white/[0.08]",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/20",
  }
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3.5 text-base rounded-xl",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

// --- EmptyState: Boş durum gösterimi ---
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

// --- SectionHeader: Bölüm başlığı ---
export function SectionHeader({
  title,
  count,
  children
}: {
  title: string
  count?: number
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold">
        {title}
        {count !== undefined && (
          <span className="text-slate-500 font-normal ml-2">({count})</span>
        )}
      </h2>
      {children}
    </div>
  )
}

// --- ProgressRing: Dairesel ilerleme göstergesi ---
export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  color = "#3b82f6",
  className = ""
}: {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="rgba(255,255,255,0.06)"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold text-slate-300">
        %{Math.round(progress)}
      </span>
    </div>
  )
}

// --- ModuleBadge: MASAK modül rozeti ---
export function ModuleBadge({ module }: { module: string | null | undefined }) {
  if (!module) return null
  
  const isModule1 = module === "Modül 1"
  return (
    <Badge color={isModule1 ? "indigo" : "violet"}>
      {isModule1 ? "📘" : "📗"} {module}
    </Badge>
  )
}

// --- ImportanceBadge: Önem derecesi rozeti ---
export function ImportanceBadge({ importance }: { importance: string | null | undefined }) {
  if (!importance) return null
  
  if (importance === "High") return <Badge color="red">🔴 Kritik</Badge>
  if (importance === "Medium") return <Badge color="amber">🟡 Önemli</Badge>
  return <Badge color="slate">🟢 Ek Bilgi</Badge>
}

// --- ReportButton: Hatalı içerik bildir ---
export function ReportButton({
  onReport,
  reported = false,
  className = ""
}: {
  onReport: () => void
  reported?: boolean
  className?: string
}) {
  return (
    <Tooltip content={reported ? "Bildirildi" : "Bu içeriği hatalı olarak bildir"}>
      <button
        onClick={(e) => { e.stopPropagation(); onReport() }}
        disabled={reported}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
          reported 
            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-default"
            : "bg-white/[0.03] hover:bg-red-500/10 text-slate-500 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20"
        } ${className}`}
      >
        <AlertCircle className="w-3 h-3" />
        {reported ? "Bildirildi" : "Hatalı Bildir"}
      </button>
    </Tooltip>
  )
}
// --- Tooltip: Premium dairesel/metinsel ipucu bileşeni ---
export function Tooltip({
  content,
  children,
  className = ""
}: {
  content: string
  children: ReactNode
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: '50%', right: 'auto', transform: 'translateX(-50%)' })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement> | React.FocusEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200
    const halfTooltip = 160 // 320 max-width / 2

    let leftStr = `${rect.left + rect.width / 2}px`
    let rightStr = 'auto'
    let transformStr = 'translate(-50%, -100%)'
    let topVal = rect.top - 8 // 8px mb-2 equivalent

    // Ekrana taşma denetimi
    if (rect.left < halfTooltip) {
      leftStr = `${rect.left}px`
      transformStr = 'translate(0, -100%)'
    } else if (viewportWidth - rect.right < halfTooltip) {
      leftStr = 'auto'
      rightStr = `${viewportWidth - rect.right}px`
      transformStr = 'translate(0, -100%)'
    }

    setCoords({
      top: topVal,
      left: leftStr,
      right: rightStr,
      transform: transformStr
    })
    setVisible(true)
  }

  const tooltipContent = (
    <AnimatePresence>
      {visible && content && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            right: coords.right,
            transform: coords.transform,
            zIndex: 9999
          }}
          className={`w-max max-w-[280px] sm:max-w-[320px] px-3 py-2 rounded-xl bg-[#090d16]/98 border border-white/[0.1] text-[11px] text-slate-200 shadow-2xl shadow-black/80 backdrop-blur-lg font-medium text-center leading-relaxed pointer-events-none whitespace-normal break-words ${className}`}
        >
          {content}
          <div 
            style={{
              position: 'absolute',
              top: '100%',
              left: coords.left !== 'auto' && coords.transform.startsWith('translate(0') ? "12px" : coords.right !== 'auto' ? "auto" : "50%",
              right: coords.right !== 'auto' ? "12px" : "auto",
              transform: coords.transform.startsWith('translate(0') ? "none" : "translateX(-50%)"
            }}
            className="border-4 border-transparent border-t-[#090d16]/98" 
          />
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <span 
      className="relative inline-block cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
      onFocus={handleMouseEnter}
      onBlur={() => setVisible(false)}
    >
      {children}
      {mounted && typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </span>
  )
}

// ==================== INPUT: Merkezi Form Elemanı ====================
export function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  className = "",
  disabled = false,
}: {
  type?: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: LucideIcon
  className?: string
  disabled?: boolean
}) {
  return (
    <div className="relative w-full">
      {Icon && <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-white/5 border border-white/10 rounded-xl py-2 ${Icon ? "pl-9" : "pl-4"} pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      />
    </div>
  )
}

// ==================== TABS: Merkezi Sekme Çubuğu ====================
export function Tabs({
  tabs,
  activeTab,
  onChange,
  className = "",
}: {
  tabs: { id: string; label: string; icon?: LucideIcon }[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <nav className={`flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${className}`} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {tab.icon && <tab.icon className="w-4 h-4" />}
          <span className="hidden sm:inline">{tab.label}</span>
          <span className="sm:hidden">{tab.label.length > 6 ? tab.label.substring(0, 5) + '.' : tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
