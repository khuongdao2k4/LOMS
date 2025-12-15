"use client"

import { Tooltip } from "recharts"

export function ChartContainer({ config = {}, className = "", children }) {
  return (
    <div className={`chart-container-shad ${className}`} style={{ "--chart-1": Object.values(config)[0]?.color }}>
      {children}
    </div>
  )
}

export function ChartTooltip(props) {
  return <Tooltip {...props} />
}

export function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="chart-tooltip-row">
          <span className="dot" style={{ background: item.color }} />
          <span className="name">{item.name || item.dataKey}</span>
          <span className="value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export const ChartConfig = {}
