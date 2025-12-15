const { PutObjectCommand } = require('@aws-sdk/client-s3');
const r2 = require('../config/r2');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

async function uploadPortrait(fileBuffer, originalName, mimeType) {
  const ext = mime.extension(mimeType) || 'bin';
  const now = new Date();
  const key = `portraits/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${uuidv4()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    // R2 bỏ qua ACL, quyền public cấu hình ở bucket/CDN
  }));

  // URL public (qua CDN/custom domain)
  const url = `${process.env.R2_PUBLIC_BASE}/${key}`;
  return { key, url };
}

module.exports = { uploadPortrait };
