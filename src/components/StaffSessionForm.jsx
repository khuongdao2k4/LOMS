"use client"

import { useState } from "react"
import { request, uploadScreenshot as apiUploadScreenshot } from "../services/apiClient"
import "../styles/components/staff-session-form.css"

export default function StaffSessionForm({ user, onSessionStarted }) {
  const [tiktokChannelId, setTiktokChannelId] = useState("")
  const [initialRevenue, setInitialRevenue] = useState("")
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const normalizeSession = (raw) => {
    if (!raw) return null
    const id = raw.id ?? raw.session_id ?? raw.session?.id ?? raw.session?.session_id
    return id ? { ...raw, id } : raw
  }

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setScreenshot(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setScreenshotPreview(event.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleStartSession = async () => {
    setError(null)
    setSuccess(null)

    if (!tiktokChannelId.trim()) {
      setError("Vui lòng nhập TikTok Channel ID")
      return
    }

    if (initialRevenue === "") {
      setError("Vui long nhập doanh thu ban đầu")
      return
    }

    if (!screenshot) {
      setError("Vui lòng chọn ảnh screenshot")
      return
    }

    let screenshotUrl = null
    setUploading(true)
    try {
      const res = await apiUploadScreenshot(screenshot)
      screenshotUrl = res?.url || res?.data?.url || null
    } catch (err) {
      setError(err.message || "Lỗi khi upload ảnh.")
      setUploading(false)
      return
    }
    setUploading(false)

    if (!screenshotUrl) {
      setError("Không Upload được ảnh. Vui lòng thử lại!")
      return
    }

    setSubmitting(true)
    try {
      const activateResponse = await request("/sessions/activate", {
        method: "POST",
        body: {
          tiktok_channel_id: tiktokChannelId.trim(),
          initial_revenue: Number.parseFloat(initialRevenue) || 0,
          screenshot_url: screenshotUrl, // backend expects screenshot_url (will persist to screenshot_start_url)
        },
      })

      let createdSession = normalizeSession(
        activateResponse?.data?.data || activateResponse?.data || activateResponse,
      )

      if (!createdSession?.id) {
        try {
          const employeeId = user?.id || localStorage.getItem("employeeId")
          const params = employeeId ? { employee_id: employeeId } : undefined
          const activeResp = await request("/sessions/active", { method: "GET", params })
          createdSession = normalizeSession(activeResp?.data?.data || activeResp?.data || activeResp)
        } catch (e) {
          // ignore
        }
      }

      if (createdSession?.id) {
        setSuccess("Bắt đầu ca thành công!")
        setInitialRevenue("")
        setScreenshot(null)
        setScreenshotPreview(null)
        onSessionStarted(createdSession)
      } else {
        setError("Không nhận được session id. Vui lòng thử lại ")
        onSessionStarted(null)
      }
    } catch (err) {
      setError(err.message || "Lỗi khi bắt đầu ca")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="staff-session-form-container">
      <div className="staff-form-card">
        <div className="staff-form-section">
          <h2 className="staff-form-heading">Bắt đầu ca làm</h2>

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

          <>
            <div className="staff-form-group">
              <label className="staff-form-label">TikTok Channel ID</label>
              <input
                type="text"
                placeholder="Nhap TikTok Channel ID"
                value={tiktokChannelId}
                onChange={(e) => setTiktokChannelId(e.target.value)}
                className="staff-form-input"
              />
            </div>

            <div className="staff-form-group">
              <label className="staff-form-label">Doanh Thu Ban Đầu (đ)</label>
              <input
                type="number"
                placeholder="0"
                value={initialRevenue}
                onChange={(e) => setInitialRevenue(e.target.value)}
                className="staff-form-input"
                min="0"
              />
            </div>

            <div className="staff-form-group">
              <label className="staff-form-label">Screenshot</label>
              <div className="staff-screenshot-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="staff-file-input"
                  id="screenshot-input"
                />
                <label htmlFor="screenshot-input" className="staff-upload-label">
                  {screenshotPreview ? "Ảnh đã chọn" : "Chọn ảnh"}
                </label>
              </div>
              {screenshotPreview && (
                <div className="staff-screenshot-preview">
                  <img src={screenshotPreview || "/placeholder.svg"} alt="Screenshot preview" />
                </div>
              )}
            </div>

            <button onClick={handleStartSession} disabled={submitting || uploading} className="staff-btn-primary">
              {submitting || uploading ? "Đang xử lý..." : "Bắt đầu ca"}
            </button>
          </>
        </div>
      </div>
    </div>
  )
}

