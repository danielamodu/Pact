const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Ensure build dir exists
  const buildDir = path.join(__dirname, '..', 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  console.log("Compiling SessionKeyExecutor.sol...");
  execSync('npx solc --abi --bin --output-dir build contracts/SessionKeyExecutor.sol');
  const execAbiRaw = fs.readFileSync(path.join(buildDir, 'contracts_SessionKeyExecutor_sol_SessionKeyExecutor.abi'), 'utf8');
  const execBinRaw = fs.readFileSync(path.join(buildDir, 'contracts_SessionKeyExecutor_sol_SessionKeyExecutor.bin'), 'utf8');
  fs.writeFileSync(
    path.join(__dirname, '..', 'contracts', 'SessionKeyExecutor.json'),
    JSON.stringify({ abi: JSON.parse(execAbiRaw), bytecode: execBinRaw }, null, 2),
    'utf8'
  );
  console.log("SessionKeyExecutor.json updated.");

  console.log("Compiling PactRegistry.sol...");
  execSync('npx solc --abi --bin --output-dir build contracts/PactRegistry.sol');
  const regAbiRaw = fs.readFileSync(path.join(buildDir, 'contracts_PactRegistry_sol_PactRegistry.abi'), 'utf8');
  const regBinRaw = fs.readFileSync(path.join(buildDir, 'contracts_PactRegistry_sol_PactRegistry.bin'), 'utf8');
  fs.writeFileSync(
    path.join(__dirname, '..', 'contracts', 'PactRegistry.json'),
    JSON.stringify({ abi: JSON.parse(regAbiRaw), bytecode: regBinRaw }, null, 2),
    'utf8'
  );
  console.log("PactRegistry.json created.");
} catch (e) {
  console.error("Compilation failed:", e.message || e);
  process.exit(1);
}
