const http = require('http');

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function main() {
  console.log("=== Testing x402 End-to-End Flow ===");

  // 1. Request plan-health insights without signature (expect 402)
  console.log("\nStep 1: Requesting protected insights without signature...");
  const res1 = await request('http://127.0.0.1:3000/api/insights/plan-health', {
    method: 'GET'
  });
  console.log("Response status (expected 402):", res1.status);
  console.log("Response body:", JSON.stringify(res1.body, null, 2));
  console.log("PAYMENT-REQUIRED header:", res1.headers['payment-required'] ? "PRESENT" : "MISSING");

  if (res1.status !== 402) {
    throw new Error(`Expected 402, got ${res1.status}`);
  }

  // 2. Request backend wallet to sign a payment (call pay-signature endpoint)
  console.log("\nStep 2: Requesting payment signature from backend...");
  const res2 = await request('http://127.0.0.1:3000/api/insights/plan-health/pay-signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  console.log("Response status:", res2.status);
  console.log("Response body:", JSON.stringify(res2.body, null, 2));

  if (res2.status !== 200 || !res2.body.success) {
    throw new Error(`Failed to generate signature: ${JSON.stringify(res2.body)}`);
  }

  const paymentHeader = res2.body.paymentHeader;

  // 3. Request insights again with the valid payment signature
  console.log("\nStep 3: Requesting protected insights with valid signature...");
  const res3 = await request('http://127.0.0.1:3000/api/insights/plan-health', {
    method: 'GET',
    headers: {
      'payment-signature': paymentHeader
    }
  });

  console.log("Response status (expected 200):", res3.status);
  console.log("Response body:", JSON.stringify(res3.body, null, 2));
  console.log("PAYMENT-RESPONSE header:", res3.headers['payment-response']);

  if (res3.status !== 200) {
    throw new Error(`Expected 200, got ${res3.status}`);
  }

  console.log("\nSUCCESS! x402 End-to-End flow verified successfully!");
}

main().catch(console.error);
