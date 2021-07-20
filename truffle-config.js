require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const gasLimit = process.env['GAS_LIMIT'];
const gasPrice = process.env['GAS_PRICE'];
const privateKey = process.env['PRIVATE_KEY'];
const ankrProjectId = process.env['ANKR_PROJECT_ID'];
const ankrApikeyBscmain = process.env['ANKR_APIKEY_BSCMAIN'];
const ankrApikeyBsctest = process.env['ANKR_APIKEY_BSCTEST'];
const ankrApikeyMaticmain = process.env['ANKR_APIKEY_MATICMAIN'];
const ankrApikeyMatictest = process.env['ANKR_APIKEY_MATICTEST'];
const infuraProjectId = process.env['INFURA_PROJECT_ID'];

module.exports = {
  compilers: {
    solc: {
      version: '0.6.12',
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks: {
    mainnet: {
      network_id: 1,
      gasPrice,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://mainnet.infura.io/ws/v3/' + infuraProjectId),
      skipDryRun: false,
    },
    ropsten: {
      network_id: 3,
      provider: () => new HDWalletProvider(privateKey, 'wss://ropsten.infura.io/ws/v3/' + infuraProjectId),
      skipDryRun: true,
    },
    rinkeby: {
      network_id: 4,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://rinkeby.infura.io/ws/v3/' + infuraProjectId),
      skipDryRun: true,
    },
    kovan: {
      network_id: 42,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://kovan.infura.io/ws/v3/' + infuraProjectId),
      skipDryRun: true,
    },
    goerli: {
      network_id: 5,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://goerli.infura.io/ws/v3/' + infuraProjectId),
      skipDryRun: true,
    },
    bscmain: {
      network_id: 56,
      gasPrice,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'https://bsc-dataseed.binance.org/'),
      // provider: () => new HDWalletProvider(privateKey, 'https://apis.ankr.com/' + ankrApikeyBscmain + '/' + ankrProjectId + '/binance/full/main'),
      skipDryRun: false,
    },
    bsctest: {
      network_id: 97,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'https://data-seed-prebsc-1-s1.binance.org:8545/'),
      // provider: () => new HDWalletProvider(privateKey, 'https://apis.ankr.com/' + ankrApikeyBsctest + '/' + ankrProjectId + '/binance/full/test'),
      skipDryRun: true,
    },
    maticmain: {
      network_id: 137,
      gasPrice,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://ws-matic-mainnet.chainstacklabs.com/'),
      // provider: () => new HDWalletProvider(privateKey, 'https://polygon-mainnet.infura.io/v3/' + infuraProjectId),
      // provider: () => new HDWalletProvider(privateKey, 'https://apis.ankr.com/' + ankrApikeyMaticmain + '/' + ankrProjectId + '/polygon/full/main'),
      skipDryRun: false,
    },
    matictest: {
      network_id: 80001,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://ws-matic-mumbai.chainstacklabs.com/'),
      // provider: () => new HDWalletProvider(privateKey, 'https://polygon-mumbai.infura.io/v3/' + infuraProjectId),
      // provider: () => new HDWalletProvider(privateKey, 'https://apis.ankr.com/' + ankrApikeyMatictest + '/' + ankrProjectId + '/polygon/full/test'),
      skipDryRun: true,
    },
    development: {
      network_id: '*',
      gas: gasLimit,
      host: 'localhost',
      port: 8545,
      skipDryRun: true,
    },
  },
};
