﻿import { useEffect, useMemo, useState } from "react"
import HeaderDefault from "../components/HeaderDefault"
import StaffSidebar from "../components/StaffSidebar"
import { api } from "../services/apiClient"
import "../styles/pages/staff-schedule.css"

const palette = [
  { bg: "rgb(248 180 180)", border: "#f87171" },
  { bg: "rgb(252 211 171)", border: "#fb923c" },
  { bg: "rgb(254 240 138)", border: "#facc15" },
  { bg: "rgb(187 247 208)", border: "#34d399" },
  { bg: "rgb(191 219 254)", border: "#60a5fa" },
  { bg: "rgb(199 210 254)", border: "#818cf8" },
  { bg: "rgb(233 213 255)", border: "#c084fc" },
]

const getColor = (id) => {
  if (!id) return palette[0]
  const idx = Math.abs(Number(id)) % palette.length
  return palette[idx]
}

const formatTimeRange = (start, end) => {
  const s = new Date(start)
  const e = new Date(end)
  const timeStr = `${s.toLocaleDateString("vi-VN")} | ${s.getHours().toString().padStart(2, "0")}:${s
    .getMinutes()
    .toString()
    .padStart(2, "0")}-${e.getHours().toString().padStart(2, "0")}:${e.getMinutes().toString().padStart(2, "0")}`
  return timeStr
}

export default function StaffSchedulePage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [range, setRange] = useState("week") // today | week | month

  const { from, to, label } = useMemo(() => {
    const now = new Date()
    let fromDate = new Date(now)
    let toDate = new Date(now)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setHours(23, 59, 59, 999)
    if (range === "today") {
      // keep today
    } else if (range === "week") {
      toDate.setDate(now.getDate() + 7)
      toDate.setHours(23, 59, 59, 999)
    } else {
      // month
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      fromDate.setHours(0, 0, 0, 0)
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      toDate.setHours(23, 59, 59, 999)
    }
    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      label:
        range === "today"
          ? "Hôm nay"
          : range === "week"
          ? "7 ngày tới"
          : `Tháng ${fromDate.getMonth() + 1}/${fromDate.getFullYear()}`,
    }
  }, [range])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await api.getMyEvents({ from, to, page: 1, pageSize: 200 })
        const raw = res?.data?.data || res?.data || (Array.isArray(res) ? res : [])
        const now = new Date()
        // Chỉ giữ ca chưa kết thúc (đang diễn ra hoặc tương lai)
        const upcoming = (raw || []).filter((evt) => {
          const end = evt?.end_at ? new Date(evt.end_at) : null
          const start = evt?.start_at ? new Date(evt.start_at) : null
          const compareTime = end?.getTime() ?? start?.getTime()
          return compareTime ? compareTime >= now.getTime() : false
        })
        setEvents(upcoming)
      } catch (err) {
        setError(err.message || "Lỗi khi tải lịch làm")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [from, to])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
  }, [events])

  return (
    <div className="main-container">
      <HeaderDefault />
      <div className="flex-row-df">
        <StaffSidebar />
        <div className="staff-schedule-content">
          <div className="staff-schedule-header">
            <div>
              <h2 className="staff-schedule-title">Lịch làm của bạn</h2>
              <p className="staff-schedule-sub">{label}</p>
            </div>
            <div className="staff-schedule-filter">
              <button
                className={`staff-range-btn ${range === "today" ? "active" : ""}`}
                onClick={() => setRange("today")}
              >
                Hôm nay
              </button>
              <button
                className={`staff-range-btn ${range === "week" ? "active" : ""}`}
                onClick={() => setRange("week")}
              >
                Tuần
              </button>
              <button
                className={`staff-range-btn ${range === "month" ? "active" : ""}`}
                onClick={() => setRange("month")}
              >
                Tháng
              </button>
            </div>
          </div>

          {loading && <div className="staff-loading">Đang tải lịch...</div>}
          {error && !loading && <div className="staff-error-message">{error}</div>}
          {!loading && !error && sortedEvents.length === 0 && (
            <div className="staff-empty-state">Không có ca trong khoảng thời gian này.</div>
          )}

          {!loading && !error && sortedEvents.length > 0 && (
            <div className="staff-schedule-card-grid">
              {sortedEvents.map((event) => {
                const color = getColor(event.channel_id || event.channel?.id)
                const members = event.members?.map((m) => m.employee?.full_name).filter(Boolean) || []
                return (
                  <div
                    key={event.id}
                    className="staff-shift-card"
                    style={{ backgroundColor: color.bg, borderColor: color.border }}
                  >
                    <div className="staff-shift-channel">{event.channel?.name || "Kênh"}</div>
                    <div className="staff-shift-time">{formatTimeRange(event.start_at, event.end_at)}</div>
                    {members.length > 0 && <div className="staff-shift-members">{members.join(", ")}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
