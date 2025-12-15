// src/services/apiClient.js

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1"

/**
 * Lấy accessToken hiện tại từ localStorage
 */
function getAccessToken() {
  try {
    return localStorage.getItem("accessToken") || null
  } catch {
    return null
  }
}

/**
 * Lưu thông tin auth sau khi login
 * expects: { accessToken, refreshToken, account }
 */
function saveAuth(auth) {
  try {
    if (!auth) return
    if (auth.accessToken) {
      localStorage.setItem("accessToken", auth.accessToken)
    }
    if (auth.refreshToken) {
      localStorage.setItem("refreshToken", auth.refreshToken)
    }
    if (auth.account) {
      localStorage.setItem("auth", JSON.stringify(auth.account))
    }
  } catch (e) {
    console.error("Failed to save auth", e)
  }
}

/**
 * Xóa toàn bộ thông tin auth
 */
function clearAuth() {
  try {
    localStorage.removeItem("auth")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  } catch (e) {
    console.error("Failed to clear auth", e)
  }
}

/**
 * Hàm gọi API chung
 */
async function request(path, options = {}) {
  const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`)

  // Hỗ trợ cả body và data cho tương thích
  const { method = "GET", params, body, data, headers = {} } = options

  // Gắn query string
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v)
      }
    })
  }

  const finalHeaders = {
    "Content-Type": "application/json",
    ...headers,
  }

  const token = getAccessToken()
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`
  }

  // Cho phép cả options.body và options.data
  const payload = body !== undefined ? body : data

  let fetchBody = undefined
  if (["GET", "HEAD"].includes(method.toUpperCase()) || payload == null) {
    fetchBody = undefined
  } else if (payload instanceof FormData) {
    fetchBody = payload
    // Remove Content-Type from headers for FormData - browser handles it
    delete finalHeaders["Content-Type"]
  } else {
    fetchBody = JSON.stringify(payload)
  }

  const res = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body: fetchBody,
    // Tránh cache gây 304
    cache: "no-store",
  })

  if (res.status === 401) {
    clearAuth()
    throw new Error("UNAUTHORIZED")
  }

  if (res.status === 304 || res.status === 204) {
    return null
  }

  let resData
  try {
    resData = await res.json()
  } catch {
    resData = null
  }

  if (!res.ok) {
    const msg = resData?.message || resData?.error || `Request failed with status ${res.status}`
    throw new Error(msg)
  }

  return resData
}

/**
 * Đăng nhập
 */
async function login(body) {
  const data = await request("/auth/login", {
    method: "POST",
    body,
  })
  saveAuth(data)
  return data
}

/**
 * Lấy danh sách nhân viên
 * params: { page, size, q, status }
 */
async function getEmployees({ page = 1, size = 10, q = "", status = "" } = {}) {
  const params = { page, pageSize: size, q, status }
  return request("/employees", {
    method: "GET",
    params,
  })
}

/**
 * Tạo nhân viên mới với JSON (portrait_url bắt buộc)
 * Changed to JSON-only flow for consistency with backend
 */
async function createEmployee(body) {
  return request("/employees", {
    method: "POST",
    body,
  })
}

/**
 * Upload portrait for an employee
 * POST /api/v1/uploads/portrait
 * Sends FormData with file, returns { url, key }
 */
async function uploadPortrait(file) {
  if (!file) throw new Error("File is required")

  const formData = new FormData()
  formData.append("file", file)

  const response = await request("/uploads/portrait", {
    method: "POST",
    body: formData,
  })

  if (response && typeof response === "object") {
    // Backend returns { url: "https://...", key: "..." }
    return response
  }

  throw new Error("Invalid upload response")
}

/**
 * Lấy danh sách kênh
 * params: { page, size, q }
 */
async function getChannels({ page = 1, size = 10, q = "" } = {}) {
  const params = { page, pageSize: size, q }
  return request("/channels", {
    method: "GET",
    params,
  })
}

/**
 * Lấy chi tiết 1 kênh
 */
async function getChannel(id) {
  return request(`/channels/${id}`, {
    method: "GET",
  })
}

/**
 * Tạo kênh mới
 * body: { tiktok_channel_id, name }
 */
async function createChannel(body) {
  return request("/channels", {
    method: "POST",
    body,
  })
}

/**
 * Cập nhật kênh
 * id: channel id
 * body: { tiktok_channel_id, name }
 */
async function updateChannel(id, body) {
  return request(`/channels/${id}`, {
    method: "PUT",
    body,
  })
}

