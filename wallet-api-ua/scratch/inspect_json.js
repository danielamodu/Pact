const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', '.superdesign', 'downloads_v2', 'dashboard.json'), 'utf8');
try {
  const parsed = JSON.parse(content);
  console.log("Keys in dashboard.json:", Object.keys(parsed));
  if (parsed.components) {
    console.log("Components keys:", Object.keys(parsed.components));
  }
} catch (e) {
  console.log("Not JSON:", e.message);
  console.log(content.slice(0, 500));
}
