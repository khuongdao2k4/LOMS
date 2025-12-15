"use client"

import { useState, useEffect, useMemo } from "react"
import Select, { components as selectComponents } from "react-select"
import "../styles/modals/event-edit.css"

// ---- Member Select with avatar (react-select) ----

const MemberOption = (props) => {
  const { avatar, label } = props.data
  return (
    <selectComponents.Option {...props}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {avatar ? (
          <img
            src={avatar}
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
            src={avatar}
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

function MemberSelect({ role, employees, selectedIds, onAdd, placeholder }) {
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
      onAdd(employeeId, role)
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
      menuPortalTarget={portalTarget}
      menuPosition="fixed"
      noOptionsMessage={() => "Không có nhân viên"}
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

// ---- Modal chính ----

export default function EventEditModal({ event, channels = [], employees = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    channel_id: "",
    start_at: "",
    end_at: "",
    revenue_enabled: true,
    members: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedChannel, setSelectedChannel] = useState(null)

  // Map employees by id để lookup nhanh & đúng type
  const employeesById = useMemo(() => {
    const map = new Map()
    employees?.forEach((emp) => {
      map.set(String(emp.id), emp)
    })
    // Bổ sung nhân viên từ members (có thể chỉ có trong event)
    formData.members?.forEach((m) => {
      const fromMember = m.employee
      if (fromMember?.id && !map.has(String(fromMember.id))) {
        map.set(String(fromMember.id), fromMember)
      }
    })
    return map
  }, [employees, formData.members])

  // ISO UTC -> chuỗi local cho <input type="datetime-local">
  const toLocalInputValue = (isoString) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return ""
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
  }

  useEffect(() => {
    if (!event) return

    const eventData = event.data || event

    const normalizedMembers =
      eventData.members?.map((m) => ({
        ...m,
        employee_id: m.employee_id ?? m.employee?.id ?? m.id,
        role: m.role || m.type || "LIVE",
      })) || []

    setFormData({
      channel_id: eventData.channel_id || eventData.channel?.id || "",
      start_at: toLocalInputValue(eventData.start_at),
      end_at: toLocalInputValue(eventData.end_at),
      revenue_enabled: eventData.revenue_enabled ?? true,
      members: normalizedMembers,
    })

      const channel = channels?.find((c) => String(c.id) === String(eventData.channel_id || eventData.channel?.id))
      setSelectedChannel(channel || null)
  }, [event, channels])

  const handleChannelChange = (channelValue) => {
    const channelId = channelValue ? Number.parseInt(channelValue, 10) : ""

    setFormData((prev) => ({
      ...prev,
      channel_id: channelId,
    }))

    const channel = channels?.find((c) => String(c.id) === String(channelId))
    setSelectedChannel(channel || null)
  }

  const handleTimeChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleRevenueToggle = () => {
    setFormData((prev) => ({
      ...prev,
      revenue_enabled: !prev.revenue_enabled,
    }))
  }

  const handleAddMember = (employeeId, role) => {
    if (!employeeId) return

    const exists = formData.members.some(
      (m) => String(m.employee_id) === String(employeeId) && m.role === role,
    )
    if (exists) return

    const newMember = {
      employee_id: employeeId,
      role,
      priority: 1,
      is_primary: formData.members.filter((m) => m.role === role).length === 0,
    }

    setFormData((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }))
  }

  const handleRemoveMember = (employeeId, role) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter(
        (m) => !(String(m.employee_id) === String(employeeId) && m.role === role),
      ),
    }))
  }

  const handleSave = async () => {
    try {
      setError("")
      setLoading(true)

      if (!formData.channel_id) {
        setError("Vui lòng chọn kênh")
        return
      }

      if (!formData.start_at || !formData.end_at) {
        setError("Vui lòng chọn thời gian")
        return
      }

      const start = new Date(formData.start_at)
      const end = new Date(formData.end_at)

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setError("Thời gian không hợp lệ")
        return
      }

      if (start >= end) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu")
        return
      }

      const liveMembersCount = formData.members.filter((m) => m.role === "LIVE").length
      if (liveMembersCount === 0) {
        setError("Phải có ít nhất 1 thành viên Live")
        return
      }

      const startIso = start.toISOString()
      const endIso = end.toISOString()

      await onSave({
        ...formData,
        start_at: startIso,
        end_at: endIso,
      })
    } catch (err) {
      setError(err?.message || "Đã xảy ra lỗi khi lưu ca làm")
    } finally {
      setLoading(false)
    }
  }

  const getEmployeeById = (employeeId) => {
    return employeesById.get(String(employeeId)) || null
  }

  const renderMemberChip = (member, role) => {
    const emp = getEmployeeById(member.employee_id) || member.employee

    if (!emp) {
      // fallback khi không tìm thấy nhân viên
      return (
        <div key={`${role}-${member.employee_id}`} className="event-edit-member-chip">
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
              color: "#999",
            }}
          >
            ?
          </div>
          <span>N/A</span>
          <button onClick={() => handleRemoveMember(member.employee_id, role)}>×</button>
        </div>
      )
    }

    const portraitUrl = emp.portrait_url
    const displayName = emp.full_name || "N/A"
    const initials = displayName.charAt(0)?.toUpperCase() || "?"

    return (
      <div key={`${role}-${member.employee_id}`} className="event-edit-member-chip">
        {portraitUrl ? (
          <img
            src={portraitUrl}
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
        ) : null}
        <div
          className="event-edit-member-avatar-placeholder"
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#e5e5e5",
            display: portraitUrl ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: "bold",
            color: "#666",
          }}
        >
          {initials}
        </div>
        <span>{displayName}</span>
        <button onClick={() => handleRemoveMember(member.employee_id, role)}>×</button>
      </div>
    )
  }

  if (!event) return null

  const liveMembers = formData.members.filter((m) => m.role === "LIVE")
  const supportMembers = formData.members.filter((m) => m.role === "SUPPORT")
  const liveSelectedIds = liveMembers.map((m) => String(m.employee_id))
  const supportSelectedIds = supportMembers.map((m) => String(m.employee_id))

  return (
    <div className="event-edit-modal-overlay" onClick={onClose}>
      <div className="event-edit-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="event-edit-modal-header">
          <h2>Chỉnh sửa ca làm</h2>
          <button className="event-edit-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="event-edit-modal-body">
          {error && <div className="event-edit-error-message">{error}</div>}

          {/* Channel Selection */}
          <div className="event-edit-form-group">
            <label>Kênh</label>
            <ChannelSelect channels={channels} value={formData.channel_id} onChange={handleChannelChange} />
          </div>

          {/* Time Selection */}
          <div className="event-edit-form-group">
            <label>Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              value={formData.start_at}
              onChange={(e) => handleTimeChange("start_at", e.target.value)}
              className="event-edit-input"
            />
          </div>

          <div className="event-edit-form-group">
            <label>Thời gian kết thúc</label>
            <input
              type="datetime-local"
              value={formData.end_at}
              onChange={(e) => handleTimeChange("end_at", e.target.value)}
              className="event-edit-input"
            />
          </div>

          {/* Revenue Toggle */}
          <div className="event-edit-form-group">
            <label className="event-edit-toggle-label">
              <input
                type="checkbox"
                checked={formData.revenue_enabled}
                onChange={handleRevenueToggle}
              />
              Kiếm tiền
            </label>
          </div>

          {/* Members LIVE */}
          <div className="event-edit-form-group">
            <label>Thành viên Live</label>
            <div className="event-edit-members-list">
              {liveMembers.map((member) => renderMemberChip(member, "LIVE"))}
            </div>
            <MemberSelect
              role="LIVE"
              employees={employees}
              selectedIds={liveSelectedIds}
              onAdd={handleAddMember}
              placeholder="+ Thêm thành viên Live"
            />
          </div>

          {/* Members SUPPORT */}
          <div className="event-edit-form-group">
            <label>Thành viên Hỗ trợ</label>
            <div className="event-edit-members-list">
              {supportMembers.map((member) => renderMemberChip(member, "SUPPORT"))}
            </div>
            <MemberSelect
              role="SUPPORT"
              employees={employees}
              selectedIds={supportSelectedIds}
              onAdd={handleAddMember}
              placeholder="+ Thêm thành viên Hỗ trợ"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="event-edit-modal-footer">
          <button onClick={onClose} className="event-edit-btn-cancel">
            Hủy
          </button>
          <button onClick={handleSave} disabled={loading} className="event-edit-btn-save">
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  )
}
// Channel Select (react-select)
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
  const portalTarget = typeof window !== "undefined" ? document.body : undefined
  let options =
    channels?.map((ch) => ({
      value: String(ch.id),
      label: ch.name || "N/A",
      color: ch.color || "#409eff",
    })) || []

  // Nếu chưa có options nhưng có value, thêm option fallback để hiển thị
  if ((!options || options.length === 0) && value) {
    options = [
      {
        value: String(value),
        label: "N/A",
        color: "#409eff",
      },
    ]
  }

  const selectedOption = options.find((opt) => opt.value === String(value))

  return (
    <Select
      classNamePrefix="channel-select"
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option?.value || "")}
      placeholder="-- Chọn Kênh --"
      isClearable
      isSearchable={false}
      menuPortalTarget={portalTarget}
      menuPosition="fixed"
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