/**
 * Xóa kênh
 */
async function deleteChannel(id) {
  return request(`/channels/${id}`, {
    method: "DELETE",
  })
}

/**
 * Tạo account cho nhân viên
 * body: { username, password, employeeId, roles }
 */
async function createAccount(body) {
  return request("/accounts", {
    method: "POST",
    body,
  })
}

/**
 * Cập nhật account_id cho nhân viên
 * id: employee id
 * accountId: account id
 */
async function updateEmployeeAccount(id, accountId) {
  return request(`/employees/${id}`, {
    method: "PUT",
    body: { account_id: accountId },
  })
}

/**
 * Thêm hàm getEmployeeWithAccount để fetch nhân viên kèm account info
 * Backend cần populate employee.account từ account_id
 */
async function getEmployeeWithAccount(employeeId) {
  return request(`/employees/${employeeId}`, {
    method: "GET",
    params: { populate: "account" },
  })
}

/**
 * Lấy thông tin tài khoản (username, roles, is_active)
 * GET /api/v1/accounts/{id}
 */
async function getAccountInfo(accountId) {
  return request(`/accounts/${accountId}`, {
    method: "GET",
  })
}

/**
 * Reset mật khẩu tài khoản
 * PUT /api/v1/accounts/{id}/password
 * body: { password: "newPassword" }
 */
async function resetAccountPassword(accountId, newPassword) {
  return request(`/accounts/${accountId}/password`, {
    method: "PUT",
    body: { password: newPassword },
  })
}

/**
 * Thêm hàm cập nhật nhân viên (PUT) với support multipart/form-data
 * id: employee id
 * body: object chứa các field cần update hoặc FormData nếu có file
 */
async function updateEmployee(id, body) {
  return request(`/employees/${id}`, {
    method: "PUT",
    body,
  })
}

/**
 * Thêm hàm xóa nhân viên (DELETE)
 * id: employee id
 */
async function deleteEmployee(id) {
  return request(`/employees/${id}`, {
    method: "DELETE",
  })
}

/**
 * Thêm hàm lấy chi tiết salary config
 * GET /api/v1/salary-configs/{id}
 */
async function getSalaryConfig(configId) {
  return request(`/salary-configs/${configId}`, {
    method: "GET",
  })
}

/**
 * Lấy salary config theo employee_id
 * GET /api/v1/salary-configs/by-employee/{employee_id}
 */
async function getSalaryConfigByEmployee(employeeId) {
  return request(`/salary-configs/by-employee/${employeeId}`, {
    method: "GET",
  })
}

/**
 * Thêm hàm cập nhật salary config
 * PATCH /api/v1/salary-configs/{id}
 * body: { base_salary, hourly_rate_live, hourly_rate_support, is_active }
 */
async function updateSalaryConfig(configId, body) {
  return request(`/salary-configs/${configId}`, {
    method: "PATCH",
    body,
  })
}

/**
 * Lấy danh sách ca làm theo khoảng thời gian
 * GET /api/v1/event
 */
async function getEvents({ from, to, channel_id, page = 1, pageSize = 50 } = {}) {
  const params = { from, to, channel_id, page, pageSize }
  return request("/event", {
    method: "GET",
    params,
  })
}

/**
 * Lấy chi tiết 1 ca làm
 * GET /api/v1/event/{id}
 */
async function getEventDetail(id) {
  return request(`/event/${id}`, {
    method: "GET",
  })
}

/**
 * Tạo ca làm mới
 * POST /api/v1/event
 */
async function createEvent(body) {
  return request("/event", {
    method: "POST",
    body,
  })
}

/**
 * Cập nhật ca làm
 * PUT /api/v1/event/{id}
 */
async function updateEvent(id, body) {
  return request(`/event/${id}`, {
    method: "PUT",
    body,
  })
}

/**
 * Xóa ca làm
 * DELETE /api/v1/event/{id}
 */
async function deleteEvent(id) {
  return request(`/event/${id}`, {
    method: "DELETE",
  })
}

/**
 * Tạo lịch lặp hàng tuần
 * POST /api/v1/schedule
 * body: { channel_id, weekdays_mask, start_at, end_at, is_active }
 */
async function createSchedule(body) {
  return request("/schedule", {
    method: "POST",
    body,
  })
}

/**
 * Lấy danh sách schedule
 * GET /api/v1/schedule
 */
