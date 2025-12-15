"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "../services/apiClient"
import { CopyButton } from "./ui/copy-button"
import "../styles/modals/booking-config-modal.css"

const weekdays = [
  { key: "sunday", label: "Sunday", value: 0 },
  { key: "monday", label: "Monday", value: 1 },
  { key: "tuesday", label: "Tuesday", value: 2 },
  { key: "wednesday", label: "Wednesday", value: 3 },
  { key: "thursday", label: "Thursday", value: 4 },
  { key: "friday", label: "Friday", value: 5 },
  { key: "saturday", label: "Saturday", value: 6 },
]


function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

// Icon xoá (delete slot)
function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
const randomId = () => Math.random().toString(36).slice(2, 9)

const defaultSlot = () => ({
  id: randomId(),
  start: "09:00",
  end: "17:00",
  isNew: false,
})

const defaultDayConfig = () => ({
  enabled: true,
  slots: [defaultSlot()],
})

const normalizeTime = (value, fallback) => {
  const raw = value || fallback
  if (!raw) return ""
  const parts = String(raw).split(":")
  if (parts.length < 2) return fallback
  const hh = String(parts[0]).padStart(2, "0")
  const mm = String(parts[1]).padStart(2, "0")
  return `${hh}:${mm}`
}

function cloneSlots(slots) {
  return slots.map((s) => ({
    ...s,
    id: randomId(),
    isNew: true,
  }))
}

const toIsoWeekday = (dayIndex) => (dayIndex === 0 ? 7 : dayIndex)

