import { useEffect, useState, useMemo } from "react"
import HeaderDefault from "../components/HeaderDefault"
import SidebarDefault from "../components/SidebarDefault"
import "../styles/pages/dashboard-new.css"
import { getPayrollReport, getEvents, getRevenueReport } from "../services/apiClient"
import { getChannelColor } from "../utils/channelColors"
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/chart"

function formatCurrency(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return "0 ₫"
  return num.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })
}

function MiniCalendar({ events = [] }) {
  const [current, setCurrent] = useState(new Date())
  const year = current.getFullYear()
  const month = current.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const startDay = start.getDay()
  const days = []
  const offset = (startDay + 6) % 7
  for (let i = 0; i < offset; i++) days.push(null)
  for (let d = 1; d <= end.getDate(); d++) days.push(d)

  const today = new Date()

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(evt => {
      const d = new Date(evt.start_at)
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate()
        if (!map[day]) map[day] = { list: [], hasMorning: false, hasAfternoon: false }
        map[day].list.push(evt)

        const hour = d.getHours()
        if (hour < 12) map[day].hasMorning = true
        else map[day].hasAfternoon = true
      }
    })
    return map
  }, [events, month, year])

  const prevMonth = () => {
    const d = new Date(current)
    d.setMonth(d.getMonth() - 1)
    setCurrent(d)
  }
  const nextMonth = () => {
    const d = new Date(current)
    d.setMonth(d.getMonth() + 1)
    setCurrent(d)
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header-db">
        <button className="mc-btn" onClick={prevMonth}>{"<"}</button>
        <span>Tháng {month + 1}, {year}</span>
        <button className="mc-btn" onClick={nextMonth}>{">"}</button>
      </div>
      <div className="mini-calendar-grid">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
          <div key={d} className="mini-calendar-day-db mini-calendar-day-label">
            {d}
          </div>
        ))}
        {days.map((d, idx) => {
          const isToday =
            d &&
            today.getDate() === d &&
            today.getMonth() === month &&
            today.getFullYear() === year
          
          const hasEvents = d && eventsByDate[d] && eventsByDate[d].list.length > 0
          const hasMorning = hasEvents && eventsByDate[d].hasMorning
          const hasAfternoon = hasEvents && eventsByDate[d].hasAfternoon
          
          return (
            <div 
              key={idx} 
              className={`mini-calendar-day-db ${isToday ? "today" : ""} ${hasEvents ? "has-events" : ""}`}
              title={hasEvents ? `${eventsByDate[d].list.length} ca live` : ""}
            >
              <span className="day-number">{d || ""}</span>
              {hasEvents && (
                <div className="dots-row">
                  {hasMorning && <span className="dot morning" />}
                  {hasAfternoon && <span className="dot afternoon" />}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mini-calendar-legend">
        <div className="legend-item"><span className="dot morning" /> Ca sáng</div>
        <div className="legend-item"><span className="dot afternoon" /> Ca chiều</div>
        <div className="legend-item"><span className="dot month" /> {events.length} ca live trong tháng này</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    totalLiveHours: 0,
    revenueChange: "+0%",
    hoursChange: "+0%",
  })
  const [topEmployees, setTopEmployees] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [revenueChart, setRevenueChart] = useState([])
  const [allEvents, setAllEvents] = useState([])

  const formatYAxisTick = (value) => {
    if (!value) return "0"
    try {
      return new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value)
    } catch (e) {
      if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}B`
      if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`
      if (value >= 1_000) return `${Math.round(value / 1_000)}k`
      return String(Math.round(value))
    }
  }

  const formatFullDate = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const renderRevenueTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null
    const value = payload[0]?.value ?? 0
    const fullDate = payload[0]?.payload?.fullDate
    const dateLabel = fullDate ? formatFullDate(fullDate) : `Ngày ${label}`
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{dateLabel}</div>
        <div className="chart-tooltip-row">
          <span className="name">Doanh thu</span>
          <span className="value">{formatCurrency(value)}</span>
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError(null)
      
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)
      const fromDate = firstDay.toISOString().split('T')[0]
      const toDate = lastDay.toISOString().split('T')[0]

      console.log('?? ===== LOADING DASHBOARD =====')
      console.log('?? Date Range:', fromDate, '?', toDate)

      // 1. Load Payroll Report
      const payrollData = await getPayrollReport({
        from: fromDate,
        to: toDate,
        page: 1,
        pageSize: 1000
      })

      // 2. Load Revenue Report (theo ngày)
      const revenueData = await getRevenueReport({
        type: 'NETWORK',
        section: 'DAILY',
        from: fromDate,
        to: toDate
      })


      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      
      const eventsData = await getEvents({
        from: now.toISOString(),
        to: futureDate.toISOString(),
        page: 1,
        pageSize: 10
      })


      const monthEventsData = await getEvents({
        from: fromDate,
        to: toDate,
        page: 1,
        pageSize: 500
      })

      console.log(' API Responses:', {
        payroll: payrollData,
        revenue: revenueData,
        events: eventsData,
        monthEvents: monthEventsData
      })


      console.log(' ===== PARSING REVENUE =====')
      let totalRevenue = 0
      

      if (payrollData?.data?.summary && Array.isArray(payrollData.data.summary)) {
        totalRevenue = payrollData.data.summary.reduce((sum, emp) => 
          sum + (emp.total_revenue || emp.revenue || 0), 0
        )
        console.log(' Calculated from Payroll summary:', totalRevenue)
      }
      // Fallback: Revenue Report
      else if (revenueData?.summary?.total_revenue) {
        totalRevenue = revenueData.summary.total_revenue
        console.log(' Fallback to Revenue Report:', totalRevenue)
      }
      
      console.log(' TOTAL REVENUE:', formatCurrency(totalRevenue))


      console.log(' ===== PARSING HOURS =====')
      let totalHours = 0
      

      if (payrollData?.data?.summary && Array.isArray(payrollData.data.summary)) {
        totalHours = payrollData.data.summary.reduce((sum, emp) => {
          const hours = emp.total_actual_hours
            ?? emp.actual_hours
            ?? emp.total_hours
            ?? emp.hours
            ?? emp.work_hours
            ?? emp.stream_hours
            ?? emp.live_hours
            ?? 0
          return sum + hours
        }, 0)
        console.log(' Calculated from Payroll summary:', totalHours)
      }

      else {
        let eventsList = []
        if (Array.isArray(monthEventsData?.data?.data)) {
          eventsList = monthEventsData.data.data
        } else if (Array.isArray(monthEventsData?.data)) {
          eventsList = monthEventsData.data
        }
        
        totalHours = eventsList.reduce((sum, evt) => {
          const start = new Date(evt.start_at)
          const end = new Date(evt.end_at)
          const hours = (end - start) / (1000 * 60 * 60)
          return sum + hours
        }, 0)
        console.log(' Fallback calculated from events:', totalHours)
      }
      
      console.log('? TOTAL HOURS:', Math.round(totalHours * 10) / 10, 'gi?')

      setSummaryData({
        totalRevenue,
        totalLiveHours: Math.round(totalHours * 10) / 10,
        revenueChange: "+12.5%",
        hoursChange: "+8.3%"
      })

      // ============================================
     
      // ============================================
      console.log('?? ===== PARSING TOP EMPLOYEES =====')
      let topEmps = []
      
      
      if (payrollData?.data?.summary && Array.isArray(payrollData.data.summary)) {

        console.log(' Raw Payroll Summary (FULL):', JSON.stringify(payrollData.data.summary[0], null, 2))
        
        topEmps = payrollData.data.summary.map(emp => {
          const liveCount = emp.total_sessions ?? emp.session_count ?? emp.live_count ?? emp.sessions ?? emp.stream_count ?? emp.live_sessions ?? emp.total_live_count ?? emp.event_count ?? 0
          const hours = emp.total_actual_hours ?? emp.actual_hours ?? emp.total_hours ?? emp.hours ?? emp.work_hours ?? emp.stream_hours ?? emp.live_hours ?? 0
          

          console.log(`?? Employee ${emp.employee_name || emp.id}:`, {
            raw_data: emp, 
            liveCount,
            hours,
            revenue: emp.total_revenue || emp.revenue
          })
          
          return {
            id: emp.employee_id || emp.id,
            name: emp.employee_name || emp.name || `Nh�n vi�n ${emp.employee_id}`,
            avatar: emp.portrait_url || null,
            liveCount: liveCount,
            hours: Math.round(hours * 10) / 10,
            revenue: emp.total_revenue || emp.revenue || 0,
            change: "+0%"
          }
        })
        
        console.log('? Found', topEmps.length, 'employees from Payroll summary')
        

        const hasValidData = topEmps.some(emp => emp.liveCount > 0 || emp.hours > 0)
        
        if (!hasValidData) {
          console.log(' Payroll không có dữ liệu Fallback to Events')
          topEmps = [] 
        }
      } 
      

      if (topEmps.length === 0) {
        console.log('?? Calculating from events...')
        const employeeMap = {}
        
        let eventsList = []
        if (Array.isArray(monthEventsData?.data?.data)) {
          eventsList = monthEventsData.data.data
        } else if (Array.isArray(monthEventsData?.data)) {
          eventsList = monthEventsData.data
        }
        
        console.log('?? Processing', eventsList.length, 'events for employee stats')
        
        eventsList.forEach(evt => {
          const members = evt.members || evt.staff || []
          const start = new Date(evt.start_at)
          const end = new Date(evt.end_at)
          const hours = (end - start) / (1000 * 60 * 60)
          
          members.forEach(member => {
            const empId = member.employee_id || member.id
            const empName = member.employee?.full_name || member.full_name || `Nh�n vi�n ${empId}`
            const empAvatar = member.employee?.portrait_url || member.portrait_url
            
            if (!employeeMap[empId]) {
              employeeMap[empId] = {
                id: empId,
                name: empName,
                avatar: empAvatar,
                liveCount: 0,
                hours: 0,
                revenue: 0,
                change: "+0%"
              }
            }
            
            // Tang s? ca live
            employeeMap[empId].liveCount++
            employeeMap[empId].hours += hours
          })
        })
        
        topEmps = Object.values(employeeMap).map(emp => ({
          ...emp,
          hours: Math.round(emp.hours * 10) / 10
        }))
        
        // Map revenue t? payroll v�o employees t? events
        if (payrollData?.data?.summary && Array.isArray(payrollData.data.summary)) {
          payrollData.data.summary.forEach(payrollEmp => {
            const empId = String(payrollEmp.employee_id)
            const foundEmp = topEmps.find(e => String(e.id) === empId)
            if (foundEmp) {
              foundEmp.revenue = payrollEmp.total_revenue || payrollEmp.revenue || 0
            }
          })
        }
        
        console.log('? Calculated', topEmps.length, 'employees from events')
      }
      
      // Sort v� l?y top 5
      topEmps = topEmps
        .sort((a, b) => b.revenue - a.revenue || b.hours - a.hours)
        .slice(0, 5)
      
      console.log('?? TOP 5 EMPLOYEES:', topEmps)
      setTopEmployees(topEmps)

      // ============================================
      // 8. X? L� UPCOMING SESSIONS
      // ============================================
      console.log('?? ===== PARSING UPCOMING SESSIONS =====')
      let eventsList = []
      if (eventsData?.data?.data && Array.isArray(eventsData.data.data)) {
        eventsList = eventsData.data.data
      } else if (Array.isArray(eventsData?.data)) {
        eventsList = eventsData.data
      }
      
      console.log('?? Found', eventsList.length, 'upcoming events')
      
      const upcoming = eventsList.slice(0, 5).map(evt => {
        const startDate = new Date(evt.start_at)
        const endDate = new Date(evt.end_at)
        const isLive = now >= startDate && now <= endDate
        const channelId = evt.channel?.id || evt.channel_id
        const channelName = evt.channel?.name || "Kênh chưa xác định"
        const colors = getChannelColor(channelId, channelName)
        
        // DEBUG: Log c?u tr�c event d? xem members
        console.log('?? Event structure:', {
          channel: evt.channel?.name,
          members: evt.members,
          staff: evt.staff,
          employees: evt.employees
        })
        
        let members = "Chưa phân công"
        
    
        const membersList = evt.members || evt.staff || evt.employees || []
        
        if (Array.isArray(membersList) && membersList.length > 0) {
          const names = membersList
            .map(m => {
             
              return m.employee?.full_name || 
                     m.employee?.name || 
                     m.full_name || 
                     m.name ||
                     m.employee_name
            })
            .filter(Boolean)
          
          members = names.length > 0 ? names.join(", ") : "Chưa phân công"
          console.log('? Found members:', names)
        } else {
          console.log('?? No members found for event:', evt.channel?.name)
        }
        
        return {
          day: startDate.getDate(),
          dow: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][startDate.getDay()],
          status: isLive ? "Đang live" : "Sắp diễn ra",
          tagColor: isLive ? "#ef4444" : "#22c55e",
          channel: channelName,
          members,
          time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')} - ${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
          viewers: isLive ? "Đang live" : calculateTimeUntil(startDate),
          colors
        }
      })
      
      setUpcomingSessions(upcoming)

      // ============================================
      // 9. Xử lý CHART DATA
      // ============================================
      console.log('?? ===== PARSING CHART DATA =====')
      const chartData = generateChartData(revenueData?.data || [], year, month)
      console.log('?? Generated', chartData.length, 'chart points')
      setRevenueChart(chartData)

      // ============================================
      // 10. SET CALENDAR EVENTS
      // ============================================
      let allEventsList = []
      if (Array.isArray(monthEventsData?.data?.data)) {
        allEventsList = monthEventsData.data.data
      } else if (Array.isArray(monthEventsData?.data)) {
        allEventsList = monthEventsData.data
      }
      
      console.log('?? Calendar:', allEventsList.length, 'events')
      setAllEvents(allEventsList)
      
      console.log('? ===== DASHBOARD LOADED SUCCESSFULLY =====')

    } catch (err) {
      console.error("? Failed to load dashboard:", err)
      setError(err.message || "Không thể tải dữ liệu dashboard")
    } finally {
      setLoading(false)
    }
  }

  function calculateTimeUntil(date) {
    const now = new Date()
    const diff = date - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `Còn ${days} ngày`
    if (hours > 0) return `Còn ${hours} giờ`
    return "Sắp bắt đầu"
  }

  function generateChartData(rawData, year, month) {
    if (rawData && rawData.length > 0) {
      return rawData.map((item, idx) => ({
        day: idx + 1,
        fullDate: `${year}-${String(month).padStart(2, "0")}-${String(idx + 1).padStart(2, "0")}`,
        value: item.total_revenue || item.revenue || 0,
      }))
    }
    return []
  }

  const chartConfig = useMemo(
    () => ({
      revenue: {
        label: "Doanh thu",
        color: "var(--chart-1)",
      },
    }),
    []
  )

  if (loading) {
    return (
      <div className="main-container">
        <HeaderDefault />
        <div className="flex-row-df">
          <SidebarDefault />
          <div className="dashboard-new">
            <div style={{ padding: "40px", textAlign: "center", fontSize: "16px" }}>
              <div>? Đang tải dữ liệu dashboard...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="main-container">
        <HeaderDefault />
        <div className="flex-row-df">
          <SidebarDefault />
          <div className="dashboard-new">
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ color: "#ef4444", marginBottom: "16px" }}>? {error}</div>
              <button 
                onClick={loadDashboardData}
                style={{ padding: "8px 16px", cursor: "pointer" }}
              >
                Th? l?i
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="main-container">
      <HeaderDefault />
      <div className="flex-row-df">
        <SidebarDefault />
        <div className="dashboard-new">
          <div className="dash-row gap-20">
            <div className="dash-card summary-card">
              <div className="stat-row">
                <div className="stat-card-db stat-revenue">
                  <div className="stat-top">
                    <div className="stat-icon"><i class="fa-solid fa-money-bill-trend-up"></i></div>
                    <div className="stat-badge">{summaryData.revenueChange}</div>
                  </div>
                  <div className="stat-label">Tổng doanh thu</div>
                  <div className="stat-value">{formatCurrency(summaryData.totalRevenue)}</div>
                </div>
                <div className="stat-card-db stat-hours">
                  <div className="stat-top">
                    <div className="stat-icon"><i class="fa-solid fa-clock"></i></div>
                    <div className="stat-badge">{summaryData.hoursChange}</div>
                  </div>
                  <div className="stat-label">Tổng giờ Live</div>
                  <div className="stat-value">{summaryData.totalLiveHours} giờ</div>
                </div>
              </div>

              <div className="line-chart chart-card">
                <div className="chart-title">Biểu đồ doanh thu tháng này</div>
                {revenueChart.length > 0 ? (
                  <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={revenueChart} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          width={60}
                          tickFormatter={formatYAxisTick}
                        />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => value}
                        />
                        <ChartTooltip content={renderRevenueTooltip} cursor={false} />
                        <Area
                          dataKey="value"
                          type="natural"
                          fill="var(--chart-1, #3b82f6)"
                          fillOpacity={0.15}
                          stroke="var(--chart-1, #3b82f6)"
                          strokeWidth={2}
                          activeDot={{ r: 4 }}
                          name="Doanh thu"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div style={{ 
                    padding: "40px", 
                    textAlign: "center", 
                    color: "#999",
                    fontSize: "14px"
                  }}>
                    Chưa có dữ liệu biểu đồ
                  </div>
                )}
              </div>
            </div>

            <div className="dash-card top-card">
              <div className="card-title">Top nhân viên</div>
              <div className="top-list">
                {topEmployees.length > 0 ? (
                  topEmployees.map((emp, idx) => (
                    <div key={emp.id} className="top-item">
                      <div className="top-rank-circle">{idx + 1}</div>
                      <div 
                        className="top-avatar" 
                        style={emp.avatar ? {
                          backgroundImage: `url(${emp.avatar})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        } : {}}
                      />
                      <div className="top-info">
                        <div className="top-name">{emp.name}</div>
                        <div className="top-meta">
                          {emp.liveCount} ca live • {emp.hours} giờ
                        </div>
                      </div>
                      <div className="top-revenue">
                        {formatCurrency(emp.revenue)}
                        <span className="top-change">{emp.change}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                    Chưa có dữ liệu nhân viên
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dash-row gap-20">
            <div className="dash-card upcoming-card">
              <div className="card-title">Ca live sắp tới</div>
              <div className="upcoming-list">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((s, idx) => (
                    <div
                      key={idx}
                      className="upcoming-item"
                      style={{
                        background: s.colors?.light || "#f8fafc",
                        borderColor: s.colors?.border || "#e5e7eb",
                        color: s.colors?.border || "#111827",
                      }}
                    >
                      <div
                        className="upcoming-date"
                        style={{ color: s.tagColor, borderColor: s.tagColor, background: "#fff" }}
                      >
                        <div className="up-day">{s.day}</div>
                        <div className="up-dow">{s.dow}</div>
                      </div>
                      <div className="up-body">
                        <div className="up-status" style={{ color: s.tagColor, borderColor: s.tagColor, background: "#fff" }}>
                          {s.status}
                        </div>
                        <div className="up-channel" style={{ color: s.colors?.border || "#111827" }}>{s.channel}</div>
                        <div className="up-meta">
                          {s.members} - {s.time}
                        </div>
                        <div className="up-viewers">{s.viewers}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                    Không có ca Live sắp tới
                  </div>
                )}
              </div>
            </div>

            <div className="dash-card mini-card">
              <div className="card-title">Lịch live stream</div>
              <MiniCalendar events={allEvents} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