async function getSchedules({ channelId, isActive, page = 1, pageSize = 200 } = {}) {
  const params = {
    page,
    pageSize,
    ...(channelId ? { channelId } : {}),
    ...(typeof isActive === "boolean" ? { isActive } : {}),
  }
  return request("/schedule", {
    method: "GET",
    params,
  })
}

/**
 * Xóa schedule
 * DELETE /api/v1/schedule/{id}
 */
async function deleteSchedule(id) {
  return request(`/schedule/${id}`, {
    method: "DELETE",
  })
}

/**
 * Sinh events từ schedules (tuỳ chọn)
 * POST /api/v1/schedule/generate-events
 * body: { days }
 */
async function generateScheduleEvents(body) {
  return request("/schedule/generate-events", {
    method: "POST",
    body,
  })
}

/**
 * Lấy ca làm của nhân viên hiện tại
 * GET /api/v1/event/my
 */
async function getMyEvents({ from, to, page = 1, pageSize = 50 } = {}) {
  const params = { from, to, page, pageSize }
  return request("/event/my", {
    method: "GET",
    params,
  })
}

/**
 * Kiểm tra ca làm đang active
 * GET /api/v1/sessions/active
 */
async function getActiveSession(employeeId) {
  const params = { employee_id: employeeId }
  return request("/sessions/active", {
    method: "GET",
    params,
  })
}

/**
 * Kích hoạt ca làm
 * POST /api/v1/sessions/activate
 */
async function activateSession(body) {
  return request("/sessions/activate", {
    method: "POST",
    body,
  })
}

/**
 * Kết thúc ca làm
 * POST /api/v1/sessions/{id}/stop
 */
async function stopSession(sessionId, body) {
  return request(`/sessions/${sessionId}/stop`, {
    method: "POST",
    body,
  })
}

// ===== Payroll / Chấm công =====
async function getPayrollReport(params) {
  return request("/payroll/report", {
    method: "GET",
    params,
  })
}

