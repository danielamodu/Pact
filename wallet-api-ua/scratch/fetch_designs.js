const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const drafts = {
  landing: '0df825a6-1c6c-45d6-adc9-8ecf4645763e',
  login: 'd11b4cfd-434b-4453-9993-0b7001b72988',
  setup: '102cb441-59b3-40bd-83d2-f1d6bb2cef6a',
  permission: 'b3448284-efb5-4d3e-b817-955c96d1d4eb',
  balance: '24f54fb9-f512-480e-9a50-8f46695151d4',
  dashboard: '925deca8-5aeb-4284-be25-1ca1def39392'
};

const outputDir = path.join(__dirname, '..', '.superdesign', 'downloads');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (const [name, id] of Object.entries(drafts)) {
  console.log(`Fetching ${name} (${id})...`);
  try {
    const outputPath = path.join(outputDir, `${name}.json`);
    execSync(`npx --yes @superdesign/cli@latest get-design --draft-id ${id} --json --output "${outputPath}"`, { stdio: 'inherit' });
    console.log(`Saved ${name} successfully.`);
  } catch (e) {
    console.error(`Failed to fetch ${name}:`, e.message);
  }
}
