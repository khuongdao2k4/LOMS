import React, { useState } from "react";
import { createEmployee, uploadPortrait } from "../services/apiClient";
import "../styles/modals/create-employee.css";

export default function CreateEmployeeModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: "",
    gender: "MALE",
    date_of_birth: "",
    hometown: "",
    address: "",
    cccd: "",
    join_date: new Date().toISOString().split("T")[0],
    telegram_id: "",
    experience: "",
    note: "",
    is_active: true,
    portrait_url: null,
  });

  const [portraitFile, setPortraitFile] = useState(null);
  const [portraitPreview, setPortraitPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setError("Vui lòng chọn file ảnh hợp lệ (JPG, PNG, GIF, WEBP)");
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      setPortraitFile(file);
      setError("");

      const reader = new FileReader();
      reader.onload = (event) => {
        setPortraitPreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError("Họ tên không được để trống");
      return false;
    }
    if (formData.full_name.trim().length < 2) {
      setError("Họ tên phải có ít nhất 2 ký tự");
      return false;
    }
    if (formData.full_name.trim().length > 100) {
      setError("Họ tên không được vượt quá 100 ký tự");
      return false;
    }

    const nameRegex =
      /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
    if (!nameRegex.test(formData.full_name.trim())) {
      setError("Họ tên chỉ được chứa chữ cái và dấu cách");
      return false;
    }

    if (!formData.gender) {
      setError("Vui lòng chọn giới tính");
      return false;
    }

    if (!formData.date_of_birth) {
      setError("Ngày sinh không được để trống");
      return false;
    }
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (birthDate > today) {
      setError("Ngày sinh không được là ngày trong tương lai");
      return false;
    }
    if (age < 16) {
      setError("Nhân viên phải từ 16 tuổi trở lên");
      return false;
    }
    if (age > 70) {
      setError("Ngày sinh không hợp lệ (quá 70 tuổi)");
      return false;
    }

    if (!formData.join_date) {
      setError("Ngày vào làm không được để trống");
      return false;
    }
    const joinDate = new Date(formData.join_date);
    if (joinDate > today) {
      setError("Ngày vào làm không được là ngày trong tương lai");
      return false;
    }
    if (joinDate < birthDate) {
      setError("Ngày vào làm phải sau ngày sinh");
      return false;
    }

    if (!formData.hometown.trim()) {
      setError("Quê quán không được để trống");
      return false;
    }
    if (formData.hometown.trim().length < 2) {
      setError("Quê quán phải có ít nhất 2 ký tự");
      return false;
    }
    if (formData.hometown.trim().length > 200) {
      setError("Quê quán không được vượt quá 200 ký tự");
      return false;
    }

    if (!formData.address.trim()) {
      setError("Địa chỉ không được để trống");
      return false;
    }
    if (formData.address.trim().length < 5) {
      setError("Địa chỉ phải có ít nhất 5 ký tự");
      return false;
    }
    if (formData.address.trim().length > 300) {
      setError("Địa chỉ không được vượt quá 300 ký tự");
      return false;
    }

    if (!formData.cccd.trim()) {
      setError("CCCD không được để trống");
      return false;
    }
    const cccdTrimmed = formData.cccd.trim();
    if (!/^\d{9}$|^\d{12}$/.test(cccdTrimmed)) {
      setError("CCCD/CMND phải là 9 hoặc 12 chữ số");
      return false;
    }

    if (!formData.telegram_id.trim()) {
      setError("Telegram ID không được để trống");
      return false;
    }
    const telegramTrimmed = formData.telegram_id.trim();
    const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
    const numericIdRegex = /^\d{5,15}$/;
    if (!telegramRegex.test(telegramTrimmed) && !numericIdRegex.test(telegramTrimmed)) {
      setError("Telegram ID không hợp lệ (VD: @username hoặc số ID)");
      return false;
    }

    if (formData.experience && formData.experience.trim().length > 500) {
      setError("Kinh nghiệm không được vượt quá 500 ký tự");
      return false;
    }

    if (formData.note && formData.note.trim().length > 1000) {
      setError("Ghi chú không được vượt quá 1000 ký tự");
      return false;
    }

    if (!portraitFile) {
      setError("Vui lòng chọn ảnh chân dung");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      let portraitUrl = null;

      if (portraitFile) {
        const uploadResponse = await uploadPortrait(portraitFile);
        if (uploadResponse && uploadResponse.url) {
          portraitUrl = uploadResponse.url;
        } else {
          throw new Error("Không lấy được URL ảnh sau khi upload");
        }
      }

      const body = {
        full_name: formData.full_name.trim(),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        hometown: formData.hometown.trim(),
        address: formData.address.trim(),
        cccd: formData.cccd.trim(),
        portrait_url: portraitUrl,
        join_date: formData.join_date,
        telegram_id: formData.telegram_id.trim(),
        experience: formData.experience.trim() || "",
        note: formData.note.trim() || "",
        is_active: formData.is_active,
        account_id: null,
      };

      const response = await createEmployee(body);

      if (response) {
        if (onSuccess) onSuccess(response);
        onClose();
      }
    } catch (err) {
      setError(err.message || "Không thể tạo nhân viên. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      full_name: "",
      gender: "MALE",
      date_of_birth: "",
      hometown: "",
      address: "",
      cccd: "",
      join_date: new Date().toISOString().split("T")[0],
      telegram_id: "",
      experience: "",
      note: "",
      is_active: true,
      portrait_url: null,
    });
    setPortraitFile(null);
    setPortraitPreview(null);
    setError("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-employee-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header: căn lại theo flex để title/subtitle và nút X thẳng hàng */}
        <div className="modal-header-ce">
          <div className="modal-header-left">
            <h2 className="modal-title-ce"> <i class="fa-solid fa-user-plus"></i>  Thêm Nhân Viên Mới</h2>
            <p className="modal-subtitle-ce">Nhập thông tin nhân viên để thêm vào danh sách</p>
          </div>

          <button type="button" className="close-btn-ce" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-ce">
          {/* Avatar upload */}
          <div className="form-group-avatar">
            <label className="avatar-upload-label">
              <div className="avatar-preview">
                {portraitPreview ? (
                  <img src={portraitPreview || "/placeholder.svg"} alt="Preview" />
                ) : (
                  <div className="avatar-placeholder">📷</div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
                style={{ display: "none" }}
              />
              <span className="upload-text">Chọn ảnh đại diện</span>
            </label>

            {portraitFile && <div className="upload-success">✓ {portraitFile.name}</div>}
          </div>

          {/* Row 1: Full name, Gender */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Họ tên</span>
                <span className="asterisk">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                className="form-input"
                placeholder="Nhập họ tên"
                value={formData.full_name}
                onChange={handleInputChange}
                disabled={loading}
                maxLength="100"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Giới tính</span>
                <span className="asterisk">*</span>
              </label>
              <select
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date of birth, Join date */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Ngày sinh</span>
                <span className="asterisk">*</span>
              </label>
              <input
                type="date"
                name="date_of_birth"
                className="form-input"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                disabled={loading}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Ngày vào làm</span>
                <span className="asterisk">*</span>
              </label>
              <input
                type="date"
                name="join_date"
                className="form-input"
                value={formData.join_date}
                onChange={handleInputChange}
                disabled={loading}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Row 3: Hometown, Address */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Quê quán</span>
                <span className="asterisk">*</span>
              </label>
              <input
                type="text"
                name="hometown"
                className="form-input"
                placeholder="Nhập quê quán"
                value={formData.hometown}
                onChange={handleInputChange}
                disabled={loading}
                maxLength="200"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Địa chỉ</span>
                <span className="asterisk">*</span>
              </label>
              <input
                type="text"
                name="address"
                className="form-input"
                placeholder="Nhập địa chỉ"
                value={formData.address}
                onChange={handleInputChange}
                disabled={loading}
                maxLength="300"
              />
            </div>
          </div>

          {/* Row 4: CCCD, Telegram ID */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <span className="label-text">CCCD</span>
                <span className="asterisk">*</span>
              </label>
              <input
                type="text"
                name="cccd"
                className="form-input"
                placeholder="Nhập CCCD (9 hoặc 12 số)"
                value={formData.cccd}
                onChange={handleInputChange}
                disabled={loading}
                maxLength="12"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-text">Telegram ID</span>
                <span className="asterisk">*</span>
              </label>
              <input
                type="text"
                name="telegram_id"
                className="form-input"
                placeholder="Nhập Telegram ID (VD: @username)"
                value={formData.telegram_id}
                onChange={handleInputChange}
                disabled={loading}
                maxLength="33"
              />
            </div>
          </div>
{/* Row 5: Experience, Status */}
<div className="form-row">
  <div className="form-group">
    <label className="form-label">
      <span className="label-text">Kinh nghiệm</span>
    </label>
    <input
      type="text"
      name="experience"
      className="form-input"
      placeholder="VD: 3 năm livestream"
      value={formData.experience}
      onChange={handleInputChange}
      disabled={loading}
      maxLength="500"
    />
  </div>

  <div className="form-group">
    <label className="form-label">
      <span className="label-text">Trạng thái</span>
    </label>

    <label className="checkbox-field">
      <input
        type="checkbox"
        name="is_active"
        checked={formData.is_active}
        onChange={handleInputChange}
        disabled={loading}
      />
      <span className="checkbox-text">Đang hoạt động</span>
    </label>
  </div>
</div>


          {/* Note */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-text">Ghi chú</span>
            </label>
            <textarea
              name="note"
              className="form-textarea"
              placeholder="Nhập ghi chú nội bộ (VD: ưu tiên ca tối)"
              value={formData.note}
              onChange={handleInputChange}
              disabled={loading}
              rows="3"
              maxLength="1000"
            />
          </div>

          {/* Error Message */}
          {error && <div className="error-message-ce">{error}</div>}

          {/* Buttons */}
          <div className="form-buttons-ce">
            <button type="submit" className="btn-primary-ce" disabled={loading || !portraitFile}>
              {loading ? "Đang tạo..." : "Thêm Nhân Viên"}
            </button>

            <button type="button" className="btn-secondary-ce" onClick={handleReset} disabled={loading}>
              Làm Mới
            </button>

            <button type="button" className="btn-cancel-ce" onClick={onClose} disabled={loading}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
