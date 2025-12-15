import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to parse user from localStorage:", e);
    return null;
  }
}

export default function ProtectedRoute({ children, roles }) {
  const location = useLocation();

  const token =
    localStorage.getItem("access_token") || localStorage.getItem("accessToken");
  const user = getStoredUser();

  // Chưa login → đá về /login
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Lấy danh sách role của user (tùy backend trả về)
  const userRoles =
    user.roleCodes || user.roles || user.authorities || user.authoritiesCodes || [];

  // Nếu route có yêu cầu roles cụ thể
  if (roles && roles.length > 0) {
    const hasRole = userRoles.some((r) => roles.includes(r));

    if (!hasRole) {
      // Nếu là nhân viên mà mò sang admin → đẩy về staff
      if (userRoles.includes("EMPLOYEE")) {
        return <Navigate to="/staff/schedule" replace />;
      }
      // Còn lại (ADMIN hoặc role khác) → đẩy về dashboard admin
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Hỗ trợ cả hai kiểu dùng:
  // 1) <ProtectedRoute><Page /></ProtectedRoute>
  if (children) {
    return children;
  }

  // 2) <Route element={<ProtectedRoute roles={...} />}> <Route ... /> </Route>
  return <Outlet />;
}
