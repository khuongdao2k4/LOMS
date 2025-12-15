"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import BookingConfigModal from "../components/BookingConfigModal"
import HeaderDefault from "../components/HeaderDefault"
import SidebarDefault from "../components/SidebarDefault"
import { api } from "../services/apiClient"
import "../styles/pages/admin-booking.css"

const PAGE_SIZE = 12

const statusLabels = {
  pending: "Chờ Duyệt",
  approved: "Đã Booking",
  rejected: "Đã Huỷ",
  cancelled: "Đã Xoá",
}

// Map giá trị filter -> status BE yêu cầu
const statusQueryMap = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
  all: "all",
}

const formatTimeRange = (start, end) => {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString("vi-VN")} ${s.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${e.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
}

const getCurrentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const format = (date) => date.toISOString().split("T")[0]
  return {
    from: format(start),
    to: format(end),
  }
}

export default function AdminBookingPage({ onLogout }) {
  const [channels, setChannels] = useState([])
  const [filters, setFilters] = useState(() => ({
    channel_id: "",
    ...getCurrentMonthRange(),
  }))
  const [tab, setTab] = useState("all") // status filter value
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showConfig, setShowConfig] = useState(false)
  const [page, setPage] = useState(1)
  const [totalBookings, setTotalBookings] = useState(0)

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const res = await api.getChannels({ pageSize: 100 })
        setChannels(res?.data?.data || res?.data || res || [])
      } catch (err) {
        console.error("[AdminBooking] load channels error", err)
      }
    }
    loadChannels()
  }, [])


  const loadBookings = useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) {
        setLoading(true)
      }
      setError("")

      try {
        const res = await api.getBookings({
          status: tab === "all" ? undefined : statusQueryMap[tab] || tab,
          channel_id: filters.channel_id || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          page,
          pageSize: PAGE_SIZE,
        })

        const rawPayload = res?.data ?? res ?? {}

        const normalizeList = (payload) => {
          if (!payload) return []
          if (Array.isArray(payload)) return payload
          if (Array.isArray(payload.data)) return payload.data
          if (Array.isArray(payload.items)) return payload.items
          if (Array.isArray(payload.rows)) return payload.rows
          return []
        }

        let list = normalizeList(rawPayload)
        if (!list.length) {
          list = normalizeList(rawPayload?.data)
        }

        const paginationSource = rawPayload?.pagination ?? rawPayload?.data?.pagination
        const totalCount =
          paginationSource?.total ??
          rawPayload?.total ??
          rawPayload?.count ??
          rawPayload?.data?.total ??
          rawPayload?.data?.count ??
          list.length

        setBookings(list)
        setTotalBookings(totalCount ?? list.length)
      } catch (err) {
        setError(err.message || "Không tải được booking")
        setBookings([])
        setTotalBookings(0)
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [tab, filters.channel_id, filters.from, filters.to, page],
  )

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    const interval = setInterval(() => {
      loadBookings({ showLoading: false })
    }, 7000)
    return () => clearInterval(interval)
  }, [loadBookings])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalBookings / PAGE_SIZE)),
    [totalBookings],
  )

  useEffect(() => {
    setPage((current) => (current > totalPages ? totalPages : current))
  }, [totalPages])

  const pageNumbers = useMemo(() => {
    const maxButtons = 5
    let start = Math.max(1, page - Math.floor(maxButtons / 2))
    let end = Math.min(totalPages, start + maxButtons - 1)
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1)
    }
    const list = []
    for (let i = start; i <= end; i += 1) {
      list.push(i)
    }
    return list
  }, [page, totalPages])

  const startIndex = totalBookings === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(totalBookings, page * PAGE_SIZE)

  const grouped = useMemo(() => {
    const pendingList = bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "pending",
    )
    const approvedList = bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "approved",
    )
    return { pendingList, approvedList }
  }, [bookings])

  const handleAction = async (id, action) => {
    try {
      if (action === "approve") await api.approveBooking(id)
      if (action === "reject") await api.rejectBooking(id)
      if (action === "cancel") await api.cancelBooking(id)
      await loadBookings()
    } catch (err) {
      setError(err.message || "Không thực hiện được hành động")
    }
  }

  const renderTable = (data, mode) => (
    <table className="admin-booking__table">
      <thead>
        <tr>
          <th>Kênh</th>
          <th>Thời gian</th>
          <th>Khách</th>
          <th>SĐT</th>
          <th>Trạng thái</th>
          <th>Ghi chú</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && (
          <tr>
            <td colSpan={7} className="admin-booking__empty">
              Không có đơn Booking nào
            </td>
          </tr>
        )}
        {data.map((b) => {
          const status = String(b.status || "").toLowerCase()
          const isPending = status === "pending"
          const isApproved = status === "approved"
          return (
            <tr key={b.id || `${b.start_at}-${b.full_name}`}>
              <td>{b.channel?.name || b.channel_name || filters.channel_id || "Kênh"}</td>
              <td>{formatTimeRange(b.start_at || b.start, b.end_at || b.end)}</td>
              <td>{b.full_name || b.name || "Khách"}</td>
              <td>{b.phone || "-"}</td>
              <td>
                <span className={`admin-booking__badge ${status}`}>
                  {statusLabels[status] || status}
                </span>
              </td>
              <td>{b.note || "-"}</td>
              <td>
                <div className="admin-booking__actions">
                  {(mode === "pending" || (mode === "all" && isPending)) && (
                    <>
                      <button
                        className="admin-booking__btn primary"
                        onClick={() => handleAction(b.id, "approve")}
                      >
                        Duyệt
                      </button>
                      <button
                        className="admin-booking__btn danger"
                        onClick={() => handleAction(b.id, "reject")}
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {(mode === "approved" || (mode === "all" && isApproved)) && (
                    <button
                      className="admin-booking__btn danger"
                      onClick={() => handleAction(b.id, "cancel")}
                    >
                      Huỷ
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div className="main-container">
      <HeaderDefault onLogout={onLogout} />
      <div className="flex-row-ea">
        <SidebarDefault />

        <div className="admin-booking__page">
          <div className="admin-booking__header">
            <h2 className="admin-booking__title">Booking</h2>
            <button
              className="admin-booking__btn primary"
              onClick={() => setShowConfig(true)}
            >
              Cấu hình khung giờ
            </button>
          </div>

          {/* Hàng filter */}
          <div className="admin-booking__filters">
            {/* Kênh */}
            <select
              value={filters.channel_id}
              onChange={(e) => {
                setFilters((p) => ({ ...p, channel_id: e.target.value }))
                setPage(1)
              }}
            >
              <option value="">Tất cả kênh</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>

            {/* Từ ngày */}
            <input
              type="date"
              value={filters.from}
              onChange={(e) => {
                setFilters((p) => ({ ...p, from: e.target.value }))
                setPage(1)
              }}
            />

            {/* Đến ngày */}
            <input
              type="date"
              value={filters.to}
              onChange={(e) => {
                setFilters((p) => ({ ...p, to: e.target.value }))
                setPage(1)
              }}
            />

            {/* Trạng thái (thay cho 3 nút tab) */}
            <select
              value={tab}
              onChange={(e) => {
                setTab(e.target.value)
                setPage(1)
              }}
            >
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã booking</option>
              <option value="all">Tất cả</option>
            </select>
          </div>

          {error && (
            <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>
          )}

          <div className="admin-booking__card">
            {loading ? (
              <div className="admin-booking__empty">Đang tải...</div>
            ) : (
              <>
                <div className="admin-booking__table-wrapper">
                  {tab === "pending" ? (
                    renderTable(grouped.pendingList, "pending")
                  ) : tab === "approved" ? (
                    renderTable(grouped.approvedList, "approved")
                  ) : (
                    renderTable(bookings, "all")
                  )}
                </div>
                <div className="admin-booking__pagination">
                  <div className="admin-booking__pagination-info">
                    Hiển thị {startIndex}-{endIndex} / {totalBookings}
                  </div>
                  <div className="admin-booking__pagination-controls">
                    <button
                      type="button"
                      className="admin-booking__pagination-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <i class="fa-solid fa-angle-left"></i>
                    </button>
                    {pageNumbers.map((pNumber) => (
                      <button
                        key={pNumber}
                        type="button"
                        className={`admin-booking__pagination-page${
                          pNumber === page ? " admin-booking__pagination-page--active" : ""
                        }`}
                        onClick={() => setPage(pNumber)}
                      >
                        {pNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="admin-booking__pagination-btn"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <i class="fa-solid fa-angle-right"></i>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <BookingConfigModal
        open={showConfig}
        channels={channels}
        defaultChannelId={filters.channel_id}
        onClose={() => setShowConfig(false)}
      />
    </div>
  )
}
