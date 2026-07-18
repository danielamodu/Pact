console.log(Object.keys(process.env).filter(k => k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('private') || k.toLowerCase().includes('wallet') || k.toLowerCase().includes('sepolia')));
if (process.env.PRIVATE_KEY) {
  console.log("PRIVATE_KEY exists in env");
}
