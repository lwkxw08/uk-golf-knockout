const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

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

async function uploadScorecard(file, matchId) {
  const client = getS3Client();
  if (!client) throw new Error('Storage not configured');

  const ext = file.originalname.split('.').pop();
  const key = `scorecards/${matchId}/${uuidv4()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return key;
}

async function getScorecardUrl(key) {
  const client = getS3Client();
  if (!client) throw new Error('Storage not configured');

  const command = new GetObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

module.exports = { uploadScorecard, getScorecardUrl };
