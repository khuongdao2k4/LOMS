// src/middleware/validate.js
const validate = (schema) => (req, res, next) => {
  const isQuery = req.method === 'GET' || req.method === 'DELETE';
  const data = isQuery ? req.query : req.body;

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true, // loại key không có trong schema
    convert: true       // ép kiểu (vd: "1" -> 1 cho page/pageSize)
  });

  if (error) {
    return res.status(400).json({
      message: 'Validation error',
      details: error.details.map(d => ({
        path: Array.isArray(d.path) ? d.path.join('.') : String(d.path || ''),
        msg: d.message
      }))
    });
  }

  if (isQuery) req.query = value;
  else req.body = value;

  next();
};

module.exports = validate;
