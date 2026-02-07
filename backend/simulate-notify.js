(async () => {
  const base = 'http://localhost:3000';
  const fetch = globalThis.fetch || (await import('node-fetch')).default;

  async function register(name, email, password, role) {
    const res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  console.log('Registering accounts...');
  const userEmail = `user_sim_${Date.now()}@example.com`;
  const ngoEmail = `ngo_sim_${Date.now()}@example.com`;

  const u = await register('Sim User', userEmail, 'password123', 'PUBLIC_USER');
  console.log('User register:', u.status, u.data?.message || u.data);

  const n = await register('Sim NGO', ngoEmail, 'password123', 'NGO');
  console.log('NGO register:', n.status, n.data?.message || n.data);

  const userToken = u.data?.token;
  if (!userToken) {
    console.error('No token for user — aborting');
    process.exit(1);
  }

  console.log('\nSubmitting stray report as user...');
  const reportRes = await fetch(`${base}/api/strays`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({ location: 'Near Central Park, City', description: 'Small injured dog near bench' }),
  });
  const reportData = await reportRes.json();
  console.log('Report status:', reportRes.status, reportData);

  // Now query DB for NGOs directly from SQLite to simulate notifications
  console.log('\nQuerying NGOs from database to simulate notifications...');
  try {
    const Database = require('better-sqlite3');
    const db = new Database('dev.db', { readonly: true });
    // Prisma uses the table name "User" (capital U)
    const stmt = db.prepare('SELECT id, name, email FROM "User" WHERE role = ?');
    const ngos = stmt.all('NGO');
    console.log('Found NGOs count:', ngos.length);
    ngos.forEach((g, i) => {
      console.log(`${i + 1}. ${g.name} <${g.email}> (id: ${g.id})`);
    });

    if (ngos.length === 0) {
      console.log('No NGOs to notify.');
    } else {
      const nearest = ngos[0];
      console.log('\nSimulated notification:');
      console.log(`-> Notified NGO ${nearest.name} <${nearest.email}> about report id ${reportData.id}`);
    }

    db.close();
  } catch (err) {
    console.error('Failed to query SQLite directly:', err);
  }
})();
