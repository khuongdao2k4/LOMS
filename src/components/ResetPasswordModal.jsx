"use client"

import React, { useState } from "react"
import { resetAccountPassword } from "../services/apiClient"
import "../styles/modals/reset-password-modern.css"

export default function ResetPasswordModal({ accountId, onClose, onSuccess }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  if (!accountId) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ mật khẩu")
      return
    }
    if (password.length < 6) {
      setError("Mật khẩu ít nhất có 6 ký tự")
      return
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không hợp lệ")
      return
    }

    setLoading(true)
    try {
      const result = await resetAccountPassword(accountId, password)
      if (result?.success !== false) {
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      setError(err.message || "Lỗi reset mật khẩu")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reset-password-modal" onClick={onClose}>
      <div className="reset-password-card" onClick={(e) => e.stopPropagation()}>
        <div className="reset-password-head">
          <div className="reset-password-title">
            <span role="img" aria-label="lock">
              🔒
            </span>
            <span>Đặt lại mật khẩu</span>
          </div>
          <button className="reset-password-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="reset-password-body">
          <form onSubmit={handleSubmit} className="reset-password-body">
            <div className="reset-password-field">
              <label>
                Mật khẩu mới <span className="reset-password-required">*</span>
              </label>
              <div className="reset-password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                />
                <button type="button" className="reset-password-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="reset-password-field">
              <label>
                Xác nhận mật khẩu <span className="reset-password-required">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
            </div>

            {error && <div className="reset-password-error">{error}</div>}

            <div className="reset-password-actions">
              <button type="button" className="reset-password-btn ghost" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="reset-password-btn primary" disabled={loading}>
                {loading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
