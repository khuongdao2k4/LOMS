import "../styles/login-banner.css"

export default function LoginBanner() {
  return (
    <div className="login-banner">
      <div className="banner-content">
        <h1>HỆ THỐNG QUẢN LÝ NHÂN SỰ</h1>
        <p className="banner-subtitle">"Chào mừng đến hệ thống quản lý nhân sự."</p>

        <div className="banner-illustration">
          <svg viewBox="0 0 200 200" className="person person-center">
            <circle cx="100" cy="50" r="20" fill="#4B7EC4" />
            <path
              d="M100 70 Q80 80 80 100 L80 140 Q80 150 90 150 L110 150 Q120 150 120 140 L120 100 Q120 80 100 70"
              fill="#4B7EC4"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
