const fs = require('fs');

// Parse .env manually
try {
  const env = fs.readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
} catch(e) {}

const apiKey = process.env.OPENFORT_SECRET_KEY;

async function main() {
  console.log("=== Querying Openfort API Directly ===");
  
  // Try sending a POST to create a backend account
  const payload = {
    chainId: 421614
  };

  try {
    const response = await fetch("https://api.openfort.io/v1/accounts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Body:", text);
  } catch(e) {
    console.error("Error:", e.message || e);
  }
}

main().catch(console.error);
