import fetch from 'node-fetch';

async function testMobileServer() {
  console.log('Testing EduPath Mobile Dev Server...');
  try {
    const res = await fetch('http://localhost:8443/');
    console.log('HTTP Status:', res.status);
    const html = await res.text();
    console.log('HTML Length:', html.length);
    console.log('Contains root element:', html.includes('id="root"'));
    console.log('Contains main.tsx script:', html.includes('src="/src/main.tsx"'));
    console.log('EduPath Native Mobile Web App Shell is serving successfully!');
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testMobileServer();
