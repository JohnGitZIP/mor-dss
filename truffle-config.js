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
      networkCheckTimeout: 10000, // fixes truffle bug
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
      provider: () => new HDWalletProvider(privateKey, 'wss://bsc-ws-node.nariox.org:443'),
      // provider: () => new HDWalletProvider(privateKey, 'wss://apis.ankr.com/wss/' + ankrApikeyBscmain + '/' + ankrProjectId + '/binance/full/main'),
      skipDryRun: false,
    },
    bsctest: {
      network_id: 97,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://apis.ankr.com/wss/' + ankrApikeyBsctest + '/' + ankrProjectId + '/binance/full/test'),
      skipDryRun: true,
    },
    maticmain: {
      network_id: 137,
      gasPrice,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://ws-matic-mainnet.chainstacklabs.com/'),
      // provider: () => new HDWalletProvider(privateKey, 'wss://apis.ankr.com/wss/' + ankrApikeyMaticmain + '/' + ankrProjectId + '/polygon/full/main'),
      skipDryRun: false,
    },
    matictest: {
      network_id: 80001,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://ws-matic-mumbai.chainstacklabs.com/'),
      // provider: () => new HDWalletProvider(privateKey, 'wss://apis.ankr.com/wss/' + ankrApikeyMatictest + '/' + ankrProjectId + '/polygon/full/test'),
      skipDryRun: true,
    },
    avaxmain: {
      network_id: 43114,
      gasPrice,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://api.avax.network/ext/bc/C/ws'),
      skipDryRun: false,
    },
    avaxtest: {
      network_id: 43113,
      networkCheckTimeout: 10000, // fixes truffle bug
      provider: () => new HDWalletProvider(privateKey, 'wss://api.avax-test.network/ext/bc/C/ws'),
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
