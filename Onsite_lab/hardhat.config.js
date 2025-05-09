require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */

const { PRIVATE_KEY } = process.env;

module.exports = {
    solidity: {
      version:"0.8.28",
      settings: {
        evmVersion: "cancun",
      }
    },
    networks: {
        Zircuit_Garfield_Testnet: {
            url: "https://garfield-testnet.zircuit.com",
            chainId: 48898,
            accounts: [`0x${PRIVATE_KEY}`] // Add private key 
        }
    },

    sourcify: {
      enabled: true,
      apiUrl: 'https://sourcify.dev/server',
      browserUrl: 'https://repo.sourcify.dev',
    },

    etherscan: {
      apiKey: "",  
      customChains: [] 
    }
};

