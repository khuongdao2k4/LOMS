"use client"

import { useState } from "react"
import LoginForm from "../components/LoginForm"
import LoginBanner from "../components/LoginBanner"
import "../styles/login-page.css"

export default function LoginPage({ onLoginSuccess }) {
  const [error, setError] = useState("")

  const handleLogin = async (credentials) => {
    try {
      setError("")
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        throw new Error("Đăng nhập thất bại. Vui lòng kiểm tra tên đăng nhập và mật khẩu.")
      }

      const data = await response.json()

      if (data.data && data.data.accessToken) {
        localStorage.setItem("accessToken", data.data.accessToken)
        if (data.data.refreshToken) {
          localStorage.setItem("refreshToken", data.data.refreshToken)
        }
        if (data.data.user) {
          localStorage.setItem("user", JSON.stringify(data.data.user))
        }
        onLoginSuccess(data.data.user)
      } else {
        throw new Error("Phản hồi từ server không hợp lệ.")
      }
    } catch (err) {
      console.error("  Login error:", err)
      setError(err.message || "Lỗi kết nối. Vui lòng thử lại.")
    }
  }

  return (
    <div className="login-page">
      <LoginBanner />
      <LoginForm onSubmit={handleLogin} error={error} />
    </div>
  )
}
