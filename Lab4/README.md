# DonationVault

A super basic ERC20-based vault smart contract with full test coverage and security risk demonstration.

## 🧰 Features

- Users can deposit ERC20 tokens into the vault and receive shares.
- Users can withdraw tokens by redeeming shares.
- The vault keeps track of share prices in proportion to token balances.
- The contract owner can withdraw funds from the vault using `takeFeeAsOwner()`.

## 🚀 How to Run

```bash
npm install
npx hardhat compile
npx hardhat test
```

## 📁 Project Structure

```
contracts/
  ├── DonationVault.sol     # Vault contract
  └── MockERC20.sol         # Test token
test/
  └── DonationVault.test.js # Test suite
```

## ✅ Unit Tests Summary

- ✔ Exposes `underlyingToken` correctly.
- ✔ Users can deposit and receive shares.
- ✔ Users can withdraw and burn shares.
- ✔ Only the owner can use `takeFeeAsOwner`.
- ✔ Fails if vault has no token when calling `takeFeeAsOwner`.
- ✔ Allows the owner to drain all funds via `takeFeeAsOwner`, breaking trust.
- ✔ Demonstrates the inflation attack.

## 🛡️ Security Analysis

### 🔥 `takeFeeAsOwner()` Risk

This function allows the contract owner to withdraw any amount of tokens from the vault at will. This undermines user trust because:

- Owner can drain all tokens.
- Users holding shares will not be able to redeem if funds are gone.
- This is confirmed in the test case `should allow owner to steal all funds via takeFeeAsOwner`.

### 💣 Inflation Attack

- An attacker sends tokens directly into the vault before any `deposit()` call.
- A legitimate user then deposits and receives very few shares due to diluted share price.
- The attacker can then `deposit()` a tiny amount at a cheap rate and `withdraw()` more than they should, effectively stealing value.
- Demonstrated in `should demonstrate inflation attack when vault is empty`.

## 🧪 Key Test Case Demonstrations

### takeFeeAsOwner risk
```js
await vault.connect(owner).takeFeeAsOwner(depositAmount);
// All user tokens are drained
await expect(
  vault.connect(user).withdraw(userShares)
).to.be.reverted;
```

### Inflation attack
```js
await token.connect(attacker).transfer(vault.address, "1"); // Sneaky transfer
await vault.connect(user).deposit("100"); // User gets tiny shares
await vault.connect(attacker).deposit("0.000000000000001");
await vault.connect(attacker).withdraw(...); // Steals user's value
```
