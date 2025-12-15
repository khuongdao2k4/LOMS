import HeaderDefault from "../components/HeaderDefault"
import SidebarDefault from "../components/SidebarDefault"
import ScheduleInterface from "../components/ScheduleInterface"
import "../styles/pages/schedules-page.css"

export default function SchedulesPage({ user, onLogout }) {
  return (
    <div className="schedules-page-wrapper">
      <HeaderDefault />
      <div className="schedules-page-container">
        <SidebarDefault />
        <ScheduleInterface />
      </div>
    </div>
  )
}
