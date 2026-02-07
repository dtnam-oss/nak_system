const https = require('https');

function testAPI(path) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000${path}`;
    console.log(`\nTesting: ${url}\n`);
    
    const req = require('http').get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('Status:', res.statusCode);
          console.log('Success:', json.success);
          console.log('Count:', json.count);
          if (json.data && json.data.length > 0) {
            console.log('\nFirst record:');
            console.log(JSON.stringify(json.data[0], null, 2));
          }
          resolve();
        } catch (e) {
          console.error('Failed to parse JSON:', e.message);
          console.log('Raw response:', data.substring(0, 200));
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('Request failed:', e.message);
      resolve();
    });
    
    req.end();
  });
}

async function main() {
  await testAPI('/api/fuel/imports?limit=2');
  await testAPI('/api/fuel/transactions?limit=2');
  process.exit(0);
}

main();
