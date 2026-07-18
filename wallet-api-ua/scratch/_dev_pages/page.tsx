"use client";

import { useState } from "react";
import { ethers } from "ethers";
import PactRegistryJson from "@/contracts/PactRegistry.json";

export default function DeployPage() {
  const [status, setStatus] = useState("");
  const [registryAddress, setRegistryAddress] = useState("");
  const [deployTx, setDeployTx] = useState("");
  const [planTx, setPlanTx] = useState("");

  const handleDeploy = async () => {
    try {
      setStatus("Requesting account...");
      if (!window.ethereum) {
        throw new Error("No web3 provider found");
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setStatus(`Connected to ${await signer.getAddress()}. Deploying...`);

      const factory = new ethers.ContractFactory(
        PactRegistryJson.abi,
        PactRegistryJson.bytecode,
        signer
      );

      const contract = await factory.deploy();
      setStatus("Waiting for deployment confirmation...");
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      setRegistryAddress(address);
      const deployTxHash = contract.deploymentTransaction()?.hash || "";
      setDeployTx(deployTxHash);
      setStatus(`PactRegistry deployed at ${address}! Calling createPlan...`);

      // Call createPlan
      const tx = await (contract as any).createPlan(
        "Premium Pro Plan",
        "0x0000000000000000000000000000000000000000", // Native token
        ethers.parseEther("0.01"),
        2592000, // 30 days
        await signer.getAddress()
      );
      setStatus("Waiting for createPlan transaction...");
      await tx.wait();
      setPlanTx(tx.hash);
      setStatus("PactRegistry deployed and createPlan executed successfully on-chain!");
    } catch (e: unknown) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : String(e);
      setStatus(`Error: ${errMsg}`);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>PactRegistry Sepolia Deployer</h1>
      <button onClick={handleDeploy} style={{ padding: "10px 20px", fontSize: 16 }}>
        Deploy to Sepolia
      </button>
      <div style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
        <p><strong>Status:</strong> {status}</p>
        {registryAddress && <p><strong>Registry Address:</strong> {registryAddress}</p>}
        {deployTx && <p><strong>Deployment Tx:</strong> {deployTx}</p>}
        {planTx && <p><strong>createPlan Tx:</strong> {planTx}</p>}
      </div>
    </div>
  );
}
