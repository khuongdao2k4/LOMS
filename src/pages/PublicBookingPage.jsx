"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import MiniCalendar from "../components/MiniCalendar"
import BookingFormModal from "../components/BookingFormModal"
import { api } from "../services/apiClient"
import "../styles/pages/public-booking.css"

const weekdayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

const getMonday = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatWeekRangeLabel = (date) => {
  // Hiển thị 7 ngày liên tiếp bắt đầu từ selectedDate
  const start = startOfDay(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const opts = { month: "short", day: "numeric" }
  const startLabel = start.toLocaleDateString("en-US", opts)
  const endLabel = end.toLocaleDateString("en-US", opts)
  const yearLabel = end.getFullYear()

  return `${startLabel} - ${endLabel}, ${yearLabel}`
}

const timeStrToMinutes = (t) => {
  if (!t) return 0
  const [h, m] = String(t).split(":").map((v) => Number(v) || 0)
  return h * 60 + m
}

const minutesToTimeStr = (minutes) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const suffix = h >= 12 ? "pm" : "am"
  const hh = ((h + 11) % 12) + 1
  return `${hh}:${m.toString().padStart(2, "0")}${suffix}`
}

const sameDate = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const setMinutesOfDay = (baseDate, minutes) => {
  const d = new Date(baseDate)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  d.setHours(h, m, 0, 0)
  return d
}

const DAY_TOTAL_MINUTES = 24 * 60
const ROW_INTERVAL_MINUTES = 30
const ROW_HEIGHT = 40
const ROW_COUNT = DAY_TOTAL_MINUTES / ROW_INTERVAL_MINUTES
const DEFAULT_GRID_HEIGHT = ROW_COUNT * ROW_HEIGHT

const buildFixedSlotsForInterval = (
  dayStart,
  dayEnd,
  minDurationMinutes,
  maxDurationMinutes,
) => {
  if (!dayStart || !dayEnd) return []
  const slots = []
  const minMs = minDurationMinutes * 60_000
  const maxMs = maxDurationMinutes * 60_000

  let current = new Date(dayStart)

  while (current.getTime() < dayEnd.getTime()) {
    let next = new Date(current.getTime() + maxMs)

    if (next.getTime() > dayEnd.getTime()) {
      const lastDuration = dayEnd.getTime() - current.getTime()
      if (lastDuration < minMs) break
      next = new Date(dayEnd)
    }

    slots.push({ start: new Date(current), end: next })
    current = next
  }

  return slots
}

const getDayKey = (date) => date.toISOString().slice(0, 10)
const buildDayModel = (day, allSlots, allBookings, minDurationMinutes) => {
  const weekday = day.getDay()
  const isoWeekday = weekday === 0 ? 7 : weekday

  const slotsForDay = (allSlots || []).filter((slot) => {
    const raw = slot.weekday ?? slot.day ?? slot.day_of_week
    const wd = Number(raw)
    return wd === isoWeekday
  })

  const windows = slotsForDay.map((slot) => {
    const startMin = timeStrToMinutes(slot.start || slot.start_time || "08:00")
    const endMin = timeStrToMinutes(slot.end || slot.end_time || "18:00")
    return {
      startMin,
      endMin,
      startDate: setMinutesOfDay(day, startMin),
      endDate: setMinutesOfDay(day, endMin),
      raw: slot,
    }
  })

  const bookingsForDay = (allBookings || [])
    .map((b) => ({
      ...b,
      startDate: new Date(b.start_at || b.start),
      endDate: new Date(b.end_at || b.end),
    }))
    .filter((b) => sameDate(b.startDate, day))

  const busyBookings = bookingsForDay
    .filter((b) =>
      ["pending", "approved"].includes(String(b.status || "").toLowerCase()),
    )
    .map((b) => {
      const startMin = b.startDate.getHours() * 60 + b.startDate.getMinutes()
      const endMin = b.endDate.getHours() * 60 + b.endDate.getMinutes()
      return {
        ...b,
        startMin,
        endMin,
        startDate: b.startDate,
        endDate: b.endDate,
      }
    })
    .sort((a, b) => a.startMin - b.startMin)

  const freeIntervals = []
  const busyIntervals = []

  windows.forEach((w) => {
    const relBookings = busyBookings.filter(
      (b) => b.endMin > w.startMin && b.startMin < w.endMin,
    )
    let cursor = w.startMin

    relBookings.forEach((b) => {
      const busyStart = Math.max(b.startMin, w.startMin)
      const busyEnd = Math.min(b.endMin, w.endMin)

      if (busyStart > cursor && busyStart - cursor >= minDurationMinutes) {
        freeIntervals.push({
          startMin: cursor,
          endMin: busyStart,
          window: w,
          startDate: setMinutesOfDay(day, cursor),
          endDate: setMinutesOfDay(day, busyStart),
        })
      }

      busyIntervals.push({
        startMin: busyStart,
        endMin: busyEnd,
        startDate: setMinutesOfDay(day, busyStart),
        endDate: setMinutesOfDay(day, busyEnd),
        status: b.status,
        booking: b,
      })

      cursor = Math.max(cursor, busyEnd)
    })

    if (cursor < w.endMin && w.endMin - cursor >= minDurationMinutes) {
      freeIntervals.push({
        startMin: cursor,
        endMin: w.endMin,
        window: w,
        startDate: setMinutesOfDay(day, cursor),
        endDate: setMinutesOfDay(day, w.endMin),
      })
    }
  })

  return { day, windows, freeIntervals, busyIntervals }
}

