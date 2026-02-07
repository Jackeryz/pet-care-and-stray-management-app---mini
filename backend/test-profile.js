const http = require('http');

// Use a token from a previous login
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQzYjhjNzgzLTlkNTQtNDNkNi1hODY1LTZmMjhkYmM5MjgyNiIsInJvbGUiOiJQVUJMSUNfVVNFUiIsImVtYWlsIjoidGVzdF8xNzcwMzE5MDU3NDUyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzcwMzE5MDU3fQ.IdAJ-GvA2xevF89NXqGaZARAotyX7OBzm--0IJpUAb4";

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/me',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
    try {
      const parsed = JSON.parse(responseData);
      console.log('Parsed:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Could not parse');
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.end();
