"use client"

import { useState } from "react"
import "../styles/modals/event-detail.css"

export default function EventDetailModal({ event, onClose, onEdit, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!event) return null

  const eventData = event.data || event

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(eventData.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const start = new Date(eventData.start_at)
  const end = new Date(eventData.end_at)
  const formatDateTime = (date) =>
    `${date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} ${date.toLocaleDateString("vi-VN")}`

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header with delete/edit buttons - only show if onEdit and onDelete provided */}
        <div className="event-modal-header">
        <h2 className="event-modal-title">{eventData.channel?.name || "Sự kiện"}</h2>
        <div>
          {onEdit && (
            <button className="event-modal-btn-edit" onClick={() => onEdit(eventData)} title="Chỉnh sửa">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 14h2.414L11.657 6.171 9.243 3.757 2 11.001V14z" fill="currentColor" />
                <path
                  d="M14.328 2.914a1 1 0 000-1.414L13.5 1.672a1 1 0 00-1.414 0l-.828.828 2.414 2.414.656-.656a1 1 0 00.6-1.344z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button className="event-modal-btn-delete" onClick={handleDelete} disabled={isDeleting} title="Xóa">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 3h12M6 1v2m4-2v2M3 3v11a1 1 0 001 1h8a1 1 0 001-1V3M6 6v6m2-6v6m2-6v6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          </div>
        </div>

        {/* Main content */}
        <div className="event-modal-body">
          {/* Channel name */}
          

          {/* Date & Time */}
          <div className="event-modal-section">
            <div className="event-modal-row">
              <div className="event-modal-field">
                <div className="event-modal-label">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <path
                      d="M1 5h10M3 1v3M9 1v3M2 2h8a1 1 0 011 1v9a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="0.8"
                    />
                  </svg>
                  Thời gian: 
                </div>
                <div className="event-modal-range">
                  <span className="event-modal-date-time">{formatDateTime(start)}</span>
                  <span className="event-modal-to">tới</span>
                  <span className="event-modal-date-time">{formatDateTime(end)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="event-modal-section">
            <div className="event-modal-participants">
              {eventData.members && eventData.members.length > 0 ? (
                <>
                  {eventData.members
                    .filter((m) => m.role === "LIVE")
                    .map((member, idx) => (
                      <div key={`live-${member.employee_id}`} className="event-modal-participant">
                        <div className="event-modal-avatar">
                          {member.employee?.portrait_url ? (
                            <img
                              src={member.employee.portrait_url || "/placeholder.svg"}
                              alt={member.employee.full_name}
                            />
                          ) : (
                            <span>{member.employee?.full_name?.charAt(0) || "?"}</span>
                          )}
                        </div>
                        <div className="event-modal-member-info">
                          <div className="event-modal-member-name">{member.employee?.full_name}</div>
                          <div className="event-modal-member-role">Live chính</div>
                        </div>
                      </div>
                    ))} 
                  {eventData.members
                    .filter((m) => m.role === "SUPPORT")
                    .map((member, idx) => (
                      <div key={`support-${member.employee_id}`} className="event-modal-participant">
                        <div className="event-modal-avatar">
                          {member.employee?.portrait_url ? (
                            <img
                              src={member.employee.portrait_url || "/placeholder.svg"}
                              alt={member.employee.full_name}
                            />
                          ) : (
                            <span>{member.employee?.full_name?.charAt(0) || "?"}</span>
                          )}
                        </div>
                        <div className="event-modal-member-info">
                          <div className="event-modal-member-name">{member.employee?.full_name}</div>
                          <div className="event-modal-member-role">Hỗ trợ</div>
                        </div>
                      </div>
                    ))}
                </>
              ) : (
                <div className="event-modal-no-members">Chưa có thành viên</div>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div className="event-modal-section">
            <div className="event-modal-badges">
              {/* Status badge */}
              <div className="event-modal-badge-group">
                <span className="event-modal-badge-label">Trạng thái</span>
                <div className={`event-modal-badge ${eventData.is_active ? "active" : "inactive"}`}>
                  {eventData.is_active ? "Hoạt động" : "Không hoạt động"}
                </div>
              </div>

              {/* Revenue badge */}
              <div className="event-modal-badge-group">
                <span className="event-modal-badge-label">Kiếm tiền</span>
                <div className={`event-modal-badge ${eventData.revenue_enabled ? "on" : "off"}`}>
                  {eventData.revenue_enabled ? "Bật" : "Tắt"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
