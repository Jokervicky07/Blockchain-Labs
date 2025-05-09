const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // deploy contract
  const FlashMint = await hre.ethers.getContractFactory("OnsiteFlashMint");
  const flashMint = await FlashMint.deploy();
  // wait for deployment
  await flashMint.waitForDeployment();
  
  const deployedAddress = await flashMint.getAddress();
  console.log("OnsiteFlashMint deployed to:", deployedAddress);
  }

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
