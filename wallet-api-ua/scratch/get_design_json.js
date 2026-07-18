const { execSync } = require('child_process');

try {
  console.log("Fetching landing page design JSON...");
  const stdout = execSync('npx --yes @superdesign/cli@latest get-design --draft-id ad4b07e5-da16-4e9e-8d1c-30423b42255d --json', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  console.log("Keys in JSON payload:", Object.keys(parsed));
  if (parsed.projectId) {
    console.log("Found Project ID:", parsed.projectId);
  }
  if (parsed.versions && parsed.versions.length > 0) {
    console.log("First version keys:", Object.keys(parsed.versions[0]));
    console.log("First version details:", JSON.stringify(parsed.versions[0], null, 2).slice(0, 2000));
  }
} catch (e) {
  console.error("Failed:", e.message);
}
