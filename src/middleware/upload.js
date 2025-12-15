const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

// Chấp nhận các định dạng ảnh phổ biến
const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif))$/i;
const ALLOWED_EXT  = /\.(jpe?g|png|webp|gif)$/i;

const fileFilter = (req, file, cb) => {
  const okMime = ALLOWED_MIME.test(file.mimetype || '');
  const okExt  = ALLOWED_EXT.test(path.extname(file.originalname || ''));
  if (okMime && okExt) return cb(null, true);
  return cb(new Error('Only image files are allowed (jpeg/png/webp/gif)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
    fields: 20,
  },
});

// Middleware chuyển lỗi Multer -> 400 JSON
function handleMulterError(err, req, res, next) {
  if (err && (err instanceof multer.MulterError || /image/i.test(err.message || ''))) {
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  return next(err);
}

module.exports = { upload, handleMulterError };
