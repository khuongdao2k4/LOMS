"use client"

import { Suspense, lazy, useEffect, useState } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import StaffSchedulePage from "./pages/StaffSchedulePage"
import StaffSessionPage from "./pages/StaffSessionPage"

// ⚠️ KHÔNG import "./App.css" ở đây nữa, để CSS login không đè Employees
import LoginInlinePage from "./pages/LoginInlinePage"
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"))
const ChannelsPage = lazy(() => import("./pages/ChannelsPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const SchedulesPage = lazy(() => import("./pages/SchedulesPage"))
const SessionPage = lazy(() => import("./pages/SessionPage"))
const RevenueReportPage = lazy(() => import("./pages/RevenueReportPage"))
const AdminBookingPage = lazy(() => import("./pages/AdminBookingPage"))
const PublicBookingPage = lazy(() => import("./pages/PublicBookingPage"))
const StaffSessionHistoryPage = lazy(() => import("./pages/StaffSessionHistoryPage"))

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [bootstrapped, setBootstrapped] = useState(false)
  const navigate = useNavigate()

  const isJwtValid = (token) => {
    try {
      const [, payload] = token.split(".")
      if (!payload) return false
      const { exp } = JSON.parse(atob(payload))
      return !exp || exp * 1000 > Date.now()
    } catch {
      return false
    }
  }

  const getRoles = (u) => u?.roles || []
  const isAdmin = (u) => getRoles(u).some((r) => r && r.includes("ADMIN"))
  const isEmployee = (u) => getRoles(u).some((r) => r && r.includes("EMPLOYEE"))
  const getHomePath = (u) => (isAdmin(u) ? "/dashboard" : "/staff/schedule")

  const boot = () => {
    const token = localStorage.getItem("accessToken")
    const ustr = localStorage.getItem("user")
    if (token && ustr && isJwtValid(token)) {
      setIsLoggedIn(true)
      setUser(JSON.parse(ustr))
    } else {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("user")
      setIsLoggedIn(false)
      setUser(null)
    }
    setBootstrapped(true)
  }

  useEffect(() => {
    boot()
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData || null)
    setIsLoggedIn(true)

    const path = getHomePath(userData)
    navigate(path, { replace: true })
  }

  const handleLogout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    setUser(null)
    navigate("/login", { replace: true })
  }

  // Tránh render Routes khi chưa boot xong, để reload /staff/schedule không bị đá sang /login rồi /dashboard
  if (!bootstrapped) {
    return <div style={{ padding: 24 }}>Đang khởi tạo phiên đăng nhập…</div>
  }

  return (
    <Routes>
      {/* Public booking page - no auth */}
      <Route
        path="/public/book/:token"
        element={
          <Suspense fallback={<div style={{ padding: 24 }}>Dang tai trang booking cong khai...</div>}>
            <PublicBookingPage />
          </Suspense>
        }
      />

      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to={getHomePath(user)} replace />
          ) : (
            <LoginInlinePage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      <Route
        path="/admin/bookings"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isAdmin(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Dang tai trang booking...</div>}>
              <AdminBookingPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/staff/schedule" replace />
          )
        }
      />

      {/* ====== ADMIN PAGES ====== */}
      <Route
        path="/dashboard"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isAdmin(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang dashboard…</div>}>
              <DashboardPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/staff/schedule" replace />
          )
        }
      />

      <Route
        path="/revenue"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isAdmin(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang báo cáo doanh thu…</div>}>
              <RevenueReportPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/staff/schedule" replace />
          )
        }
      />

      <Route
        path="/employees"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isAdmin(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang nhân viên…</div>}>
              <EmployeesPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/staff/schedule" replace />
          )
        }
      />

      <Route
        path="/channels"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isAdmin(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang kênh…</div>}>
              <ChannelsPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/staff/schedule" replace />
          )
        }
      />

      <Route
        path="/salary"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isAdmin(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang chấm công…</div>}>
              <SessionPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/staff/schedule" replace />
          )
        }
      />

      <Route
        path="/schedules"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isAdmin(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang quản lý lịch làm…</div>}>
              <SchedulesPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/staff/schedule" replace />
          )
        }
      />

      {/* ====== STAFF PAGES ====== */}
      <Route
        path="/staff/schedule"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isEmployee(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang lịch làm…</div>}>
              <StaffSchedulePage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/staff/session"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isEmployee(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Đang tải trang kích hoạt ca…</div>}>
              <StaffSessionPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/staff/history"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : isEmployee(user) ? (
            <Suspense fallback={<div style={{ padding: 24 }}>Dang tai ...</div>}>
              <StaffSessionHistoryPage user={user} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* ====== ROOT & FALLBACK ====== */}
      <Route path="/" element={<Navigate to={isLoggedIn ? getHomePath(user) : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
