const fs = require('fs');
const zlib = require('zlib');
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

// Intercept https module requests
const https = require('https');
const originalRequest = https.request;
https.request = function(options, callback) {
  const hostname = options.hostname || (options.headers && options.headers.host);
  const path = options.path || options.pathname;
  
  if (hostname && hostname.includes('particle.network')) {
    console.log(`\n[HTTPS REQUEST] to ${hostname}${path}`);
    
    const req = originalRequest.call(this, options, function(res) {
      console.log(`[HTTPS RESPONSE] Status: ${res.statusCode}`);
      console.log(`[HTTPS RESPONSE] Headers:`, JSON.stringify(res.headers, null, 2));
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'];
        let decompressed;
        try {
          if (encoding === 'gzip') {
            decompressed = zlib.gunzipSync(buffer);
          } else if (encoding === 'deflate') {
            decompressed = zlib.inflateSync(buffer);
          } else if (encoding === 'br') {
            decompressed = zlib.brotliDecompressSync(buffer);
          } else {
            decompressed = buffer;
          }
          const text = decompressed.toString('utf8');
          try {
            const parsed = JSON.parse(text);
            console.log(`[HTTPS RESPONSE] Body:`, JSON.stringify(parsed, null, 2));
          } catch(e) {
            console.log(`[HTTPS RESPONSE] Raw Body:`, text);
          }
        } catch (err) {
          console.error('[DECOMPRESS ERROR]', err.message);
        }
      });
      if (callback) callback(res);
    });
    
    const originalWrite = req.write;
    let reqBody = '';
    req.write = function(chunk, encoding, cb) {
      reqBody += chunk.toString();
      return originalWrite.call(this, chunk, encoding, cb);
    };
    
    const originalEnd = req.end;
    req.end = function(chunk, encoding, cb) {
      if (chunk) reqBody += chunk.toString();
      try {
        const parsed = JSON.parse(reqBody);
        console.log(`[HTTPS REQUEST] Body:`, JSON.stringify(parsed, null, 2));
      } catch(e) {
        if (reqBody) console.log(`[HTTPS REQUEST] Raw Body:`, reqBody);
      }
      return originalEnd.call(this, chunk, encoding, cb);
    };
    
    return req;
  }
  
  return originalRequest.apply(this, arguments);
};

const { UniversalAccount } = require('@particle-network/universal-account-sdk');

async function main() {
  const ua = new UniversalAccount({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "8e0b60ba-6c33-4293-bfb8-f33f8d889114",
    projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY || "c27MqU6j4lNYOhOXUsU29A8met2N9KsJli0Ic55u",
    projectAppUuid: process.env.NEXT_PUBLIC_APP_ID || "01bc1045-ed39-44c4-b1f2-ecfa8aff3be4",
    ownerAddress: "0x4F31f7C529bf0cD0846E593fc043c552475A839c",
    smartAccountOptions: {
      name: "BICONOMY",
      version: "2.0.0",
      ownerAddress: "0x4F31f7C529bf0cD0846E593fc043c552475A839c",
      useEIP7702: true
    }
  });

  try {
    await ua.getEIP7702Auth([42161]);
  } catch(e) {
    console.error("SDK Method call threw:", e.message || e);
  }
}

main().catch(console.error);
