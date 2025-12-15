"use client"

import { useEffect, useState } from "react"
import MiniCalendar from "./MiniCalendar"
import EventDetailModal from "./EventDetailModal"
import EventEditModal from "./EventEditModal"
import CreateShiftModal from "./CreateShiftModal"
import { api } from "../services/apiClient"
import { getChannelColor } from "../utils/channelColors"
import "../styles/pages/schedule-interface.css"

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function isToday(date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function formatMonth(date) {
  const months = [
    "tháng 1",
    "tháng 2",
    "tháng 3",
    "tháng 4",
    "tháng 5",
    "tháng 6",
    "tháng 7",
    "tháng 8",
    "tháng 9",
    "tháng 10",
    "tháng 11",
    "tháng 12",
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

const HOUR_HEIGHT = 60 // pixels per hour
const START_HOUR = 0
/* Extended END_HOUR to 25 to show full 24:00 time slot */
const END_HOUR = 25 // Changed from 24 to 25 to display 24:00 (midnight)
const TOTAL_HOURS = END_HOUR - START_HOUR
const DAY_COLUMN_PADDING = 0 // extra offset on top of day columns (kept zero for accurate alignment)

// Split an event that spans multiple days into day-bounded segments
const splitEventIntoDaySegments = (event) => {
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return []
  }

  const segments = []
  let segmentStart = new Date(start)

  while (segmentStart < end) {
    const dayEnd = new Date(segmentStart)
    dayEnd.setHours(24, 0, 0, 0) // start of the next day

    const segmentEnd = end <= dayEnd ? end : dayEnd

    segments.push({
      ...event,
      start_at: new Date(segmentStart),
      end_at: new Date(segmentEnd),
    })

    segmentStart = segmentEnd
  }

  return segments
}

// Detect overlapping events and calculate positioning
const calculateEventPositions = (dayEvents) => {
  if (!dayEvents.length) return dayEvents.map((e, i) => ({ event: e, position: 0, totalOverlaps: 1 }))

  const sortedEvents = [...dayEvents].sort((a, b) => {
    const aStart = new Date(a.start_at).getTime()
    const bStart = new Date(b.start_at).getTime()
    return aStart - bStart
  })

  const positionMap = {}

  sortedEvents.forEach((event) => {
    const eventStart = new Date(event.start_at).getTime()
    const eventEnd = new Date(event.end_at).getTime()

    let position = 0
    const overlappingEvents = [event]

    // Find all events that overlap with this event
    sortedEvents.forEach((otherEvent) => {
      if (otherEvent.id === event.id) return

      const otherStart = new Date(otherEvent.start_at).getTime()
      const otherEnd = new Date(otherEvent.end_at).getTime()

      // Check if events overlap
      if (!(eventEnd <= otherStart || eventStart >= otherEnd)) {
        overlappingEvents.push(otherEvent)
      }
    })

    const uniqueOverlaps = overlappingEvents.length

    // Find position in overlapping group
    overlappingEvents.sort((a, b) => {
      const aId = a.id
      const bId = b.id
      return String(aId).localeCompare(String(bId))
    })

    position = overlappingEvents.findIndex((e) => e.id === event.id)
    positionMap[event.id] = { position, totalOverlaps: uniqueOverlaps }
  })

  return dayEvents.map((event) => ({
    event,
    ...positionMap[event.id],
  }))
}

export default function ScheduleInterface({ mode = "admin" }) {
  const isStaff = mode === "staff"

  const [currentTime, setCurrentTime] = useState(new Date())
  const [events, setEvents] = useState([])
  const [channels, setChannels] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedChannelIds, setSelectedChannelIds] = useState([])

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showScheduleListModal, setShowScheduleListModal] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [scheduleError, setScheduleError] = useState("")
  const [generatingEvents, setGeneratingEvents] = useState(false)
  const [generateEventsMessage, setGenerateEventsMessage] = useState("")

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState("week")

  const weekStart = getMonday(currentDate)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode])

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const ref = new Date(currentDate)
      let from
      let to

      if (viewMode === "week") {
        from = getMonday(ref)
        from.setHours(0, 0, 0, 0)

        to = new Date(from)
        to.setDate(to.getDate() + 7)
        to.setHours(23, 59, 59, 999)
      } else {
        from = new Date(ref.getFullYear(), ref.getMonth(), 1)
        from.setHours(0, 0, 0, 0)

        to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
        to.setHours(23, 59, 59, 999)
      }

      const eventUrl = isStaff ? "/event/my" : "/event"
      const eventsRes = await api.request(eventUrl, {
        method: "GET",
        params: {
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          pageSize: 200,
          ...(isStaff ? {} : { channelIds: selectedChannelIds.length > 0 ? selectedChannelIds.join(",") : undefined }),
        },
      })

      let eventsData = []
      if (eventsRes?.data?.data && Array.isArray(eventsRes.data.data)) {
        eventsData = eventsRes.data.data
      } else if (eventsRes?.data && Array.isArray(eventsRes.data)) {
        eventsData = eventsRes.data
      } else if (Array.isArray(eventsRes)) {
        eventsData = eventsRes
      }
      setEvents(eventsData)

      let channelsArray = []
      if (!isStaff) {
        try {
          const channelsRes = await api.getChannels({ pageSize: 100 })
          channelsArray =
            channelsRes?.data?.data || channelsRes?.data || (Array.isArray(channelsRes) ? channelsRes : []) || []
        } catch (err) {
          throw err
        }

        setSelectedChannelIds((prev) => {
          if (prev && prev.length > 0) return prev
          return channelsArray.map((ch) => String(ch.id))
        })
      }

      setChannels(channelsArray)

      if (!isStaff) {
        const employeesRes = await api.getEmployees({ size: 100 })
        const employeesArray =
          employeesRes?.data?.data || employeesRes?.data || (Array.isArray(employeesRes) ? employeesRes : []) || []
        setEmployees(employeesArray)
      }
    } catch (err) {
      console.error("Error loading data:", err)
      setError(err.message)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = async (eventId) => {
    try {
      console.log("  Handling event click for ID:", eventId)
      if (mode === "staff") {
        // Staff: find event from the already-loaded list
        const event = events.find((e) => e.id === eventId)
        if (event) {
          console.log("  Setting selected event from list:", event)
          setSelectedEvent(event)
        } else {
          console.error("  Event not found in list")
          setError("Không tìm thấy ca làm")
        }
      } else {
        // Admin: fetch full details
        console.log("  Fetching event details for ID:", eventId)
        const eventDetail = await api.getEventDetail(eventId)
        console.log("  Event detail fetched:", eventDetail)
        setSelectedEvent(eventDetail)
      }
    } catch (err) {
      console.error("  Error fetching event detail:", err)
      setError(err.message)
    }
  }

  const handleEditEvent = (event) => {
    setSelectedEvent(null)
    setEditingEvent(event)
  }

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa ca làm này không?")) {
      return
    }

    try {
      await api.deleteEvent(eventId)
      setSelectedEvent(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSaveEvent = async (formData) => {
    try {
      const eventId = editingEvent.id
      await api.updateEvent(eventId, formData)
      setEditingEvent(null)
      await loadData()
    } catch (err) {
      throw err
    }
  }

  const handleDateSelect = (selectedDate) => {
    // click trên mini calendar → di chuyển tới tuần/tháng chứa ngày đó
    setCurrentDate(selectedDate)
  }

  const handleCreateShiftSuccess = () => {
    setShowCreateShiftModal(false)
    loadData()
  }

  const fetchSchedules = async () => {
    setLoadingSchedules(true)
    setScheduleError("")
    try {
      const res = await api.getSchedules({ page: 1, pageSize: 500 })
      let items = []
      if (Array.isArray(res?.data?.data)) {
        items = res.data.data
      } else if (Array.isArray(res?.data)) {
        items = res.data
      } else if (Array.isArray(res?.items)) {
        items = res.items
      } else if (Array.isArray(res)) {
        items = res
      }
      setSchedules(items)
    } catch (err) {
      console.error("Failed to load schedules", err)
      setScheduleError(err.message || "Không tải được danh sách schedule")
      setSchedules([])
    } finally {
      setLoadingSchedules(false)
    }
  }

  const handleOpenScheduleList = () => {
    setShowScheduleListModal(true)
    fetchSchedules()
  }

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Xóa schedule này?")) return
    try {
      await api.deleteSchedule(scheduleId)
      await Promise.all([fetchSchedules(), loadData()])
    } catch (err) {
      setScheduleError(err.message || "Xóa thất bại")
    }
  }

  const handleGenerateScheduleEvents = async () => {
    setGeneratingEvents(true)
    setScheduleError("")
    setGenerateEventsMessage("")
    try {
      await api.generateScheduleEvents({ days: 31 })
      setGenerateEventsMessage("Đã sinh event cho 1 tháng tới")
      await loadData()
    } catch (err) {
      setScheduleError(err.message || "Không sinh được event")
    } finally {
      setGeneratingEvents(false)
    }
  }

  // filter kênh
  const handleToggleChannel = (channelId) => {
    const idStr = String(channelId)
    setSelectedChannelIds((prev) => {
      if (prev.includes(idStr)) {
        // bỏ chọn
        return prev.filter((id) => id !== idStr)
      }
      // chọn thêm
      return [...prev, idStr]
    })
  }

  const handleTodayClick = () => {
    setCurrentDate(new Date())
  }

  const handlePrevPeriod = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (viewMode === "week") {
        d.setDate(d.getDate() - 7)
      } else {
        d.setMonth(d.getMonth() - 1)
      }
      return d
    })
  }

  const handleNextPeriod = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (viewMode === "week") {
        d.setDate(d.getDate() + 7)
      } else {
        d.setMonth(d.getMonth() + 1)
      }
      return d
    })
  }

  const hours = currentTime.getHours()
  const minutes = currentTime.getMinutes()
  const timeOffsetPixels = (hours - START_HOUR + minutes / 60) * HOUR_HEIGHT

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return {
      day: ["CHỦ NHẬT", "THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6", "THỨ 7"][date.getDay()],
      date: date.getDate(),
      fullDate: date,
    }
  })

