const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const Token = await hre.ethers.getContractFactory("MyToken");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const deployedAddress = await token.getAddress();

    console.log("MyToken deployed to:", deployedAddress);

    const TokenLock = await hre.ethers.getContractFactory("TokenLock");
    const lockContract = await TokenLock.deploy(deployer.address, deployedAddress);
    await lockContract.waitForDeployment();
    
    const lockAddress = await lockContract.getAddress();
    console.log("TokenLock deployed to:", lockAddress);

    const totalSupply = await token.totalSupply();
    const tx = await token.transfer(lockAddress, totalSupply);
    await tx.wait();
    console.log(`Transferred all ${totalSupply} MyToken to TokenLock at ${lockAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });