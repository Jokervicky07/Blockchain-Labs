const hre = require("hardhat");


async function main() {
    const [owner, alice, bob] = await hre.ethers.getSigners();
    const tokenLockAddress = "0x11F823fff818935125464abbcC403eAc79Ca1656";
    const lockContract = await hre.ethers.getContractAt("TokenLock", tokenLockAddress, owner);

    console.log(`Interacting with contract at ${tokenLockAddress}`);

    let tx = await lockContract.connect(alice).lock({ value: hre.ethers.parseEther("0.0001") });
    await tx.wait();
    console.log("Alice locked 1 ETH, tx hash:", tx.hash);

    //
    await hre.ethers.provider.send("evm_increaseTime", [40]);  // 
    await hre.ethers.provider.send("evm_mine", []);  // 

    // 
    tx = await lockContract.connect(alice).unlock();
    await tx.wait();
    console.log("Alice unlocked, tx hash:", tx.hash);

    // 
    tx = await lockContract.connect(bob).lock({ value: hre.ethers.parseEther("0.0002") });
    await tx.wait();
    console.log("Bob locked 2 ETH, tx hash:", tx.hash);

    // 
    tx = await lockContract.connect(owner).tradeUserFunds(bob.address);
    await tx.wait();
    console.log("Owner traded Bob's funds, tx hash:", tx.hash);

    // 
    await hre.ethers.provider.send("evm_increaseTime", [40]);  // 
    await hre.ethers.provider.send("evm_mine", []);

    // 
    tx = await lockContract.connect(bob).unlock();
    await tx.wait();
    console.log("Bob unlocked, tx hash:", tx.hash);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