const timeSlots = Array.from({ length: TOTAL_HOURS }, (_, i) => {
  const hour = START_HOUR + i
  /* Format hour display to show 24:00 instead of 0:00 for last slot */
  return hour === 24 ? "24:00" : `${hour}:00`
})

  // build eventsByDay có apply filter kênh
  const eventsByDay = {}
  const channelIndexMap = {} // Map channel ID to index for colors

  channels.forEach((channel, index) => {
    channelIndexMap[channel.id] = index
  })

  if (Array.isArray(events) && events.length > 0) {
    events.forEach((event) => {
      const channelId = event.channel_id ?? event.channel?.id
      if (selectedChannelIds.length > 0 && channelId != null && !selectedChannelIds.includes(String(channelId))) {
        return // bị filter bởi kênh
      }

      const segments = splitEventIntoDaySegments(event)
      segments.forEach((segment) => {
        const startDate = new Date(segment.start_at)
        if (Number.isNaN(startDate.getTime())) return

        const day = startDate.getDate()
        const month = startDate.getMonth()
        const year = startDate.getFullYear()

        const dayKey = `${year}-${month}-${day}`

        if (!eventsByDay[dayKey]) eventsByDay[dayKey] = []
        eventsByDay[dayKey].push(segment)
      })
    })
  }

  // ==== view tuần (giữ nguyên layout cũ) ====
  const renderWeekView = () => (
    <div className="schedule-calendar-container">
      

      {/* Days grid */}
      <div className="schedule-days-grid">
        {/* Time labels on the left */}
      
        <div className="schedule-day-headers" >
          {weekDays.map((day) => ( 
            <div key={day.date} className="schedule-day-header">
              <div className="schedule-day-name">{day.day}</div>
              <div className="schedule-day-date">{day.date}</div>
            </div>
          ))}
        </div>

        {/* Time grid with events */}
        <div className="schedule-time-grid" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
          {weekDays.map((day) => {
            const dayKey = `${day.fullDate.getFullYear()}-${day.fullDate.getMonth()}-${day.fullDate.getDate()}`
            const dayEvents = eventsByDay[dayKey] || []

            const eventPositions = calculateEventPositions(dayEvents)

            return (
              <div key={dayKey} className="schedule-day-column">
                {timeSlots.map((time) => (
                  <div
                    key={`${dayKey}-${time}`}
                    className="schedule-time-cell"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                {isToday(day.fullDate) && timeOffsetPixels >= 0 && (
                  <div
                    className="schedule-current-time-indicator"
                    style={{
                      top: `${timeOffsetPixels}px`,
                    }}
                  />
                )}

                {eventPositions.length > 0 &&
                  eventPositions.map(({ event, position, totalOverlaps }) => {
                    const startDate = new Date(event.start_at)
                    const endDate = new Date(event.end_at)
                    const startHour = startDate.getHours()
                    const startMin = startDate.getMinutes()
                    const durationHours = Math.max((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60), 0)
                    const endHour = endDate.getHours()
                    const endMin = endDate.getMinutes()
                    const endsAtNextMidnight = startDate.getDate() !== endDate.getDate() && endHour === 0 && endMin === 0
                    const displayStartHour = String(startHour).padStart(2, "0")
                    const displayStartMin = String(startMin).padStart(2, "0")
                    const displayEndHour = String(endsAtNextMidnight ? 24 : endHour).padStart(2, "0")
                    const displayEndMin = String(endMin).padStart(2, "0")

                    const topOffset = (startHour - START_HOUR + startMin / 60) * HOUR_HEIGHT
                    const heightOffset = durationHours * HOUR_HEIGHT

                    const channelId = event.channel_id ?? event.channel?.id
                    const channelIndex = channelIndexMap[channelId] ?? 0
                    const colors = getChannelColor(channelId, event.channel?.name || "Sự kiện", channelIndex)

                    // Calculate width and left offset for overlapping events
                    const eventWidth = totalOverlaps > 1 ? 100 / totalOverlaps : 100
                    const eventLeft = totalOverlaps > 1 ? position * eventWidth : 0

                    const channelName = event.channel?.name || "Sự kiện"
                    const isMainChannel = event.channel?.name?.includes("chính")

                    return (
                      <div
                        key={event.id}
                        className={`schedule-event-block ${isMainChannel ? "main" : "sub"}`}
                        style={{
                          top: `${topOffset}px`,
                          height: `${Math.max(heightOffset, 25)}px`,
                          left: `${eventLeft + 1}%`,
                          right: `${101 - eventLeft - eventWidth}%`,
                          backgroundColor: colors.bg,
                          borderLeft: `3px solid ${colors.border}`,
                          color: "#ffffff",
                          boxShadow: `0 8px 18px ${colors.light || "rgba(0,0,0,0.12)"}`,
                        }}
                        onClick={() => handleEventClick(event.id)}
                      >
                        <div className="schedule-event-title" style={{ color: "#ffffff" }}>
                          {channelName}
                        </div>
                        <div className="schedule-event-detail" style={{ color: "rgba(255,255,255,0.92)" }}>
                          {displayStartHour}:{displayStartMin}-{displayEndHour}:{displayEndMin}
                        </div>
                        {event.members && event.members.length > 0 && (
                          <div className="schedule-event-names">
                            {event.members.slice(0, 2).map((member, i) => (
                              <div key={i}>{member.employee?.full_name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
        <div className="schedule-time-column">
        <div className="schedule-time-header" />
        {timeSlots.map((time) => (
          <div key={time} className="schedule-time-slot">
            {time}
          </div>
        ))}
      </div>
      </div>
    </div>
  )

  // ==== view tháng đơn giản giống Google Calendar ====
  const renderMonthView = () => {
    const ref = new Date(currentDate)
    const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const startDay = startOfMonth.getDay() // 0=CN..6=Th7

    // chuyển sang lưới bắt đầu từ Thứ 2
    const offset = (startDay + 6) % 7 // Mon=0,...,Sun=6
    const gridStart = new Date(startOfMonth)
    gridStart.setDate(startOfMonth.getDate() - offset)

    const days = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      days.push(d)
    }

    const rows = []
    for (let w = 0; w < 6; w++) {
      rows.push(days.slice(w * 7, (w + 1) * 7))
    }

    const weekdayNames = ["THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6", "THỨ 7", "CHỦ NHẬT"]

    return (
      <div className="schedule-month-container">
        <div className="schedule-month-headers">
          {weekdayNames.map((name) => (
            <div key={name} className="schedule-month-header-cell">
              {name}
            </div>
          ))}
        </div>
        <div className="schedule-month-grid">
          {rows.map((week, idx) => (
            <div key={idx} className="schedule-month-row">
              {week.map((dayDate) => {
                const dayKey = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`
                const dayEvents = eventsByDay[dayKey] || []
                const inCurrentMonth = dayDate.getMonth() === ref.getMonth()
                const todayFlag = isToday(dayDate)

                return (
                  <div
                    key={dayKey}
                    className={`schedule-month-cell ${
                      inCurrentMonth ? "current-month" : "other-month"
                    } ${todayFlag ? "today" : ""}`}
                  >
                    <div className="schedule-month-date">{dayDate.getDate()}</div>
                    <div className="schedule-month-events">
                      {dayEvents.slice(0, 3).map((event) => {
                        const channelId = event.channel_id ?? event.channel?.id
                        const channelIndex = channelIndexMap[channelId] ?? 0
                        const colors = getChannelColor(channelId, event.channel?.name || "Sự kiện", channelIndex)

                        const channelName = event.channel?.name || "Sự kiện"
                        const isMainChannel = event.channel?.name?.includes("chính")
                        return (
                          <div
                            key={event.id}
                            className={`schedule-month-event ${isMainChannel ? "main" : "sub"}`}
                            style={{
                              backgroundColor: colors.light,
                              color: colors.border,
                              borderLeftColor: colors.border,
                            }}
                            onClick={() => handleEventClick(event.id)}
                          >
                            <span className="schedule-month-event-dot" style={{ backgroundColor: colors.border }} />
                            <span className="schedule-month-event-title">{channelName}</span>
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="schedule-month-more">+{dayEvents.length - 3} ca nữa</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="schedule-main-container">
      <div className="schedule-content">
        {/* Left Sidebar */}
        <div className="schedule-left-sidebar">
          {!isStaff && (
            <div className="schedule-create-btn" onClick={() => setShowCreateShiftModal(true)}>
              <span>+ Tạo lịch</span>
            </div>
          )}
          {!isStaff && (
            <div className="schedule-secondary-btn" onClick={handleOpenScheduleList}>
              <span>Danh sách schedule</span>
            </div>
          )}

          <MiniCalendar selectedDate={currentDate} onDateSelect={handleDateSelect} />

          {/* Filter kênh ngay dưới mini-calendar - only show for admin */}
          {!isStaff && (
            <div className="schedule-events-section">
              <h3 className="schedule-events-title">Lọc theo kênh</h3>
              <div className="schedule-channel-list">
                {channels.map((channel) => {
                  const idStr = String(channel.id)
                  const checked = selectedChannelIds.includes(idStr)
                  const colors = getChannelColor(channel.id, channel.name)
                  return (
                    <label
                      key={channel.id}
                      className="schedule-channel-item"
                      style={{
                        borderColor: colors.border,
                        color: colors.border,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleChannel(channel.id)}
                        style={{ accentColor: colors.border }}
                      />
                      <span
                        className="schedule-channel-badge"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          color: colors.text || "#ffffff",
                          boxShadow: `0 3px 10px ${colors.light}`,
                        }}
                      >
                        {channel.name}
                      </span>
                    </label>
                  )
                })}
                {channels.length === 0 && <div className="schedule-channel-empty">Chưa có kênh nào</div>}
              </div>
            </div>
          )}
        </div>

        {/* Main Calendar */}
        <div className="schedule-main-content">
          {/* Header */}
          <div className="schedule-header">
            <div className="schedule-title">
              <button className="schedule-today-btn" onClick={handleTodayClick}>
                Hôm nay
              </button>
              <button className="schedule-nav-btn" onClick={handlePrevPeriod}>
              <i class="fa-solid fa-angle-left"></i>
              </button>
              <button className="schedule-nav-btn" onClick={handleNextPeriod}>
              <i class="fa-solid fa-angle-right"></i>
              </button>
              <span className="schedule-title-text">{formatMonth(currentDate)}</span>
            </div>
            <div className="schedule-view-buttons">
              <button
                className={`schedule-view-btn ${viewMode === "week" ? "active" : ""}`}
                onClick={() => setViewMode("week")}
              >
                Tuần
              </button>
              <button
                className={`schedule-view-btn ${viewMode === "month" ? "active" : ""}`}
                onClick={() => setViewMode("month")}
              >
                Tháng
              </button>
            </div>
          </div>

          {error && <div className="schedule-error">{error}</div>}

          {loading ? (
            <div className="schedule-loading">Đang tải dữ liệu...</div>
          ) : viewMode === "week" ? (
            renderWeekView()
          ) : (
            renderMonthView()
          )}
        </div>

        {/* Modals */}
        {showScheduleListModal && (
          <div className="schedule-modal-overlay" onClick={() => setShowScheduleListModal(false)}>
            <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3>Danh sách schedule</h3>
              <div className="schedule-modal-actions">
                <button
                  className="schedule-list-generate"
                  onClick={handleGenerateScheduleEvents}
                  disabled={generatingEvents}
                >
                  {generatingEvents ? "Đang sinh..." : "Sinh event 1 tháng tới"}
                </button>
                <button className="schedule-modal-close" onClick={() => setShowScheduleListModal(false)}>
                <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
            <div className="schedule-modal-body">
              {loadingSchedules && <div className="schedule-modal-loading">Đang tải...</div>}
              {scheduleError && <div className="schedule-modal-error">{scheduleError}</div>}
              {generateEventsMessage && <div className="schedule-modal-success">{generateEventsMessage}</div>}
              {!loadingSchedules && schedules.length === 0 && !scheduleError && (
                <div className="schedule-modal-empty">Không có schedule</div>
              )}
                {!loadingSchedules && schedules.length > 0 && (
                  <div className="schedule-list">
                    {schedules.map((item) => (
                      <div key={item.id} className="schedule-list-item">
                        <div>
                          <div className="schedule-list-title">
                            Kênh: {item.channel?.name || item.channel_id || "-"}
                          </div>
                          <div className="schedule-list-sub">
                            Trạng thái: {item.is_active ? "Đang bật" : "Tắt"}
                          </div>
                          <div className="schedule-list-sub">
                            {item.start_at} - {item.end_at}
                          </div>
                        </div>
                        <button className="schedule-list-delete" onClick={() => handleDeleteSchedule(item.id)}>
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onEdit={!isStaff ? handleEditEvent : undefined}
            onDelete={!isStaff ? handleDeleteEvent : undefined}
          />
        )}

        {!isStaff && editingEvent && (
          <EventEditModal
            event={editingEvent}
            channels={channels}
            employees={employees}
            onClose={() => setEditingEvent(null)}
            onSave={handleSaveEvent}
          />
        )}

        {!isStaff && showCreateShiftModal && (
          <CreateShiftModal
            isOpen={showCreateShiftModal}
            channels={channels}
            employees={employees}
            onClose={() => setShowCreateShiftModal(false)}
            onSuccess={handleCreateShiftSuccess}
          />
        )}
      </div>
    </div>
  )
}
