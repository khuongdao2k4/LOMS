import React, { useState } from "react";
import { api } from "../services/apiClient";
import "../styles/modals/create-account.css";

export default function CreateAccountModal({ employee, onClose, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validateForm = () => {
    if (!username.trim()) {
      setError("Tên đăng nhập không được để trống");
      return false;
    }
    if (username.length < 4) {
      setError("Tên đăng nhập phải tối thiểu 4 ký tự");
      return false;
    }
    if (!password) {
      setError("Mật khẩu không được để trống");
      return false;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải tối thiểu 8 ký tự");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError("Mật khẩu phải chứa ít nhất 1 số");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.createAccount({
        username,
        password,
        employeeId: employee.id,
        roles: ["EMPLOYEE"],
      });

      const accountId = response?.account?.id;
      console.log("[v0] Account created, response:", response);
      console.log("[v0] Extracted account ID:", accountId);

      if (accountId) {
        console.log("[v0] Account created with ID:", accountId);

        try {
          await api.updateEmployeeAccount(employee.id, accountId);
          console.log("[v0] Employee account_id updated successfully");
        } catch (updateErr) {
          console.error("[v0] Failed to update employee account_id:", updateErr);
          setError("Tài khoản đã được tạo nhưng không thể cập nhật vào hồ sơ nhân viên. Vui lòng thử lại.");
          setLoading(false);
          return;
        }

        setSuccess("✓ Tài khoản đã được tạo thành công!");
        console.log("[v0] Success message displayed");

        // Call parent callback to reload employee list
        if (onSuccess) {
          console.log("[v0] Calling onSuccess callback to reload employee list");
          onSuccess({ id: accountId });
        }

        // Close modal after 1.5 second delay to show success message
        setTimeout(() => {
          console.log("[v0] Closing modal after success");
          onClose();
        }, 1500);
      } else {
        setError("Lỗi: Không nhận được ID tài khoản từ server");
      }
    } catch (err) {
      console.error("[v0] Account creation error:", err);
      setError(err.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  if (!employee) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-ca">
          <div className="icon-background">
            <div className="icon-container">
              <span className="icon-symbol"><i class="fa-solid fa-user-gear"></i></span>
            </div>
          </div>
          <h2 className="modal-title-ca">Tạo Tài Khoản Nhân Viên</h2>
          <p className="modal-subtitle-ca">Nhập thông tin đăng nhập cho nhân viên mới</p>
        </div>

        <form onSubmit={handleSubmit} className="form-ca">
          {/* Username */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-text">Tên Đăng Nhập</span>
              <span className="asterisk">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-icon"><i class="fa-solid fa-user-gear"></i></span>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <p className="form-hint">Tối thiểu 4 ký tự, không có khoảng trắng</p>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-text">Mật Khẩu</span>
              <span className="asterisk">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-icon"><i class="fa-solid fa-unlock-keyhole"></i></span>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <p className="form-hint">Tối thiểu 8 ký tự, bao gồm chữ và số</p>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-text">Xác Nhận Mật Khẩu</span>
              <span className="asterisk">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-icon"><i class="fa-solid fa-unlock-keyhole"></i></span>
              <input
                type={showConfirm ? "text" : "password"}
                className="form-input"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={loading}
              >
                {showConfirm ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="success-message" style={{
              padding: "12px",
              backgroundColor: "#d1fae5",
              color: "#065f46",
              borderRadius: "6px",
              fontSize: "14px",
              marginBottom: "12px",
              border: "1px solid #6ee7b7"
            }}>
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Buttons */}
          <div className="form-buttons">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo Tài Khoản"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Làm Mới
            </button>
          </div>
        </form>

        <div className="info-box">
          <span className="info-icon">ℹ️</span>
          <span className="info-text">
            Tài khoản sẽ được gửi qua cho nhân viên thông qua telegram hiện tại
          </span>
        </div>
      </div>
    </div>
  );
}
