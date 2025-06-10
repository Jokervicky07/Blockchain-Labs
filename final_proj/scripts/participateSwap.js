// scripts/participateSwap.js
const { ethers } = require("hardhat");

async function main() {
  const bSigner = (await ethers.getSigners())[1];
  // const bSigner = new ethers.Wallet(process.env.SECOND_PRIVATE_KEY, ethers.provider);
  const htlc = await ethers.getContractAt("HTLC", process.env.SEPOLIA_HTLC, bSigner);

  // Same as A's swap ID and hash lock, i.e. the output of createSwap.js 
  const swap_id = process.env.SWAP_ID;      
  const hashLock  = process.env.HASH_LOCK;     
  const latest = await ethers.provider.getBlock("latest");
  const timelock = latest.timestamp + 1 * 3600; // 1 hours from now

  const tx = await htlc.lockETH(swap_id, hashLock, timelock, process.env.A_RECEIVER, {
    value: ethers.parseEther("0.003"),   // 1:3
  });
  console.log("🔒 B locked, tx:", tx.hash);
}


main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });