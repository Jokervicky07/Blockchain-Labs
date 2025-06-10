const hre = require("hardhat");

async function main() {
  const HTLC = await hre.ethers.getContractFactory("HTLC");
  const htlc = await HTLC.deploy();
  await htlc.waitForDeployment();

  const deployedAddress = await htlc.getAddress();
  console.log("HTLC deployed to:", deployedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });