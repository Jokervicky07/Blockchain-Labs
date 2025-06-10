// scripts/deployERC20.js
const { ethers } = require("hardhat");

async function main() {
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");

  // mint 1 000 000 * 10**18 to deployer
  const supply = ethers.parseUnits("1000000", 18);
  const token  = await ERC20Mock.deploy(supply);
  await token.waitForDeployment();

  console.log("ERC20Mock deployed to:", await token.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });