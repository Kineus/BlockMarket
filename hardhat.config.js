require('dotenv').config()
require('@nomicfoundation/hardhat-toolbox')

const { RPC_URL_SEPOLIA, PRIVATE_KEY } = process.env

module.exports = {
  solidity: '0.8.19',
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: undefined,
    },
    celoSepolia: {
      url: process.env.RPC_URL_SEPOLIA || 'https://forno.celo-testnet.org',
      chainId: 11142220,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}