const getCellStatus = (startMin, endMin, model) => {
  if (!model) return "disabled"

  const day = model.day
  const cellStart = setMinutesOfDay(day, startMin)
  const cellEnd = setMinutesOfDay(day, endMin)

  const withinWindow = (model.windows || []).some(
    (w) => cellStart >= w.startDate && cellEnd <= w.endDate,
  )
  if (!withinWindow) return "disabled"

  for (const b of model.busyIntervals || []) {
    const busyStart = b.startDate
    const busyEnd = b.endDate
    if (!busyStart || !busyEnd) continue
    const overlaps = cellStart < busyEnd && cellEnd > busyStart
    if (!overlaps) continue
    const fullyCovered = busyStart <= cellStart && busyEnd >= cellEnd
    if (fullyCovered) return "busy"
  }

  return "free"
}

const getInitialCurrentDate = () => {
  // selectedDate mặc định = ngày mai, không cho booking hôm nay
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function PublicBookingPage() {
  const { token } = useParams()
  const [channel, setChannel] = useState(null)
  const [config, setConfig] = useState(null)
  const [bookings, setBookings] = useState([])

  // selectedDate: ngày bắt đầu của dải 7 ngày đang hiển thị
  const [currentDate, setCurrentDate] = useState(getInitialCurrentDate)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [toast, setToast] = useState("")
  const [hoverSlot, setHoverSlot] = useState(null)
  const gridRef = useRef(null)
  const [rowHeight, setRowHeight] = useState(ROW_HEIGHT)
  const [gridHeight, setGridHeight] = useState(DEFAULT_GRID_HEIGHT)

  const loadBookings = useCallback(
    async ({ showLoading = true } = {}) => {
      if (!channel?.id) return
      try {
        if (showLoading) {
          setLoading(true)
        }
        setError("")

        const start = startOfDay(currentDate)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        end.setHours(23, 59, 59, 999)

        const res = await api.getPublicBookings({
          channel_id: channel.id,
          from: start.toISOString(),
          to: end.toISOString(),
        })
        setBookings(res?.data || res || [])
      } catch (err) {
        setError(err.message || "Failed to load booking list")
        setBookings([])
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [channel?.id, currentDate],
  )

  // today cố định theo thời điểm load page
  const today = useMemo(() => startOfDay(new Date()), [])

  // visibleMonth: dùng cho mini calendar
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = getInitialCurrentDate()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await api.resolvePublicChannel(token)
        const data = res?.data || res
        setChannel({
          id: data?.channel_id,
          name: data?.name || data?.channel_name || "Kênh",
        })
        setConfig({
          slots: data?.booking_config?.slots || data?.slots || [],
          minDuration: data?.booking_config?.min_duration_minutes ?? 30,
          maxDuration: data?.booking_config?.max_duration_minutes ?? 120,
        })
      } catch (err) {
        setError(err.message || "Không tải được cấu hình booking")
      } finally {
        setLoading(false)
      }
    }

    if (token) loadConfig()
  }, [token])

  useEffect(() => {
    if (!channel?.id) return
    loadBookings({ showLoading: true })
  }, [channel?.id, currentDate, loadBookings])

  useEffect(() => {
    if (!channel?.id) return
    const interval = setInterval(() => {
      loadBookings({ showLoading: false })
    }, 7000)
    return () => clearInterval(interval)
  }, [channel?.id, loadBookings])

  // weekDays: 7 ngày liên tiếp từ currentDate
  const weekDays = useMemo(() => {
    const start = startOfDay(currentDate)
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start)
      d.setDate(start.getDate() + idx)
      return d
    })
  }, [currentDate])

  const dayModels = useMemo(() => {
    if (!config) return []
    const minD = Number(config.minDuration) || 30
    return weekDays.map((day) =>
      buildDayModel(day, config.slots || [], bookings, minD),
    )
  }, [config, weekDays, bookings])

  const updateMeasurements = useCallback(() => {
    const gridEl = gridRef.current
    if (!gridEl) return

    const measuredHeight = gridEl.getBoundingClientRect().height
    if (!measuredHeight) return

    setGridHeight((prev) =>
      prev === measuredHeight ? prev : measuredHeight,
    )
    const newRowHeight = measuredHeight / ROW_COUNT
    if (!newRowHeight) return
    setRowHeight((prev) =>
      Math.abs(prev - newRowHeight) < 0.5 ? prev : newRowHeight,
    )
  }, [])

  useEffect(() => {
    updateMeasurements()
    window.addEventListener("resize", updateMeasurements)
    return () => window.removeEventListener("resize", updateMeasurements)
  }, [loading, dayModels.length, updateMeasurements])

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return
    const gridEl = gridRef.current
    if (!gridEl) return
    const observer = new ResizeObserver(updateMeasurements)
    observer.observe(gridEl)
    return () => observer.disconnect()
  }, [dayModels.length, updateMeasurements])

  const timeSlots = useMemo(() => {
    const slots = []
    for (let m = 0; m < 24 * 60; m += 30) {
      slots.push(m)
    }
    return slots
  }, [])

  const effectiveGridHeight = gridHeight || DEFAULT_GRID_HEIGHT
  const pixelsPerMinute = effectiveGridHeight / DAY_TOTAL_MINUTES
  const timelineHeight = effectiveGridHeight

  const fixedSlotsByDay = useMemo(() => {
    if (!config || !dayModels.length) return {}
    const minDuration = Number(config.minDuration) || 30
    const maxDuration = Number(config.maxDuration) || 120
    return dayModels.reduce((acc, dm) => {
      const dayKey = getDayKey(dm.day)
      const ranges = dm.freeIntervals
        .map((range) => ({
          start: range.startDate,
          end: range.endDate,
        }))
        .filter((r) => r.start && r.end && r.start < r.end)

      const slots = ranges.flatMap((range) =>
        buildFixedSlotsForInterval(
          range.start,
          range.end,
          minDuration,
          maxDuration,
        ),
      )

      if (slots.length) {
        acc[dayKey] = slots
      }

      return acc
    }, {})
  }, [config, dayModels])

  const getMinutesFromPointer = (event) => {
    const container = event.currentTarget
    if (!container) return null

    const rect = container.getBoundingClientRect()
    const offsetY = event.clientY - rect.top

    if (offsetY < 0 || offsetY > timelineHeight) return null

    const minutes = Math.min(
      DAY_TOTAL_MINUTES,
      Math.max(0, offsetY / pixelsPerMinute),
    )
    return {
      minutes,
      offsetY,
    }
  }

  const findSlotAtMinute = (dayIdx, minutes) => {
    if (!Number.isFinite(minutes)) return null
    const dayModel = dayModels[dayIdx]
    if (!dayModel) return null
    const slots = fixedSlotsByDay[getDayKey(dayModel.day)] || []
    return slots.find((slot) => {
      const startMin = slot.start.getHours() * 60 + slot.start.getMinutes()
      const endMin = slot.end.getHours() * 60 + slot.end.getMinutes()
      return minutes >= startMin && minutes < endMin
    })
  }

  const buildSlotLabel = (slot) => {
    const startMin = slot.start.getHours() * 60 + slot.start.getMinutes()
    const endMin = slot.end.getHours() * 60 + slot.end.getMinutes()
    return `${minutesToTimeStr(startMin)} - ${minutesToTimeStr(endMin)}`
  }

  const handleDayMouseMove = (dayIdx, event) => {
    if (!config) {
      setHoverSlot(null)
      return
    }
    const pointer = getMinutesFromPointer(event)
    if (!pointer) {
      setHoverSlot(null)
      return
    }
    const slot = findSlotAtMinute(dayIdx, pointer.minutes)
    if (!slot) {
      setHoverSlot(null)
      return
    }
    const normalized = pointer.offsetY
    const slotStartPx =
      (slot.start.getHours() * 60 + slot.start.getMinutes()) *
      pixelsPerMinute
    const slotEndPx =
      (slot.end.getHours() * 60 + slot.end.getMinutes()) * pixelsPerMinute
    if (normalized < slotStartPx || normalized > slotEndPx) {
      setHoverSlot(null)
      return
    }
    setHoverSlot({
      dayIdx,
      slot,
      label: buildSlotLabel(slot),
    })
  }

  const handleDayClick = (dayIdx, event) => {
    if (!config) return
    const pointer = getMinutesFromPointer(event)
    if (!pointer) return
    const slot = findSlotAtMinute(dayIdx, pointer.minutes)
    if (!slot) return
    const label = buildSlotLabel(slot)
    const normalized = pointer.offsetY
    const slotStartPx =
      (slot.start.getHours() * 60 + slot.start.getMinutes()) *
      pixelsPerMinute
    const slotEndPx =
      (slot.end.getHours() * 60 + slot.end.getMinutes()) * pixelsPerMinute
    if (normalized < slotStartPx || normalized > slotEndPx) return
    setSelectedSlot({
      label,
      intervalStart: slot.start,
      intervalEnd: slot.end,
      suggestStart: slot.start,
      suggestEnd: slot.end,
    })
    setModalVisible(true)
  }

  const getDayIndexFromOverlay = (event) => {
    const overlayEl = event.currentTarget
    if (!overlayEl) return null
    const rect = overlayEl.getBoundingClientRect()
    const timeColumnWidth = 64
    const pointerX = event.clientX - rect.left - timeColumnWidth
    if (pointerX < 0) return null
    const dayWidth = (rect.width - timeColumnWidth) / 7
    const dayIdx = Math.floor(pointerX / dayWidth)
    if (dayIdx < 0 || dayIdx >= 7) return null
    return dayIdx
  }

  const handleOverlayMouseMove = (event) => {
    const dayIdx = getDayIndexFromOverlay(event)
    if (dayIdx === null) {
      setHoverSlot(null)
      return
    }
    handleDayMouseMove(dayIdx, event)
  }

  const handleOverlayClick = (event) => {
    const dayIdx = getDayIndexFromOverlay(event)
    if (dayIdx === null) return
    handleDayClick(dayIdx, event)
  }

  const handleSubmitBooking = async (data) => {
    if (!channel?.id) return
    try {
      setLoading(true)
      await api.createPublicBooking({
        channel_id: channel.id,
        start_at: data.start_at,
        end_at: data.end_at,
        full_name: data.full_name,
        phone: data.phone,
        note: data.note,
      })
      setToast("Gửi yêu cầu booking thành công.")
      setModalVisible(false)
      setSelectedSlot(null)
      setTimeout(() => setToast(""), 2500)

      const start = startOfDay(currentDate)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      const res = await api.getPublicBookings({
        channel_id: channel.id,
        from: start.toISOString(),
        to: end.toISOString(),
      })
      setBookings(res?.data || res || [])
    } catch (err) {
      setToast(err.message || "Không gửi được booking")
      setTimeout(() => setToast(""), 2500)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedSlot(null)
  }

  const goPrevWeek = () => {
    // Không cho quay lại quá khứ (ngày bắt đầu < ngày mai)
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 7)
    if (startOfDay(d) <= today) return
    setCurrentDate(startOfDay(d))
  }

  const goNextWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 7)
    setCurrentDate(startOfDay(d))
  }

  const goToday = () => {
    // "Hôm nay" = quay về dải 7 ngày bắt đầu từ ngày mai
    setCurrentDate(getInitialCurrentDate())
  }

  // ====== MINI CALENDAR LOGIC ======

  // tập các thứ trong tuần có slot config (ISO 1–7 → JS 0–6)
  const availabilityWeekdays = useMemo(() => {
    const set = new Set()
    ;(config?.slots || []).forEach((slot) => {
      const raw = slot.weekday ?? slot.day ?? slot.day_of_week
      const iso = Number(raw)
      if (!Number.isFinite(iso)) return
      const js = iso === 7 ? 0 : iso // 1–6 giữ nguyên, 7 → 0 (Chủ nhật)
      set.add(js)
    })
    return set
  }, [config])

  const monthCells = useMemo(() => {
    const start = new Date(visibleMonth)
    start.setHours(0, 0, 0, 0)
    const year = start.getFullYear()
    const month = start.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay() // 0=SUN
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []

    // ô trống trước ngày 1
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      date.setHours(0, 0, 0, 0)
      cells.push({ date })
    }

    return cells
  }, [visibleMonth])

  const monthLabel = useMemo(() => {
    const opts = { month: "long", year: "numeric" }
    return visibleMonth.toLocaleDateString("en-US", opts)
  }, [visibleMonth])

  const canGoPrevMonth = useMemo(() => {
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const targetPrevMonth = new Date(visibleMonth)
    targetPrevMonth.setMonth(targetPrevMonth.getMonth() - 1)
    return targetPrevMonth >= thisMonthStart
  }, [today, visibleMonth])

  const goPrevMonthMini = () => {
    if (!canGoPrevMonth) return
    const next = new Date(visibleMonth)
    next.setMonth(next.getMonth() - 1)
    next.setHours(0, 0, 0, 0)
    setVisibleMonth(next)
  }

  const goNextMonthMini = () => {
    const next = new Date(visibleMonth)
    next.setMonth(next.getMonth() + 1)
    next.setHours(0, 0, 0, 0)
    setVisibleMonth(next)
  }

  // đồng bộ visibleMonth theo currentDate khi người dùng đổi tuần bằng nút prev/next
  useEffect(() => {
    setVisibleMonth((prev) => {
      if (
        prev.getFullYear() === currentDate.getFullYear() &&
        prev.getMonth() === currentDate.getMonth()
      ) {
        return prev
      }
      const m = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      m.setHours(0, 0, 0, 0)
      return m
    })
  }, [currentDate])

  return (
    <div className="public-booking__page">
      <header className="public-booking__topbar">
        <div className="public-booking__topbar-left">
          <h1 className="public-booking__title">Booking Lịch</h1>
        </div>

        <div className="public-booking__topbar-center">
          <button
            type="button"
            className="public-booking__nav-btn"
            onClick={goPrevWeek}
          >
            <i class="fa-solid fa-angle-left"></i>
          </button>

          <button
            type="button"
            className="public-booking__today-btn"
            onClick={goToday}
          >
            Hôm nay
          </button>

          <button
            type="button"
            className="public-booking__nav-btn"
            onClick={goNextWeek}
          >
            <i class="fa-solid fa-angle-right"></i>
          </button>

          <span className="public-booking__week-label">
            {formatWeekRangeLabel(currentDate)}
          </span>
        </div>
      </header>

      <div className="public-booking__layout">
        <aside className="public-booking__sidebar">
          <div className="public-booking__mini-calendar">
            {/* MINI CALENDAR mới giống Cal.com */}
            <div className="mini-cal">
              <div className="mini-cal__header">
                <span className="mini-cal__month-label">{monthLabel}</span>
                <div className="mini-cal__nav">
                  <button
                    type="button"
                    className="mini-cal__nav-btn"
                    onClick={goPrevMonthMini}
                    disabled={!canGoPrevMonth}
                  >
                    <i class="fa-solid fa-angle-left"></i>
                  </button>
                  <button
                    type="button"
                    className="mini-cal__nav-btn"
                    onClick={goNextMonthMini}
                  >
                    <i class="fa-solid fa-angle-right"></i>
                  </button>
                </div>
              </div>

              <div className="mini-cal__weekdays">
                {weekdayNames.map((w) => (
                  <div key={w} className="mini-cal__weekday">
                    {w}
                  </div>
                ))}
              </div>

              <div className="mini-cal__grid">
                {monthCells.map((cell, idx) => {
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="mini-cal__day mini-cal__day--empty"
                      />
                    )
                  }

                  const date = cell.date
                  const isToday = sameDate(date, today)
                  const isSelected = sameDate(date, currentDate)
                  const isPastOrToday = date <= today

                  let hasAvailability = false
                  if (!isPastOrToday) {
                    if (availabilityWeekdays.size === 0) {
                      hasAvailability = true
                    } else {
                      hasAvailability = availabilityWeekdays.has(date.getDay())
                    }
                  }

                  const isClickable = hasAvailability

                  let className = "mini-cal__day"
                  if (isSelected) className += " mini-cal__day--selected"
                  else if (hasAvailability)
                    className += " mini-cal__day--available"
                  else if (isPastOrToday)
                    className += " mini-cal__day--disabled"
                  else className += " mini-cal__day--default"

                  const handleClick = () => {
                    if (!isClickable) return
                    setCurrentDate(startOfDay(date))
                  }

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={className}
                      onClick={handleClick}
                      disabled={!isClickable}
                    >
                      <div className="mini-cal__day-inner">
                        <span className="mini-cal__day-number">
                          {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="mini-cal__today-dot" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Giữ mini calendar cũ (ẩn đi) để không mất code gốc */}
            <div className="public-booking__mini-calendar-legacy">
              <MiniCalendar onDateSelect={setCurrentDate} />
            </div>
          </div>

          {config && (
            <div className="public-booking__note">
              <p>
                Min: <b>{config.minDuration}</b> phút – Max:{" "}
                <b>{config.maxDuration}</b> phút.
              </p>
              <p>
                Chỉ đặt trong khung giờ khả dụng. Slot{" "}
                <span className="pill pill-pending">Chờ duyệt</span> /
                <span className="pill pill-approved">Đã Book</span> sẽ bị khóa.
              </p>
            </div>
          )}
        </aside>

        <main className="public-booking__main">
          {error && <div className="public-booking__error">{error}</div>}
          {toast && <div className="public-booking__toast">{toast}</div>}
          {loading && <div>Đang tải...</div>}

          {!loading && (
            <div className="public-cal">
              <div className="public-cal__header-row">
                <div className="public-cal__time-col-header" />
                {dayModels.map((dm, idx) => (
                  <div key={idx} className="public-cal__day-header">
                    <div className="public-cal__day-name">
                      {weekdayNames[dm.day.getDay()]}
                    </div>
                    <div className="public-cal__day-date">
                      {dm.day.getDate()}/{dm.day.getMonth() + 1}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="public-cal__body"
                onMouseLeave={() => setHoverSlot(null)}
              >
                <div
                  className="public-cal__grid"
                  ref={gridRef}
                  style={{ minHeight: timelineHeight }}
                >
                  {timeSlots.map((m) => (
                    <div
                      key={m}
                      className="public-cal__row"
                      style={{ height: rowHeight }}
                    >
                      <div className="public-cal__time-col">
                        {m % 60 === 0 ? minutesToTimeStr(m) : ""}
                      </div>
                      {dayModels.map((dm, dayIdx) => {
                        const status = getCellStatus(m, m + 30, dm)
                        return (
                          <button
                            key={dayIdx}
                            type="button"
                            className={`public-cal__cell public-cal__cell--${status}`}
                            disabled={status !== "free"}
                          />
                        )
                      })}
                    </div>
                  ))}

                  <div
                    className="public-cal__slot-overlay"
                    onMouseMove={handleOverlayMouseMove}
                    onMouseLeave={() => setHoverSlot(null)}
                    onClick={handleOverlayClick}
                  >
                    <div className="public-cal__slot-overlay-inner">
                      <div className="public-cal__slot-overlay-time-col" />
                      {dayModels.map((dm, dayIdx) => (
                        <div
                          key={dayIdx}
                          className="public-cal__slot-overlay-day-col"
                        >
                          {(dm.busyIntervals || []).map((b, i) => {
                            const startM = b.startMin
                            const endM = b.endMin
                            if (
                              !Number.isFinite(startM) ||
                              !Number.isFinite(endM)
                            ) {
                              return null
                            }
                            const top = startM * pixelsPerMinute
                            const height = Math.max(
                              2,
                              (endM - startM) * pixelsPerMinute,
                            )
                            return (
                              <div
                                key={`busy-${dayIdx}-${i}`}
                                className="public-cal__busy-block"
                                style={{ top, height }}
                              />
                            )
                          })}
                          {hoverSlot?.dayIdx === dayIdx &&
                            hoverSlot?.slot && (
                              <div
                                className="public-cal__slot-block"
                                style={{
                                  top:
                                    (hoverSlot.slot.start.getHours() * 60 +
                                      hoverSlot.slot.start.getMinutes()) *
                                    pixelsPerMinute,
                                  height:
                                    ((hoverSlot.slot.end.getTime() -
                                      hoverSlot.slot.start.getTime()) /
                                      60000) *
                                    pixelsPerMinute,
                                }}
                              >
                                <span className="public-cal__slot-block-label">
                                  {hoverSlot.label}
                                </span>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedSlot && config && (
        <BookingFormModal
          isOpen={modalVisible}
          slotLabel={selectedSlot.label}
          defaultStart={selectedSlot.suggestStart}
          defaultEnd={selectedSlot.suggestEnd}
          intervalStart={selectedSlot.intervalStart}
          intervalEnd={selectedSlot.intervalEnd}
          minDuration={config.minDuration}
          maxDuration={config.maxDuration}
          onClose={closeModal}
          onSubmit={handleSubmitBooking}
        />
      )}
    </div>
  )
}
