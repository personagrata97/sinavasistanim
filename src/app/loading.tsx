export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center" role="status" aria-label="Yükleniyor">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
        </div>
        <p className="text-sm text-slate-500 font-medium animate-pulse">Yükleniyor...</p>
      </div>
    </div>
  )
}
