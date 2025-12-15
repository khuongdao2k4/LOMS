const { r2, buildPublicUrl } = require('../config/r2');
const { PutObjectCommand }   = require('@aws-sdk/client-s3');
const { v4: uuid }           = require('uuid');
const mime                   = require('mime-types');

exports.uploadPortrait = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Missing file' });

    const bucket = process.env.R2_BUCKET;
    const ext = mime.extension(req.file.mimetype) || 'bin';
    const key = `portraits/${uuid()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    // ✅ TRUYỀN STRING key, KHÔNG truyền object
    const url = buildPublicUrl(key);
    return res.json({ url, key });
  } catch (e) {
    console.error('[UPLOAD/PORTRAIT]', e);
    return res.status(500).json({ message: 'Upload failed' });
  }
};

exports.uploadScreenshot = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Missing file' });

    const bucket = process.env.R2_BUCKET;
    const ext = mime.extension(req.file.mimetype) || 'bin';
    const key = `screenshots/${uuid()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const url = buildPublicUrl(key);
    return res.json({ url, key });
  } catch (e) {
    console.error('[UPLOAD/SCREENSHOT]', e);
    return res.status(500).json({ message: 'Upload failed' });
  }
};
