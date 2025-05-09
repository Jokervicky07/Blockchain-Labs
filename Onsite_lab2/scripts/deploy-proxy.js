const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ProxyMock with account:", deployer.address);

  // ProxyMock contract factory
  const ProxyMock = await hre.ethers.getContractFactory("ProxyMock");
  // deploy ProxyMock
  const proxy = await ProxyMock.deploy();
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  console.log("ProxyMock deployed to:", proxyAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });