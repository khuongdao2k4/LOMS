import "../styles/pages/revenue-report.css"
import SidebarDefault from "../components/SidebarDefault"
import HeaderDefault from "../components/HeaderDefault"
import RevenueReportDashboard from "../components/revenueReportDashBoard"

const RevenueReportPage = () => {
  return (
    <div className="main-container">
        <HeaderDefault/>
        <div className="flex-row-ea">
      <SidebarDefault />
      <div className="main-content">
        <RevenueReportDashboard/>
      </div>
    </div>
    </div> 
  )
}

export default RevenueReportPage
