"use client"

// src/components/StaffScheduleInterface.jsx
import { useEffect, useMemo, useState } from "react"
import { request } from "../services/apiClient"
import EventDetailModal from "./EventDetailModal"
import "../styles/pages/schedule-interface.css"

const WEEKDAY_LABELS = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Phòng thủ: luôn coi input là array trước khi forEach
function groupEventsByDay(input) {
  const events = Array.isArray(input) ? input : []
  const map = {}
  events.forEach((ev) => {
    const start = ev.start_at || ev.startAt || ev.start_time || ev.startTime
    if (!start) return
    const d = new Date(start)
    const key = d.toISOString().slice(0, 10)
    if (!map[key]) map[key] = []
    map[key].push(ev)
  })
  return map
}

function formatHourRange(ev) {
  const start = ev.start_at || ev.startAt || ev.start_time || ev.startTime
  const end = ev.end_at || ev.endAt || ev.end_time || ev.endTime

  if (!start || !end) return ""

  const s = new Date(start)
  const e = new Date(end)
  const opts = { hour: "2-digit", minute: "2-digit" }

  return `${s.toLocaleTimeString("vi-VN", opts)} - ${e.toLocaleTimeString("vi-VN", opts)}`
}

const StaffScheduleInterface = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  // today | 7days | month — dùng cho nút Tuần / Tháng
  const [filterRange, setFilterRange] = useState("7days")
  const [events, setEvents] = useState([]) // luôn cố gắng giữ là array
  const [channels, setChannels] = useState([])
  const [selectedChannelIds, setSelectedChannelIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedEvent, setSelectedEvent] = useState(null)

  // ===== Load danh sách kênh (chỉ để lọc, nếu 404 thì coi như không có kênh) =====
  useEffect(() => {
    let ignore = false

    const loadChannels = async () => {
      try {
        const res = await request("/channel", { method: "GET" })
        if (ignore) return
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
        setChannels(items)
        setSelectedChannelIds(items.map((c) => c.id))
      } catch (err) {
        console.error("Failed to load channels", err)
        if (!ignore) {
          // Nếu backend không cho EMPLOYEE gọi /channel → chấp nhận, không crash
          setChannels([])
          setSelectedChannelIds([])
        }
      }
    }

    loadChannels()
    return () => {
      ignore = true
    }
  }, [])

  // ===== Tính from / to theo filterRange (Tuần / Tháng) =====
  const { from, to } = useMemo(() => {
    const base = startOfDay(currentDate)

    if (filterRange === "today") {
      return { from: startOfDay(base), to: endOfDay(base) }
    }

    if (filterRange === "month") {
      const first = new Date(base.getFullYear(), base.getMonth(), 1)
      const last = new Date(base.getFullYear(), base.getMonth() + 1, 0)
      return { from: startOfDay(first), to: endOfDay(last) }
    }

    // mặc định: 7 ngày tới (Tuần)
    const end = addDays(base, 7)
    return { from: startOfDay(base), to: endOfDay(end) }
  }, [currentDate, filterRange])

  // ===== Load lịch của nhân viên hiện tại: GET /api/v1/event/my =====
  useEffect(() => {
    let ignore = false

    const loadEvents = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await request("/event/my", {
          params: {
            from: from.toISOString(),
            to: to.toISOString(),
            page: 1,
            pageSize: 200,
          },
        })

        if (ignore) return

        let items
        if (Array.isArray(res?.items)) {
          items = res.items
        } else if (Array.isArray(res?.data)) {
          items = res.data
        } else if (Array.isArray(res)) {
          items = res
        } else {
          items = []
        }

        setEvents(items)
      } catch (err) {
        console.error("Failed to load my events", err)
        if (!ignore) {
          setError("Không tải được lịch làm. Vui lòng thử lại.")
          setEvents([]) // tránh để events = object gây lỗi forEach
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadEvents()
    return () => {
      ignore = true
    }
  }, [from, to])

  // ===== Lọc theo kênh =====
  const filteredEvents = useMemo(() => {
    const list = Array.isArray(events) ? events : []
    if (!selectedChannelIds || selectedChannelIds.length === 0) {
      return list
    }
    const setIds = new Set(selectedChannelIds)
    return list.filter((ev) => {
      const cid = ev.channel_id || ev.channelId || ev.channel?.id
      return !cid || setIds.has(cid)
    })
  }, [events, selectedChannelIds])

  const eventsByDay = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents])

  // ===== Danh sách ngày để hiển thị =====
  const daysList = useMemo(() => {
    const list = []
    let cursor = new Date(from)
    while (cursor <= to) {
      list.push(new Date(cursor))
      cursor = addDays(cursor, 1)
    }
    return list
  }, [from, to])

  const handlePrev = () => {
    if (filterRange === "month") {
      const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      setCurrentDate(prev)
    } else {
      setCurrentDate(addDays(currentDate, -7))
    }
  }

  const handleNext = () => {
    if (filterRange === "month") {
      const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      setCurrentDate(next)
    } else {
      setCurrentDate(addDays(currentDate, 7))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const toggleChannel = (id) => {
    setSelectedChannelIds((prev) => {
      const setIds = new Set(prev)
      if (setIds.has(id)) {
        setIds.delete(id)
      } else {
        setIds.add(id)
      }
      return Array.from(setIds)
    })
  }

  const monthTitle = useMemo(() => `tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`, [currentDate])

  const getChannelName = (channelId) => {
    return channels.find((ch) => ch.id === channelId)?.name || "Ca làm"
  }

  return (
    <div className="schedule-main-container staff-schedule-main">
      {/* ===== Panel trái: Filter sidebar ===== */}
      <div className="schedule-left-sidebar">
        <button type="button" className="schedule-create-button" disabled style={{ opacity: 0.5, cursor: "default" }}>
          📅 Lịch làm của tôi
        </button>

        <div className="schedule-mini-calendar-wrapper">
          <h3 className="schedule-mini-title">Hiển thị lịch</h3>
          <div className="schedule-filter-buttons">
            <button
              type="button"
              className={`schedule-filter-btn ${filterRange === "today" ? "active" : ""}`}
              onClick={() => setFilterRange("today")}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className={`schedule-filter-btn ${filterRange === "7days" ? "active" : ""}`}
              onClick={() => setFilterRange("7days")}
            >
              Tuần
            </button>
            <button
              type="button"
              className={`schedule-filter-btn ${filterRange === "month" ? "active" : ""}`}
              onClick={() => setFilterRange("month")}
            >
              Tháng
            </button>
          </div>
        </div>

        <div className="schedule-channel-filter">
          <h3 className="schedule-mini-title">Chọn kênh</h3>
          <div className="schedule-channel-cards">
            {channels.length === 0 && <div className="schedule-empty-text">Chưa có kênh nào được cấu hình.</div>}
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                className={`schedule-channel-card ${selectedChannelIds.includes(ch.id) ? "active" : ""}`}
                onClick={() => toggleChannel(ch.id)}
              >
                <div className="schedule-channel-card-dot" style={{ background: ch.color || "#409eff" }} />
                <span className="schedule-channel-card-name">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Panel phải: Schedule display ===== */}
      <div className="schedule-right-content">
        <div className="schedule-header">
          <div className="schedule-header-left">
            <button type="button" className="schedule-nav-button" onClick={handleToday}>
              Hôm nay
            </button>
            <button type="button" className="schedule-nav-button" onClick={handlePrev}>
              ‹
            </button>
            <button type="button" className="schedule-nav-button" onClick={handleNext}>
              ›
            </button>
            <span className="schedule-current-period">{monthTitle}</span>
          </div>
        </div>

        {loading && <div className="schedule-empty-state">Đang tải lịch làm...</div>}

        {error && !loading && <div className="schedule-error-state">{error}</div>}

        {!loading && !error && daysList.length === 0 && (
          <div className="schedule-empty-state">Không có ca làm nào trong khoảng thời gian này.</div>
        )}

        {!loading && !error && daysList.length > 0 && (
          <div className="schedule-simplified-view">
            {daysList.map((day) => {
              const key = day.toISOString().slice(0, 10)
              const dayEvents = eventsByDay[key] || []
              const dow = day.getDay()
              const label = WEEKDAY_LABELS[dow]
              const dateStr = `${label}, ${day.getDate()}/${day.getMonth() + 1}`

              return (
                <div key={key} className="schedule-day-card-wrapper">
                  <div className="schedule-day-title">{dateStr}</div>
                  {dayEvents.length === 0 ? (
                    <div className="schedule-event-empty">Không có ca</div>
                  ) : (
                    <div className="schedule-day-events">
                      {dayEvents.map((ev) => (
                        <div key={ev.id} className="schedule-event-card" onClick={() => setSelectedEvent(ev)}>
                          <div className="schedule-event-channel">
                            <div
                              className="schedule-event-channel-dot"
                              style={{
                                background: channels.find((ch) => ch.id === ev.channel_id)?.color || "#409eff",
                              }}
                            />
                            <span>{getChannelName(ev.channel_id)}</span>
                          </div>
                          <div className="schedule-event-time">{formatHourRange(ev)}</div>
                          {ev.members && ev.members.length > 0 && (
                            <div className="schedule-event-members">
                              {ev.members.slice(0, 3).map((member, idx) => (
                                <div key={idx} className="schedule-event-member-avatar" title={member.full_name}>
                                  {member.portrait_url ? (
                                    <img src={member.portrait_url || "/placeholder.svg"} alt={member.full_name} />
                                  ) : (
                                    <span>{member.full_name?.charAt(0) || "?"}</span>
                                  )}
                                </div>
                              ))}
                              {ev.members.length > 3 && (
                                <div className="schedule-event-member-more">+{ev.members.length - 3}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}

export default StaffScheduleInterface
