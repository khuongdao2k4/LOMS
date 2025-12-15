import { useEffect, useRef, useState } from "react";
import "../styles/components/header-default.css";
import { handleForcedLogout } from "../pages/EmployeesPage";

// Hàm cố gắng lấy username từ localStorage theo nhiều kiểu khác nhau
function resolveUsernameFromStorage() {
  let fallbackName = "Người dùng";

  const candidateKeys = ["auth", "account", "user", "currentUser"];

  try {
    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      // Nếu lưu chuỗi thuần: "admin"
      if (
        typeof raw === "string" &&
        raw.trim() !== "" &&
        (raw.trim()[0] !== "{" && raw.trim()[0] !== "[")
      ) {
        return raw.trim();
      }

      // Nếu là JSON
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch {
        // parse fail thì coi như chuỗi username
        if (raw.trim()) return raw.trim();
        continue;
      }

      if (!obj) continue;

      // 1. obj.username
      if (typeof obj.username === "string" && obj.username.trim() !== "") {
        return obj.username.trim();
      }

      // 2. obj.account.username
      if (
        obj.account &&
        typeof obj.account.username === "string" &&
        obj.account.username.trim() !== ""
      ) {
        return obj.account.username.trim();
      }

      // 3. obj.user.username
      if (
        obj.user &&
        typeof obj.user.username === "string" &&
        obj.user.username.trim() !== ""
      ) {
        return obj.user.username.trim();
      }
    }
  } catch (_) {
    // ignore mọi lỗi đọc localStorage
  }

  return fallbackName;
}

export default function HeaderDefault() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [userName, setUserName] = useState(() => resolveUsernameFromStorage());

  // Nếu trong runtime có thay đổi localStorage (login/logout), nghe sự kiện để cập nhật
  useEffect(() => {
    function handleStorageChange(e) {
      if (!e.key || ["auth", "account", "user", "currentUser"].includes(e.key)) {
        setUserName(resolveUsernameFromStorage());
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => setOpen((v) => !v);

  const handleLogout = () => {
    try {
      localStorage.removeItem("auth");
      localStorage.removeItem("account");
      localStorage.removeItem("user");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } catch (_) {}

    // Cho các trang khác biết là đã logout (EmployeesPage có lắng nghe)
    window.dispatchEvent(new Event("FORCE_LOGOUT"));

    // Và chắc chắn chuyển sang login
    handleForcedLogout();
  };

  return (
    <div className="header">
      {/* Bên trái: Logo TikTok + ch��� LOMS */}
      <div className="header-left">
        <div className="tik-tok-png-logo-dad" />
        <div className="header-logo-text">LOMS</div>
      </div>

      {/* Bên phải: avatar + dropdown */}
      <div className="right-block" ref={dropdownRef}>
        <div
          className="profile"
          onClick={toggleDropdown}
          style={{ cursor: "pointer", position: "relative" }}
          title="Tài khoản"
        >
          <div className="avatar-woman">
            <div className="avatar-px" />
          </div>
          <div className="chevron-down" />
        </div>

        {open && (
          <div
            className="header-user-dropdown"
            style={{
              position: "absolute",
              right: 16,
              top: 56,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              minWidth: 220,
              padding: 12,
              zIndex: 2200,
            }}
          >
            <div style={{ padding: "8px 10px", fontSize: 14, color: "#374151" }}>
              Xin chào, <strong>{userName}</strong>
            </div>
            <hr
              style={{
                border: "none",
                borderTop: "1px solid #f3f4f6",
                margin: "8px 0",
              }}
            />
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
