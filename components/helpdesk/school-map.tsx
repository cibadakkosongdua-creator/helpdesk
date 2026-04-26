"use client"

import React, { useState } from "react"

export interface MapRoom {
  id: string
  label: string
  type: "class" | "wc" | "office" | "canteen" | "mushola" | "field"
  x: number
  y: number
  w: number
  h: number
  extra?: { x: number; y: number; w: number; h: number }
}

const ROOMS: MapRoom[] = [
  { id: "kelas-4b", label: "KELAS IVB", type: "class", x: 2, y: 2, w: 6, h: 6 },
  { id: "kelas-4a", label: "KELAS IVA", type: "class", x: 8, y: 2, w: 6, h: 6 },
  { id: "kelas-3a", label: "KELAS IIIA", type: "class", x: 14, y: 2, w: 6, h: 6 },
  { id: "kelas-5b", label: "KELAS VB", type: "class", x: 24, y: 2, w: 6, h: 6 },
  { id: "kelas-6b", label: "KELAS VIB", type: "class", x: 30, y: 2, w: 6, h: 6 },
  { id: "kelas-6a", label: "KELAS VIA", type: "class", x: 30, y: 8, w: 6, h: 6 },
  { id: "wc-r1", label: "WC", type: "wc", x: 37, y: 6, w: 3, h: 2 },
  { id: "wc-r2", label: "WC", type: "wc", x: 37, y: 8, w: 3, h: 2 },
  { id: "wc-r3", label: "WC", type: "wc", x: 37, y: 10, w: 3, h: 2 },
  { id: "wc-r4", label: "WC", type: "wc", x: 37, y: 12, w: 3, h: 2 },
  { id: "mushola", label: "MUSHOLA", type: "mushola", x: 2, y: 13, w: 3, h: 4, extra: { x: 3, y: 12, w: 1, h: 1 } },
  { id: "wc-l1", label: "WC", type: "wc", x: 2, y: 20, w: 3, h: 2 },
  { id: "wc-l2", label: "WC", type: "wc", x: 2, y: 22, w: 3, h: 2 },
  { id: "wc-l3", label: "WC", type: "wc", x: 2, y: 24, w: 3, h: 2 },
  { id: "kelas-3b", label: "KELAS IIIB", type: "class", x: 6, y: 11, w: 6, h: 6 },
  { id: "kelas-2ab", label: "KELAS IIA-B", type: "class", x: 6, y: 17, w: 6, h: 6 },
  { id: "kelas-1ab", label: "KELAS IA-B", type: "class", x: 6, y: 23, w: 6, h: 6 },
  { id: "kantor", label: "RUANG KANTOR", type: "office", x: 14, y: 23, w: 6, h: 6 },
  { id: "kelas-5a", label: "KELAS VA", type: "class", x: 20, y: 23, w: 6, h: 6 },
  { id: "kantin", label: "KANTIN", type: "canteen", x: 26, y: 23, w: 3, h: 6 },
  { id: "serbaguna", label: "RUANG SERBAGUNA", type: "class", x: 34, y: 21, w: 6, h: 6 },
  { id: "lapangan", label: "Lapangan Upacara", type: "field", x: 12, y: 9, w: 18, h: 12 },
]

