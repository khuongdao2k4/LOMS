import { useState, useEffect, useRef } from "react"
import { request } from "../services/apiClient"
import HeaderDefault from "../components/HeaderDefault"
import StaffSidebar from "../components/StaffSidebar"
import StaffSessionForm from "../components/StaffSessionForm"
import StaffActiveSession from "../components/StaffActiveSession"
import "../styles/pages/dashboard.css"
import "../styles/pages/staff-session.css"

export default function StaffSessionPage({ user, onLogout }) {
  const [activeSession, setActiveSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const activeSessionRef = useRef(null)

  const setActiveSessionWithCache = (session) => {
    if (session?.id && !Number.isNaN(Number(session.id))) {
      const normalized = { ...session, id: Number(session.id) }
      setActiveSession(normalized)
      activeSessionRef.current = normalized
      try {
        localStorage.setItem("activeSession", JSON.stringify(normalized))
      } catch {}
    } else {
      setActiveSession(null)
      activeSessionRef.current = null
      try {
        localStorage.removeItem("activeSession")
      } catch {}
    }
  }

  const isSessionValid = (session) => {
    if (!session?.id || Number.isNaN(Number(session.id))) return false
    if (!session?.end_at) return true
    const endAt = new Date(session.end_at)
    return endAt > new Date()
  }

  const fetchActiveSession = async () => {
    setLoading(true)
    setError(null)
    try {
      const employeeId = user?.id || localStorage.getItem("employeeId")
      const params = employeeId ? { employee_id: employeeId } : undefined

      const response = await request("/sessions/active", {
        method: "GET",
        params,
      })

      const sessionData = response?.data?.data || response?.data || response
      if (isSessionValid(sessionData)) {
        setActiveSessionWithCache(sessionData)
      } else if (isSessionValid(activeSessionRef.current)) {
        
        setActiveSessionWithCache(activeSessionRef.current)
      } else {
        setActiveSessionWithCache(null)
      }
    } catch (err) {
      setError(err.message || "Lỗi khi tải dữ liệu")
      if (!isSessionValid(activeSessionRef.current)) {
        setActiveSessionWithCache(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const cached = localStorage.getItem("activeSession")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.id && !Number.isNaN(Number(parsed.id))) {
          setActiveSession(parsed)
          activeSessionRef.current = parsed
        }
      }
    } catch {}

    fetchActiveSession()
  }, [refreshTrigger])

  const handleSessionStarted = (newSession) => {
    if (newSession) {
      setActiveSessionWithCache(newSession.data || newSession)
      // Không fetch ngay để tránh BE trả null; sẽ reload theo refreshTrigger hoặc thủ công
      return
    }
    fetchActiveSession()
  }

  const handleSessionEnded = () => {
    setActiveSessionWithCache(null)
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="main-container">
      <HeaderDefault />
      <div className="flex-row-df">
        <StaffSidebar />
        <div className="staff-session-content">
          <div className="staff-session-header">
            <h1 className="staff-session-title">Kích hoạt ca</h1>
          </div>

          {error && (
            <div className="staff-error-message">
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="staff-loading">
              <span>Đang tải dữ liệu...</span>
            </div>
          )}

          {!loading && activeSession && (
            <StaffActiveSession session={activeSession} user={user} onSessionEnded={handleSessionEnded} />
          )}

          {!loading && !activeSession && <StaffSessionForm user={user} onSessionStarted={handleSessionStarted} />}
        </div>
      </div>
    </div>
  )
}
