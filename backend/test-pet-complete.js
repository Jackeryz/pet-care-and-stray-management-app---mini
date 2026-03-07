const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');

// Create a test image
const testImagePath = path.join(__dirname, 'test-image.jpg');
const jpegBuffer = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
  0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
  0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
  0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
  0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
  0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
  0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
  0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
  0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
  0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
  0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
  0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
  0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
  0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
  0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD0, 0xFF, 0xD9
]);
fs.writeFileSync(testImagePath, jpegBuffer);
console.log('✓ Created test image');

let globalToken = null;
const email = `test_${Date.now()}@example.com`;

// Step 1: Register user
async function registerUser() {
  return new Promise((resolve) => {
    console.log('\n=== STEP 1: Register User ===');
    
    const data = JSON.stringify({
      name: "Test Pet Owner",
      email: email,
      password: "password123",
      role: "PUBLIC_USER"
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log('✓ User registered:', parsed.email);
          resolve(parsed);
        } catch (e) {
          console.log('Response:', responseData);
          resolve(null);
        }
      });
    });
    req.on('error', (error) => {
      console.error('Error:', error);
      resolve(null);
    });
    req.write(data);
    req.end();
  });
}

// Step 2: Login user
async function loginUser() {
  return new Promise((resolve) => {
    console.log('\n=== STEP 2: Login User ===');
    
    const data = JSON.stringify({
      email: email,
      password: "password123"
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log('✓ Login successful');
          console.log('Token:', parsed.token.substring(0, 50) + '...');
          globalToken = parsed.token;
          resolve(parsed.token);
        } catch (e) {
          console.log('Response:', responseData);
          resolve(null);
        }
      });
    });
    req.on('error', (error) => {
      console.error('Error:', error);
      resolve(null);
    });
    req.write(data);
    req.end();
  });
}

// Step 3: Create pet with photo
async function createPetWithPhoto() {
  return new Promise((resolve) => {
    console.log('\n=== STEP 3: Create Pet with Photo ===');
    
    const form = new FormData();
    form.append('name', 'TestPet');
    form.append('breed', 'Golden Retriever');
    form.append('age', '3');
    form.append('photo', fs.createReadStream(testImagePath));

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/pets',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${globalToken}`
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 201) {
            console.log('✓ Pet created successfully!');
            console.log('  Pet ID:', parsed.id);
            console.log('  Pet Name:', parsed.name);
            console.log('  Photo URL:', parsed.photoUrl);
            resolve(parsed);
          } else {
            console.log('✗ Error (Status ' + res.statusCode + '):', parsed.error);
            resolve(null);
          }
        } catch (e) {
          console.log('Response:', responseData);
          resolve(null);
        }
      });
    });
    req.on('error', (error) => {
      console.error('Error:', error);
      resolve(null);
    });
    form.pipe(req);
  });
}

// Step 4: List pets
async function listPets() {
  return new Promise((resolve) => {
    console.log('\n=== STEP 4: List Pets ===');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/pets',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${globalToken}`
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          console.log(`✓ Retrieved ${parsed.length} pet(s)`);
          parsed.forEach((pet, idx) => {
            console.log(`\n  Pet ${idx + 1}:`);
            console.log('    Name:', pet.name);
            console.log('    Breed:', pet.breed);
            console.log('    Age:', pet.age);
            console.log('    Photo URL:', pet.photoUrl);
          });
          resolve(parsed);
        } catch (e) {
          console.log('Response:', responseData);
          resolve(null);
        }
      });
    });
    req.on('error', (error) => {
      console.error('Error:', error);
      resolve(null);
    });
    req.end();
  });
}

// Run sequence
(async () => {
  await registerUser();
  await new Promise(r => setTimeout(r, 1000));
  
  await loginUser();
  await new Promise(r => setTimeout(r, 1000));
  
  const pet = await createPetWithPhoto();
  await new Promise(r => setTimeout(r, 1000));
  
  if (pet && pet.photoUrl) {
    // Check that the photo file actually exists
    const uploadFileName = pet.photoUrl.replace('/uploads/', '');
    const uploadPath = path.join(__dirname, 'uploads', uploadFileName);
    console.log('\n=== STEP 5: Verify Photo File ===');
    if (fs.existsSync(uploadPath)) {
      const stats = fs.statSync(uploadPath);
      console.log('✓ Photo file exists!');
      console.log('  Path:', uploadPath);
      console.log('  Size:', stats.size, 'bytes');
    } else {
      console.log('✗ Photo file NOT found at:', uploadPath);
    }
  }
  
  await listPets();
})();
