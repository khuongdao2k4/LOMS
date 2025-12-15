﻿﻿"use client"

import { useEffect, useMemo, useState } from "react"
import { FileDown, ChevronLeft, ChevronRight, Pencil, Save } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import {
  getChannels,
  getRevenueReport,
  getRevenueReportChart,
  exportRevenueReportExcel,
  updateRevenueReportRecord,
  updateSessionTotals,
} from "../services/apiClient"
import "../styles/pages/revenue-report.css"

const formatCurrency = (v) => {
  if (v == null || Number.isNaN(Number(v))) return "0"
  return `${Number(v).toLocaleString("vi-VN")}`
}

const palette = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#6366f1", "#14b8a6", "#ec4899"]

const defaultRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

const formatDayLabel = (row) => row.date_value || row.date || row.month_value || row.label || "-"

const formatMonthYearLabel = (row) => {
  const mv = row.month_value ?? row.month
  const yv = row.year_value ?? row.year
  if (mv && typeof mv === "string" && mv.includes("-")) return mv
  if (mv && yv) return `${String(mv).padStart(2, "0")}/${yv}`
  const base = row.date_value || row.date || row.label
  const parsed = base ? new Date(base) : null
  if (parsed && !Number.isNaN(parsed)) {
    return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`
  }
  return "-"
}

const parseDateSafe = (value) => {
  const d = value ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

const formatTimeRange = (start, end) => {
  const startDate = parseDateSafe(start)
  const endDate = parseDateSafe(end)
  if (!startDate && !endDate) return "-"
  const opts = { hour: "2-digit", minute: "2-digit" }
  const startLabel = startDate ? startDate.toLocaleTimeString("vi-VN", opts) : "?"
  const endLabel = endDate ? endDate.toLocaleTimeString("vi-VN", opts) : "?"
  return `${startLabel} - ${endLabel}`
}

const hoursFromRange = (start, end) => {
  const startDate = parseDateSafe(start)
  const endDate = parseDateSafe(end)
  if (!startDate || !endDate) return null
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
}

const hoursFromMinutes = (minutes) => {
  const n = Number(minutes)
  if (!Number.isFinite(n)) return null
  return n / 60
}

const toHoursNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const formatHoursText = (value) => {
  if (!Number.isFinite(value)) return "-"
  return `${value.toFixed(2)}h`
}

const formatCurrencyShort = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return "0"
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("vi-VN")
}

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function RevenueReportDashboard() {
  const [{ from, to }, setRange] = useState(defaultRange)
  const [type, setType] = useState("NETWORK")
  const [section, setSection] = useState("DAILY")
  const [channelId, setChannelId] = useState("")
  const [channels, setChannels] = useState([])
  const [data, setData] = useState([])
  const [perChannelData, setPerChannelData] = useState([])
  const [chart, setChart] = useState([])
  const [summary, setSummary] = useState({
    total_revenue: 0,
    total_hours: 0,
    total_sessions: 0,
  })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState("")
  const [editingKey, setEditingKey] = useState(null)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [editRevenue, setEditRevenue] = useState("")
  const [editHours, setEditHours] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState(null)

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const res = await getChannels({ page: 1, size: 200, q: "" })
        const list = res?.data || res?.data?.data || res || []
        setChannels(Array.isArray(list) ? list : [])
      } catch (_) {
        setChannels([])
      }
    }
    loadChannels()
  }, [])

  const { apiSection, apiDetail } = useMemo(() => {
    if (section === "DAILY") return { apiSection: "DAILY", apiDetail: "session" }
    if (section === "MONTHLY") return { apiSection: "DAILY", apiDetail: "aggregate" }
    return { apiSection: "MONTHLY", apiDetail: "aggregate" }
  }, [section])

  const params = useMemo(() => {
    const p = {
      from,
      to,
      type,
      section: apiSection,
      detail: apiDetail,
      page,
      page_size: pageSize,
      sort_by: "date_value",
      sort_dir: "DESC",
    }
    if (type === "CHANNEL" && channelId) p.value_id = channelId
    return p
  }, [from, to, type, apiSection, apiDetail, page, pageSize, channelId])

  const loadReport = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await getRevenueReport(params)
      const list = res?.data || res?.data?.data || []
      const pagination = res?.pagination || res?.data?.pagination || {}
      const channelListFromApi = res?.channels || res?.data?.channels
      setData(Array.isArray(list) ? list : [])
      setSummary(
        res?.summary ||
          res?.data?.summary || {
            total_revenue: 0,
            total_hours: 0,
            total_sessions: 0,
          },
      )
      setTotal(pagination.total || list.length || 0)
      if (Array.isArray(channelListFromApi)) {
        setChannels(channelListFromApi)
      }

      const chartRes = res?.chart ? res.chart : await getRevenueReportChart(params).catch(() => [])
      setChart(Array.isArray(chartRes) ? chartRes : [])

      if (type === "NETWORK" && Array.isArray(channelListFromApi) && channelListFromApi.length > 0) {
        const detailParams = { ...params, type: "CHANNEL" }
        const perChannel = await Promise.all(
          channelListFromApi.map((ch) =>
            getRevenueReport({ ...detailParams, value_id: ch.id })
              .then((resCh) => {
                const rows = resCh?.data || resCh?.data?.data || []
                return rows.map((r, idx) => ({
                  ...r,
                  value_id: ch.id,
                  channel_name: ch.name || ch.tiktok_channel_id || ch.id,
                  _key: r.id ?? `${ch.id}-${idx}-${r.date_value ?? r.date ?? "row"}`,
                }))
              })
              .catch(() => []),
          ),
        )
        setPerChannelData(perChannel.flat())
      } else {
        setPerChannelData([])
      }
    } catch (err) {
      console.error(err)
      setError(err.message || "Không tải được báo cáo")
      setData([])
      setSummary({ total_revenue: 0, total_hours: 0, total_sessions: 0 })
      setChart([])
      setPerChannelData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, from, to, type, channelId, page])

  const handleExport = async () => {
    try {
      setExporting(true)
      const { blob, filename } = await exportRevenueReportExcel(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert("Xuất Excel thất bại: " + (err.message || "Unknown"))
    } finally {
      setExporting(false)
    }
  }

  const mapChannelIdToName = (id) => {
    const found = channels.find((c) => String(c.id) === String(id))
    return found?.name || found?.tiktok_channel_id || id
  }

  const resolveChannelName = (row) => {
    if (row.channel?.name) return row.channel.name
    if (row.channel_name) return row.channel_name
    if (row.value_id) {
      return mapChannelIdToName(row.value_id)
    }
    if (Array.isArray(row.channel_list) && row.channel_list.length > 0) {
      const first = row.channel_list.find((c) => c?.name || c?.tiktok_channel_id || c?.id)
      if (first) return first.name || first.tiktok_channel_id || first.id
    }
    if (Array.isArray(row.channel_ids) && row.channel_ids.length > 0) {
      return mapChannelIdToName(row.channel_ids[0])
    }
    if (type === "CHANNEL" && channelId) {
      return mapChannelIdToName(channelId) || channelId
    }
    return "Tất cả kênh"
  }

  const getChannelNames = (row) => {
    // Chỉ hiển thị kênh gắn với bản ghi; tránh nhân đôi khi API trả channel_list cho NETWORK
    const singleChannelName = resolveChannelName(row)
    return [singleChannelName]
  }

  const chartConfig = useMemo(() => {
    const effectiveData = type === "NETWORK" && perChannelData.length > 0 ? perChannelData : data
    const source = type === "NETWORK" ? effectiveData : Array.isArray(chart) && chart.length > 0 ? chart : effectiveData
    const lineSet = new Set()
    const pointMap = new Map()

    const buildLabel = (row) => {
      if (section === "DAILY") {
        const dayLabel = formatDayLabel(row)
        const timeLabel = formatTimeRange(row.start_at, row.end_at)
        return {
          xLabel: dayLabel,
          tooltip: timeLabel && timeLabel !== "-" ? `${dayLabel} ${timeLabel}` : dayLabel,
        }
      }
      if (section === "MONTHLY") {
        const label = formatDayLabel(row)
        return { xLabel: label, tooltip: label }
      }
      const label = formatMonthYearLabel(row)
      return { xLabel: label, tooltip: label }
    }

    const buildSortKey = (row, fallback) => {
      if (section === "DAILY") {
        const start = parseDateSafe(row.start_at || row.date_value || row.date)
        if (start) return start.getTime()
      }
      if (section === "MONTHLY") {
        const day = parseDateSafe(row.date_value || row.date || row.label)
        if (day) return day.getTime()
      }
      if (section === "YEARLY") {
        const mv = row.month_value ?? row.month
        const yv = row.year_value ?? row.year
        if (mv && yv) {
          const d = parseDateSafe(`${yv}-${String(mv).padStart(2, "0")}-01`)
          if (d) return d.getTime()
        }
      }
      const parsed = parseDateSafe(row.date_value || row.date || row.label)
      return parsed ? parsed.getTime() : fallback
    }

    source.forEach((row, idx) => {
      const { xLabel, tooltip } = buildLabel(row)
      const sortKey = buildSortKey(row, idx)
      const channelNames = getChannelNames(row)
      const revenueValue = toNumber(row.total_revenue ?? row.value ?? 0)

      channelNames.forEach((name) => {
        const existing = pointMap.get(sortKey) || {
          xLabel: xLabel || `label-${idx}`,
          tooltipLabel: tooltip || xLabel || `label-${idx}`,
          sortKey,
          xValue: sortKey,
        }
        existing[name] = (existing[name] || 0) + revenueValue
        pointMap.set(sortKey, existing)
        lineSet.add(name)
      })
    })

    const lines = Array.from(lineSet).map((name, idx) => ({
      key: name,
      name,
      color: palette[idx % palette.length],
    }))

    const dataPoints = Array.from(pointMap.values()).sort((a, b) => a.sortKey - b.sortKey)

    return {
      data: dataPoints,
      lines,
    }
  }, [chart, data, perChannelData, section, type, channelId, channels])

  const formatDateTick = (value) => {
    const d = parseDateSafe(value)
    if (!d) return value
    if (section === "DAILY")
      return d.toLocaleDateString("vi-VN", {
        month: "2-digit",
        day: "2-digit",
      })
    return d.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })
  }

  const formatTooltipLabel = (label, payload) => {
    if (payload && payload[0] && payload[0].payload && payload[0].payload.tooltipLabel) {
      return payload[0].payload.tooltipLabel
    }
    const d = parseDateSafe(label)
    if (d) {
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
    return label
  }

  const chartData = chartConfig.data
  const chartLines = chartConfig.lines

  const totalHoursNumber = useMemo(() => {
    const val = Number.parseFloat(summary?.total_hours ?? 0)
    return Number.isFinite(val) ? val : 0
  }, [summary?.total_hours])

  const totalSessionsNumber = useMemo(() => {
    const val = Number.parseFloat(summary?.total_sessions ?? 0)
    return Number.isFinite(val) ? val : 0
  }, [summary?.total_sessions])

  const displayedCount = type === "NETWORK" && perChannelData.length > 0 ? perChannelData.length : data.length
  const resolveRecordId = (row) => row?.id ?? row?.record_id ?? row?.revenue_report_id ?? null
  const resolveSessionId = (row) => row?.session_id ?? null

  const startEditRow = (row) => {
    const recordId = resolveRecordId(row)
    const sessionId = resolveSessionId(row)
    if (!recordId && !sessionId) {
      alert("Bản ghi này không có id hoặc session_id từ API, không thể sửa")
      return
    }
    const key = row.id ?? row._key ?? row.record_id ?? row.revenue_report_id ?? row.session_id
    if (!key) return
    setEditingKey(key)
    setEditingRecordId(recordId)
    setEditingSessionId(sessionId)
    setEditRevenue(row.total_revenue ?? row.value ?? "")
    setEditHours(row.total_hours ?? row._totalHours ?? row.duration_hours ?? row.actual_total_hours ?? "")
  }

  const saveRow = async (row) => {
    const targetId = resolveRecordId(row) ?? editingRecordId
    const targetSessionId = resolveSessionId(row) ?? editingSessionId
    const targetKey = row?.id ?? row?.record_id ?? row?.revenue_report_id ?? row?.session_id ?? row?._key ?? editingKey
    if (!targetId && !targetSessionId) {
      alert("Không xác định được bản ghi để lưu (thiếu id/session_id)")
      return
    }
    if (!targetKey) {
      alert("Không xác định được khóa dòng")
      return
    }
    const payload = {}
    if (editRevenue !== "") payload.total_revenue = Number(editRevenue) || 0
    if (editHours !== "") payload.total_hours = Number(editHours) || 0

    setSaving(true)
    try {
      if (targetId) {
        await updateRevenueReportRecord(targetId, payload)
      } else if (targetSessionId) {
        await updateSessionTotals(targetSessionId, {
          total_revenue: payload.total_revenue,
          total_hours: payload.total_hours,
        })
      }

      const applyUpdate = (arr) =>
        arr.map((item) =>
          (item.id ?? item.record_id ?? item.revenue_report_id ?? item.session_id ?? item._key) === targetKey
            ? {
                ...item,
                total_revenue: payload.total_revenue ?? item.total_revenue,
                total_hours: payload.total_hours ?? item.total_hours,
              }
            : item,
        )

      setData((prev) => applyUpdate(prev))
      setPerChannelData((prev) => applyUpdate(prev))
      setEditingKey(null)
      setEditingRecordId(null)
      setEditingSessionId(null)
    } catch (err) {
      alert(err.message || "Lưu thay đổi thất bại")
    } finally {
      setSaving(false)
    }
  }

  const allDisplayRows = useMemo(() => {
    const baseData = type === "NETWORK" && perChannelData.length > 0 ? perChannelData : data

    if (section === "DAILY") {
      return baseData.map((row, idx) => {
        const timeRange = formatTimeRange(row.start_at, row.end_at)
        const rangeHours = hoursFromRange(row.start_at, row.end_at)
        const actualRangeHours = hoursFromRange(row.actual_start_at, row.actual_end_at)
        const actualTimeRange = formatTimeRange(row.actual_start_at, row.actual_end_at)
        const totalHours =
          toHoursNumber(row.total_hours) ??
          toHoursNumber(row.duration_hours) ??
          hoursFromMinutes(row.duration_minutes) ??
          rangeHours
        const scheduledHours = rangeHours ?? toHoursNumber(row.duration_hours) ?? hoursFromMinutes(row.duration_minutes)

        return {
          ...row,
          _channelName: resolveChannelName(row),
          _dateLabel: formatDayLabel(row),
          _timeRange: timeRange,
          _actualTimeRange: actualTimeRange,
          _totalHours: totalHours,
          _actualHours: scheduledHours,
          _actualRangeHours: actualRangeHours,
          _key: row.id ?? `${idx}-${row.date_value ?? row.date ?? "row"}`,
        }
      })
    }

    if (section === "MONTHLY") {
      const acc = new Map()

      baseData.forEach((row, rowIdx) => {
        const label = formatDayLabel(row)
        const channelNames = getChannelNames(row)
        const channelsToUse = channelNames.length > 0 ? channelNames : [resolveChannelName(row)]

        channelsToUse.forEach((name, idx) => {
          const key = `${label}::${name}`
          const existing = acc.get(key) || {
            ...row,
            _channelName: name,
            _dateLabel: label,
            _key: `${row.id ?? rowIdx}-${idx}-${label}`,
            total_revenue: 0,
            total_hours: 0,
            total_sessions: 0,
          }

          existing.total_revenue += toNumber(row.total_revenue ?? row.value ?? 0)
          existing.total_hours += toNumber(row.total_hours ?? 0)
          existing.total_sessions += toNumber(row.total_sessions ?? row.session_count ?? 0)

          acc.set(key, existing)
        })
      })

      return Array.from(acc.values())
    }

    const acc = new Map()
    baseData.forEach((row, rowIdx) => {
      const label = formatMonthYearLabel(row)
      const channelNames = getChannelNames(row)
      const channelsToUse = channelNames.length > 0 ? channelNames : [resolveChannelName(row)]

      channelsToUse.forEach((name, idx) => {
        const key = `${label}::${name}`
        const existing = acc.get(key) || {
          _channelName: name,
          _dateLabel: label,
          total_revenue: 0,
          total_hours: 0,
          total_sessions: 0,
          _key: `${row.id ?? rowIdx}-${idx}-${label}`,
        }

        existing.total_revenue += toNumber(row.total_revenue ?? row.value ?? 0)
        existing.total_hours += toNumber(row.total_hours ?? 0)
        existing.total_sessions += toNumber(row.total_sessions ?? row.session_count ?? 0)

        acc.set(key, existing)
      })
    })

    return Array.from(acc.values())
  }, [data, perChannelData, section, channels, type, channelId])

  // Tính toán tổng số trang dựa trên allDisplayRows
  const totalRecords = allDisplayRows.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  // Lấy dữ liệu cho trang hiện tại
  const displayRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return allDisplayRows.slice(startIndex, endIndex)
  }, [allDisplayRows, page, pageSize])

  // Tính toán thông tin phân trang
  const startRecord = totalRecords > 0 ? (page - 1) * pageSize + 1 : 0
  const endRecord = Math.min(page * pageSize, totalRecords)

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Báo cáo doanh thu</h1>
            <p>Quản lý doanh thu theo kênh/hệ thống với bộ lọc thời gian</p>
          </div>
          <div className="header-actions">
            <button className="btn-export" onClick={handleExport} disabled={exporting || loading}>
              <FileDown size={18} />
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>
          </div>
        </div>
      </div>

      <div className="filter-section">
        <h3>Bộ lọc báo cáo</h3>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Loại báo cáo / Kênh</label>
            <select
              className="select-input"
              value={type === "NETWORK" ? "NETWORK" : channelId || "NETWORK"}
              onChange={(e) => {
                const val = e.target.value
                if (val === "NETWORK") {
                  setType("NETWORK")
                  setChannelId("")
                } else {
                  setType("CHANNEL")
                  setChannelId(val)
                }
              }}
            >
              <option value="NETWORK">Toàn hệ thống</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.tiktok_channel_id || c.id}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Chế độ xem</label>
            <select
              className="select-input"
              value={section}
              onChange={(e) => {
                setSection(e.target.value)
                setPage(1)
              }}
            >
              <option value="DAILY">Theo ngày</option>
              <option value="MONTHLY">Theo tháng</option>
              <option value="YEARLY">Theo năm</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Từ ngày</label>
            <input
              className="select-input"
              type="date"
              value={from}
              onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Đến ngày</label>
            <input
              className="select-input"
              type="date"
              value={to}
              onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))}
            />
          </div>

          <button className="btn-export" style={{ height: 40 }} onClick={() => loadReport()} disabled={loading}>
            {loading ? "Đang tải..." : "Tìm kiếm"}
          </button>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card blue">
          <div className="card-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
          <div className="card-content">
            <p className="card-label">Tổng doanh thu</p>
            <h2 className="card-value">{formatCurrency(summary.total_revenue)}</h2>
          </div>
        </div>
        <div className="stat-card light-blue">
          <div className="card-icon"><i class="fa-solid fa-clock"></i></div>
          <div className="card-content">
            <p className="card-label">Tổng giờ</p>
            <h2 className="card-value">{totalHoursNumber.toFixed(1)}h</h2>
          </div>
        </div>
        <div className="stat-card light-blue">
          <div className="card-icon"><i class="fa-solid fa-calendar-check"></i></div>
          <div className="card-content">
            <p className="card-label">Tổng số ca</p>
            <h2 className="card-value">{totalSessionsNumber}</h2>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 12, right: 24, bottom: 12, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="xValue"
              type="number"
              scale="time"
              domain={["auto", "auto"]}
              tickFormatter={formatDateTick}
              tick={{ fontSize: 12 }}
              tickMargin={8}
              allowDuplicatedCategory={false}
            />
            <YAxis
              tickFormatter={(v) => formatCurrencyShort(v)}
              width={80}
              tick={{ fontSize: 12 }}
              tickMargin={8}
              allowDecimals={false}
            />
            <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={formatTooltipLabel} />
            <Legend />
            {chartLines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="table-section">
        <div className="table-header">
          <h3>Bảng báo cáo</h3>
          {error && <span className="badge error">{error}</span>}
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              {section === "DAILY" ? (
                <tr>
                  <th>Kênh</th>
                  <th>Ngày</th>
                  <th>Giờ live</th>
                  <th>Tổng giờ live</th>
                  <th>Giờ live thực</th>
                  <th>Tổng giờ live thực</th>
                  <th>Doanh thu</th>
                  <th>Thao tác</th>
                </tr>
              ) : (
                <tr>
                  <th>Kênh</th>
                  <th>{section === "YEARLY" ? "Tháng/Năm" : "Ngày"}</th>
                  <th>Tổng giờ live</th>
                  <th>Tổng số ca</th>
                  <th>Doanh thu</th>
                  <th>Thao tác</th>
                </tr>
              )}
            </thead>
            <tbody>
              {!loading && displayRows.length === 0 && (
                <tr>
                  <td colSpan={section === "DAILY" ? 8 : 6} style={{ textAlign: "center", padding: 16 }}>
                    Không có dữ liệu
                  </td>
                </tr>
              )}
              {displayRows.map((row) => {
                const channelLabel = row._channelName
                const dateLabel = row._dateLabel
                const rowKey = row.id ?? row._key
                const isEditing = editingKey === rowKey
                const revenueLabel = isEditing ? editRevenue : formatCurrency(row.total_revenue)
                const timeRange = row._timeRange ?? formatTimeRange(row.start_at, row.end_at)
                const actualTimeRange = row._actualTimeRange ?? formatTimeRange(row.actual_start_at, row.actual_end_at)
                const scheduledHoursLabel = formatHoursText(
                  toHoursNumber(row._actualHours) ??
                    toHoursNumber(row.duration_hours) ??
                    hoursFromMinutes(row.duration_minutes) ??
                    hoursFromRange(row.start_at, row.end_at),
                )
                const totalHoursLabel = formatHoursText(
                  toHoursNumber(row._totalHours) ??
                    toHoursNumber(row.total_hours) ??
                    toHoursNumber(row.duration_hours) ??
                    hoursFromMinutes(row.duration_minutes),
                )
                const hoursLabel = isEditing ? editHours : formatHoursText(toHoursNumber(row.total_hours))
                const sessions = row.total_sessions ?? row.session_count ?? (section === "DAILY" ? 1 : "-")

                return section === "DAILY" ? (
                  <tr key={row._key}>
                    <td>{channelLabel}</td>
                    <td>{dateLabel}</td>
                    <td>{timeRange}</td>
                    <td>{scheduledHoursLabel}</td>
                    <td>{actualTimeRange}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editHours}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="select-input"
                          style={{ width: 100 }}
                        />
                      ) : (
                        totalHoursLabel
                      )}
                    </td>
                    <td className="amount">
                      {isEditing ? (
                        <input
                          type="number"
                          step="1000"
                          value={editRevenue}
                          onChange={(e) => setEditRevenue(e.target.value)}
                          className="select-input"
                          style={{ width: 140 }}
                        />
                      ) : (
                        revenueLabel
                      )}
                    </td>
                    <td>
                      <button
                        className="view-button"
                        onClick={() => (isEditing ? saveRow(row) : startEditRow(row))}
                        disabled={(saving && isEditing) || (!resolveRecordId(row) && !resolveSessionId(row))}
                      >
                        {isEditing ? <i class="fa-solid fa-floppy-disk"></i> : <i class="fa-solid fa-pen-to-square"></i>}
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row._key}>
                    <td>{channelLabel}</td>
                    <td>{dateLabel}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editHours}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="select-input"
                          style={{ width: 100 }}
                        />
                      ) : (
                        hoursLabel
                      )}
                    </td>
                    <td>{sessions}</td>
                    <td className="amount">
                      {isEditing ? (
                        <input
                          type="number"
                          step="1000"
                          value={editRevenue}
                          onChange={(e) => setEditRevenue(e.target.value)}
                          className="select-input"
                          style={{ width: 140 }}
                        />
                      ) : (
                        revenueLabel
                      )}
                    </td>
                    <td>
                      <button
                        className="view-button"
                        onClick={() => (isEditing ? saveRow(row) : startEditRow(row))}
                        disabled={(saving && isEditing) || (!resolveRecordId(row) && !resolveSessionId(row))}
                      >
                        {isEditing ? <i class="fa-solid fa-floppy-disk"></i> : <i class="fa-solid fa-pen-to-square"></i>}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <div className="footer-info">
            Hiện tại {startRecord}-{endRecord} / {totalRecords}
          </div>
          <div className="pagination">
            {/* Nút Previous */}
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <i class="fa-solid fa-angle-left"></i>
            </button>

            {/* Hiển thị các số trang */}
            {(() => {
              const pages = []
              const maxVisible = 5

              let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
              const endPage = Math.min(totalPages, startPage + maxVisible - 1)

              if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1)
              }

              // Trang đầu
              if (startPage > 1) {
                pages.push(
                  <button key={1} className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>
                    1
                  </button>,
                )
                if (startPage > 2) {
                  pages.push(
                    <span key="dots-start" style={{ padding: "0 8px" }}>
                      ...
                    </span>,
                  )
                }
              }

              // Các trang ở giữa
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button key={i} className={`page-btn ${page === i ? "active" : ""}`} onClick={() => setPage(i)}>
                    {i}
                  </button>,
                )
              }

              // Trang cuối
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(
                    <span key="dots-end" style={{ padding: "0 8px" }}>
                      ...
                    </span>,
                  )
                }
                pages.push(
                  <button
                    key={totalPages}
                    className={`page-btn ${page === totalPages ? "active" : ""}`}
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>,
                )
              }

              return pages
            })()}

            {/* Nút Next */}
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <i class="fa-solid fa-angle-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}