"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getPayrollReport,
  exportPayrollExcel,
  updatePayrollSession,
  generateSalaryReport,
  getEmployees,
} from "../services/apiClient"
import Select, { components as selectComponents } from "react-select"
import "../styles/sessions/sessions.css"
import "../styles/modals/edit-session-figma.css"
import HeaderDefault from "../components/HeaderDefault"
import SidebarDefault from "../components/SidebarDefault"

// Đăng xuất bắt buộc khi token hết hạn
export function handleForcedLogout() {
  try {
    localStorage.removeItem("auth")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  } catch (_) {}
  window.location.href = "/login"
}

const PAGE_SIZE = 9

export default function PayrollPage() {
  // ====== Date filters ======
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const formatDateForInput = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [startDate, setStartDate] = useState(formatDateForInput(firstDayOfMonth))
  const [endDate, setEndDate] = useState(formatDateForInput(lastDayOfMonth))
  const [employeeId, setEmployeeId] = useState("")

  // ====== Data state ======
  const [summary, setSummary] = useState({
    totalHours: "0h",
    totalScheduledHours: "0h",
    totalRevenue: "0đ",
  })
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState("")
  const [employees, setEmployees] = useState([])
  const [page, setPage] = useState(1)

  // ====== Modal states ======
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [formData, setFormData] = useState({
    actual_duration_minutes: "",
    actual_revenue: "",
    note: "",
  })
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const hasToken = () => !!localStorage.getItem("accessToken")

  // ====== Format helpers ======
  const formatCurrency = useMemo(
    () => (value) => {
      if (!value && value !== 0) return "0đ"
      return new Intl.NumberFormat("vi-VN").format(value) + "đ"
    },
    []
  )

  const formatDate = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  // ====== Load report data ======
  const loadReport = useCallback(async () => {
    if (!hasToken()) return

    setLoading(true)
    setError("")

    try {
      const parseTimeToMinutes = (timeStr) => {
        if (!timeStr || typeof timeStr !== "string") return null
        const [startPart, endPart] = timeStr.split("-").map((p) => p && p.trim())
        if (!startPart || !endPart) return null
        const parsePart = (p) => {
          const [h, m] = p.split(":").map((n) => Number(n))
          if (Number.isNaN(h) || Number.isNaN(m)) return null
          return h * 60 + m
        }
        const start = parsePart(startPart)
        const end = parsePart(endPart)
        if (start == null || end == null) return null
        const diff = end - start
        return diff >= 0 ? diff : diff + 24 * 60
      }

      const params = {
        start_date: startDate,
        end_date: endDate,
      }
      if (employeeId.trim()) params.employee_id = employeeId.trim()

      const response = await getPayrollReport(params)
      const payload = response?.data || response
      const detailed = payload?.data?.detailed || payload?.detailed || payload?.sessions || []

      const mappedSessions = detailed.map((item) => {
      const shiftTime =
        item.schedule_time ||
        (item.schedule_start && item.schedule_end ? `${item.schedule_start} - ${item.schedule_end}` : item.shift_time)

        let actualMinutes = null
        if (item.actual_start_at && item.actual_end_at) {
          const diffMs = new Date(item.actual_end_at).getTime() - new Date(item.actual_start_at).getTime()
          actualMinutes = diffMs > 0 ? diffMs / 60000 : null
        }
        if (actualMinutes == null) {
          if (item.actual_duration_minutes != null) actualMinutes = Number(item.actual_duration_minutes)
          else if (item.actual_hours != null) actualMinutes = Number(item.actual_hours) * 60
          else if (item.total_hour != null) actualMinutes = Number(item.total_hour) * 60
        }

        const scheduledMinutesFromField =
          item.scheduled_hours != null ? Number(item.scheduled_hours) * 60 : null

        const scheduledMinutesFromRange = parseTimeToMinutes(
          item.schedule_time || (item.schedule_start && item.schedule_end ? `${item.schedule_start} - ${item.schedule_end}` : "")
        )

        const scheduledMinutes =
          scheduledMinutesFromField != null ? scheduledMinutesFromField : scheduledMinutesFromRange

        const portraitUrl =
          item.employee?.portrait_url ||
          item.portrait_url ||
          item.employee_portrait_url ||
          item.portrait ||
          (item.employee_id ||
          item.employee?.id ||
          item.employeeId
            ? employees.find((emp) => String(emp.id) === String(item.employee_id || item.employee?.id || item.employeeId))
                ?.portrait_url
            : null)

        return {
          ...item,
          id: item.session_id || item.id,
          employee_name:
            item.employee?.full_name ||
            item.employee_name ||
            item.employee_fullname ||
            item.employee?.name ||
            item.employee?.fullName ||
            "",
          employee_portrait_url: portraitUrl,
          portrait_url: portraitUrl,
          date: item.date || item.schedule_date || item.actual_start_at,
          channel_name: item.channel?.name || item.channel || item.channel_name,
          shift_time: shiftTime || "-",
          actual_duration_minutes: actualMinutes,
          scheduled_minutes: scheduledMinutes,
          scheduled_hours:
            scheduledMinutes != null
              ? scheduledMinutes / 60
              : item.scheduled_hours != null
              ? Number(item.scheduled_hours)
              : null,
          role: item.role,
          actual_revenue: item.revenue != null ? item.revenue : item.actual_revenue,
          unit_price: item.hourly_rate != null ? item.hourly_rate : item.unit_price,
          calculated_salary:
            item.total_salary != null ? item.total_salary : item.calculated_salary != null ? item.calculated_salary : null,
        }
      })

      setSessions(mappedSessions)
      setPage(1)

      const totalActualHours = mappedSessions.reduce(
        (acc, s) => acc + (s.actual_duration_minutes != null ? Number(s.actual_duration_minutes) / 60 : 0),
        0
      )
      const totalScheduledHours = mappedSessions.reduce(
        (acc, s) => acc + (s.scheduled_hours != null ? Number(s.scheduled_hours) : 0),
        0
      )
      const totalRevenue = mappedSessions.reduce(
        (acc, s) => acc + (s.actual_revenue != null ? Number(s.actual_revenue) : 0),
        0
      )

      setSummary({
        totalHours: `${totalActualHours.toFixed(1)}h`,
        totalScheduledHours: `${totalScheduledHours.toFixed(1)}h`,
        totalRevenue: formatCurrency(totalRevenue),
      })
    } catch (e) {
      console.error(e)
      if (e?.message === "UNAUTHORIZED") {
        handleForcedLogout()
        return
      }
      setError("Không tải được dữ liệu báo cáo")
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, employeeId, employees, formatCurrency])

  // Load danh sách nhân viên cho combobox
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await getEmployees()
        const list = res?.data || res || []
        setEmployees(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error("Không tải được danh sách nhân viên", err)
        setEmployees([])
      }
    }
    fetchEmployees()
  }, [])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Listen FORCE_LOGOUT
  useEffect(() => {
    const handler = () => handleForcedLogout()
    window.addEventListener("FORCE_LOGOUT", handler)
    return () => window.removeEventListener("FORCE_LOGOUT", handler)
  }, [])

  // ====== Export Excel ======
  const handleExportExcel = async () => {
    if (!hasToken()) return

    setExporting(true)

    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
      }
      if (employeeId.trim()) params.employee_id = employeeId.trim()

      const { blob, filename } = await exportPayrollExcel(params)
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename || `payroll-report-${startDate}-to-${endDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error(err)
      if (err?.message === "UNAUTHORIZED") {
        handleForcedLogout()
        return
      }
      alert("Lỗi khi xuất file Excel: " + (err.message || "Unknown error"))
    } finally {
      setExporting(false)
    }
  }

  // ====== Edit Modal ======
  const openEditModal = (session) => {
    setEditingSession(session)
    const baseRevenueStart =
      session.revenue_start ?? session.revenue_start_snap ?? 0
    const baseRevenueEnd =
      session.revenue_end ?? session.revenue ?? session.actual_revenue ?? 0
    const derivedActualRevenue =
      session.actual_revenue != null
        ? session.actual_revenue
        : baseRevenueEnd - baseRevenueStart > 0
        ? baseRevenueEnd - baseRevenueStart
        : baseRevenueEnd || ""

    setFormData({
      actual_duration_minutes:
        session.actual_duration_minutes ??
        (session.actual_hours != null ? Number(session.actual_hours) * 60 : null) ??
        (session.total_hour != null ? Number(session.total_hour) * 60 : null) ??
        "",
      actual_revenue: derivedActualRevenue,
      note: session.note || "",
    })
    setFormError("")
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setFormData({
      actual_duration_minutes: "",
      actual_revenue: "",
      note: "",
    })
    setFormError("")
    setEditingSession(null)
  }

  const handleUpdateSession = async () => {
    if (!editingSession) return

    if (formData.actual_duration_minutes === "" || formData.actual_revenue === "") {
      setFormError("Vui l?ng ?i?n ??y ?? th?ng tin b?t bu?c")
      return
    }

    setSubmitting(true)
    setFormError("")

    try {
      const existingMinutes =
        editingSession.actual_duration_minutes ??
        (editingSession.actual_hours != null ? Number(editingSession.actual_hours) * 60 : null) ??
        (editingSession.total_hour != null ? Number(editingSession.total_hour) * 60 : null) ??
        0
      const minutes =
        formData.actual_duration_minutes === ""
          ? existingMinutes
          : parseInt(formData.actual_duration_minutes, 10) || existingMinutes

      const existingRevenueStart =
        editingSession.revenue_start ?? editingSession.revenue_start_snap ?? 0
      const existingRevenueEnd =
        editingSession.revenue_end ??
        editingSession.revenue ??
        editingSession.actual_revenue ??
        existingRevenueStart
      const existingActualRevenue =
        editingSession.actual_revenue != null
          ? Number(editingSession.actual_revenue)
          : Math.max(0, Number(existingRevenueEnd) - Number(existingRevenueStart))

      const revenueInput =
        formData.actual_revenue === ""
          ? existingActualRevenue
          : Number.isNaN(Number(formData.actual_revenue))
          ? existingActualRevenue
          : Number(formData.actual_revenue)

      const revenueStart = 0
      const revenueEnd = revenueStart + revenueInput

      const startRaw = editingSession.actual_start_at || editingSession.schedule_start || editingSession.date
      const startDate = startRaw ? new Date(startRaw) : new Date()
      const endDate = new Date(startDate.getTime() + minutes * 60000)

      const body = {
        actual_start_at: startDate.toISOString(),
        actual_end_at: endDate.toISOString(),
        revenue_start: Number(revenueStart) || 0,
        revenue_end: Number(revenueEnd) || 0,
        revenue_enabled_snap: editingSession.revenue_enabled ?? true,
        note: formData.note || "",
      }

      await updatePayrollSession(editingSession.id, body)

      closeEditModal()
      await loadReport()
    } catch (err) {
      console.error(err)
      if (err?.message === "UNAUTHORIZED") {
        handleForcedLogout()
        return
      }
      setFormError(err.message || "Lỗi khi cập nhật ca làm")
    } finally {
      setSubmitting(false)
    }
  }

// ====== Generate Salary Report ======
  const openSalaryModal = () => {
    setShowSalaryModal(true)
  }

  const closeSalaryModal = () => {
    setShowSalaryModal(false)
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sessions.length / PAGE_SIZE)), [sessions.length])
  useEffect(() => {
    setPage((current) => (current > totalPages ? totalPages : current))
  }, [totalPages])

  const paginatedSessions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sessions.slice(start, start + PAGE_SIZE)
  }, [sessions, page])

  const pageNumbers = useMemo(() => {
    const maxButtons = 5
    let start = Math.max(1, page - Math.floor(maxButtons / 2))
    let end = Math.min(totalPages, start + maxButtons - 1)
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1)
    }
    const list = []
    for (let i = start; i <= end; i += 1) list.push(i)
    return list
  }, [page, totalPages])

  const startIndex = sessions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(sessions.length, page * PAGE_SIZE)

  const handleGenerateSalary = async () => {
    setSubmitting(true)

    try {
      const body = {
        start_date: startDate,
        end_date: endDate,
      }
      if (employeeId.trim()) body.employee_id = employeeId.trim()

      await generateSalaryReport(body)

      alert("Tạo báo cáo lương thành công!")
      closeSalaryModal()
      await loadReport()
    } catch (err) {
      console.error(err)
      if (err?.message === "UNAUTHORIZED") {
        handleForcedLogout()
        return
      }
      alert(err.message || "Lỗi khi tạo báo cáo lương")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="main-container">
      <HeaderDefault />

      <div className="flex-row-ea">
        <SidebarDefault />

        <div className="quan-ly-kenh-main">
          <div className="main-ss">
            {/* Header */}
            <div className="header-kenh">
              <div className="container">
                <div className="heading">
                  <span className="quan-ly-kenh-title">Quản lý chấm công</span>
                </div>
                <div className="container-desc">
                  <span className="quan-ly-kenh-desc">Hệ thống báo cáo và quản lý lương</span>
                </div>
              </div>
            </div>

            <div className="container-kenh">
              <div className="body">
                {/* Summary Cards */}
                <div className="payroll-summary-cards">
                  <div className="summary-card-ss">
                    <div className="summary-label">Tổng giờ thực tế</div>
                    <div className="summary-value summary-hours">{summary.totalHours}</div>
                  </div>
                  <div className="summary-card-ss">
                    <div className="summary-label">Tổng giờ ca làm</div>
                    <div className="summary-value summary-hours">{summary.totalScheduledHours}</div>
                  </div>
                  <div className="summary-card-ss summary-card-highlight">
                    <div className="summary-label">Tổng doanh thu</div>
                    <div className="summary-value summary-revenue">{summary.totalRevenue}</div>
                  </div>
                </div>

                {/* Filters */}
                <div className="horizontal-border">
                  <div className="container-search payroll-filters">
                    <div className="payroll-date-filters">
                      <div className="date-input-group">
                        <label className="date-label">Từ ngày</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value)
                            setPage(1)
                          }}
                          className="date-input"
                        />
                      </div>
                      <div className="date-input-group">
                        <label className="date-label">Đến ngày</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value)
                            setPage(1)
                          }}
                          className="date-input"
                        />
                      </div>
                      <div className="employee-input-group">
                        <label className="date-label">Chọn nhân viên</label>
                        <EmployeeSelect
                          employees={employees}
                          value={employeeId}
                          onChange={(val) => {
                            setEmployeeId(val)
                            setPage(1)
                          }}
                          placeholder="Chọn nhân viên (để trống = tất cả)"
                        />
                      </div>
                    </div>
                    <div className="button-actions">
                      <button className="button-export" onClick={loadReport} disabled={loading}>
                        <span className="text-export">{loading ? "Đang tải..." : "Tìm kiếm"}</span>
                      </button>
                      <button className="button-export" onClick={handleExportExcel} disabled={loading || exporting}>
                        <span className="text-export">{exporting ? "Đang xuất..." : "Xuất Excel"}</span>
                      </button>
                      <button className="button-add" onClick={openSalaryModal} disabled={loading}>
                        <span className="text-add">Báo cáo chấm công</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="container-table-ss">
                  <div className="table payroll-table">
                    {/* Header */}
                    <div className="header-table">
                      <div className="row-ss payroll-table-header">
                        <div className="cell payroll-col-employee">
                          <span className="id-kenh">Nhân viên</span>
                        </div>
                        <div className="cell payroll-col-date">
                          <span className="id-kenh">Ngày</span>
                        </div>
                        <div className="cell payroll-col-channel">
                          <span className="id-kenh">Kênh</span>
                        </div>
                        <div className="cell payroll-col-shift">
                          <span className="id-kenh">Ca làm (lịch)</span>
                        </div>
                        <div className="cell payroll-col-scheduled">
                          <span className="id-kenh">Giờ làm (lịch)</span>
                        </div>
                        <div className="cell payroll-col-hours">
                          <span className="id-kenh">Giờ thực tế</span>
                        </div>
                        <div className="cell payroll-col-role">
                          <span className="id-kenh">Vai trò</span>
                        </div>
                        <div className="cell payroll-col-revenue">
                          <span className="id-kenh">Doanh thu</span>
                        </div>
                        <div className="cell payroll-col-action">
                          <span className="id-kenh">Thao tác</span>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="body-table">
                      {loading && (
                        <div className="row" style={{ padding: 24, justifyContent: "center" }}>
                          Đang tải dữ liệu
                        </div>
                      )}

                      {!loading && error && (
                        <div className="row" style={{ padding: 24, justifyContent: "center", color: "#ef4444" }}>
                          {error}
                        </div>
                      )}

                      {!loading && !error && sessions.length === 0 && (
                        <div className="row" style={{ padding: 24, justifyContent: "center" }}>
                          Không có dữ liệu ca làm trong khoảng thời gian này
                        </div>
                      )}

                      {!loading &&
                        !error &&
                        paginatedSessions.map((session, idx) => (
                          <div
                            className="row-data-ss payroll-table-row"
                            key={`${session.id ?? "session"}-${page}-${idx}`}
                          >
                            <div className="data-col payroll-col-employee">
                              <span className="channel-name">{session.employee_name || "-"}</span>
                            </div>
                            <div className="data-col payroll-col-date">
                              <span className="channel-date">{formatDate(session.date)}</span>
                            </div>
                            <div className="data-col payroll-col-channel">
                              <span className="channel-name">{session.channel_name || "-"}</span>
                            </div>
                            <div className="data-col payroll-col-shift">
                              <span className="channel-name">{session.shift_time || "-"}</span>
                            </div>
                            <div className="data-col payroll-col-scheduled">
                              <span className="payroll-hours-value">
                                {session.scheduled_minutes != null ? `${(session.scheduled_minutes / 60).toFixed(1)}h` : "-"}
                              </span>
                            </div>
                            <div className="data-col payroll-col-hours">
                              <span className="payroll-hours-value">
                                {session.actual_duration_minutes != null
                                  ? `${(session.actual_duration_minutes / 60).toFixed(1)}h`
                                  : "-"}
                              </span>
                            </div>
                            <div className="data-col payroll-col-role">
                              <span
                                className={`payroll-role-badge ${
                                  session.role === "Livestreamer" ? "role-livestreamer" : "role-support"
                                }`}
                              >
                                {session.role || "-"}
                              </span>
                            </div>
                            <div className="data-col payroll-col-revenue">
                              <span className="channel-name">{formatCurrency(session.actual_revenue)}</span>
                            </div>
                            <div className="data-col-action payroll-col-action">
                              <button
                                className="button-edit"
                                title="Sua"
                                onClick={() => openEditModal(session)}
                                disabled={submitting || loading}
                              >
                                <div className="svg-edit" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="payroll-pagination">
                <div className="payroll-pagination-info">
                  Hiển thị {startIndex}-{endIndex} / {sessions.length}
                </div>
                <div className="payroll-pagination-controls">
                  <button
                    type="button"
                    className="payroll-pagination-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <i class="fa-solid fa-angle-left"></i>
                  </button>
                  {pageNumbers.map((pNumber) => (
                    <button
                      key={pNumber}
                      type="button"
                      className={`payroll-pagination-page${
                        pNumber === page ? " payroll-pagination-page--active" : ""
                      }`}
                      onClick={() => setPage(pNumber)}
                    >
                      {pNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="payroll-pagination-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <i class="fa-solid fa-angle-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Session Modal */}

      {showEditModal && editingSession && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content-cn" onClick={(e) => e.stopPropagation()}>
            <div className="session-edit-card">
              <div className="session-edit-header">
                <div>
                  <div className="session-edit-eyebrow">Cập nhật báo cáo</div>
                  <h2 className="session-edit-title">Chỉnh sửa chấm công</h2>
                  <p className="session-edit-subtitle">Cập nhật ca làm, giờ thực tế và doanh thu</p>
                </div>
                <button className="session-edit-close" onClick={closeEditModal} aria-label="??ng">
                  ?
                </button>
              </div>

              <div className="session-edit-meta">
                <div className="session-edit-avatar">
                  {editingSession?.employee?.portrait_url ||
                  editingSession?.portrait_url ||
                  editingSession?.employee_portrait_url ||
                  editingSession?.portrait ? (
                    <img
                      src={
                        editingSession.employee?.portrait_url ||
                        editingSession.portrait_url ||
                        editingSession.employee_portrait_url ||
                        editingSession.portrait
                      }
                      alt={editingSession.employee_name || "avatar"}
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        const fallback = e.currentTarget.nextElementSibling
                        if (fallback) fallback.style.display = "grid"
                      }}
                    />
                  ) : null}
                  <span className="session-edit-avatar-fallback">
                    {editingSession?.employee_name?.[0]?.toUpperCase?.() || "N"}
                  </span>
                </div>
                <div className="session-edit-meta-text">
                  <div className="session-edit-name-row">
                    <span className="session-edit-name">{editingSession.employee_name || "Ch?a c? t?n"}</span>
                    {editingSession.role && (
                      <span className={`session-edit-role ${editingSession.role === "Livestreamer" ? "primary" : "secondary"}`}>
                        {editingSession.role}
                      </span>
                    )}
                  </div>
                  <div className="session-edit-meta-line">
                    Kênh: {editingSession.channel_name || "-"}
                  </div>
                  <div className="session-edit-meta-line">
                    Ngày: {formatDate(editingSession.date)} - Ca: {editingSession.shift_time || "-"}
                  </div>
                </div>
              </div>
<div className="session-edit-grid">
                <div className="session-edit-field">
                  <label>Giờ ca (lịch)</label>
                  <div className="session-edit-input readonly">
                    {(editingSession.scheduled_minutes != null
                      ? (editingSession.scheduled_minutes / 60).toFixed(1)
                      : editingSession.scheduled_hours != null
                      ? Number(editingSession.scheduled_hours).toFixed(1)
                      : "-") + (editingSession.scheduled_minutes != null || editingSession.scheduled_hours != null ? "h" : "")}
                  </div>
                </div>

                <div className="session-edit-field">
                  <label>Giờ thực tế (phút) *</label>
                  <input
                    className="session-edit-input"
                    type="number"
                    min="0"
                    value={formData.actual_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, actual_duration_minutes: e.target.value })}
                    disabled={submitting}
                    placeholder="Nhập số phút (vd: 240)"
                  />
                </div>

                <div className="session-edit-field">
                  <label>Doanh thu thực tế (VND) *</label>
                  <input
                    className="session-edit-input"
                    type="number"
                    min="0"
                    value={formData.actual_revenue}
                    onChange={(e) => setFormData({ ...formData, actual_revenue: e.target.value })}
                    disabled={submitting}
                    placeholder="Nhập doanh thu"
                  />
                </div>
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="session-edit-actions">
                <button type="button" className="session-edit-btn ghost" onClick={closeEditModal} disabled={submitting}>
                 Huỷ
                </button>
                <button className="session-edit-btn primary" onClick={handleUpdateSession} disabled={submitting}>
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Generate Salary Report Modal */}
      {showSalaryModal && (
        <div className="modal-overlay" onClick={closeSalaryModal}>
          <div className="modal-content-cn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tạo báo cáo bảng lương</h2>
              <button className="modal-close" onClick={closeSalaryModal}>
              <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "12px" }}>
                  Bạn chắc chắn muốn tạo báo cáo lương cho khoảng thời gian:
                </p>
                <div
                  style={{
                    background: "#f3f4f6",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    marginBottom: "8px",
                  }}
                >
                  <p style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", margin: 0 }}>
                    {formatDate(startDate)} đến {formatDate(endDate)}
                  </p>
                </div>
                {employeeId && (
                  <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                    Nhân viên ID: <strong>{employeeId}</strong>
                  </p>
                )}
                <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "12px", fontStyle: "italic" }}>
                  Lưu ý: Hệ thống sẽ tính toán và lưu báo cáo lương dựa trên dữ liệu ca làm hiện có.
                </p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeSalaryModal} disabled={submitting}>
                  Hủy
                </button>
                <button className="btn-submit" onClick={handleGenerateSalary} disabled={submitting}>
                  {submitting ? "Đang tạo..." : "Tạo báo cáo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const EmployeeSelect = ({ employees, value, onChange, placeholder }) => {
  const options =
    employees?.map((emp) => ({
      value: String(emp.id),
      label: emp.full_name || "N/A",
      avatar: emp.portrait_url || "",
    })) || []

  const selected = options.find((opt) => opt.value === String(value)) || null

  const Option = (props) => (
    <selectComponents.Option {...props}>
      <div className="select-option row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", justifyContent: "flex-start" }}>
        <div className="avatar" style={{ width: 24, height: 24 }}>
          {props.data.avatar ? <img src={props.data.avatar} alt="" /> : props.data.label?.charAt(0) || "?"}
        </div>
        <span>{props.data.label}</span>
      </div>
    </selectComponents.Option>
  )

  const SingleValue = (props) => (
    <selectComponents.SingleValue {...props}>
      <div className="select-value row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="avatar" style={{ width: 24, height: 24 }}>
          {props.data.avatar ? <img src={props.data.avatar} alt="" /> : props.data.label?.charAt(0) || "?"}
        </div>
        <span>{props.data.label}</span>
      </div>
    </selectComponents.SingleValue>
  )

  return (
    <Select
      classNamePrefix="employee-select"
      value={selected}
      options={options}
      isClearable
      placeholder={placeholder}
      onChange={(opt) => onChange(opt ? opt.value : "")}
      components={{ Option, SingleValue, IndicatorSeparator: () => null }}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: 36,
          height: 36,
          borderRadius: 8,
          borderColor: "#dcdfe6",
          boxShadow: "none",
          fontSize: 14,
          "&:hover": { borderColor: "#409eff" },
        }),
        valueContainer: (base) => ({
          ...base,
          height: 36,
          padding: "4px 8px",
          gap: 8,
        }),
        input: (base) => ({
          ...base,
          margin: 0,
          padding: 0,
        }),
        indicatorsContainer: (base) => ({
          ...base,
          height: 36,
        }),
        menu: (base) => ({
          ...base,
          zIndex: 20,
          maxHeight: 240,
          overflow: "hidden",
        }),
        option: (base, state) => ({
          ...base,
          fontSize: 14,
          padding: "6px 10px",
          backgroundColor: state.isFocused ? "#f0f6ff" : "white",
          color: "#1f2937",
        }),
        singleValue: (base) => ({
          ...base,
          display: "flex",
          alignItems: "center",
          gap: 8,
          lineHeight: "20px",
          height: 28,
          overflow: "hidden",
          justifyContent: "flex-start",
        }),
      }}
      noOptionsMessage={() => "Không có nhân viên"}
    />
  )
}
