"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getChannels, createChannel, updateChannel, deleteChannel } from "../services/apiClient"
import "../styles/channels/channels.css"
import HeaderDefault from "../components/HeaderDefault"
import SidebarDefault from "../components/SidebarDefault"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faPlus,
  faPenToSquare,
  faXmark,
  faAt,
  faTag,
  faFloppyDisk,
  faBan,
} from "@fortawesome/free-solid-svg-icons"

export function handleForcedLogout() {
  try {
    localStorage.removeItem("auth")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  } catch (_) {}
  window.location.href = "/login"
}

export default function ChannelsPage() {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [size] = useState(8)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("add")
  const [editingChannel, setEditingChannel] = useState(null)
  const [formData, setFormData] = useState({ tiktok_channel_id: "", name: "" })
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size])

  const filterSearchQuery = (searchQuery) => {
    if (searchQuery.startsWith("@")) return searchQuery.substring(1)
    return searchQuery
  }

  const fmtDate = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const handleExportExcel = () => {
    if (!items.length) {
      alert("Không có dữ liệu đề xuất")
      return
    }

    try {
      const headers = ["ID Kênh", "Tên Kênh", "Ngày Thêm Vào"]
      const rows = items.map((channel) => [channel.tiktok_channel_id, channel.name, fmtDate(channel.created_at)])
      const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `channels_${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert("Lỗi khi xuất file")
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const filteredQ = filterSearchQuery(q)
      const data = await getChannels({ page, size, q: filteredQ })

      let list = []
      let totalCount = 0
      if (data && typeof data === "object" && Array.isArray(data.data) && data.pagination) {
        list = data.data
        totalCount = data.pagination.total || 0
      } else if (Array.isArray(data)) {
        list = data
        totalCount = data.length
      }

      setItems(list)
      setTotal(totalCount)
    } catch (e) {
      if (e?.message === "UNAUTHORIZED") {
        handleForcedLogout()
        return
      }
      setError("Không tải được danh sách kênh")
    } finally {
      setLoading(false)
    }
  }, [page, size, q])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handler = () => handleForcedLogout()
    window.addEventListener("FORCE_LOGOUT", handler)
    return () => window.removeEventListener("FORCE_LOGOUT", handler)
  }, [])

  const openAddModal = () => {
    setModalMode("add")
    setFormData({ tiktok_channel_id: "", name: "" })
    setFormError("")
    setEditingChannel(null)
    setShowModal(true)
  }

  const openEditModal = (channel) => {
    setModalMode("edit")
    setEditingChannel(channel)
    setFormData({ tiktok_channel_id: channel.tiktok_channel_id, name: channel.name })
    setFormError("")
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({ tiktok_channel_id: "", name: "" })
    setFormError("")
    setEditingChannel(null)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormError("")

    if (!formData.tiktok_channel_id.trim() || !formData.name.trim()) {
      setFormError("Vui lòng điền đầy đủ thông tin")
      return
    }

    setSubmitting(true)
    try {
      if (editingChannel) {
        await updateChannel(editingChannel.id, {
          tiktok_channel_id: formData.tiktok_channel_id,
          name: formData.name,
        })
      } else {
        await createChannel({
          tiktok_channel_id: formData.tiktok_channel_id,
          name: formData.name,
        })
      }
      closeModal()
      setPage(1)
      await load()
    } catch (err) {
      setFormError(err.message || "Lỗi khi lưu kênh")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (channelId) => {
    setSubmitting(true)
    try {
      await deleteChannel(channelId)
      setDeleteConfirm(null)
      setPage(1)
      await load()
    } catch (err) {
      setError(err.message || "Lỗi khi xoá kênh")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    load()
  }

  const renderTableRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={4} style={{ textAlign: "center", padding: 16 }}>
            Đang tải dữ liệu...
          </td>
        </tr>
      )
    }
    if (error) {
      return (
        <tr>
          <td colSpan={4} style={{ textAlign: "center", padding: 16 }}>
            {error}
          </td>
        </tr>
      )
    }
    if (!items.length) {
      return (
        <tr>
          <td colSpan={4} style={{ textAlign: "center", padding: 16 }}>
            Không có kênh phù hợp.
          </td>
        </tr>
      )
    }
    return items.map((channel) => (
      <tr key={channel.id}>
        <td>@{channel.tiktok_channel_id}</td>
        <td>{channel.name}</td>
        <td>{fmtDate(channel.created_at)}</td>
        <td className="channel-actions">
          <button className="button-edit" title="Sửa" onClick={() => openEditModal(channel)} disabled={submitting}>
            <div className="svg-edit" />
          </button>
          <button className="button-delete" title="Xóa" onClick={() => setDeleteConfirm(channel.id)} disabled={submitting}>
            <div className="svg-2e" />
          </button>
        </td>
      </tr>
    ))
  }

  return (
    <div className="main-container">
      <HeaderDefault />
      <div className="flex-row-ea">
        <SidebarDefault />

        <div className="quan-ly-kenh-main">
          <div className="main">
            <div className="header-kenh">
              <div className="container">
                <div className="heading">
                  <span className="quan-ly-kenh-title">Quản ký kênh</span>
                </div>
                <div className="container-desc">
                  <span className="quan-ly-kenh-desc">Quản lý danh sách các kênh trong hệ thống</span>
                </div>
              </div>
            </div>

            <div className="container-kenh-cn">
              <div className="body-cn">
                <div className="horizontal-border">
                  <div className="container-search">
                    <div className="search-box">
                      <div className="input">
                        <input
                          className="nhap-id-kenh"
                          style={{ border: "none", width: "100%" }}
                          placeholder="Nhập id kênh hoặc tên kênh để tìm kiếm"
                          value={q}
                          onChange={(e) => {
                            setQ(e.target.value)
                            setPage(1)
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") handleSearch()
                          }}
                        />
                      </div>
                      <div className="container-search-icon">
                        <div className="symbol" />
                      </div>
                    </div>
                    <div className="button-actions">
                      <button className="button-export" onClick={handleExportExcel}>
                        <span className="text-export">Xuất Excel</span>
                      </button>
                      <button className="button-add" onClick={openAddModal}>
                        <span className="text-add">+ Thêm kênh</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="container-table">
                  <div className="table-card">
                    <table className="channels-table">
                      <thead>
                        <tr>
                          <th>ID Kênh</th>
                          <th>Tên Kênh</th>
                          <th>Ngày thêm </th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>{renderTableRows()}</tbody>
                    </table>
                  </div>

                  <div className="horizontal-border-pagination">
                    <div className="container-pagination-info">
                      <span className="pagination-text">
                        Hien thi {items.length ? (page - 1) * size + 1 : 0}-{(page - 1) * size + items.length} / {total}
                      </span>
                    </div>
                    <div className="container-pagination-buttons">
                      <button
                        className="button-prev"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <div className="container-icon">
                        <i class="fa-solid fa-angle-left"></i>
                        </div>
                      </button>
                      {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1
                        const active = p === page
                        return (
                          <button
                            key={p}
                            className={active ? "button-page-active" : "button-page"}
                            onClick={() => setPage(p)}
                          >
                            <span className={active ? "page-number-active" : "page-number"}>{p}</span>
                          </button>
                        )
                      })}
                      <button
                        className="button-next"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <div className="container-icon">
                        <i class="fa-solid fa-angle-right"></i>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-content-cn" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div className="modal-title-wrap">
          <span className="modal-title-icon" aria-hidden="true">
            <FontAwesomeIcon icon={modalMode === "add" ? faPlus : faPenToSquare} />
          </span>

          <div className="modal-title-text">
            <h2 className="modal-title">{modalMode === "add" ? "Thêm Kênh" : "Sửa Kênh"}</h2>
            <p className="modal-subtitle">
              {modalMode === "add" ? "Tạo mới kênh TikTok trong hệ thống" : "Cập nhật thông tin kênh TikTok"}
            </p>
          </div>
        </div>

        <button type="button" className="modal-close" onClick={closeModal} aria-label="Đóng">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <form onSubmit={handleFormSubmit}>
        <div className="form-group-cn">
          <label>ID Kênh TikTok *</label>
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faAt} />
            </span>
            <input
              className="modal-input"
              type="text"
              placeholder="VD: shop_eaut_official"
              value={formData.tiktok_channel_id}
              onChange={(e) => setFormData({ ...formData, tiktok_channel_id: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="form-group-cn">
          <label>Tên Kênh *</label>
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faTag} />
            </span>
            <input
              className="modal-input"
              type="text"
              placeholder="VD: Shop Official"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        {formError && <div className="form-error">{formError}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={closeModal} disabled={submitting}>
            <span className="btn-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faBan} />
            </span>
            Hủy
          </button>

          <button type="submit" className="btn-submit" disabled={submitting}>
            <span className="btn-icon" aria-hidden="true">
              <FontAwesomeIcon icon={faFloppyDisk} />
            </span>
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content-cn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Xác nhận xóa</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
              <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p>Bạn có chắc chắn muốn xóa kênh này?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)} disabled={submitting}>
                Hủy
              </button>
              <button className="btn-submit btn-delete" onClick={() => handleDelete(deleteConfirm)} disabled={submitting}>
                {submitting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
