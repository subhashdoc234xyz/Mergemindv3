const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=[\"']?([^\"'\r\n]+)[\"']?/);
const key = keyMatch ? keyMatch[1] : '';
if (!key) { console.log('no key'); process.exit(1); }
https.get('https://generativelanguage.googleapis.com/v1beta/models?key=' + key, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const models = JSON.parse(data).models;
    if (models) {
      console.log(models.filter(m => m.name.includes('gemini')).map(m => m.name).join('\n'));
    } else {
      console.log(data);
    }
  });
});
