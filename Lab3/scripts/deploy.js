// deploy.js - Hardhat 部署脚本示例

const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  // 1. 部署 TokenWithdrawerFactory
  const Factory = await ethers.getContractFactory("TokenWithdrawerFactory");
  const factory = await Factory.deploy();
  await factory.deployed();
  console.log("TokenWithdrawerFactory deployed to:", factory.address);

  // 2. 指定 owner 地址和 salt
  const owner = "0xYourOwnerAddressHere"; // <-- 替換為你的 owner 地址
  const salt = ethers.utils.formatBytes32String("custom_salt");

  // 3. 預計算地址
  const computedAddress = await factory.computeAddress(owner, salt);
  console.log("預計算部署地址:", computedAddress);

  // 4. 向預計算地址發送 ERC20 代幣 (這部分要用 ethers.js 單獨調用發送代幣交易)
  // 例如：await tokenContract.transfer(computedAddress, amount);

  // 5. 部署 TokenWithdrawer 合約到預計算地址
  const deployTx = await factory.deploy(owner, salt);
  await deployTx.wait();
  console.log("合約已部署至:", computedAddress);

  // 6. 可以通過 ethers.js 和 computedAddress 互動提取代幣
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
