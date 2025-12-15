import React, { useState, useEffect } from "react";
import {
  getAccountInfo,
  updateEmployee,
  deleteEmployee,
  getSalaryConfig,
  updateSalaryConfig,
  request,
  getSalaryConfigByEmployee,
} from "../services/apiClient";
import ResetPasswordModal from "./ResetPasswordModal";
import "../styles/modals/employee-detail.css";

export default function EmployeeDetailModal({ employee, onClose, onUpdated }) {
  const [account, setAccount] = useState(null);
  const [salaryConfig, setSalaryConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [editSalaryData, setEditSalaryData] = useState({}); // state cho salary config
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(employee?.portrait_url);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!employee) return null;

  useEffect(() => {
    if (!employee.account_id) return;

    const fetchAccount = async () => {
      setLoading(true);
      try {
        const data = await getAccountInfo(employee.account_id);
        setAccount(data);
      } catch (err) {
        console.error("  Failed to fetch account info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [employee.account_id]);

  useEffect(() => {
    if (!employee.salary_config_id && !employee.id) return;

    const fetchSalaryConfig = async () => {
      try {
        let data;
        if (employee.salary_config_id) {
          // Try fetch by salary_config_id
          data = await getSalaryConfig(employee.salary_config_id);
          console.log("  Salary config fetched by salary_config_id:", data);
        } else if (employee.id) {
          // Fallback: nếu backend không trả salary_config_id, fetch theo employee_id
          // Backend dùng endpoint: GET /salary-configs/by-employee/{employee_id}
          console.log(
            "  No salary_config_id found, attempting fallback fetch with employee_id:",
            employee.id
          );
          try {
            const response = await getSalaryConfigByEmployee(employee.id);
            data = response; // luôn là 1 object salaryConfig
            console.log("  Salary config fetched by employee_id:", data);
          } catch (fallbackErr) {
            console.warn("  Fallback fetch failed:", fallbackErr);
            data = null;
          }
        }
        setSalaryConfig(data);
      } catch (err) {
        console.error("  Failed to fetch salary config:", err);
        setSalaryConfig(null);
      }
    };

    fetchSalaryConfig();
  }, [employee.salary_config_id, employee.id]);

  const handleStartEdit = () => {
    setEditData({
      full_name: employee.full_name || "",
      gender: employee.gender || "",
      date_of_birth: employee.date_of_birth || "",
      hometown: employee.hometown || "",
      address: employee.address || "",
      cccd: employee.cccd || "",
      join_date: employee.join_date || "",
      telegram_id: employee.telegram_id || "",
      experience: employee.experience || "",
      note: employee.note || "",
      is_active: employee.is_active !== false,
    });

    if (salaryConfig) {
      setEditSalaryData({
        base_salary: salaryConfig.base_salary || 0,
        hourly_rate_live: salaryConfig.hourly_rate_live || 0,
        hourly_rate_support: salaryConfig.hourly_rate_support || 0,
        is_active: salaryConfig.is_active !== false,
      });
    }

    setAvatarPreview(employee.portrait_url);
    setAvatarFile(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setEditSalaryData({});
    setAvatarFile(null);
    setAvatarPreview(employee.portrait_url);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!employee?.id) return;

    setSaving(true);
    try {
      let body;

      if (avatarFile) {
        body = new FormData();
        body.append("file", avatarFile);
        Object.entries(editData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            body.append(key, value);
          }
        });
      } else {
        body = editData;
      }

      const updated = await updateEmployee(employee.id, body);
      console.log("  Employee updated:", updated);

      if (salaryConfig && Object.keys(editSalaryData).length > 0) {
        try {
          await updateSalaryConfig(salaryConfig.id, editSalaryData);
          console.log("  Salary config updated");
        } catch (err) {
          console.error("  Failed to update salary config:", err);
        }
      }

      if (onUpdated) {
        onUpdated();
      }

      setIsEditing(false);
      onClose();
    } catch (err) {
      alert(`Lỗi khi sửa thông tin: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân viên ${employee.full_name}?`)) {
      return;
    }

    if (!employee?.id) return;

    setDeleting(true);
    try {
      await deleteEmployee(employee.id);
      console.log("  Employee deleted");

      if (onUpdated) {
        onUpdated();
      }

      onClose();
    } catch (err) {
      alert(`Lỗi khi xóa nhân viên: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const fmtCurrency = (num) => {
    if (!num) return "0";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleResetPasswordSuccess = () => {
    console.log("  Password reset successfully");
  };

  return (
    <div className="modal-overlay-em" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <div className="icon-box">
            <i class="fa-regular fa-id-badge"></i>
            </div>
            <span className="title">Thông tin nhân viên</span>
          </div>
          <button className="close-btn" onClick={onClose}>
          <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body-em">
          <div className="profile-section">
            <div className="profile-image">
              <img
                src={avatarPreview || "https://placehold.co/120x120?text=No+Img"}
                alt={editData.full_name || employee.full_name}
                style={{ cursor: isEditing ? "pointer" : "default" }}
                onClick={() => {
                  if (isEditing) {
                    document.getElementById("avatar-file-input")?.click();
                  }
                }}
              />
              {isEditing && (
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{
                    display: "none",
                  }}
                />
              )}
            </div>
            <div className="profile-name-wrapper">
              {isEditing ? (
                <input
                  type="text"
                  value={editData.full_name || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, full_name: e.target.value })
                  }
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    border: "1px solid #ccc",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                />
              ) : (
                <h2 className="profile-name">{employee.full_name}</h2>
              )}
              {!isEditing && (
                <button
                  className="edit-icon"
                  title="Chỉnh sửa"
                  onClick={handleStartEdit}
                  style={{ cursor: "pointer" }}
                >
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
              )}
            </div>
          </div>

          <div className="stats-container">
            <div className="stat-card-em">
              <span className="stat-value">0</span>
              <span className="stat-label">Năm kinh nghiệm</span>
            </div>
            <div className="stat-card-em">
              <span className="stat-value">0+</span>
              <span className="stat-label">Phiên livestream</span>
            </div>
            <div className="stat-card-em">
              <span className="stat-value">0%</span>
              <span className="stat-label">Tỉ lệ làm việc</span>
            </div>
            <div className="stat-card-em">
              <span className="stat-value">0M+</span>
              <span className="stat-label">Doanh số</span>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon"><i class="fa-solid fa-user"></i></span>
              Thông tin cá nhân
            </h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Họ tên:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.full_name || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, full_name: e.target.value })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  />
                ) : (
                  <span className="info-value">{employee.full_name || "-"}</span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Giới tính:</span>
                {isEditing ? (
                  <select
                    value={editData.gender || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, gender: e.target.value })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  >
                    <option value="">-- Chọn --</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                ) : (
                  <span className="info-value">
                    {employee.gender === "FEMALE"
                      ? "Nữ"
                      : employee.gender === "MALE"
                      ? "Nam"
                      : "Khác"}
                  </span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Telegram ID:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.telegram_id || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, telegram_id: e.target.value })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  />
                ) : (
                  <span className="info-value">{employee.telegram_id || "-"}</span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">CCCD:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.cccd || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, cccd: e.target.value })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  />
                ) : (
                  <span className="info-value">{employee.cccd || "-"}</span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Ngày sinh:</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.date_of_birth || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        date_of_birth: e.target.value,
                      })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  />
                ) : (
                  <span className="info-value">
                    {fmtDate(employee.date_of_birth)}
                  </span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Quê quán:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.hometown || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, hometown: e.target.value })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  />
                ) : (
                  <span className="info-value">{employee.hometown || "-"}</span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Địa chỉ:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.address || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, address: e.target.value })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  />
                ) : (
                  <span className="info-value">{employee.address || "-"}</span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Ngày vào làm:</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.join_date || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        join_date: e.target.value,
                      })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  />
                ) : (
                  <span className="info-value">
                    {fmtDate(employee.join_date)}
                  </span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Trạng thái:</span>
                {isEditing ? (
                  <select
                    value={editData.is_active ? "active" : "inactive"}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        is_active: e.target.value === "active",
                      })
                    }
                    style={{ flex: 1, padding: "6px", border: "1px solid #ccc" }}
                  >
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Nghỉ</option>
                  </select>
                ) : (
                  <span
                    className={`info-badge ${
                      employee.is_active ? "active" : "inactive"
                    }`}
                  >
                    {employee.is_active ? "Đang làm việc" : "Nghỉ"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon"><i class="fa-solid fa-user-gear"></i></span>
              Tài khoản nội bộ
            </h3>
            <div className="info-grid">
              {employee.account_id ? (
                <>
                  <div className="info-row">
                    <span className="info-label">Tài khoản:</span>
                    <span className="info-value">
                      {loading ? "Đang tải..." : account?.username || "-"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Quyền hạn:</span>
                    <span className="info-value">
                      {loading
                        ? "Đang tải..."
                        : account?.roles?.join(", ") || "-"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Trạng thái:</span>
                    <span
                      className={`info-badge ${
                        account?.is_active ? "active" : "inactive"
                      }`}
                    >
                      {loading
                        ? "Đang tải..."
                        : account?.is_active
                        ? "Đang hoạt động"
                        : "Đã khóa"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="info-row">
                  <span className="info-value">Chưa có tài khoản nội bộ</span>
                </div>
              )}
            </div>
          </div>

          {salaryConfig && (
            <div className="info-section">
              <h3 className="section-title">
                <span className="section-icon"><i class="fa-solid fa-dollar-sign"></i></span>
                Cấu hình lương
              </h3>
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">Lương cứng:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editSalaryData.base_salary || 0}
                      onChange={(e) =>
                        setEditSalaryData({
                          ...editSalaryData,
                          base_salary: parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "6px",
                        border: "1px solid #ccc",
                      }}
                    />
                  ) : (
                    <span className="info-value">
                      {fmtCurrency(salaryConfig.base_salary)}
                    </span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Tiền/giờ livestream:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editSalaryData.hourly_rate_live || 0}
                      onChange={(e) =>
                        setEditSalaryData({
                          ...editSalaryData,
                          hourly_rate_live: parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "6px",
                        border: "1px solid #ccc",
                      }}
                    />
                  ) : (
                    <span className="info-value">
                      {fmtCurrency(salaryConfig.hourly_rate_live)}
                    </span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Tiền/giờ hỗ trợ:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editSalaryData.hourly_rate_support || 0}
                      onChange={(e) =>
                        setEditSalaryData({
                          ...editSalaryData,
                          hourly_rate_support:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "6px",
                        border: "1px solid #ccc",
                      }}
                    />
                  ) : (
                    <span className="info-value">
                      {fmtCurrency(salaryConfig.hourly_rate_support)}
                    </span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Trạng thái:</span>
                  {isEditing ? (
                    <select
                      value={editSalaryData.is_active ? "active" : "inactive"}
                      onChange={(e) =>
                        setEditSalaryData({
                          ...editSalaryData,
                          is_active: e.target.value === "active",
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "6px",
                        border: "1px solid #ccc",
                      }}
                    >
                      <option value="active">Có hiệu lực</option>
                      <option value="inactive">Không hiệu lực</option>
                    </select>
                  ) : (
                    <span
                      className={`info-badge ${
                        salaryConfig.is_active ? "active" : "inactive"
                      }`}
                    >
                      {salaryConfig.is_active
                        ? "Có hiệu lực"
                        : "Không hiệu lực"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isEditing ? (
            <>
              <button
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  background: saving ? "#ccc" : "#10b981",
                  color: "#fff",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: saving ? "not-allowed" : "pointer",
                  marginRight: "8px",
                }}
              >
                <i class="fa-solid fa-check"></i>
                {saving ? "Đang lưu..." : " Lưu"}
              </button>
              <button
                className="btn-secondary"
                onClick={handleCancelEdit}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                <i class="fa-solid fa-xmark"></i> Hủy
              </button>
            </>
          ) : (
            <>
              {employee.account_id && (
                <button
                  className="btn-primary"
                  onClick={() => setShowResetPasswordModal(true)}
                  style={{
                    background: "#f59e0b",
                    color: "#fff",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    marginRight: "8px",
                  }}
                >
                  <i class="fa-solid fa-retweet"></i> Đặt lại mật khẩu
                </button>
              )}
              <button
                className="btn-primary"
                onClick={handleStartEdit}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginRight: "8px",
                }}
              >
                <i class="fa-regular fa-pen-to-square"></i> Sửa
              </button>
              <button
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: deleting ? "#ccc" : "#ef4444",
                  color: "#fff",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginRight: "8px",
                }}
              ><i class="fa-regular fa-trash-can"></i>
                {deleting ? "Đang xóa..." : " Xóa"}
              </button>
            </>
          )}
        </div>
      </div>

      {showResetPasswordModal && (
        <ResetPasswordModal
          accountId={employee.account_id}
          onClose={() => setShowResetPasswordModal(false)}
          onSuccess={handleResetPasswordSuccess}
        />
      )}
    </div>
  );
}
