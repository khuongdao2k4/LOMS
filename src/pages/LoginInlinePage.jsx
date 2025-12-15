"use client"

import { useState } from "react"
import "../styles/login.css" // chỉ login mới nạp CSS này

export default function LoginInlinePage({ onLoginSuccess }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(raw?.message || "Đăng nhập thất bại.")

      const accessToken = raw?.accessToken ?? raw?.data?.accessToken
      const refreshToken = raw?.refreshToken ?? raw?.data?.refreshToken
      const user        = raw?.account     ?? raw?.data?.user
      if (!accessToken || !user) throw new Error("Phản hồi từ server không hợp lệ.")

      localStorage.setItem("accessToken", accessToken)
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("user", JSON.stringify(user))

      onLoginSuccess?.(user)
    } catch (err) {
      setError(err.message || "Lỗi kết nối. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-main-container">
      <div className="frame">
        <div className="frame-1">
          <div className="isolation-mode" />
          <div className="frame-2">
            <span className="dang-nhap">Đăng nhập</span>
            <form className="frame-3" onSubmit={handleSubmit}>
              <div className="input">
                <div className="title">
                  <span className="title-id-user">Username</span>
                  <span className="asterisk">*</span>
                </div>
                <input
                  type="text"
                  className="input-4"
                  placeholder="Nhập Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="input-5">
                <span className="title-6">Mật khẩu</span>
                <div className="input-7">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input-content-8"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="eye-off"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  />
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="frame-9">
                <div className="remember">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    className="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="rememberMe" className="content">Ghi nhớ</label>
                </div>
              </div>

              <button type="submit" className="button" disabled={loading}>
                <span className="login-button">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="frame-a">
        <div className="frame-b">
          <span className="welcome-message">"Chào mừng đến mới hệ thống quản lý nhân sự."</span>
        </div>
        <div className="priscilla-du-preez" />
      </div>
    </div>
  )
}
