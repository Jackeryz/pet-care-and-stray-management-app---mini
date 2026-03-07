const https = require('https');
const fs = require('fs');

// Try to fetch one of the uploaded images
const imageUrl = 'https://localhost:3000/uploads/photo-1772867102364-995854830.jpg';

console.log('Testing direct image fetch from:', imageUrl);
console.log('');

const req = https.get(
  imageUrl,
  { rejectUnauthorized: false },
  (res) => {
    console.log('Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Content-Length:', res.headers['content-length']);
    console.log('');

    if (res.statusCode === 200) {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.length;
      });
      res.on('end', () => {
        console.log(`✓ Successfully fetched image (${data} bytes)`);
        
        // Also try to write it to a file to verify it's valid
        const localPath = './downloaded-image.jpg';
        const writeStream = fs.createWriteStream(localPath);
        const req2 = https.get(
          imageUrl,
          { rejectUnauthorized: false },
          (res2) => {
            res2.pipe(writeStream);
            writeStream.on('finish', () => {
              console.log(`✓ Wrote downloaded image to ${localPath}`);
            });
          }
        );
      });
    } else {
      console.log('✗ Failed to fetch image - Status ' + res.statusCode);
    }
  }
);

req.on('error', (error) => {
  console.error('✗ Error:', error.message);
});
