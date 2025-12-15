import { NavLink, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import "../styles/components/staff-sidebar.css"

export default function StaffSidebar() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setIsOpen(false)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const linkStyle = ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "#111827" : "#374151",
    fontWeight: isActive ? 700 : 500,
  })

  const isRouteActive = (path) => location.pathname === path

  return (
    <>
      <button className={`sidebar-toggle-btn ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Sidebar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d={isOpen ? "M18 6L6 18M6 6l12 12" : "M3 12h18M3 6h18M3 18h18"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isMobile && isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      <div className={`sidebar-default staff-sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="frame-1">
          <div className="frame-4">
            <div className="frame-5">
              <span className="ca-nhan-6">NHÂN VIÊN</span>
            </div>

            <div className={`menu-tab-7 ${isRouteActive("/staff/schedule") ? "active-menu" : ""}`}>
              <NavLink to="/staff/schedule" style={linkStyle} className="menu-8" onClick={() => isMobile && setIsOpen(false)}>
                <div className="name-9">
                  <div className="calendar-icon">
                    <div className="vuesax-outline-element" />
                  </div>
                  <span className="menu-label-sb">Xem Lịch Làm</span>
                </div>
              </NavLink>
            </div>

            <div className={`menu-tab-7 ${isRouteActive("/staff/session") ? "active-menu" : ""}`}>
              <NavLink to="/staff/session" style={linkStyle} className="menu-8" onClick={() => isMobile && setIsOpen(false)}>
                <div className="name-9">
                  <div className="session-icon">
                    <div className="vuesax-outline-element" />
                  </div>
                  <span className="menu-label-sb">Kích hoạt ca</span>
                </div>
              </NavLink>
            </div>

            <div className={`menu-tab-7 ${isRouteActive("/staff/history") ? "active-menu" : ""}`}>
              <NavLink to="/staff/history" style={linkStyle} className="menu-8" onClick={() => isMobile && setIsOpen(false)}>
                <div className="name-9">
                  <div className="session-icon">
                    <div className="vuesax-outline-element" />
                  </div>
                  <span className="menu-label-sb">Lịch sử chấm công</span>
                </div>
              </NavLink>
            </div>
          </div>
        </div>

        <div className="group" style={{ cursor: "pointer" }}></div>
      </div>
    </>
  )
}
