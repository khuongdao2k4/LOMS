import { NavLink, useLocation } from "react-router-dom"
import "../styles/components/sidebar-default.css"
import '@fortawesome/fontawesome-free/css/all.min.css';


function SidebarDefault() {
  const location = useLocation()

  const linkStyle = ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "#111827" : "#374151",
    fontWeight: isActive ? 700 : 500,
  })

  const isRouteActive = (path) => location.pathname === path

  return (
    <div className="sidebar-default">
      <div className="frame-1">
        <div className="frame-4">
          <div className="frame-5">
            <span className="ca-nhan-6">TỔ CHỨC</span>
          </div>

          {/* Dashboard */}
          <div className={`menu-tab-7 ${isRouteActive("/dashboard") ? "active-menu" : ""}`}>
            <NavLink to="/dashboard" style={linkStyle} className="menu-8">
              <div className="name-9">
                <div className="dashboard-bold">
                  <div className="vuesax-bold-element" />
                </div>
                <span className="dashboard-a">Dashboard</span>
              </div>
            </NavLink>
          </div>
          
           {/* Qu?n ly l?ch l…m */}
           <div className={`menu-tab-1a ${isRouteActive("/schedules") ? "active-menu" : ""}`}>
            <NavLink to="/schedules" style={linkStyle} className="menu-1b">
              <div className="name-1c">
                <div className="organization-outline">
                  <div className="vuesax-outline-home-hashtag" />
                </div>
                <span className="dashboard-19">Quản lý lịch làm</span>
              </div>
            </NavLink>
          </div>

         {/* Booking */}
         <div className={`menu-tab-1a ${isRouteActive("/admin/bookings") ? "active-menu" : ""}`}>
            <NavLink to="/admin/bookings" style={linkStyle} className="menu-1b">
              <div className="name-1c">
                <div className="organization-outline">
                  {/* <div className="vuesax-outline-home-hashtag" /> */}
                  <i class="fa-regular fa-calendar-days"></i>
                </div>
                <span className="dashboard-19">Booking</span>
              </div>
            </NavLink>
          </div>

          {/* Nhƒn viˆn */}
          <div className={`menu-tab-7 ${isRouteActive("/employees") ? "active-menu" : ""}`}>
            <NavLink to="/employees" style={linkStyle} className="menu-c">
              <div className="name-d">
                <div className="employee-outline">
                  <div className="vuesax-outline-frame" />
                </div>
                <span className="dashboard-e">Nhân viên</span>
              </div>
            </NavLink>
          </div>

          {/* Kˆnh */}
          <div className={`menu-tab-12 ${isRouteActive("/channels") ? "active-menu" : ""}`}>
            <NavLink to="/channels" style={linkStyle} className="menu-13">
              <div className="name-14">
                <div className="request-outline">
                  <div className="vuesax-outline-clipboard-tick" />
                </div>
                <span className="kenh">Kênh</span>
              </div>
            </NavLink>
          </div>

          {/* Qu?n ly ch?m c“ng */}
          <div className={`menu-tab-16 ${isRouteActive("/salary") ? "active-menu" : ""}`}>
            <NavLink to="/salary" style={linkStyle} className="menu-17">
              <div className="name-18">
                <div className="report-outline">
                  <div className="vuesax-outline-book-saved" />
                </div>
                <span className="dashboard-15">Quản lý chấm công</span>
              </div>
            </NavLink>
          </div>

         

          

          {/* B o c o doanh thu */}
          <div className={`menu-tab-1a ${isRouteActive("/revenue") ? "active-menu" : ""}`}>
            <NavLink to="/revenue" style={linkStyle} className="menu-1b">
              <div className="name-1c">
                <div className="vector" />
                <span className="bao-cao-doanh-thu">Báo cáo doanh thu</span>
              </div>
            </NavLink>
          </div>
        </div>
      </div>

      <div className="group" style={{ cursor: "pointer" }}></div>
    </div>
  )
}

export default SidebarDefault
