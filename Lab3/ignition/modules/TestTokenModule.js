const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TestTokenModule", (m) => {
  const testToken = m.contract("TestToken");

  return { testToken };
});
