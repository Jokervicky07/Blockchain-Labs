// scripts/claim.js   (A 在 Base 链执行)
const { ethers } = require("hardhat");
async function main() {
  const aSigner = (await ethers.getSigners())[0];
  const htlc = await ethers.getContractAt("HTLC", process.env.SEPOLIA_HTLC, aSigner);
  const tx = await htlc.withdraw(process.env.SWAP_ID, process.env.PREIMAGE);
  console.log("✅ Claimed on Sepolia:", tx.hash);
}



main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });