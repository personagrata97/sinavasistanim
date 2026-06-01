"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  name?: string
}

interface State {
  hasError: boolean
  error?: Error
}

function translateErrorMessage(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes("is not defined")) {
    const varName = msg.split(" ")[0] || ""
    return `Koddaki bir değişken tanımlı değil: ${varName}. Lütfen geliştiriciye bildirin.`
  }
  if (lower.includes("cannot read properties of null") || lower.includes("cannot read property")) {
    return "Olmayan veya boş (null) bir verinin detayına erişilmeye çalışıldı. Lütfen geliştiriciye bildirin."
  }
  if (lower.includes("is not a function")) {
    return "Sistemde çağrılmaya çalışılan fonksiyon mevcut değil. Lütfen geliştiriciye bildirin."
  }
  return msg || "Beklenmeyen bir hata oluştu."
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || "unknown"}]`, error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center" role="alert">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Bir şeyler ters gitti</h3>
          <p className="text-sm text-slate-400 mb-4">
            {this.props.name && <span className="text-red-400/70">[{this.props.name}] </span>}
            {translateErrorMessage(this.state.error?.message || "")}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-bold hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
