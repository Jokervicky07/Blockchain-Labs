const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("HTLC basic flow", () => {
  let htlc, token, deployer, alice, bob;

  /* helpers ---------------------------------------------------------- */
  const rand32   = () => ethers.hexlify(ethers.randomBytes(32));
  const tsPlus   = async (s) => (await ethers.provider.getBlock("latest")).timestamp + s;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    /* ERC-20 mock */
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    /* HTLC */
    const HTLC = await ethers.getContractFactory("HTLC");
    htlc = await HTLC.deploy();
    await htlc.waitForDeployment();
  });

  it("ETH: lock → withdraw", async () => {
    const S      = rand32();
    const H      = ethers.keccak256(S);
    const swapId = ethers.id("eth-swap");

    /* Alice locks 1 ETH for Bob */
    await htlc.connect(alice).lockETH(
      swapId, H, await tsPlus(3600), bob.address,
      { value: ethers.parseEther("1") }
    );

    /* Bob withdraws */
    const balBefore = await ethers.provider.getBalance(bob.address);
    const tx        = await htlc.connect(bob).withdraw(swapId, S);
    const rcpt      = await tx.wait();
    const gasSpent  = rcpt.gasUsed * tx.gasPrice;         // BigInt × BigInt

    const balAfter  = await ethers.provider.getBalance(bob.address);

    expect(balAfter - balBefore + gasSpent)
      .to.equal(ethers.parseEther("1"));                  // Bob received full 1 ETH
  });

  it("ERC-20: lock → refund", async () => {
    const S      = rand32();
    const H      = ethers.keccak256(S);
    const swapId = ethers.id("erc-swap");
    const amt    = ethers.parseUnits("1000", 18);

    /* Give Alice tokens she can lock */
    await token.transfer(alice.address, amt);

    
    await token.transfer(htlc.target, amt);
    

    /* Approve & lock */
    await token.connect(alice).approve(htlc.target, amt);
    await htlc.connect(alice).lockERC20(
      swapId, H, await tsPlus(5), bob.address, token.target, amt
    );

    /* jump 6 s so timelock expires */
    await ethers.provider.send("evm_increaseTime", [6]);
    await ethers.provider.send("evm_mine");

    /* Alice refunds */
    await expect(htlc.connect(alice).refund(swapId))
      .to.emit(htlc, "Refunded").withArgs(swapId);

    expect(await token.balanceOf(alice.address)).to.be.gte(amt);
  });

  it("rescueERC20 returns excess tokens", async () => {
    const extra = ethers.parseUnits("777", 18);
    await token.transfer(htlc.target, extra);

    const balBefore = await token.balanceOf(deployer.address);
    await htlc.connect(deployer).rescueERC20(token.target, deployer.address);
    const balAfter  = await token.balanceOf(deployer.address);

    expect(balAfter - balBefore).to.equal(extra);
  });
});
