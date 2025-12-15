import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import HeaderDefault from "../components/HeaderDefault";
import SidebarDefault from "../components/SidebarDefault";
import EmployeeDetailModal from "../components/EmployeeDetailModal";
import CreateAccountModal from "../components/CreateAccountModal";
import CreateEmployeeModal from "../components/CreateEmployeeModal";
import { getEmployees } from "../services/apiClient";
import "../styles/employees/employees.css";

/**
 * Hàm logout bắt buộc: xoá token + quay về trang login.
 * Dùng chung cho cả EmployeesPage và HeaderDefault nếu cần.
 */
export function handleForcedLogout() {
  try {
    localStorage.removeItem("auth");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  } catch (_) {}

  // Đẩy về trang login (reload SPA luôn cho chắc)
  window.location.href = "/login";
}

export default function EmployeesPage() {
  // ====== filter & paging ======
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "", "active", "inactive"
  const [openStatus, setOpenStatus] = useState(false);
  const statusRef = useRef(null);

  const [page, setPage] = useState(1);
  const [size] = useState(5);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState(false);

  const hasToken = () => !!localStorage.getItem("accessToken");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / size)),
    [total, size]
  );

  // ====== load list (đÃ sửa phần mapping data) ======
  const load = useCallback(async () => {
    if (!hasToken()) return;

    setLoading(true);
    setError("");

    try {
      const data = await getEmployees({ page, size, q, status });

      if (!data) {
        setLoading(false);
        return;
      }

      let list = [];
      let totalCount = 0;

      // TH1: backend trả thẳng mảng
      if (Array.isArray(data)) {
        list = data;
        totalCount = data.length;
      } else if (data && typeof data === "object") {
        // TH2: { items: [...], total / count / pagination }
        if (Array.isArray(data.items)) {
          list = data.items;
          totalCount =
            data.total ??
            data.count ??
            data.pagination?.total ??
            data.items.length;
        }
        // TH3: { rows: [...], count }
        else if (Array.isArray(data.rows)) {
          list = data.rows;
          totalCount = data.count ?? data.rows.length;
        }
        // TH4: { data: [...] }
        else if (Array.isArray(data.data)) {
          list = data.data;
          totalCount =
            data.total ?? 
            data.count ?? 
            data.pagination?.total ??
            data.data.length;
        }
        // TH5: { data: { items / rows / ... } }
        else if (
          data.data &&
          typeof data.data === "object" &&
          !Array.isArray(data.data)
        ) {
          const inner = data.data;

          if (Array.isArray(inner.items)) {
            list = inner.items;
            totalCount =
              inner.total ??
              inner.count ??
              inner.pagination?.total ??
              inner.items.length;
          } else if (Array.isArray(inner.rows)) {
            list = inner.rows;
            totalCount =
              inner.total ?? inner.count ?? inner.rows.length;
          } else if (Array.isArray(inner)) {
            list = inner;
            totalCount = inner.length;
          }
        }
      }

      setItems(list);
      setTotal(totalCount);
    } catch (e) {
      console.error(e);
      if (e?.message === "UNAUTHORIZED") {
        handleForcedLogout();
        return;
      }
      setError("Không tải được danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  }, [page, size, q, status]);

  // Gọi load khi page / q / status đổi
  useEffect(() => {
    load();
  }, [load]);

  // Lắng nghe sự kiện FORCE_LOGOUT nếu header có bắn
  useEffect(() => {
    const handler = () => handleForcedLogout();
    window.addEventListener("FORCE_LOGOUT", handler);
    return () => window.removeEventListener("FORCE_LOGOUT", handler);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function onDocClick(e) {
      if (!statusRef.current) return;
      if (!statusRef.current.contains(e.target)) setOpenStatus(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ====== helpers ======
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const StatusPill = ({ value }) => {
    const active = value === true || value === "active";
    return (
      <div className={active ? "background-3b" : "background-57"}>
        <div className={active ? "container-3c" : "container-58"}>
          <div className={active ? "symbol-3d" : "symbol-59"} />
        </div>
        <span className={active ? "activity" : "leave"}>
          {active ? "Hoạt động" : "Nghỉ"}
        </span>
      </div>
    );
  };

  const handleOpenDetailModal = (emp) => {
    setSelectedEmployee(emp);
    setShowDetailModal(true);
  };

  const handleOpenCreateAccountModal = (emp) => {
    setSelectedEmployee(emp);
    setShowCreateAccountModal(true);
  };

  const handleCloseModals = () => {
    setShowDetailModal(false);
    setShowCreateAccountModal(false);
    setShowCreateEmployeeModal(false);
    setSelectedEmployee(null);
  };

  const handleCreateAccountSuccess = () => {
    load();
    setShowCreateAccountModal(false);
  };

  const handleCreateEmployeeSuccess = () => {
    load();
    setShowCreateEmployeeModal(false);
  };

  const handleEmployeeUpdated = () => {
    load();
  };

  // ====== UI - GIỮ NGUYÊN GIAO DIỆN CŨ + THÊM NÚT "THÊM NHÂN VIÊN" ======
  return (
    <div className="main-container">
      <HeaderDefault />

      <div className="flex-row-ea">
        <SidebarDefault />

        {/* Main content - Quản lý nhân viên */}
        <div className="quan-ly-nhan-vien-1d">
          <div className="main">
            <div className="header-1e">
              <div className="container">
                <div className="heading">
                  <span className="quan-ly-nhan-vien-1f">Quản Lý Nhân Viên</span>
                </div>
                <div className="container-20">
                  <span className="quan-ly-ho-so">
                    Tìm kiếm & lọc theo trạng thái hoạt động
                  </span>
                </div>
              </div>

              <button
                className="add-employee-btn"
                style={{
                  padding: "10px 16px",
                  background: "#3b82f6",
                  color: "#fff",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  marginLeft: "auto",
                }}
                onClick={() => setShowCreateEmployeeModal(true)}
              >
                <i class="fa-solid fa-user-plus"></i> <span>Thêm nhân viên</span>
              </button>
            </div>

            <div className="container-22">
              <div className="body">
                {/* Search + Trạng thái */}
                <div
                  className="horizontal-border-ep"
                  style={{ position: "relative" }}
                >
                  <div className="container-23">
                    <div className="container-24">
                      <div className="input-search">
                        <input
                          className="tim-kiem-nhan-vien"
                          style={{ border: "none", width: "100%" }}
                          placeholder="Tìm theo Họ tên / Quê quán / ID Telegram…"
                          value={q}
                          onChange={(e) => {
                            setQ(e.target.value);
                            setPage(1);
                          }}
                        />
                      </div>
                      <div className="container-26">
                        <div className="symbol" />
                      </div>
                    </div>
                  </div>

                  <div
                    className="dropdown-box"
                    ref={statusRef}
                    style={{ top: 12, right: 24, left: "auto" }}
                  >
                    <div
                      className="header-bf"
                      onClick={() => setOpenStatus(!openStatus)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="menu-label">
                        <span className="status">
                          {status === "active"
                            ? "Hoạt động"
                            : status === "inactive"
                            ? "Nghỉ"
                            : "Trạng thái"}
                        </span>
                      </div>
                      <div className="chevron-down-c0" />
                    </div>
                    {openStatus && (
                      <div className="items-list" style={{ marginTop: 4 }}>
                        <div
                          className="item-hover"
                          onClick={() => {
                            setStatus("active");
                            setPage(1);
                            setOpenStatus(false);
                          }}
                        >
                          <div className="label">
                            <span className="activity-c1">Hoạt động</span>
                          </div>
                          <div className="chevron-down-c2">
                            <div className="icon-c3" />
                          </div>
                        </div>
                        <div
                          className="item-hover-c4"
                          onClick={() => {
                            setStatus("inactive");
                            setPage(1);
                            setOpenStatus(false);
                          }}
                        >
                          <div className="label-c5">
                            <span className="leave-c6">Nghỉ</span>
                          </div>
                          <div className="chevron-down-c7">
                            <div className="icon-c8" />
                          </div>
                        </div>
                        <div
                          className="item-hover-c9"
                          onClick={() => {
                            setStatus("");
                            setPage(1);
                            setOpenStatus(false);
                          }}
                        >
                          <div className="label-ca">
                            <span className="deselect">Bỏ chọn</span>
                          </div>
                          <div className="chevron-down-cb">
                            <div className="icon-cc" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="container-27">
                  <div className="table">
                    {/* Header */}
                    <div className="header-28">
                      <div className="row">
                        <div className="cell-01">
                          <span className="nhan-vien">Nhân viên</span>
                        </div>
                        <div className="cell-29">
                          <span className="thong-tin">Thông tin</span>
                        </div>
                        <div className="cell-2a">
                          <span className="gioi-tinh">Giới tính</span>
                        </div>
                        <div className="cell-2b">
                          <span className="que-quan">Quê quán</span>
                        </div>
                        <div className="cell-2c">
                          <span className="ngay-sinh">Ngày sinh</span>
                        </div>
                        <div className="cell-2d">
                          <span className="trang-thai">
                            Trạng
                            <br />
                            thái
                          </span>
                        </div>
                        <div className="cell-2e">
                          <span className="thao-tac">Thao tác</span>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="body-2f">
                      {loading && (
                        <div
                          className="row"
                          style={{ padding: 24, justifyContent: "center" }}
                        >
                          Đang tải dữ liệu...
                        </div>
                      )}

                      {!loading && error && (
                        <div
                          className="row"
                          style={{ padding: 24, justifyContent: "center" }}
                        >
                          {error}
                        </div>
                      )}

                      {!loading && !error && items.length === 0 && (
                        <div
                          className="row"
                          style={{ padding: 24, justifyContent: "center" }}
                        >
                          Không có nhân viên phù hợp.
                        </div>
                      )}

                      {!loading &&
                        !error &&
                        items.map((emp) => (
                          <div className="row-44" key={emp.id}>
                            <div className="data-45">
                              <div
                                className="employee-46"
                                style={{
                                  backgroundImage: `url(${
                                    emp.portrait_url ||
                                    "https://placehold.co/80x80?text=No+Img"
                                  })`,
                                }}
                              />
                              <div className="container-47">
                                <div className="paragraph-48">
                                  <span className="name-49">
                                    {emp.full_name || "-"}
                                  </span>
                                </div>
                                <div
                                  className="paragraph-4c"
                                  style={{ marginTop: 4 }}
                                >
                                  <span className="data-4e">
                                    Telegram: {emp.telegram_id || "-"}
                                  </span>
                                </div>
                                <div
                                  className="paragraph-4c"
                                  style={{ marginTop: 2 }}
                                >
                                  <span className="data-4e">
                                    CCCD: {emp.cccd || "-"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="data-4b">
                              <div className="paragraph-4c">
                                <span className="data-4e">
                                  {emp.address || "-"}
                                </span>
                              </div>
                            </div>

                            <div className="background-4f">
                              <div className="name-50">
                                <span className="data-51">
                                  {emp.gender === "FEMALE"
                                    ? "Nữ"
                                    : emp.gender === "MALE"
                                    ? "Nam"
                                    : "Khác"}
                                </span>
                              </div>
                            </div>

                            <div className="name-52">
                              <span className="name-53">
                                {emp.hometown || "-"}
                              </span>
                            </div>
                            <div className="data-54">
                              <span className="date-of-birth-55">
                                {fmtDate(emp.date_of_birth)}
                              </span>
                            </div>
                            <div className="data-56">
                              <StatusPill value={emp.is_active} />
                            </div>

                            <div className="data-5a">
                              <button
                                className="button-5b"
                                title="Thông tin chi tiết"
                                onClick={() => handleOpenDetailModal(emp)}
                              >
                                <div className="container-5c">
                                  <div className="symbol-5d" />
                                </div>
                              </button>
                              {!emp.account_id && (
                                <button
                                  className="button-5e"
                                  title="Tạo Tài Khoản"
                                  onClick={() => handleOpenCreateAccountModal(emp)}
                                >
                                  <div className="container-5f">
                                    <div className="symbol-60" />
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Footer: pagination */}
                    <div className="horizontal-border-b3">
                      <div className="container-b4">
                        <span className="employee-display">
                          Hiển thị{" "}
                          {items.length ? (page - 1) * size + 1 : 0}-
                          {(page - 1) * size + items.length} / {total}
                        </span>
                      </div>
                      <div className="container-b5">
                        <button
                          className="button-b6"
                          disabled={page === 1}
                          onClick={() =>
                            setPage((p) => Math.max(1, p - 1))
                          }
                        >
                          <div className="container-b7">
                            <div className="symbol-b8" />
                          </div>
                        </button>
                        {[...Array(totalPages)].map((_, i) => {
                          const p = i + 1;
                          const active = p === page;
                          return (
                            <button
                              key={p}
                              className={active ? "button-b9" : "button-ba"}
                              onClick={() => setPage(p)}
                            >
                              <span className={active ? "page-1" : "page-2"}>
                                {p}
                              </span>
                            </button>
                          );
                        })}
                        <button
                          className="button-bc"
                          disabled={page === totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        >
                          <div className="container-bd">
                            <div className="symbol-be" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* .body */}
            </div>
            {/* .container-22 */}
          </div>
          {/* .main */}
        </div>
        {/* .quan-ly-nhan-vien-1d */}
      </div>
      {/* .flex-row-ea */}

      {showDetailModal && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={handleCloseModals}
          onUpdated={handleEmployeeUpdated}
        />
      )}

      {showCreateAccountModal && (
        <CreateAccountModal
          employee={selectedEmployee}
          onClose={handleCloseModals}
          onSuccess={handleCreateAccountSuccess}
        />
      )}

      {showCreateEmployeeModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateEmployeeModal(false)}
          onSuccess={handleCreateEmployeeSuccess}
        />
      )}
    </div>
  );
}
