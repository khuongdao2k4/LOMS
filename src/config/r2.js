// src/config/r2.js
const { S3Client } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto', // Cloudflare R2 dùng 'auto'
  endpoint: process.env.R2_ENDPOINT, // https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Tạo URL public qua CDN/R2.dev (nên set R2_PUBLIC_BASE = https://<bucket_public>.r2.dev)
function buildPublicUrl(key) {
  const base = (process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  if (base) return `${base}/${key}`;
  // fallback: endpoint trực tiếp (thường không public)
  const endpoint = (process.env.R2_ENDPOINT || '').replace(/\/+$/, '');
  const bucket   = process.env.R2_BUCKET;
  return `${endpoint}/${bucket}/${key}`;
}

module.exports = { r2: client, buildPublicUrl };
