const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const drafts = {
  "landing": "ad4b07e5-da16-4e9e-8d1c-30423b42255d",
  "login": "4948bbec-af10-4453-aa50-3183534fe51e",
  "dashboard": "eb84e8e6-b2b6-46f8-a8d8-ed6bf5901101",
  "create_plan": "8e36bd94-cd32-4b9c-ac92-648a561f7aa7",
  "subscribe_landing": "1df3d74e-dc7d-4fa6-adee-e5bdac729716",
  "permission": "9e2951db-c331-43b6-9a9e-c74651b710a5",
  "balance_reveal": "a7352b23-b8d8-420c-ab8e-dc4ddb855fa6",
  "balance_empty": "755cea0a-de73-4793-bd13-983deaee9599",
  "sub_detail": "bf87a15b-cc31-4f57-9c02-7fdd4faf4fb0",
  "settings": "b435020c-3411-4fad-8dbf-11e946ea928e",
  "navbar": "64f7db0f-00d6-46c0-b867-10282865b8be",
  "sub_card": "8dea02f0-9fc0-4e32-be91-903ec2664c0a",
  "plan_card": "6fb34942-df6f-4993-80da-4af3347324b0",
  "footer": "56d37656-4db7-4fb6-8a2e-c22a4e6bb02e"
};

const outputDir = path.join(__dirname, '..', '.superdesign', 'downloads_v2');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (const [name, id] of Object.entries(drafts)) {
  try {
    console.log(`Downloading ${name} (${id})...`);
    execSync(`npx --yes @superdesign/cli@latest get-design --draft-id ${id} --json --output "${path.join(outputDir, `${name}.json`)}"`, { stdio: 'ignore' });
    console.log(`Downloaded ${name}.`);
  } catch (e) {
    console.error(`Error downloading ${name}:`, e.message);
  }
}
