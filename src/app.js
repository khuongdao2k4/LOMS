require('dotenv').config();

const express = require('express');
const morgan  = require('morgan');
const cors    = require('cors');
const path    = require('path');

// Routers
const authRoutes     = require('./routes/auth.routes');
const roleRoutes     = require('./routes/role.routes');
const employeeRoutes = require('./routes/employee.routes');
const uploadRoutes   = require('./routes/upload.routes');
const channelRoutes  = require('./routes/channel.routes');
const salaryRoutes   = require('./routes/salary.routes');
const accountRoutes  = require('./routes/account.routes');
const salaryReportRoutes = require('./routes/salaryReport.routes');
const revenueReportRoutes = require('./routes/revenueReport.routes');
const publicBookingRoutes = require('./routes/publicBooking.route');
const adminBookingRoutes = require('./routes/adminBooking.route');
const adminBookingConfigRoutes = require('./routes/adminBookingConfig.route');

// ▶️ Thêm 3 router mới: schedule, event, session
const scheduleRoutes = require('./routes/schedules.routes');
const eventRoutes    = require('./routes/events.routes');
const sessionRoutes  = require('./routes/session.routes');

// Swagger (đã tách config riêng)
const swaggerUi = require('swagger-ui-express');
const { specs }  = require('./config/swagger');

const app = express();

// ---------- Middlewares ----------
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Swagger UI ----------
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// ---------- Health check ----------
app.get('/health', (req, res) => res.json({ ok: true }));

// ---------- Mount routes ----------
app.use('/api/v1', roleRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', employeeRoutes);
app.use('/api/v1', uploadRoutes);
app.use('/api/v1', channelRoutes);
app.use('/api/v1', publicBookingRoutes);
app.use('/api/v1/bookings', adminBookingRoutes);
app.use('/api/v1/channels', adminBookingConfigRoutes);
app.use('/api/v1', salaryRoutes);
app.use('/api/v1', accountRoutes);
// Payroll reports (legacy prefix /api/payroll + aligned /api/v1/payroll)
app.use('/api/payroll', salaryReportRoutes);
app.use('/api/v1/payroll', salaryReportRoutes);
// Revenue reports
app.use('/api/v1/revenue-report', revenueReportRoutes);

//  Mount thêm các route mới
app.use('/api/v1', scheduleRoutes);
app.use('/api/v1', eventRoutes);
app.use('/api/v1', sessionRoutes);

// Serve placeholder static page for /booking (avoid 404 when opening link)
app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

// ---------- Error fallback ----------
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ message: 'Internal error' });
});

module.exports = app;
