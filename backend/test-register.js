const http = require('http');

const email = `test_${Date.now()}@example.com`;
const data = JSON.stringify({
  name: "Test User",
  email: email,
  password: "password123",
  role: "PUBLIC_USER"
});

console.log("Testing with email:", email);
console.log("Sending payload:", data);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== RESPONSE ===');
    console.log('Status Code:', res.StatusCode);
    console.log('Raw Response:', responseData);
    try {
      const parsed = JSON.parse(responseData);
      console.log('Parsed:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Could not parse');
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();

setTimeout(() => {
  console.log('\nTimeout - terminating');
  process.exit(0);
}, 5000);
