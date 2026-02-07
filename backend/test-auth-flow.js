const http = require('http');

// First do a login to get a token
const loginData = JSON.stringify({
  email: 'test_1770319122149@example.com',
  password: 'password123'
});

console.log('Step 1: Testing login...');

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (loginRes) => {
  let loginData = '';
  
  loginRes.on('data', (chunk) => {
    loginData += chunk;
  });
  
  loginRes.on('end', () => {
    console.log('Login Status:', loginRes.statusCode);
    try {
      const loginResponse = JSON.parse(loginData);
      const token = loginResponse.token;
      
      console.log('\nStep 2: Testing /api/auth/me with token...');
      
      const meOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      const meReq = http.request(meOptions, (meRes) => {
        let meData = '';
        
        meRes.on('data', (chunk) => {
          meData += chunk;
        });
        
        meRes.on('end', () => {
          console.log('Profile Fetch Status:', meRes.statusCode);
          console.log('Profile Data:', meData);
          try {
            const profile = JSON.parse(meData);
            console.log('Parsed Profile:');
            console.log(JSON.stringify(profile, null, 2));
          } catch (e) {
            console.log('Could not parse profile');
          }
        });
      });
      
      meReq.on('error', (error) => {
        console.error('Profile Request Error:', error);
      });
      
      meReq.end();
      
    } catch (e) {
      console.log('Could not parse login response');
    }
  });
});

loginReq.on('error', (error) => {
  console.error('Login Request Error:', error);
});

loginReq.write(loginData);
loginReq.end();
