// scripts/sendToken.js
const { ethers } = require("hardhat");

async function main() {
  const tokenAddress = "0x8eA36adf44d973FA4f6EA9fE29fcE6c6350f36F37";
  const recipient = "0xcc4b509c15d63eb0cf43646a9e6217d017331750".toLowerCase(); 
  const amount = ethers.parseUnits("1000000", 18);

  const [signer] = await ethers.getSigners();
  const token = await ethers.getContractAt("IERC20", tokenAddress, signer);

  console.log(`正在轉帳 ${amount.toString()} 個 token 給 ${recipient}...`);

  const tx = await token.transfer(recipient, amount);
  await tx.wait();

  console.log("✅ 轉帳成功！交易 hash:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
