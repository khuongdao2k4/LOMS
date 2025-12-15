"use client"

import { useEffect, useMemo, useState } from "react"
import Select, { components as selectComponents } from "react-select"
import { api } from "../services/apiClient"
import "../styles/modals/create-shift.css"

// Custom components for Select
const MemberOption = (props) => {
  const { avatar, label } = props.data
  return (
    <selectComponents.Option {...props}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {avatar ? (
          <img
            src={avatar || "/placeholder.svg"}
            alt={label}
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(e) => {
              e.target.style.display = "none"
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = "flex"
              }
            }}
          />
        ) : null}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#e5e5e5",
            display: avatar ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            color: "#666",
          }}
        >
          {label?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <span>{label}</span>
      </div>
    </selectComponents.Option>
  )
}

const MemberSingleValue = (props) => {
  const { avatar, label } = props.data
  return (
    <selectComponents.SingleValue {...props}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {avatar ? (
          <img
            src={avatar || "/placeholder.svg"}
            alt={label}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(e) => {
              e.target.style.display = "none"
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = "flex"
              }
            }}
          />
        ) : null}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#e5e5e5",
            display: avatar ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
            color: "#666",
          }}
        >
          {label?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <span>{label}</span>
      </div>
    </selectComponents.SingleValue>
  )
}

const MemberSelect = ({ employees, selectedIds, onAdd, placeholder }) => {
  const portalTarget = typeof window !== "undefined" ? document.body : undefined

  const options =
    employees
      ?.filter((emp) => !selectedIds.includes(String(emp.id)))
      .map((emp) => ({
        value: String(emp.id),
        label: emp.full_name || "N/A",
        avatar: emp.portrait_url || "",
      })) || []

  const handleChange = (option) => {
    if (!option) return
    const employeeId = Number.parseInt(option.value, 10)
    if (!Number.isNaN(employeeId)) {
      onAdd(employeeId)
    }
  }

  return (
    <Select
      classNamePrefix="member-select"
      options={options}
      onChange={handleChange}
      placeholder={placeholder}
      isClearable
      isSearchable={false}
      // Không portal để tránh bị chặn nếu CSS/overlay khác chèn lên
      menuPortalTarget={null}
      noOptionsMessage={() => "Không có Nhân viên"}
      components={{
        Option: MemberOption,
        SingleValue: MemberSingleValue,
        IndicatorSeparator: () => null,
      }}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: 40,
          borderRadius: 8,
          borderColor: "#dcdfe6",
          boxShadow: "none",
          fontSize: 14,
          "&:hover": { borderColor: "#409eff" },
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 10000,
        }),
        menu: (base) => ({
          ...base,
          zIndex: 10000,
        }),
      }}
    />
  )
}

const ChannelOption = (props) => {
  return (
    <selectComponents.Option {...props}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: props.data.color || "#409eff",
          }}
        />
        <span>{props.data.label}</span>
      </div>
    </selectComponents.Option>
  )
}

const ChannelSingleValue = (props) => {
  return (
    <selectComponents.SingleValue {...props}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: props.data.color || "#409eff",
          }}
        />
        <span>{props.data.label}</span>
      </div>
    </selectComponents.SingleValue>
  )
}

const ChannelSelect = ({ channels, value, onChange }) => {
  const options =
    channels?.map((ch) => ({
      value: String(ch.id),
      label: ch.name || "N/A",
      color: ch.color || "#409eff",
    })) || []

  const selectedOption = options.find((opt) => opt.value === String(value))

  return (
    <Select
      classNamePrefix="channel-select"
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option?.value || "")}
      placeholder="-- Chọn kênh --"
      isClearable
      isSearchable={false}
      menuPortalTarget={null}
      noOptionsMessage={() => "Không có kênh"}
      components={{
        Option: ChannelOption,
        SingleValue: ChannelSingleValue,
        IndicatorSeparator: () => null,
      }}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: 40,
          borderRadius: 8,
          borderColor: "#dcdfe6",
          boxShadow: "none",
          fontSize: 14,
          "&:hover": { borderColor: "#409eff" },
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 10000,
        }),
        menu: (base) => ({
          ...base,
          zIndex: 10000,
        }),
      }}
    />
  )
}

