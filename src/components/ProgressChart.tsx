"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart } from "recharts"

interface ProgressChartProps {
  data: { name: string; puan: number; tarih: string }[]
  passingScore: number
}

export default function ProgressChart({ data, passingScore }: ProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="puanGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis 
          dataKey="tarih" 
          tick={{ fontSize: 10, fill: "#64748b" }} 
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={false}
        />
        <YAxis 
          domain={[0, 100]} 
          tick={{ fontSize: 10, fill: "#64748b" }} 
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontSize: "12px",
            color: "#e2e8f0",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
          formatter={(value: any) => [`${value} puan`, "Skor"]}
          labelFormatter={(label: any) => `📅 ${label}`}
        />
        <ReferenceLine 
          y={passingScore} 
          stroke="#f59e0b" 
          strokeDasharray="6 4" 
          strokeWidth={1.5}
          label={{ 
            value: `Geçme: ${passingScore}`, 
            position: "insideTopRight", 
            fill: "#f59e0b", 
            fontSize: 10,
            fontWeight: "bold"
          }} 
        />
        <Area
          type="monotone"
          dataKey="puan"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#puanGradient)"
          dot={{ r: 4, fill: "#6366f1", stroke: "#1e293b", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#818cf8", stroke: "#1e293b", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
