"use client"

import { useEffect, useRef, useState } from "react"

export default function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState(false)

  useEffect(() => {
    async function renderMermaid() {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#1e3a5f",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#38bdf8",
            lineColor: "#64748b",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0f172a",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "13px",
            nodeBorder: "#38bdf8",
            mainBkg: "#1e3a5f",
            clusterBkg: "#0f172a",
            edgeLabelBackground: "#1e293b",
          },
          flowchart: { curve: "basis", padding: 15, htmlLabels: true },
          securityLevel: "loose",
        })

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        
        function wrapLongText(str: string, maxLineLength = 15): string {
          if (str.includes('<br>') || str.includes('<br/>') || str.toLowerCase().includes('<br')) return str;
          if (str.length <= maxLineLength || !str.includes(' ')) return str;
          const words = str.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          words.forEach(word => {
            if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
              currentLine = (currentLine + ' ' + word).trim();
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) lines.push(currentLine);
          return lines.join('<br>');
        }

        let cleanedChart = chart
          .replace(/^\s*style\s+[^\n]+/gm, '')
          .replace(/^\s*classDef\s+[^\n]+/gm, '')
          .replace(/^\s*class\s+[^\n]+/gm, '');

        const processedChart = cleanedChart.replace(/([a-zA-Z0-9_-]+)({\s*"([^"]+)"\s*}|{\s*([^{}]+)\s*}|\[\s*"([^"]+)"\s*\]|\[\s*([^\[\]]+)\s*\]|\(\s*"([^"]+)"\s*\)|\(\s*([^\(\)]+)\s*\))/g, (m, nodeId, shapes, g1, g2, g3, g4, g5, g6) => {
          const rawText = g1 || g2 || g3 || g4 || g5 || g6 || '';
          const wrappedText = wrapLongText(rawText.trim(), 15);
          if (shapes.startsWith('{')) return `${nodeId}{"${wrappedText}"}`;
          if (shapes.startsWith('[')) return `${nodeId}["${wrappedText}"]`;
          if (shapes.startsWith('(')) return `${nodeId}("${wrappedText}")`;
          return m;
        });

        const { svg: renderedSvg } = await mermaid.render(id, processedChart.trim())
        setSvg(renderedSvg)
      } catch (e) {
        console.warn("[Mermaid] Render failed:", e)
        setError(true)
      }
    }

    renderMermaid()
  }, [chart])

  if (error) {
    // Fallback: show warning + collapsible raw code
    return (
      <div className="my-4 p-4 bg-amber-950/30 rounded-xl border border-amber-700/40 overflow-x-auto">
        <div className="flex items-center gap-2 text-amber-400 text-xs mb-2">
          <span>⚠️</span>
          <span className="font-medium">Bu diyagram görüntülenemiyor</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">Diyagram sözdiziminde bir sorun var. İçerik aşağıda ham kod olarak gösterilmektedir.</p>
        <details className="group">
          <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
            📊 Ham diyagram kodunu göster
          </summary>
          <pre className="mt-2 text-xs text-slate-400 font-mono whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg">{chart}</pre>
        </details>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-4 p-6 bg-slate-900/50 rounded-xl border border-slate-700/30 flex items-center justify-center">
        <div className="animate-pulse text-xs text-slate-500">Diyagram yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="mermaid-diagram-wrapper my-4 p-4 bg-slate-900/60 rounded-xl border border-sky-500/10 overflow-x-auto">
      <style>{`
        @media print {
          .mermaid-diagram-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 15px auto !important;
            page-break-inside: avoid !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
          }
          .mermaid-diagram-wrapper > div:last-child {
            display: block !important;
            width: 100% !important;
            margin: 0 auto !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          .mermaid-diagram-wrapper svg {
            display: block !important;
            margin: 0 auto !important;
            /* Do NOT override max-width or width here */
            height: auto !important;
          }
          .mermaid-diagram-wrapper svg rect,
          .mermaid-diagram-wrapper svg polygon,
          .mermaid-diagram-wrapper svg circle,
          .mermaid-diagram-wrapper svg ellipse,
          .mermaid-diagram-wrapper svg path.node {
            fill: #f8fafc !important;
            stroke: #1e3a5f !important;
            stroke-width: 1.5px !important;
          }
          .mermaid-diagram-wrapper svg .label,
          .mermaid-diagram-wrapper svg text,
          .mermaid-diagram-wrapper svg span {
            fill: #0f172a !important;
            color: #0f172a !important;
            font-family: 'Inter', sans-serif !important;
            font-weight: 500 !important;
          }
          .mermaid-diagram-wrapper svg .edgePath .path,
          .mermaid-diagram-wrapper svg .edgePath path,
          .mermaid-diagram-wrapper svg path.link,
          .mermaid-diagram-wrapper svg path.connection {
            stroke: #475569 !important;
            stroke-width: 1.5px !important;
          }
          .mermaid-diagram-wrapper svg .markerPath,
          .mermaid-diagram-wrapper svg marker path,
          .mermaid-diagram-wrapper svg .arrowheadPath {
            fill: #475569 !important;
            stroke: #475569 !important;
          }
          .mermaid-diagram-wrapper svg .edgeLabel rect {
            fill: #ffffff !important;
            opacity: 0.95 !important;
          }
          .mermaid-diagram-wrapper svg .edgeLabel text {
            fill: #334155 !important;
            font-size: 11px !important;
            font-weight: 600 !important;
          }
        }
      `}</style>
      <div className="text-[10px] text-sky-400/60 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Akış Şeması
      </div>
      <div 
        dangerouslySetInnerHTML={{ __html: svg }} 
        className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      />
    </div>
  )
}