export default function CreateShiftModal({ channels, employees, onClose, onSuccess }) {
  const [shiftType, setShiftType] = useState("single") // "single" hoac "weekly"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    console.log("[CreateShiftModal] channels", channels)
    console.log("[CreateShiftModal] employees", employees)
  }, [channels, employees])

  const [formData, setFormData] = useState({
    channel_id: "",
    revenue_enabled: true,
  })

  const [singleForm, setSingleForm] = useState({
    start_date: "",
    start_time: "09:00",
    end_date: "",
    end_time: "11:00",
    live_members: [],
    support_members: [],
  })

  const [weeklyForm, setWeeklyForm] = useState({
    start_time: "09:00",
    end_time: "11:00",
    weekdays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
    default_live_members: [],
    default_support_members: [],
  })

  const employeesById = useMemo(() => {
    const map = new Map()
    employees?.forEach((emp) => {
      map.set(String(emp.id), emp)
    })
    return map
  }, [employees])

  const getEmployeeById = (employeeId) => {
    return employeesById.get(String(employeeId)) || null
  }

  const renderMemberChip = (employeeId, onRemove, keySuffix = "") => {
    const emp = getEmployeeById(employeeId)
    const displayName = emp?.full_name || "N/A"
    const portraitUrl = emp?.portrait_url
    const initials = displayName.charAt(0)?.toUpperCase() || "?"

    return (
      <div key={`member-chip-${employeeId}${keySuffix ? `-${keySuffix}` : ""}`} className="event-edit-member-chip">
        {portraitUrl ? (
          <img
            src={portraitUrl || "/placeholder.svg"}
            alt={displayName}
            className="event-edit-member-avatar"
            style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => {
              e.target.style.display = "none"
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = "flex"
              }
            }}
          />
        ) : (
          <div
            className="event-edit-member-avatar-placeholder"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#e5e5e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: "bold",
              color: "#666",
            }}
          >
            {initials}
          </div>
        )}
        <span>{displayName}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove(employeeId)
          }}
        >
          X
        </button>
      </div>
    )
  }

  const validateForm = () => {
    setError("")

    if (!formData.channel_id) {
      setError("Vui lòng chọn kênh")
      return false
    }

    if (shiftType === "single") {
      if (!singleForm.start_date || !singleForm.end_date) {
        setError("Vui lòng chọn ngày bắt đầu và kết thúc")
        return false
      }

      const startDateTime = new Date(`${singleForm.start_date}T${singleForm.start_time}`)
      const endDateTime = new Date(`${singleForm.end_date}T${singleForm.end_time}`)

      if (startDateTime >= endDateTime) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu")
        return false
      }

      if (startDateTime < new Date()) {
        setError("Thời gian bắt đầu phải nằm trong tương lai")
        return false
      }

      if (singleForm.live_members.length === 0) {
        setError("Phải có ít nhất 1 thành viên Live")
        return false
      }
    } else {
      const hasSelectedDay = Object.values(weeklyForm.weekdays).some((v) => v)
      if (!hasSelectedDay) {
        setError("Vui lòng chọn ít nhất 1 ngày trong tuần")
        return false
      }

      if (weeklyForm.start_time >= weeklyForm.end_time) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu")
        return false
      }
    }

    return true
  }

  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.id || user.account_id
      }
      return null
    } catch (e) {
      console.error("  Failed to get user ID:", e)
      return null
    }
  }

  const generateEventsFromSchedule = async (scheduleData) => {
    try {
      console.log("  Generating events from schedule for next 30 days")

      const today = new Date()
      const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      const weekdayMap = {
        1: "monday",
        2: "tuesday",
        4: "wednesday",
        8: "thursday",
        16: "friday",
        32: "saturday",
        64: "sunday",
      }

      const selectedDays = []
      Object.entries(weekdayMap).forEach(([mask, dayName]) => {
        if (scheduleData.weekdays_mask & Number.parseInt(mask)) {
          selectedDays.push(dayName)
        }
      })

      // Lấy members từ schedule để copy vào events
      const scheduleMembers = scheduleData.staff || scheduleData.members || []
      const eventMembers = scheduleMembers.map(member => ({
        employee_id: member.employee_id,
        role: member.role,
        priority: member.priority || 1,
        is_primary: member.is_primary || false,
      }))

      const events = []
      const currentDate = new Date(today)

      const parseScheduleTime = (timeValue) => {
        if (!timeValue) return { hour: 0, minute: 0 }
        if (typeof timeValue === "string" && timeValue.includes("T")) {
          const d = new Date(timeValue)
          return { hour: d.getHours(), minute: d.getMinutes() }
        }
        const parts = String(timeValue).split(":")
        return {
          hour: Number.parseInt(parts[0] || "0", 10),
          minute: Number.parseInt(parts[1] || "0", 10),
        }
      }

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        const currentDayName = dayNames[dayOfWeek]

        if (selectedDays.includes(currentDayName)) {
          const { hour: startHour, minute: startMin } = parseScheduleTime(scheduleData.start_at)
          const { hour: endHour, minute: endMin } = parseScheduleTime(scheduleData.end_at)

          const startDateTime = new Date(currentDate)
          startDateTime.setHours(startHour, startMin, 0, 0)

          const endDateTime = new Date(currentDate)
          endDateTime.setHours(endHour, endMin, 0, 0)

          const eventData = {
            channel_id: scheduleData.channel_id,
            start_at: startDateTime.toISOString(),
            end_at: endDateTime.toISOString(),
            revenue_enabled: formData.revenue_enabled,
            members: eventMembers,
            schedule_id: scheduleData.id,
          }

          events.push(eventData)
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      console.log(`  Creating ${events.length} events with ${eventMembers.length} members each`)

      for (const eventData of events) {
        try {
          await api.createEvent(eventData)
        } catch (err) {
console.error("  Failed to create event:", err)
        }
      }
    } catch (err) {
      console.error(" Error generating events from schedule:", err)
      throw err
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")

      if (shiftType === "single") {
        const startDateTime = new Date(`${singleForm.start_date}T${singleForm.start_time}`)
        const endDateTime = new Date(`${singleForm.end_date}T${singleForm.end_time}`)

        const members = [
          ...singleForm.live_members.map((empId) => ({
            employee_id: empId,
            role: "LIVE",
            priority: 1,
            is_primary: singleForm.live_members[0] === empId,
          })),
          ...singleForm.support_members.map((empId) => ({
            employee_id: empId,
            role: "SUPPORT",
            priority: 1,
            is_primary: singleForm.support_members[0] === empId,
          })),
        ]

        const eventData = {
          channel_id: Number.parseInt(formData.channel_id),
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          revenue_enabled: formData.revenue_enabled,
          members,
        }

        console.log(" Creating event with data:", eventData)
        await api.createEvent(eventData)
        setSuccessMessage("Tạo ca làm thành công!")

        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 500)
      } else {
        const weekdayMap = {
          monday: 1,
          tuesday: 2,
          wednesday: 4,
          thursday: 8,
          friday: 16,
          saturday: 32,
          sunday: 64,
        }

        let weekdaysMask = 0
        Object.entries(weeklyForm.weekdays).forEach(([day, selected]) => {
          if (selected) {
            weekdaysMask += weekdayMap[day]
          }
        })

        const userId = getCurrentUserId()
        if (!userId) {
          setError("Không xác định được người dùng hiện tại. Vui lòng đăng nhập lại.")
          setLoading(false)
          return
        }

        const scheduleData = {
          channel_id: Number.parseInt(formData.channel_id),
          weekdays_mask: weekdaysMask,
          // Gửi giờ thuần để tránh trừ offset (BE đã hỗ trợ HH:mm:ss hoặc ISO)
          start_at: `${weeklyForm.start_time}:00`,
          end_at: `${weeklyForm.end_time}:00`,
          is_active: true,
          created_by: userId,
        }

        const scheduleStaff = [
          ...weeklyForm.default_live_members.map((empId, idx) => ({
            employee_id: empId,
            role: "LIVE",
            priority: 1,
            is_primary: idx === 0,
          })),
          ...weeklyForm.default_support_members.map((empId, idx) => ({
            employee_id: empId,
            role: "SUPPORT",
            priority: 1,
            is_primary: idx === 0,
          })),
        ]

        if (scheduleStaff.length > 0) {
          scheduleData.staff = scheduleStaff
        }

        console.log(" Creating schedule with data:", scheduleData)
        const scheduleResponse = await api.createSchedule(scheduleData)

        if (scheduleResponse && scheduleResponse.data) {
          const createdSchedule = scheduleResponse.data
          await generateEventsFromSchedule(createdSchedule)
        }

        setSuccessMessage("Tạo lịch lặp thành công! Sự kiện được tạo cho 30 ngày tiếp theo.")

        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 500)
      }
    } catch (err) {
      console.error(" Error:", err)
      setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-shift-modal-overlay" onClick={onClose}>
      <div className="create-shift-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="create-shift-modal-header">
          <h2>Tạo lịch làm</h2>
          <button className="create-shift-close-btn" onClick={onClose}>
          <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-shift-modal-body">
          {error && <div className="create-shift-error-message">{error}</div>}
          {successMessage && <div className="create-shift-success-message">{successMessage}</div>}

          <div className="create-shift-form-group">
            <label>Loại lịch</label>
            <div className="create-shift-radio-group">
              <label className="create-shift-radio-label">
                <input
                  type="radio"
                  value="single"
                  checked={shiftType === "single"}
                  onChange={(e) => setShiftType(e.target.value)}
                />
                Tạo Ca Một Lần
              </label>
              <label className="create-shift-radio-label">
                <input
                  type="radio"
                  value="weekly"
                  checked={shiftType === "weekly"}
                  onChange={(e) => setShiftType(e.target.value)}
                />
                Tạo Lịch Lặp
              </label>
            </div>
          </div>

          <div className="create-shift-form-group">
            <label>
              Kênh <span className="create-shift-required">*</span>
            </label>
            <ChannelSelect
              channels={channels}
              value={formData.channel_id}
              onChange={(val) => setFormData({ ...formData, channel_id: val })}
            />
            {!channels || channels.length === 0 ? (
              <div className="create-shift-hint">Không có dữ liệu kênh.</div>
            ) : null}
          </div>

          {shiftType === "single" && (
            <>
              <div className="create-shift-form-row">
                <div className="create-shift-form-group">
                  <label>
                    Ngày Bắt Đầu <span className="create-shift-required">*</span>
                  </label>
                  <input
                    type="date"
                    value={singleForm.start_date}
                    onChange={(e) => setSingleForm({ ...singleForm, start_date: e.target.value })}
                    className="create-shift-input"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="create-shift-form-group">
                  <label>
                    Giờ Bắt Đầu <span className="create-shift-required">*</span>
                  </label>
                  <input
                    type="time"
                    value={singleForm.start_time}
                    onChange={(e) => setSingleForm({ ...singleForm, start_time: e.target.value })}
                    className="create-shift-input"
                  />
                </div>
              </div>

              <div className="create-shift-form-row">
                <div className="create-shift-form-group">
                  <label>
                    Ngày Kết Thúc <span className="create-shift-required">*</span>
                  </label>
                  <input
                    type="date"
                    value={singleForm.end_date}
                    onChange={(e) => setSingleForm({ ...singleForm, end_date: e.target.value })}
                    className="create-shift-input"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="create-shift-form-group">
                  <label>
                    Giờ Kết Thúc <span className="create-shift-required">*</span>
                  </label>
                  <input
                    type="time"
                    value={singleForm.end_time}
                    onChange={(e) => setSingleForm({ ...singleForm, end_time: e.target.value })}
                    className="create-shift-input"
                  />
                </div>
              </div>

              <div className="create-shift-form-group">
                <label>
                  Thành Viên Live <span className="create-shift-required">*</span>
                </label>
                <div className="event-edit-members-list">
                  {singleForm.live_members.map((empId) =>
                    renderMemberChip(empId, () => {
                      setSingleForm((prev) => ({
                        ...prev,
                        live_members: prev.live_members.filter((id) => id !== empId),
                      }))
                    })
                  )}
                </div>
                <MemberSelect
                  employees={employees}
                  selectedIds={singleForm.live_members.map((id) => String(id))}
                  onAdd={(employeeId) => {
                    setSingleForm({
                      ...singleForm,
                      live_members: [...singleForm.live_members, employeeId],
                    })
                  }}
                  placeholder="+ Thêm nhân viên Live"
                />
                {!employees || employees.length === 0 ? (
                  <div className="create-shift-hint">Không có dữ liệu nhân viên. Kiểm tra API getEmployees.</div>
                ) : null}
              </div>

              <div className="create-shift-form-group">
                <label>Thành viên hỗ trợ</label>
                <div className="event-edit-members-list">
                  {singleForm.support_members.map((empId) =>
                    renderMemberChip(empId, () => {
                      setSingleForm((prev) => ({
                        ...prev,
                        support_members: prev.support_members.filter((id) => id !== empId),
                      }))
                    })
                  )}
                </div>
                <MemberSelect
                  employees={employees}
                  selectedIds={singleForm.support_members.map((id) => String(id))}
                  onAdd={(employeeId) => {
                    setSingleForm({
                      ...singleForm,
                      support_members: [...singleForm.support_members, employeeId],
                    })
                  }}
                  placeholder="+ Thêm nhân viên hỗ trợ"
                />
              </div>

              <div className="create-shift-form-group">
                <label className="create-shift-toggle-label">
                  <input
                    type="checkbox"
                    checked={formData.revenue_enabled}
                    onChange={(e) => setFormData({ ...formData, revenue_enabled: e.target.checked })}
                  />
                  Kiếm tiền
                </label>
              </div>
            </>
          )}

          {shiftType === "weekly" && (
            <>
              <div className="create-shift-form-group">
                <label>
                  Chọn các ngày trong tuần <span className="create-shift-required">*</span>
                </label>
                <div className="create-shift-weekdays-grid">
                  {[
                    { key: "monday", label: "Thứ 2" },
                    { key: "tuesday", label: "Thứ 3" },
                    { key: "wednesday", label: "Thứ 4" },
                    { key: "thursday", label: "Thứ 5" },
                    { key: "friday", label: "Thứ 6" },
                    { key: "saturday", label: "Thứ 7" },
                    { key: "sunday", label: "Chủ nhật" },
                  ].map(({ key, label }) => (
                    <label key={key} className="create-shift-weekday-checkbox">
                      <input
                        type="checkbox"
                        checked={weeklyForm.weekdays[key]}
                        onChange={(e) => {
                          setWeeklyForm({
                            ...weeklyForm,
                            weekdays: { ...weeklyForm.weekdays, [key]: e.target.checked },
                          })
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="create-shift-form-row">
                <div className="create-shift-form-group">
                  <label>
                    Giờ bắt đầu: <span className="create-shift-required">*</span>
                  </label>
                  <input
                    type="time"
                    value={weeklyForm.start_time}
                    onChange={(e) => setWeeklyForm({ ...weeklyForm, start_time: e.target.value })}
                    className="create-shift-input"
                  />
                </div>
                <div className="create-shift-form-group">
                  <label>
                    Giờ kết thúc <span className="create-shift-required">*</span>
                  </label>
                  <input
                    type="time"
                    value={weeklyForm.end_time}
                    onChange={(e) => setWeeklyForm({ ...weeklyForm, end_time: e.target.value })}
                    className="create-shift-input"
                  />
                </div>
              </div>

              <div className="create-shift-form-group">
                <label>Thành viên Live</label>
                <div className="event-edit-members-list">
                  {weeklyForm.default_live_members.map((empId) =>
                    renderMemberChip(
                      empId,
                      () => {
                        setWeeklyForm((prev) => ({
                          ...prev,
                          default_live_members: prev.default_live_members.filter((id) => id !== empId),
                        }))
                      },
                      "weekly-live"
                    )
                  )}
                </div>
                <MemberSelect
                  employees={employees}
                  selectedIds={weeklyForm.default_live_members.map((id) => String(id))}
                  onAdd={(employeeId) => {
                    setWeeklyForm((prev) => ({
                      ...prev,
                      default_live_members: [...prev.default_live_members, employeeId],
                    }))
                  }}
                  placeholder="+ Thêm nhân viên Live"
                />
                {!employees || employees.length === 0 ? (
                  <div className="create-shift-hint">Không có dữ liệu nhân viên.</div>
                ) : null}
              </div>

              <div className="create-shift-form-group">
                <label>Nhân viên hỗ trợ</label>
                <div className="event-edit-members-list">
                  {weeklyForm.default_support_members.map((empId) =>
                    renderMemberChip(
                      empId,
                      () => {
                        setWeeklyForm((prev) => ({
                          ...prev,
                          default_support_members: prev.default_support_members.filter((id) => id !== empId),
                        }))
                      },
                      "weekly-support"
                    )
                  )}
                </div>
                <MemberSelect
                  employees={employees}
                  selectedIds={weeklyForm.default_support_members.map((id) => String(id))}
                  onAdd={(employeeId) => {
                    setWeeklyForm((prev) => ({
                      ...prev,
                      default_support_members: [...prev.default_support_members, employeeId],
                    }))
                  }}
                  placeholder="+ Thêm nhân viên hỗ trợ"
                />
              </div>
            </>
          )}
        </form>

        <div className="create-shift-modal-footer">
          <button onClick={onClose} className="create-shift-btn-cancel">
            Huy
          </button>
          <button onClick={handleSubmit} disabled={loading} className="create-shift-btn-save">
            {loading ? "Đang tạo..." : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  )
}
