"use client"

import { useEffect, useMemo, useState } from "react"
import HeaderDefault from "../components/HeaderDefault"
import StaffSidebar from "../components/StaffSidebar"
import { request } from "../services/apiClient"
import "../styles/pages/staff-session-history.css"

const PAGE_SIZE = 11

const getCurrentMonthDate = (isEnd = false) => {
  const now = new Date()
  if (isEnd) {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return lastDay.toISOString().slice(0, 10)
  }
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  return firstDay.toISOString().slice(0, 10)
}

export default function StaffSessionHistoryPage({ onLogout }) {
  const [fromDate, setFromDate] = useState(() => getCurrentMonthDate())
  const [toDate, setToDate] = useState(() => getCurrentMonthDate(true))
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)

  const rangeLabel = useMemo(() => {
    if (!fromDate || !toDate) return ""
    return `${fromDate} - ${toDate}`
  }, [fromDate, toDate])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError("")
      const params = {
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      }
      const res = await request("/sessions/history", { method: "GET", params })
      const payload = res?.data || res || {}
      const list = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data?.items) ? payload.data.items : []
      setSessions(list)
      setPage(1)
    } catch (err) {
      setError(err.message || "Không tải được lịch sử chấm công")
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmtDateTime = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
  }

  const fmtDate = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString("vi-VN")
  }

  const fmtShift = (start, end) => {
    if (!start || !end) return "-"
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "-"
    const h = (date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    return `${h(s)} - ${h(e)}`
  }

  const fmtHours = (start, end) => {
    if (!start || !end) return "-"
    const s = new Date(start)
    const e = new Date(end)
    const diff = Math.max(0, e.getTime() - s.getTime())
    return `${(diff / 3600000).toFixed(1)}h`
  }

  const fmtHoursActual = (session) => {
    const { actual_start_at, actual_end_at, total_hours } = session || {}
    if (actual_start_at && actual_end_at) {
      return fmtHours(actual_start_at, actual_end_at)
    }
    if (typeof total_hours === "number") {
      return `${Number(total_hours).toFixed(1)}h`
    }
    return "-"
  }

  const fmtRevenue = (session) => {
    const format = (val) =>
      new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(val) || 0) + "đ"
    if (session?.revenue_total != null) return format(session.revenue_total)
    if (session?.revenue_end != null && session?.revenue_start != null) {
      return format(session.revenue_end - session.revenue_start)
    }
    return "-"
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



  return (
    <div className="main-container">
      <HeaderDefault onLogout={onLogout} />
      <div className="flex-row-df">
        <StaffSidebar />
        <div className="staff-history-content">
          <div className="staff-history-header">
            <div>
              <h2 className="staff-history-title">Lịch sử chấm công</h2>
              {rangeLabel && <p className="staff-history-sub">{rangeLabel}</p>}
            </div>
            <div className="staff-history-filters">
              <div className="staff-history-date">
                <label>Từ ngày</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="staff-history-date">
                <label>Đến ngày</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <button className="staff-history-btn" onClick={loadHistory} disabled={loading}>
                {loading ? "Đang tải..." : "Lọc"}
              </button>
            </div>
          </div>

          <div className="staff-history-table-wrapper">
            <table className="staff-history-table">
              <thead>
                <tr>
                  <th className="col-date">Ngày</th>
                  <th className="col-channel">Kênh</th>
                  <th className="col-shift">Ca làm (lịch)</th>
                  <th className="col-hours">Giờ làm (lịch)</th>
                  <th className="col-hours">Giờ thực tế</th>
                  <th className="col-role">Vai trò</th>
                  <th className="col-revenue">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="staff-history-empty">
                      Đang tải...
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={7} className="staff-history-empty">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && (!sessions || sessions.length === 0) && (
                  <tr>
                    <td colSpan={7} className="staff-history-empty">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  paginatedSessions.map((s, idx) => (
                    <tr key={s.id || s.session_id || `${s.start_at}-${s.end_at}-${idx}`}>
                      <td>{fmtDate(s.start_at || s.start_time)}</td>
                      <td>{s.channel?.name || s.channel_name || "-"}</td>
                      <td>{fmtShift(s.start_at || s.start_time, s.end_at || s.end_time)}</td>
                      <td>{fmtHours(s.start_at || s.start_time, s.end_at || s.end_time)}</td>
                      <td>{fmtHoursActual(s)}</td>
                      <td>
                        {s.role ? <span className={`staff-history-badge ${String(s.role).toLowerCase()}`}>{s.role}</span> : "-"}
                      </td>
                      <td className="revenue-cell">{fmtRevenue(s)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          
          {/* Scroll hint cho mobile */}
          {!loading && !error && sessions.length > 0 && (
            <div className="staff-history-scroll-hint">
              Vuốt ngang để xem thêm
            </div>
          )}
          {!loading && !error && sessions.length > 0 && (
            <div className="staff-history-pagination">
              <div className="staff-history-pagination-info">
                Hiển thị {startIndex}-{endIndex} / {sessions.length}
              </div>
              <div className="staff-history-pagination-controls">
                <button
                  type="button"
                  className="staff-history-pagination-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                 <i class="fa-solid fa-angle-left"></i>
                </button>
                {pageNumbers.map((pg) => (
                  <button
                    type="button"
                    key={pg}
                    className={`staff-history-pagination-page${pg === page ? " staff-history-pagination-page--active" : ""}`}
                    onClick={() => setPage(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  className="staff-history-pagination-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <i class="fa-solid fa-angle-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
