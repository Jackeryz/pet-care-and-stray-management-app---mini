(async ()=>{
  const fetch = globalThis.fetch || (await import('node-fetch')).then(m=>m.default);
  const base = 'http://localhost:3000';

  // Register NGO with location
  const ngoEmail = `ngo_geo_${Date.now()}@example.com`;
  const ngoRes = await fetch(`${base}/api/auth/register`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name:'Geo NGO', email: ngoEmail, password:'password123', role:'NGO', latitude: 40.785091, longitude: -73.968285})
  });
  const ngoData = await ngoRes.json();
  console.log('NGO register:', ngoRes.status, ngoData);

  // Register user
  const userEmail = `user_geo_${Date.now()}@example.com`;
  const uRes = await fetch(`${base}/api/auth/register`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name:'Geo User', email: userEmail, password:'password123', role:'PUBLIC_USER'})
  });
  const uData = await uRes.json();
  console.log('User register:', uRes.status, uData);

  const token = uData.token;

  // Submit stray report with lat/lng near the NGO
  const reportRes = await fetch(`${base}/api/strays`, {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify({location:'Near the park', description:'Injured cat', latitude:40.784, longitude:-73.966})
  });
  const reportData = await reportRes.json();
  console.log('Report:', reportRes.status, reportData);

  // Query notifications for NGO
  const ngoToken = ngoData.token;
  const notRes = await fetch(`${base}/api/notifications`, {headers:{'Authorization':`Bearer ${ngoToken}`}});
  const notData = await notRes.json();
  console.log('Notifications for NGO:', notRes.status, notData);
})();
