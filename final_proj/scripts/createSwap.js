// scripts/createSwap.js   A perform HTLC lock on Zircit chain
const { ethers } = require("hardhat");
const crypto = require("crypto");

async function main() {
  const signer = (await ethers.getSigners())[0];
  const htlc = await ethers.getContractAt("HTLC", process.env.ZIRCUIT_HTLC, signer);

  // 1) random preimage and hashLock
  const preimage = "0x" + crypto.randomBytes(32).toString("hex");
  const hashLock = ethers.keccak256(preimage);

  // 2) random swap ID
  const swap_id = ethers.keccak256(ethers.randomBytes(32));

  // 3) timelock: now + 2 hours
  const latest = await ethers.provider.getBlock("latest");
  const timelock = latest.timestamp + 2 * 3600; // 2 hours from now

  console.log("preimage:", preimage);
  console.log("hashLock:", hashLock);
  console.log("Swap id:", swap_id);

  const tx = await htlc.lockETH(swap_id, hashLock, timelock, process.env.B_RECEIVER, {
    value: ethers.parseEther("0.001"),
  });
  console.log("🔒 Locked, tx:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
