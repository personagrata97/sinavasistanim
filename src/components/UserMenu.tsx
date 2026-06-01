"use client"

import { signOut, useSession } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import { LogOut, User, ChevronDown } from "lucide-react"

export default function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  if (!session?.user) return null

  const user = session.user as any
  const initials = (user.name || user.email || "?").substring(0, 2).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
          {initials}
        </div>
        <span className="text-sm font-medium text-slate-300 hidden md:block max-w-[120px] truncate">
          {user.name || user.email}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 py-2 rounded-xl bg-[#0f172a] border border-white/[0.08] shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="text-sm font-bold text-white truncate">{user.name || "Kullanıcı"}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
            {user.role === "admin" && (
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400">Admin</span>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/[0.03] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      )}
    </div>
  )
}