export function SchoolMap({
  onSelect,
  selectedId,
}: {
  onSelect?: (roomLabel: string) => void
  selectedId?: string
}) {
  const GRID_SIZE = 20
  const [hovered, setHovered] = useState<string | null>(null)

  const getColor = (type: MapRoom["type"], isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return "fill-blue-500 stroke-blue-700"
    if (isHovered) return "fill-blue-200 stroke-blue-400"
    
    switch (type) {
      case "class": return "fill-pink-100/80 stroke-pink-300"
      case "wc": return "fill-yellow-200/80 stroke-yellow-400"
      case "office": return "fill-cyan-100/80 stroke-cyan-300"
      case "canteen": return "fill-amber-200/80 stroke-amber-400"
      case "mushola": return "fill-emerald-500/80 stroke-emerald-700"
      case "field": return "fill-transparent stroke-transparent hover:fill-black/5"
      default: return "fill-slate-100 stroke-slate-300"
    }
  }

  return (
    <div className="relative w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 custom-scrollbar">
      <div className="min-w-[800px] p-4">
        <svg viewBox="0 0 840 640" className="w-full h-auto drop-shadow-sm font-sans">
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <rect width={GRID_SIZE} height={GRID_SIZE} fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Main School Boundary */}
          <rect x={1*GRID_SIZE} y={1*GRID_SIZE} width={40*GRID_SIZE} height={29*GRID_SIZE} fill="none" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />

          {/* Flag */}
          <g transform={`translate(${18.5*GRID_SIZE}, ${16*GRID_SIZE})`} className="opacity-80">
            <rect x={0} y={0} width={2*GRID_SIZE} height={GRID_SIZE/2} fill="#ef4444" />
            <rect x={0} y={GRID_SIZE/2} width={2*GRID_SIZE} height={GRID_SIZE/2} fill="#ffffff" className="stroke-slate-200" strokeWidth="0.5" />
            <line x1={0} y1={0} x2={0} y2={3*GRID_SIZE} stroke="#94a3b8" strokeWidth="2" />
          </g>

          {/* Rooms */}
          {ROOMS.map((room) => {
            const isSelected = selectedId === room.label
            const isHovered = hovered === room.id
            const colorClass = getColor(room.type, isHovered, isSelected)
            
            return (
              <g
                key={room.id}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHovered(room.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect?.(room.label)}
              >
                {/* Main room rect */}
                <rect
                  x={room.x * GRID_SIZE}
                  y={room.y * GRID_SIZE}
                  width={room.w * GRID_SIZE}
                  height={room.h * GRID_SIZE}
                  className={`${colorClass} transition-colors duration-200`}
                  strokeWidth="1.5"
                />
                
                {/* Extra part (like Mushola Mihrab) */}
                {room.extra && (
                  <rect
                    x={room.extra.x * GRID_SIZE}
                    y={room.extra.y * GRID_SIZE}
                    width={room.extra.w * GRID_SIZE}
                    height={room.extra.h * GRID_SIZE}
                    className={`${colorClass} transition-colors duration-200`}
                    strokeWidth="1.5"
                  />
                )}

                {/* Label text */}
                {room.type !== "field" && (
                  <text
                    x={(room.x + room.w / 2) * GRID_SIZE}
                    y={(room.y + room.h / 2) * GRID_SIZE}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-bold select-none pointer-events-none transition-colors ${
                      isSelected || room.type === 'mushola' ? 'fill-white' : 'fill-slate-700 dark:fill-slate-900'
                    }`}
                    fontSize={room.type === "wc" ? "7" : "9"}
                  >
                    {room.label.split(" ").map((word, i, arr) => (
                      <tspan key={i} x={(room.x + room.w / 2) * GRID_SIZE} dy={i === 0 ? (arr.length === 1 ? 0 : -(arr.length - 1) * 5) : 11}>
                        {word}
                      </tspan>
                    ))}
                  </text>
                )}
                
                {/* Check icon if selected */}
                {isSelected && (
                  <circle cx={(room.x + room.w / 2) * GRID_SIZE} cy={(room.y + room.h / 2) * GRID_SIZE - 12} r="6" fill="#10b981" />
                )}
              </g>
            )
          })}
        </svg>
      </div>
      
      <div className="absolute bottom-4 left-4 flex gap-3 text-[10px] font-semibold bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm pointer-events-none">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-pink-100 border border-pink-300 rounded-sm"></div> Kelas</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-cyan-100 border border-cyan-300 rounded-sm"></div> Kantor</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 border border-emerald-700 rounded-sm"></div> Mushola</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-200 border border-yellow-400 rounded-sm"></div> WC</div>
      </div>
    </div>
  )
}
