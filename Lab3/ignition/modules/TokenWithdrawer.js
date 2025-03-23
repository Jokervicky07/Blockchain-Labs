// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");



module.exports = buildModule("TokenWithdrawer", (m) => {
  const factory = m.contract("TokenWithdrawerFactory");
  const owner = "0x9Ab5DF890A6757a6Bb50E7c717a92c2fc81DAF05";
  const salt = m.getParameter("salt", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

  const deployedAddress = m.call(factory, "deploy", [owner, salt]);

  return {factory, deployedAddress};
});
