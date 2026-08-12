const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');
const { randomUUID } = require('crypto');

let s3Client = null;

function getS3Client() {
  if (!s3Client && config.r2.endpoint) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3Client;
}

function isStorageConfigured() {
  return !!(config.r2.endpoint && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucketName);
}

async function uploadFile(file, folder = 'uploads') {
  const client = getS3Client();
  if (!client) return null; // fallback to base64

  const ext = file.originalname?.split('.').pop() || 'jpg';
  const key = `${folder}/${randomUUID()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  // Return public URL if bucket has public access, otherwise return the key
  if (config.r2.publicUrl) {
    return `${config.r2.publicUrl}/${key}`;
  }
  return key;
}

async function uploadAvatar(file, playerId) {
  const client = getS3Client();
  if (!client) {
    // Fallback: store as base64 data URL (dev/no-R2 mode)
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  }

  const ext = file.originalname?.split('.').pop() || 'jpg';
  const key = `avatars/${playerId}/${randomUUID()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000',
  }));

  if (config.r2.publicUrl) {
    return `${config.r2.publicUrl}/${key}`;
  }
  return key;
}

async function uploadGalleryPhoto(file, clubId) {
  const client = getS3Client();
  if (!client) {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  }

  const ext = file.originalname?.split('.').pop() || 'jpg';
  const key = `gallery/${clubId}/${randomUUID()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=86400',
  }));

  if (config.r2.publicUrl) {
    return `${config.r2.publicUrl}/${key}`;
  }
  return key;
}

async function uploadScorecard(file, matchId) {
  const client = getS3Client();
  if (!client) throw new Error('Storage not configured');

  const ext = file.originalname.split('.').pop();
  const key = `scorecards/${matchId}/${randomUUID()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return key;
}

async function getSignedFileUrl(key) {
  const client = getS3Client();
  if (!client) throw new Error('Storage not configured');

  const command = new GetObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

async function deleteFile(key) {
  const client = getS3Client();
  if (!client) return;

  await client.send(new DeleteObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
  }));
}

// Alias for backwards compat
const getScorecardUrl = getSignedFileUrl;

module.exports = {
  isStorageConfigured,
  uploadFile,
  uploadAvatar,
  uploadGalleryPhoto,
  uploadScorecard,
  getScorecardUrl,
  getSignedFileUrl,
  deleteFile,
};