export default function BookingConfigModal({ open, channels = [], defaultChannelId = "", onClose, onSaved }) {
  const [selectedChannel, setSelectedChannel] = useState(defaultChannelId || "")
  const [minDuration, setMinDuration] = useState(30)
  const [maxDuration, setMaxDuration] = useState(120)
  const [dayConfigs, setDayConfigs] = useState(() => {
    const init = {}
    weekdays.forEach((d) => {
      init[d.key] = defaultDayConfig()
    })
    return init
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("") 
  const [publicLink, setPublicLink] = useState("")
  const [copySourceDay, setCopySourceDay] = useState(null)
  const [copyTargetDays, setCopyTargetDays] = useState([])

  useEffect(() => {
    if (open && defaultChannelId) {
      setSelectedChannel(defaultChannelId)
    }
  }, [open, defaultChannelId])

  useEffect(() => {
    if (!open || !selectedChannel) return
    const load = async () => {
      try {
        setLoading(true)
        setError("")
        setSuccess("")
        const res = await api.getBookingConfig(selectedChannel)
        const data = res?.data || res
        const slots = data?.slots || data?.config || []
        const minD = data?.min_duration_minutes ?? 30
        const maxD = data?.max_duration_minutes ?? 120
        const link = data?.public_link || ""
        const nextConfigs = {}
        weekdays.forEach((d) => {
          const daySlots = slots.filter((s) => {
            const weekdayValue = s.weekday ?? s.day ?? s.day_of_week
            const target = toIsoWeekday(d.value)
            return Number(weekdayValue) === target
          })
          if (daySlots.length === 0) {
            nextConfigs[d.key] = { enabled: false, slots: [defaultSlot()] }
          } else {
            nextConfigs[d.key] = {
              enabled: true,
              slots: daySlots.map((s, idx) => ({
                id: randomId(),
                start: normalizeTime(s.start || s.start_time, "09:00"),
                end: normalizeTime(s.end || s.end_time, "17:00"),
                isNew: idx > 0, // only allow delete for extras
              })),
            }
          }
        })
        setDayConfigs(nextConfigs)
        setMinDuration(Number(minD) || 30)
        setMaxDuration(Number(maxD) || 120)
        const { protocol, hostname, port } = window.location
        const feBase = `${protocol}//${hostname}${port ? `:${port}` : ""}`
        const token = data?.public_token || data?.public_link?.split("token=")[1] || ""
        const nextLink = token ? `${feBase}/public/book/${token}` : link
        setPublicLink(nextLink)
        setSuccess("Lưu cấu hình thành công.") 
      } catch (err) {
        console.error("[BookingConfigModal] load error", err)
        setError(err.message || "Không lấy được cấu hình")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, selectedChannel])

  const handleToggleDay = (dayKey) => {
    setDayConfigs((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], enabled: !prev[dayKey].enabled },
    }))
  }

  const handleSlotChange = (dayKey, slotId, field, value) => {
    setDayConfigs((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: prev[dayKey].slots.map((s) => (s.id === slotId ? { ...s, [field]: value } : s)),
      },
    }))
  }

  const handleAddSlot = (dayKey) => {
    setDayConfigs((prev) => {
      const slots = prev[dayKey].slots
      const last = slots[slots.length - 1]
      const nextStart = last?.end || "09:00"
      const [h, m] = nextStart.split(":").map((v) => Number(v) || 0)
      const startDate = new Date()
      startDate.setHours(h, m, 0, 0)
      const endDate = new Date(startDate.getTime() + 60 * 60000)
      const next = {
        id: randomId(),
        start: nextStart,
        end: `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
        isNew: true,
      }
      return {
        ...prev,
        [dayKey]: { ...prev[dayKey], slots: [...slots, next], enabled: true },
      }
    })
  }

  const handleDeleteSlot = (dayKey, slotId) => {
    setDayConfigs((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: prev[dayKey].slots.filter((s) => s.id !== slotId || !s.isNew),
      },
    }))
  }

  const openCopyPopover = (dayKey) => {
    setCopySourceDay(dayKey)
    setCopyTargetDays([])
  }

  const applyCopy = () => {
    if (!copySourceDay || copyTargetDays.length === 0) {
      setCopySourceDay(null)
      return
    }
    setDayConfigs((prev) => {
      const next = { ...prev }
      copyTargetDays.forEach((day) => {
        next[day] = {
          enabled: prev[day].enabled || prev[copySourceDay].enabled,
          slots: cloneSlots(prev[copySourceDay].slots),
        }
      })
      return next
    })
    setCopySourceDay(null)
  }

  const payload = useMemo(() => {
    const slots = []
    weekdays.forEach((d) => {
      const conf = dayConfigs[d.key]
      if (!conf?.enabled) return
      conf.slots.forEach((s) => {
        slots.push({
          weekday: toIsoWeekday(d.value), // backend uses ISO: 1=Mon..7=Sun
          start: s.start,
          end: s.end,
        })
      })
    })
    return {
      slots,
      min_duration_minutes: Number(minDuration) || 30,
      max_duration_minutes: Number(maxDuration) || 120,
    }
  }, [dayConfigs, minDuration, maxDuration])

  const handleSave = async () => {
    if (!selectedChannel) {
      setError("Vui lòng chọn kênh")
      return
    }
    if (!payload.slots || payload.slots.length === 0) {
      setError("Vui lòng cấu hình ít nhất 1 khung giờ")
      return
    }
    try {
      setSaving(true)
      setError("")
      const res = await api.updateBookingConfig(selectedChannel, payload)
      const data = res?.data || res
      const { protocol, hostname, port } = window.location
      const feBase = `${protocol}//${hostname}${port ? `:${port}` : ""}`
      const token = data?.public_token || data?.public_link?.split("token=")[1] || ""
      const nextLink = token ? `${feBase}/public/book/${token}` : data?.public_link || publicLink
      setPublicLink(nextLink)
      onSaved?.(data)
    } catch (err) {
      console.error("[BookingConfigModal] save error", err)
      setError(err.message || "Không lưu được cấu hình")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="booking-config__overlay" onClick={onClose}>
      <div className="booking-config__panel" onClick={(e) => e.stopPropagation()}>
        <div className="booking-config__header">
          <div>
            <h3> Cấu hình khung giờ Booking</h3>
            <p className="booking-config__sub">Áp dụng theo kênh, có thể Copy qua các ngày </p>
          </div>
          <button className="booking-config__close" onClick={onClose}>
          <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="booking-config__body">
          {error && <div className="booking-config__error">{error}</div>}
          {success && <div className="booking-config__success">{success}</div>}
          <div className="booking-config__row">
            <label>Kênh</label>
            <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}>
              <option value="">-- Chọn kênh --</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="booking-config__row grid-2">
            <div>
              <label>Thời lượng tối thiểu (phút)</label>
              <input
                type="number"
                min={5}
                value={minDuration}
                onChange={(e) => setMinDuration(e.target.value)}
              />
            </div>
            <div>
              <label>Thời lượng tối đa (phút)</label>
              <input
                type="number"
                min={5}
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="booking-config__schedule-card">
            {loading ? (
              <div className="booking-config__loading">Đang tải cấu hình...</div>
            ) : (
              weekdays.map((day) => {
                const conf = dayConfigs[day.key] || defaultDayConfig()
                const isFirstSlot = (idx) => idx === 0
                return (
                  <div key={day.key} className="booking-config__day-row">
                    <div className="booking-config__day-toggle">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={!!conf.enabled}
                          onChange={() => handleToggleDay(day.key)}
                        />
                        <span className="slider" />
                      </label>
                      <span className="booking-config__day-label">{day.label}</span>
                    </div>
                    <div className={`booking-config__slots ${!conf.enabled ? "disabled" : ""}`}>
                      {conf.slots.map((slot, idx) => (
                        <div key={slot.id} className="booking-config__slot-row">
                          <input
                            type="time"
                            value={slot.start}
                            disabled={!conf.enabled}
                            onChange={(e) => handleSlotChange(day.key, slot.id, "start", e.target.value)}
                          />
                          <span className="booking-config__dash">-</span>
                          <input
                            type="time"
                            value={slot.end}
                            disabled={!conf.enabled}
                            onChange={(e) => handleSlotChange(day.key, slot.id, "end", e.target.value)}
                          />
                          {isFirstSlot(idx) ? (
                            <>
                              <button
                                className="booking-config__icon-btn"
                                title="Add new time slot"
                                disabled={!conf.enabled}
                                onClick={() => handleAddSlot(day.key)}
                              >
                                <PlusIcon />
                              </button>
                              <div className="booking-config__copy-wrapper">
                              <CopyButton
                                className="booking-config__icon-btn"
                                title="Copy times to"
                                onCopy={() => openCopyPopover(day.key)}
                              />
                                {copySourceDay === day.key && (
                                  <div className="booking-config__copy-popover">
                                    <div className="booking-config__copy-title">Copy times to</div>
                                    <div className="booking-config__copy-list">
                                      <label className="booking-config__copy-item">
                                        <input
                                          type="checkbox"
                                          checked={copyTargetDays.length === weekdays.length}
                                          onChange={(e) =>
                                            setCopyTargetDays(
                                              e.target.checked ? weekdays.map((d) => d.key) : [],
                                            )
                                          }
                                        />
                                        <span>Select All</span>
                                      </label>
                                      {weekdays.map((wd) => (
                                        <label key={wd.key} className="booking-config__copy-item">
                                          <input
                                            type="checkbox"
                                            checked={copyTargetDays.includes(wd.key)}
                                            onChange={(e) => {
                                              setCopyTargetDays((prev) =>
                                                e.target.checked
                                                  ? [...prev, wd.key]
                                                  : prev.filter((k) => k !== wd.key),
                                              )
                                            }}
                                          />
                                          <span>{wd.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <div className="booking-config__copy-actions">
                                      <button onClick={() => setCopySourceDay(null)}>Cancel</button>
                                      <button className="primary" onClick={applyCopy}>
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <button
                              className="booking-config__icon-btn danger"
                              title="Delete"
                              disabled={!conf.enabled || !slot.isNew}
                              onClick={() => handleDeleteSlot(day.key, slot.id)}
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {publicLink && (
            <div className="booking-config__link">
              <label>Public booking link</label>
              <div className="booking-config__link-row">
                <input type="text" readOnly value={publicLink} />
                <button
                  className="booking-config__btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(publicLink)
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="booking-config__footer">
          <button className="booking-config__btn ghost" onClick={onClose}>
            Đóng
          </button>
          <button className="booking-config__btn primary" disabled={saving} onClick={handleSave}>
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </div>
    </div>
  )
}
