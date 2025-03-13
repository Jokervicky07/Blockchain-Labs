const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenLock Contract", function () {
    let Token, token, TokenLock, lockContract, owner, alice, bob;

    beforeEach(async function () {
        [owner, alice, bob] = await ethers.getSigners();

        Token = await ethers.getContractFactory("MyToken");
        token = await Token.deploy();
        await token.waitForDeployment();

        TokenLock = await ethers.getContractFactory("TokenLock");
        lockContract = await TokenLock.deploy(owner.address, await token.getAddress());
        await lockContract.waitForDeployment();

        await token.transfer(await lockContract.getAddress(), ethers.parseUnits("1000000", 18));
    });

    it("Should set startTime and endTime correctly", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 100;
      const endTime = startTime + 200;

      await lockContract.setStartTime(startTime);
      await lockContract.setEndTime(endTime);
        
      expect(await lockContract.startTime()).to.be.gt(0);
      expect(await lockContract.endTime()).to.be.gt(await lockContract.startTime());
    });

    it("Alice should lock ETH", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 100;
      const endTime = startTime + 200;

      await lockContract.setStartTime(startTime);
      await lockContract.setEndTime(endTime);

      await expect(
        lockContract.connect(alice).lock({ value: ethers.parseEther("1") })
      ).to.emit(lockContract, "Lock").withArgs(alice.address, ethers.parseEther("1"));

      expect(await lockContract.deposits(alice.address)).to.equal(ethers.parseEther("1"));
    });

    it("Alice should unlock and receive ETH + reward", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 10;
      const endTime = startTime + 20;

      await lockContract.setStartTime(startTime);
      await lockContract.setEndTime(endTime);

      await lockContract.connect(alice).lock({ value: ethers.parseEther("1") });
      
      await ethers.provider.send("evm_increaseTime", [40]); // Fast forward 100 seconds
      await ethers.provider.send("evm_mine", []); // Mine a block

      await expect(lockContract.connect(alice).unlock())
        .to.emit(lockContract, "Unlock")
        .withArgs(alice.address, ethers.parseEther("1"), ethers.parseUnits("1000", 18));
    });

    it("Bob locks ETH, owner trades Bob's funds, Bob only receives reward", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 10;
      const endTime = startTime + 20;

      await lockContract.setStartTime(startTime);
      await lockContract.setEndTime(endTime);

      await lockContract.connect(bob).lock({ value: ethers.parseEther("2") });

      await lockContract.tradeUserFunds(bob.address);

      await ethers.provider.send("evm_increaseTime", [100]); // Fast forward 100 seconds
      await ethers.provider.send("evm_mine", []); // Mine a block

      await expect(lockContract.connect(bob).unlock())
        .to.emit(lockContract, "Unlock")
        .withArgs(bob.address, ethers.parseEther("2"), ethers.parseUnits("6000", 18));
    });
});
