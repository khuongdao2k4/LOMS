"use client"
import { useEffect, useState } from "react"
import { request } from "../services/apiClient"
import "../styles/components/staff-active-session.css"

export default function StaffActiveSession({ session, user, onSessionEnded }) {
  const [sessionData, setSessionData] = useState(session?.data || session || {})
  const [finalRevenue, setFinalRevenue] = useState("")
  const [endScreenshot, setEndScreenshot] = useState(null)
  const [endScreenshotPreview, setEndScreenshotPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    setSessionData(session?.data || session || {})
  }, [session])

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const handleEndSession = async () => {
    setError(null)
    setSuccess(null)

    if (finalRevenue === "") {
      setError("Vui lòng nhập doanh thu kết thúc")
      return
    }

    if (!endScreenshot) {
      setError("Vui lòng chọn ảnh kết thúc ca")
      return
    }

    const ensureSessionId = async () => {
      const numId = Number(sessionData?.id)
      if (!Number.isNaN(numId)) return sessionData

      try {
        const params = user?.id ? { employee_id: user.id } : undefined
        const resp = await request("/sessions/active", { method: "GET", params })
        const data = resp?.data?.data || resp?.data || resp
        if (data?.id) {
          setSessionData(data)
          return data
        }
      } catch (err) {
        console.error("Failed to refetch active session", err)
      }
      return null
    }

    setSubmitting(true)
    try {
      // Upload screenshot end
      let screenshotEndUrl = null
      try {
        const res = await request("/uploads/screenshot", {
          method: "POST",
          body: (() => {
            const fd = new FormData()
            fd.append("file", endScreenshot)
            return fd
          })(),
        })
        screenshotEndUrl = res?.url || res?.data?.url || null
      } catch (e) {
        setError(e.message || "Lỗi khi upload ảnh kết thúc")
        setSubmitting(false)
        return
      }

      const current = await ensureSessionId()
      const finalId = current?.id
      if (!finalId || Number.isNaN(Number(finalId))) {
        setError("Không xác định được session id hợp lệ")
        return
      }

      const response = await request(`/sessions/${finalId}/stop`, {
        method: "POST",
        body: {
          final_revenue: Number.parseFloat(finalRevenue) || 0,
          screenshot_end_url: screenshotEndUrl,
        },
      })

      if (response?.success) {
        setSuccess("Kết thúc ca thành công!")
        setFinalRevenue("")
        setEndScreenshot(null)
        setEndScreenshotPreview(null)
        setTimeout(() => {
          onSessionEnded()
        }, 1000)
      }
    } catch (err) {
      setError(err.message || "Lỗi khi kết thúc ca")
    } finally {
      setSubmitting(false)
    }
  }

  const elapsedTime = () => {
    if (!sessionData.actual_start_at) return "N/A"
    const start = new Date(sessionData.actual_start_at)
    const now = new Date()
    const diff = now - start
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="staff-active-session-container">
      <div className="staff-session-card">
        <div className="staff-session-status">
          <div className="status-badge active">Đang diễn ra</div>
          <span className="elapsed-time">Thời gian: {elapsedTime()}</span>
        </div>

        {/* Session Information */}
        <div className="staff-session-info">
          <div className="info-group">
            <label>Thời gian ca</label>
            <p>
              {formatDateTime(sessionData.start_at)} - {formatDateTime(sessionData.end_at)}
            </p>
          </div>

          <div className="info-group">
            <label>Giờ Bắt Đầu Thực Tế</label>
            <p>{sessionData.actual_start_at ? formatDateTime(sessionData.actual_start_at) : "N/A"}</p>
          </div>

          <div className="info-group">
            <label>Doanh Thu Ban Đầu (d)</label>
            <p className="revenue">{(sessionData.revenue_start || 0).toLocaleString("vi-VN")}</p>
          </div>

          {(sessionData.screenshot_start_url || sessionData.screenshot_url) && (
            <div className="info-group">
              <label>Screenshot Bắt Đầu</label>
              <img
                src={sessionData.screenshot_start_url || sessionData.screenshot_url || "/placeholder.svg"}
                alt="Session screenshot"
                className="session-screenshot"
              />
            </div>
          )}
        </div>

        {/* End Session Form */}
        <div className="staff-end-session-form">
          <h3>Kết thúc ca</h3>

          {error && (
            <div className="staff-alert error">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="staff-alert success">
              <span>{success}</span>
            </div>
          )}

          <div className="staff-form-group">
            <label className="staff-form-label">Doanh Thu Kết thúc (d)</label>
            <input
              type="number"
              placeholder="Nhập doanh thu kết thúc"
              value={finalRevenue}
              onChange={(e) => setFinalRevenue(e.target.value)}
              className="staff-form-input"
              min="0"
            />
          </div>

          <div className="staff-form-group">
            <label className="staff-form-label">Screenshot Kết thúc</label>
            <div className="staff-screenshot-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setEndScreenshot(file)
                    const reader = new FileReader()
                    reader.onload = (ev) => setEndScreenshotPreview(ev.target?.result)
                    reader.readAsDataURL(file)
                  }
                }}
                className="staff-file-input"
                id="end-screenshot-input"
              />
              <label htmlFor="end-screenshot-input" className="staff-upload-label">
                {endScreenshotPreview ? "Ảnh đã chọn" : "Chọn ảnh kết thúc"}
              </label>
            </div>
            {endScreenshotPreview && (
              <div className="staff-screenshot-preview">
                <img src={endScreenshotPreview || "/placeholder.svg"} alt="Screenshot kết thúc" />
              </div>
            )}
          </div>

          <button onClick={handleEndSession} disabled={submitting} className="staff-btn-danger">
            {submitting ? "Đang xử lý..." : "Kết thúc ca"}
          </button>
        </div>
      </div>
    </div>
  )
}

