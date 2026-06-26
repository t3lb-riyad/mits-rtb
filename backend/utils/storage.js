const fs = require('fs');
const path = require('path');
const https = require('https');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function uploadToImgBB(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const base64 = buffer.toString('base64');
    const postData = `key=${IMGBB_API_KEY}&image=${encodeURIComponent(base64)}&name=${encodeURIComponent(originalName || 'image')}`;

    const req = https.request({
      hostname: 'api.imgbb.com',
      path: '/1/upload',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.success) {
            resolve(result.data.url);
          } else {
            reject(new Error(result.error?.message || 'ImgBB upload failed'));
          }
        } catch {
          reject(new Error('Failed to parse ImgBB response'));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function uploadLocal(buffer, originalName) {
  const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(originalName || '.jpg');
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return '/uploads/' + filename;
}

async function uploadImage(buffer, originalName, mimetype) {
  if (IMGBB_API_KEY) {
    const url = await uploadToImgBB(buffer, originalName);
    return url;
  }
  return uploadLocal(buffer, originalName);
}

module.exports = { uploadImage, IMGBB_API_KEY };
