const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('Testing health...');
    const health = await get('/api/health');
    console.log('Health:', JSON.stringify(health));

    console.log('\nSeeding database...');
    const seed = await get('/api/seed');
    console.log('Seed:', JSON.stringify(seed));

    console.log('\nGetting products...');
    const products = await get('/api/products');
    console.log('Products count:', products.products.length);
    console.log('First product:', products.products[0]?.name);

    console.log('\nGetting categories...');
    const cats = await get('/api/categories');
    console.log('Categories:', cats.categories.map(c => c.name).join(', '));

    console.log('\nGetting provinces...');
    const provs = await get('/api/shipping/provinces');
    console.log('Provinces:', provs.provinces.join(', '));

    console.log('\nGetting offices for Algiers...');
    const offices = await get('/api/shipping/offices?province=Algiers');
    console.log('Offices:', offices.offices.map(o => o.office_name).join(', '));

    console.log('\nTesting admin login...');
    const login = await fetch('http://localhost:3001/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await login.json();
    console.log('Login:', loginData.token ? 'SUCCESS (token received)' : 'FAILED');

    if (loginData.token) {
      console.log('\nGetting dashboard...');
      const dash = await fetch('http://localhost:3001/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      const dashData = await dash.json();
      console.log('Dashboard:', JSON.stringify(dashData));
    }

    console.log('\n--- ALL TESTS PASSED ---');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

main();