async function exportPayrollExcel(params) {
  const url = new URL(`${BASE_URL}/payroll/export`)

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v)
      }
    })
  }

  const headers = {
    Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream",
  }

  const token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (res.status === 401) {
    clearAuth()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("FORCE_LOGOUT"))
    }
    throw new Error("UNAUTHORIZED")
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const text = await res.text()
      if (text) message = text
    } catch (_) {}
    throw new Error(message)
  }

  const disposition = res.headers.get("content-disposition") || ""
  let filename = "payroll-report.xlsx"
  const match = disposition.match(/filename[^;=\n]*=((['\"]).*?\2|[^;\n]*)/)
  if (match && match[1]) {
    filename = decodeURIComponent(match[1].replace(/['\"]/g, ""))
  }

  const blob = await res.blob()
  return { blob, filename }
}

async function updatePayrollSession(sessionId, body) {
  return request(`/payroll/session/${sessionId}`, {
    method: "PUT",
    body,
  })
}

// Tạo báo cáo lương (backend route: /payroll/salary-report)
async function generateSalaryReport(body) {
  return request("/payroll/salary-report", {
    method: "POST",
    body,
  })
}

/**
 * Upload screenshot
 * POST /api/v1/uploads/screenshot
 */
async function uploadScreenshot(file) {
  if (!file) throw new Error("File is required")

  const formData = new FormData()
  formData.append("file", file)

  const response = await request("/uploads/screenshot", {
    method: "POST",
    body: formData,
  })

  if (response && typeof response === "object") {
    return response
  }

  throw new Error("Invalid upload response")
}

// ===== Revenue Report =====
async function getRevenueReport(params = {}) {
  return request("/revenue-report", {
    method: "GET",
    params,
  })
}

async function getRevenueReportChart(params = {}) {
  return request("/revenue-report/chart", {
    method: "GET",
    params,
  })
}

async function exportRevenueReportExcel(params = {}) {
  const url = new URL(`${BASE_URL}/revenue-report/export`)

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v)
      }
    })
  }

  const headers = {
    Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream",
  }

  const token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (res.status === 401) {
    clearAuth()
    throw new Error("UNAUTHORIZED")
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed with status ${res.status}`)
  }

  const disposition = res.headers.get("content-disposition") || ""
  let filename = "revenue-report.xlsx"
  const match = disposition.match(/filename[^;=\n]*=((['\"]).*?\2|[^;\n]*)/)
  if (match && match[1]) {
    filename = decodeURIComponent(match[1].replace(/['\"]/g, ""))
  }

  const blob = await res.blob()
  return { blob, filename }
}

async function updateRevenueReportRecord(id, body) {
  return request(`/revenue-report/${id}`, {
    method: "PUT",
    body,
  })
}

// Update session (detail=session)
async function updateSessionTotals(sessionId, body) {
  return request(`/sessions/${sessionId}`, {
    method: "PUT",
    body,
  })
}

// ===== Booking public =====
async function resolvePublicChannel(token) {
  return request("/public/channels/resolve", {
    method: "GET",
    params: { token },
  })
}

async function getPublicBookings({ channel_id, from, to } = {}) {
  return request("/public/bookings", {
    method: "GET",
    params: { channel_id, from, to },
  })
}

async function createPublicBooking(body) {
  return request("/public/bookings", {
    method: "POST",
    body,
  })
}

async function getPublicBookingDetail(id, token) {
  return request(`/public/bookings/${id}`, {
    method: "GET",
    params: token ? { token } : undefined,
  })
}

async function deletePublicBooking(id, token) {
  return request(`/public/bookings/${id}`, {
    method: "DELETE",
    params: token ? { token } : undefined,
  })
}

// ===== Booking admin/config =====
async function getBookingConfig(channelId) {
  return request(`/channels/${channelId}/booking-config`, {
    method: "GET",
  })
}

async function updateBookingConfig(channelId, body) {
  return request(`/channels/${channelId}/booking-config`, {
    method: "PUT",
    body,
  })
}

async function getBookings({ status, channel_id, from, to, page = 1, pageSize = 20 } = {}) {
  return request("/bookings", {
    method: "GET",
    params: { status, channel_id, from, to, page, pageSize },
  })
}

async function getBookingDetail(id) {
  return request(`/bookings/${id}`, {
    method: "GET",
  })
}

async function approveBooking(id) {
  return request(`/bookings/${id}/approve`, {
    method: "POST",
  })
}

async function rejectBooking(id) {
  return request(`/bookings/${id}/reject`, {
    method: "POST",
  })
}

async function cancelBooking(id) {
  return request(`/bookings/${id}/cancel`, {
    method: "POST",
  })
}

const api = {
  request,
  login,
  getEmployees,
  getChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  createAccount,
  updateEmployeeAccount,
  createEmployee,
  uploadPortrait,
  getEmployeeWithAccount,
  getAccountInfo,
  resetAccountPassword,
  updateEmployee,
  deleteEmployee,
  getSalaryConfig,
  getSalaryConfigByEmployee,
  updateSalaryConfig,
  getEvents,
  getEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
  createSchedule,
  getSchedules,
  deleteSchedule,
  generateScheduleEvents,
  getRevenueReport,
  getRevenueReportChart,
  exportRevenueReportExcel,
  updateRevenueReportRecord,
  updateSessionTotals,
  getPayrollReport,
  exportPayrollExcel,
  updatePayrollSession,
  generateSalaryReport,
  getMyEvents,
  getActiveSession,
  activateSession,
  stopSession,
  uploadScreenshot,
  resolvePublicChannel,
  getPublicBookings,
  createPublicBooking,
  getPublicBookingDetail,
  deletePublicBooking,
  getBookingConfig,
  updateBookingConfig,
  getBookings,
  getBookingDetail,
  approveBooking,
  rejectBooking,
  cancelBooking,
}

export {
  api,
  request,
  login,
  getEmployees,
  getChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  createAccount,
  updateEmployeeAccount,
  createEmployee,
  uploadPortrait,
  getEmployeeWithAccount,
  getAccountInfo,
  resetAccountPassword,
  updateEmployee,
  deleteEmployee,
  getSalaryConfig,
  getSalaryConfigByEmployee,
  updateSalaryConfig,
  getEvents,
  getEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
  createSchedule,
  generateScheduleEvents,
  getRevenueReport,
  getRevenueReportChart,
  exportRevenueReportExcel,
  updateRevenueReportRecord,
  updateSessionTotals,
  getPayrollReport,
  exportPayrollExcel,
  updatePayrollSession,
  generateSalaryReport,
  getMyEvents,
  getActiveSession,
  activateSession,
  stopSession,
  uploadScreenshot,
  resolvePublicChannel,
  getPublicBookings,
  createPublicBooking,
  getPublicBookingDetail,
  deletePublicBooking,
  getBookingConfig,
  updateBookingConfig,
  getBookings,
  getBookingDetail,
  approveBooking,
  rejectBooking,
  cancelBooking,
}
export default api
