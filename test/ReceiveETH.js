const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReceiveETH Contract", function () {
    let contract, owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("ReceiveETH");
        contract = await Contract.deploy();
    });

    it("should set the owner correctly", async function () {
        expect(await contract.owner()).to.equal(owner.address);
    });

    it("should accept ETH and emit an event", async function () {
        const sendValue = ethers.parseEther("1");

        await expect(
            owner.sendTransaction({
                to: contract.target,
                value: sendValue,
            })
        ).to.emit(contract, "Received")
        .withArgs(owner.address, sendValue);

        expect(await ethers.provider.getBalance(contract.target)).to.equal(sendValue);
    });

    it("should allow only the owner to withdraw funds", async function () {
        const sendValue = ethers.parseEther("1");
        await owner.sendTransaction({ to: contract.target, value: sendValue });

        await expect(contract.connect(addr1).withdraw()).to.be.revertedWith("Not authorized");

        await expect(contract.withdraw())
            .to.emit(contract, "Withdrawn")
            .withArgs(owner.address, sendValue);
        
        expect(await ethers.provider.getBalance(contract.target)).to.equal(0);
    });

    it("should not withdraw if balance is zero", async function () {
        await expect(contract.withdraw()).to.be.revertedWith("No funds to withdraw");
    });
});
