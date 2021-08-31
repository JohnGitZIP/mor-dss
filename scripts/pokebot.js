const fs = require('fs')
require('dotenv').config();
/*
const axios = require('axios')
*/
const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

/*
// process

function idle() {
  return new Promise((resolve, reject) => { });
}
*/

function sleep(delay) {
  return new Promise((resolve, reject) => setTimeout(resolve, delay));
}

function abort(e) {
  console.error(e || new Error('Program aborted'));
  process.exit(1);
}

function exit() {
  process.exit(0);
}
/*
function interrupt(f) {
  process.on('SIGINT', f);
  process.on('SIGTERM', f);
  process.on('SIGUSR1', f);
  process.on('SIGUSR2', f);
  process.on('uncaughtException', f);
  process.on('unhandledRejection', f);
}
*/

function entrypoint(main) {
  const args = process.argv;
  (async () => { try { await main(args); } catch (e) { abort(e); } exit(); })();
}

function randomInt(limit) {
  return Math.floor(Math.random() * limit)
}

// conversion

function valid(amount, decimals) {
  const regex = new RegExp(`^\\d+${decimals > 0 ? `(\\.\\d{1,${decimals}})?` : ''}$`);
  return regex.test(amount);
}

function coins(units, decimals) {
  if (!valid(units, 0)) throw new Error('Invalid amount');
  if (decimals == 0) return units;
  const s = units.padStart(1 + decimals, '0');
  return s.slice(0, -decimals) + '.' + s.slice(-decimals);
}

function units(coins, decimals) {
  if (!valid(coins, decimals)) throw new Error('Invalid amount');
  let i = coins.indexOf('.');
  if (i < 0) i = coins.length;
  const s = coins.slice(i + 1);
  return coins.slice(0, i) + s + '0'.repeat(decimals - s.length);
}

// web3

const privateKey = process.env['PRIVATE_KEY'] || '';

/*
const NETWORK_ID = {
  'bscmain': 56,
  'bsctest': 97,
};

const NETWORK_NAME = {
  56: 'bscmain',
  97: 'bsctest',
};

const ADDRESS_URL_PREFIX = {
  'bscmain': 'https://bscscan.com/address/',
  'bsctest': 'https://testnet.bscscan.com/address/',
};

const TX_URL_PREFIX = {
  'bscmain': 'https://bscscan.com/tx/',
  'bsctest': 'https://testnet.bscscan.com/tx/',
};

const NATIVE_SYMBOL = {
  'bscmain': 'BNB',
  'bsctest': 'BNB',
};
*/
const HTTP_PROVIDER_URLS = {
  'bscmain': [
    'https://bsc-dataseed.binance.org/',
    'https://bsc-dataseed1.defibit.io/',
    'https://bsc-dataseed1.ninicoin.io/',
    'https://bsc-dataseed2.defibit.io/',
    'https://bsc-dataseed3.defibit.io/',
    'https://bsc-dataseed4.defibit.io/',
    'https://bsc-dataseed2.ninicoin.io/',
    'https://bsc-dataseed3.ninicoin.io/',
    'https://bsc-dataseed4.ninicoin.io/',
    'https://bsc-dataseed1.binance.org/',
    'https://bsc-dataseed2.binance.org/',
    'https://bsc-dataseed3.binance.org/',
    'https://bsc-dataseed4.binance.org/',
  ],
};

const web3Cache = {};

function getWeb3(privateKey, network) {
  let web3 = web3Cache[network];
  if (!web3) {
    const index = randomInt(HTTP_PROVIDER_URLS[network].length);
    const url = HTTP_PROVIDER_URLS[network][index];
    const options = { transactionConfirmationBlocks: 0 };
    web3 = new Web3(new HDWalletProvider(privateKey, url), null, options);
    web3Cache[network] = web3;
  }
  return web3;
}
/*
// telegram

function escapeHTML(message) {
  return message
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const telegramBotApiKey = process.env['TELEGRAM_BOT_API_KEY'] || '';
const telegramBotChatId = process.env['TELEGRAM_BOT_CHAT_ID'] || '';

let lastTelegramMessage = {};

async function sendTelegramMessage(message, key = '') {
  if (message !== lastTelegramMessage[key]) {
    console.log(new Date().toISOString());
    console.log(message);
    try {
      const url = 'https://api.telegram.org/bot'+ telegramBotApiKey +'/sendMessage';
      await axios.post(url, { chat_id: telegramBotChatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true });
      lastTelegramMessage[key] = message;
    } catch (e) {
      console.error('FAILURE', e.message);
    }
  }
}
*/
// lib

const MCD_VAT = '0x713C28b2Ef6F89750BDf97f7Bbf307f6F949b3fF';
const MCD_SPOT = '0x7C4925D62d24A826F8d945130E620fdC510d0f68';

const VAT_ABI = require('../build/contracts/Vat.json').abi;
const SPOTTER_ABI = require('../build/contracts/Spotter.json').abi;
const PIPLIKE_ABI = require('../build/contracts/PipLike.json').abi;
const UNIV2LPORACLE_ABI = require('../build/contracts/UNIV2LPOracle.json').abi;

const PIP_LIST = {
  'PSM_BUSD': { address: '0x4C4119f8438CC66CE21414dC7d09437954433C78', type: 'value' },
  'BUSD':     { address: '0x08F39c96E6A954894252171a5300dECD350d3fA8', type: 'chainlink' },
  'USDC':     {  address: '0xd4d7BCF6c7b54349C91f39cAd89B228C53FE6BD7', type: 'chainlink' },
  'BNB':       { address: '0x63c2E42758EF8776BF7b70afb00E0e2748Ad3F05', type: 'chainlink' },
  'ETH':       { address: '0x7622ce6588116c1C7F1a4E61A153C1efC7226f78', type: 'chainlink' },
  'BTCB':     { address: '0x585707c57413e09a4BE58e89798f5074b2B89De1', type: 'chainlink' },
  'CAKE':     { address: '0x447FE0cc2145F27127Cf60C6FD6D9025A4208b8B', type: 'chainlink' },
  'BANANA':    { address: '0x6Ee2E2d648698357Cc518D1D5E8170586dca5348', type: 'twap' },
  'MOR':       { address: '0x3Ac5DF5d1a97E66d9a20c90961daaBcf9EC34B06', type: 'twap' },

  'PCSBNBCAKE': { address: '0x326Db2b9640e51077fD9B70767855f5c2128e91A', type: 'univ2lp' },
  'PCSBNBBUSD': { address: '0x1a06452B84456728Ee4054AE6157d3feDF56C295', type: 'univ2lp' },
  'PCSBNBETH': { address: '0x8BBcd7E4da4395E391Fbfc2A11775debe3ca0D58', type: 'univ2lp' },
  'PCSBNBBTCB': { address: '0xcf55226EE56F174B3cB3F75a5182d2300e788e91', type: 'univ2lp' },
  'PCSBUSDUSDC': { address: '0xC5065b47A133071fe8cD94f46950fCfBA53864C6', type: 'univ2lp' },
  'PCSBUSDBTCB': { address: '0x3d4604395595Bb30A8B7754b5dDBF0B3F680564b', type: 'univ2lp' },
  'PCSBUSDCAKE': { address: '0x1e1ee1AcD4B7ad405A0D701884F093d54DF7fba4', type: 'univ2lp' },
  'PCSETHBTCB': { address: '0x58849cE72b4E4338C00f0760Ca6AfCe11b5ee370', type: 'univ2lp' },
  'PCSETHUSDC': { address: '0xc690F38430Db2057C992c3d3190D9902CD7E0294', type: 'univ2lp' },
  'APEMORBUSD': { address: '0x2987bC4DD60A0bC8801ADCE4EdFB1efB6781A984', type: 'univ2lp' },

  'STKCAKE': { address: '0xeE991787C4ffE1de8c8c7c45e3EF14bFc47A2735', type: 'vault' },
  'STKBANANA': { address: '0xE4d5a6E0581646f5a5806F9c171E96879ae8b385', type: 'vault' },

  'STKPCSBNBCAKE': { address: '0x5Df1B3212EB26f506af448cE25cd4E315BEdf630', type: 'vault' },
  'STKPCSBNBBUSD': { address: '0x8a8eA20937BBC38c0952b206892e9A273E7180E1', type: 'vault' },
  'STKPCSBNBETH': { address: '0x0Ca167778392473E0868503522a11f1e749bbF82', type: 'vault' },
  'STKPCSBNBBTCB': { address: '0x7e7C92D432307218b94052488B2CD54D8b826546', type: 'vault' },
  'STKPCSBUSDUSDC': { address: '0x7bA715959A52ef046BE76c4E32f1de1d161E2888', type: 'vault' },
  'STKPCSBUSDBTCB': { address: '0x8652883985B39D85B6432e3Ec5D9bea77edc31b0', type: 'vault' },
  'STKPCSBUSDCAKE': { address: '0xeBcb52E5696A2a90D684C76cDf7095534F265370', type: 'vault' },
  'STKPCSETHBTCB': { address: '0x70AF6F516f9E167620a5bdd970c671c69C81E92F', type: 'vault' },
  'STKPCSETHUSDC': { address: '0x68697fF7Ec17F528E3E4862A1dbE6d7D9cBBd5C6', type: 'vault' },
  'STKAPEMORBUSD': { address: '0x627A13421df5Ff3FdF8f56AF2911c287ad8CbE9f', type: 'vault' },
};

const ILK_LIST = [
  'STKCAKE-A',
  'STKBANANA-A',
  'STKPCSBNBCAKE-A',
  'STKPCSBNBBUSD-A',
  'STKPCSBNBETH-A',
  'STKPCSBNBBTCB-A',
  'STKPCSBUSDUSDC-A',
  'STKPCSBUSDBTCB-A',
  'STKPCSBUSDCAKE-A',
  'STKPCSETHBTCB-A',
  'STKPCSETHUSDC-A',
  'STKAPEMORBUSD-A',
];

/*
const IERC20_ABI = require('../build/contracts/IERC20.json').abi;
const MASTERCHEF_ABI = require('../build/contracts/CustomMasterChef.json').abi;
const STRATEGY_ABI = require('../build/contracts/RewardCompoundingStrategyToken.json').abi;
const COLLECTOR_ADAPTER_ABI = require('../build/contracts/AutoFarmFeeCollectorAdapter.json').abi;
const COLLECTOR_ABI = require('../build/contracts/FeeCollector.json').abi;
const BUYBACK_ABI = require('../build/contracts/Buyback.json').abi;
const UNIVERSAL_BUYBACK_ABI = require('../build/contracts/UniversalBuyback.json').abi;

const MASTERCHEF_ADDRESS = {
  'bscmain': '0x95fABAe2E9Fb0A269cE307550cAC3093A3cdB448',
  'bsctest': '0xF4748df5D63F6AB01e276065E6bD098Ce8dEA98a',
};

function getDefaultAccount(privateKey, network) {
  const web3 = getWeb3(privateKey, network);
  const [account] = web3.currentProvider.getAddresses();
  return account;
}
*/

async function getNonce(privateKey, network) {
  const web3 = getWeb3(privateKey, network);
  const [from] = web3.currentProvider.getAddresses();
  try {
    return await web3.eth.getTransactionCount(from);
  } catch (e) {
    throw new Error(e.message);
  }
}

/*
async function getNativeBalance(privateKey, network, account = null) {
  const web3 = getWeb3(privateKey, network);
  if (account === null) [account] = web3.currentProvider.getAddresses();
  try {
    const amount = await web3.eth.getBalance(account);
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function getTokenBalance(privateKey, network, address, account = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = IERC20_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (account === null) [account] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.balanceOf(account).call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function getTokenSymbol(privateKey, network, address) {
  const web3 = getWeb3(privateKey, network);
  const abi = STRATEGY_ABI;
  const contract = new web3.eth.Contract(abi, address);
  try {
    const symbol = await contract.methods.symbol().call();
    return symbol;
  } catch (e) {
    throw new Error(e.message);
  }
}
*/

async function vat_ilk(privateKey, network, name) {
  const web3 = getWeb3(privateKey, network);
  const abi = VAT_ABI;
  const address = MCD_VAT;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  try {
    const { Art, rate, spot, line, dust } = await contract.methods.ilks(web3.utils.asciiToHex(name)).call({ from });
    return { Art: coins(Art, 18), rate: coins(rate, 27), spot: coins(spot, 27), line: coins(line, 45), dust: coins(line, 45) }
  } catch (e) {
    throw new Error(e.message);
  }
}

async function spot_ilk(privateKey, network, name) {
  const web3 = getWeb3(privateKey, network);
  const abi = SPOTTER_ABI;
  const address = MCD_SPOT;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  try {
    const { pip, mat } = await contract.methods.ilks(web3.utils.asciiToHex(name)).call({ from });
    return { pip, mat: coins(mat, 25) };
  } catch (e) {
    throw new Error(e.message);
  }
}

async function peek(privateKey, network, address) {
  const web3 = getWeb3(privateKey, network);
  const abi = PIPLIKE_ABI;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  try {
    const result = await contract.methods.peek().call({ from });
    const value = coins(web3.utils.hexToNumberString(result[0]), 18);
    const has = result[1];
    return [value, has];
  } catch (e) {
    throw new Error(e.message);
  }
}

async function peep(privateKey, network, address) {
  const web3 = getWeb3(privateKey, network);
  const abi = UNIV2LPORACLE_ABI;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  try {
    const result = await contract.methods.peep().call({ from });
    const value = coins(web3.utils.hexToNumberString(result[0]), 18);
    const has = result[1];
    return [value, has];
  } catch (e) {
    throw new Error(e.message);
  }
}

async function zph(privateKey, network, address) {
  const web3 = getWeb3(privateKey, network);
  const abi = UNIV2LPORACLE_ABI;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  try {
    return await contract.methods.zph().call({ from });
  } catch (e) {
    throw new Error(e.message);
  }
}

async function spot_poke(privateKey, network, name, nonce) {
  const web3 = getWeb3(privateKey, network);
  const abi = SPOTTER_ABI;
  const address = MCD_SPOT;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  let txId = null;
  try {
    const estimatedGas = await contract.methods.poke(web3.utils.asciiToHex(name)).estimateGas({ from, nonce });
    const gas = 2 * estimatedGas;
    await contract.methods.poke(web3.utils.asciiToHex(name)).send({ from, nonce, gas })
      .on('transactionHash', (hash) => {
        txId = hash;
      });
  } catch (e) {
    throw new Error(e.message);
  }
  if (txId === null) throw new Error('Failure reading txId');
  return txId;
}

async function poke(privateKey, network, address, nonce) {
  const web3 = getWeb3(privateKey, network);
  const abi = UNIV2LPORACLE_ABI;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  let txId = null;
  try {
    const estimatedGas = await contract.methods.poke().estimateGas({ from, nonce });
    const gas = 2 * estimatedGas;
    await contract.methods.poke().send({ from, nonce, gas })
      .on('transactionHash', (hash) => {
        txId = hash;
      });
  } catch (e) {
    throw new Error(e.message);
  }
  if (txId === null) throw new Error('Failure reading txId');
  return txId;
}

/*
async function pendingReward(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = STRATEGY_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.pendingReward().call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function performanceFee(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = STRATEGY_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.performanceFee().call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function pendingPerformanceFee(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = STRATEGY_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.pendingPerformanceFee().call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function getCollector(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = STRATEGY_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const collector = await contract.methods.collector().call();
    return collector;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function pendingDeposit(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = COLLECTOR_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.pendingDeposit().call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function getBuyback(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = COLLECTOR_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const buyback = await contract.methods.buyback().call();
    return buyback;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function pendingBuyback(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = BUYBACK_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.pendingBuyback().call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function pendingSource(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = COLLECTOR_ADAPTER_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.pendingSource().call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function pendingTarget(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = COLLECTOR_ADAPTER_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const amount = await contract.methods.pendingTarget().call();
    return amount;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function pendingBurning(privateKey, network, address, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = UNIVERSAL_BUYBACK_ABI;
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const { _burning1, _burning2 } = await contract.methods.pendingBurning().call();
    return [_burning1, _burning2];
  } catch (e) {
    throw new Error(e.message);
  }
}

async function gulp0(privateKey, network, address, nonce) {
  const web3 = getWeb3(privateKey, network);
  const abi = STRATEGY_ABI;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  let txId = null;
  try {
    const estimatedGas = await contract.methods.gulp().estimateGas({ from, nonce });
    const gas = 2 * estimatedGas;
    await contract.methods.gulp().send({ from, nonce, gas })
      .on('transactionHash', (hash) => {
        txId = hash;
      });
  } catch (e) {
    throw new Error(e.message);
  }
  if (txId === null) throw new Error('Failure reading txId');
  return txId;
}

async function gulp1(privateKey, network, address, amount, nonce) {
  const web3 = getWeb3(privateKey, network);
  const abi = COLLECTOR_ADAPTER_ABI;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  let txId = null;
  try {
    const estimatedGas = await contract.methods.gulp(amount).estimateGas({ from, nonce });
    const gas = 2 * estimatedGas;
    await contract.methods.gulp(amount).send({ from, nonce, gas })
      .on('transactionHash', (hash) => {
        txId = hash;
      });
  } catch (e) {
    throw new Error(e.message);
  }
  if (txId === null) throw new Error('Failure reading txId');
  return txId;
}

async function gulp2(privateKey, network, address, amount1, amount2, nonce) {
  const web3 = getWeb3(privateKey, network);
  const abi = UNIVERSAL_BUYBACK_ABI;
  const contract = new web3.eth.Contract(abi, address);
  const [from] = web3.currentProvider.getAddresses();
  let txId = null;
  try {
    const estimatedGas = await contract.methods.gulp(amount1, amount2).estimateGas({ from, nonce });
    const gas = 2 * estimatedGas;
    await contract.methods.gulp(amount1, amount2).send({ from, nonce, gas })
      .on('transactionHash', (hash) => {
        txId = hash;
      });
  } catch (e) {
    throw new Error(e.message);
  }
  if (txId === null) throw new Error('Failure reading txId');
  return txId;
}

async function poolLength(privateKey, network, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = MASTERCHEF_ABI;
  const address = MASTERCHEF_ADDRESS[network];
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const length = await contract.methods.poolLength().call();
    return length;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function poolInfo(privateKey, network, pid, agent = null) {
  const web3 = getWeb3(privateKey, network);
  const abi = MASTERCHEF_ABI;
  const address = MASTERCHEF_ADDRESS[network];
  const contract = new web3.eth.Contract(abi, address);
  if (agent === null) [agent] = web3.currentProvider.getAddresses();
  try {
    const { lpToken } = await contract.methods.poolInfo(pid).call();
    return { lpToken };
  } catch (e) {
    throw new Error(e.message);
  }
}

// app

const ACTIVE_PIDS = [
  5,
  // 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
  33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
  48, 49, 50, 51
];
const MONITORING_INTERVAL = 15; // 15 seconds
/ *
const DEFAULT_GULP_INTERVAL = 12 * 60 * 60; // 12 hours
const GULP_INTERVAL = {
  // 5 - stkCAKE
  '0x84BA65DB2da175051E25F86e2f459C863CBb3E0C': 24 * 60 * 60, // 24 hours

  // 18 - stkBNB/CAKE
  // '0x4291474e88E2fEE6eC5B8c28F4Ed2075cEf5B803': 12 * 60 * 60, // 12 hours
  // 19 - stkBNB/BUSD
  // '0xdC4D358B34619e4fE7feb28bE301B2FBe4F3aFf9': 24 * 60 * 60, // 24 hours
  // 20 - stkBNB/BTCB
  // '0xA561fa603bf0B43Cb0d0911EeccC8B6777d3401B': 24 * 60 * 60, // 24 hours
  // 21 - stkBNB/ETH
  // '0x28e6aa3DD98372Da0959Abe9d0efeB4455d4dFe1': 24 * 60 * 60, // 24 hours
  // 22 - stkBNB/LINK
  // '0x3B88a64D0B9fA485B71c98B00D799aa8D1aEe9E3': 24 * 60 * 60, // 24 hours
  // 23 - stkBNB/UNI
  // '0x515785CE5D5e94f93fe41Ed3fd83779Fb3Aff8A4': 24 * 60 * 60, // 24 hours
  // 24 - stkBNB/DOT
  // '0x53073f685474341cdc765F97E7CFB2F427BD9db9': 24 * 60 * 60, // 24 hours
  // 25 - stkBNB/ADA
  // '0xf5aFfe3459813AB193329E53f17098806709046A': 24 * 60 * 60, // 24 hours
  // 26 - stkBUSD/UST
  // '0x5141da4ab5b3e13ceE7B10980aE6bB848FdB59Cd': 24 * 60 * 60, // 24 hours
  // 27 - stkBUSD/DAI
  // '0x691e486b5F7E39e90d37485164fAbDDd93aE43cD': 24 * 60 * 60, // 24 hours
  // 28 - stkBUSD/USDC
  // '0xae35A19F1DAc62AD3794773D5f0983f05073D0f2': 24 * 60 * 60, // 24 hours

  // 33 - stkBNB/CAKEv2
  '0x86c15Efe94320Cd139eA4875b7ceF336e1F91f16': 36 * 60 * 60, // 36 hours
  // 34 - stkBNB/BUSDv2
  '0xd5ffd8318b1c82FDE321f7BC1a553462A13A2E14': 36 * 60 * 60, // 36 hours
  // 35 - stkBNB/USDTv2
  '0x7259CeBc6D8f84afdce4B81a3a33D53A526521F8': 72 * 60 * 60, // 72 hours
  // 36 - stkBNB/BTCBv2
  '0x074fD0f3289cF3F5E0E80c969F62B21cB38Ad3b5': 72 * 60 * 60, // 72 hours
  // 37 - stkBNB/ETHv2
  '0x15B310c8D9d0Ac9aefB94BF492e7eAbC43B4f93e': 72 * 60 * 60, // 72 hours
  // 38 - stkBUSD/USDTv2
  '0x6f1c4303bC40AEee0aa60dD90e4eeC353487b66f': 72 * 60 * 60, // 72 hours
  // 39 - stkBUSD/VAIv2
  '0xC8daDd57BD9342b7ba9449B952DBE11B4f3D1648': 72 * 60 * 60, // 72 hours
  // 40 - stkBNB/DOTv2
  '0x5C96941B28B824c3E9d01E5cb2D77B3f7801560e': 72 * 60 * 60, // 72 hours
  // 41 - stkBNB/LINKv2
  '0x501382584a3DBF1471918Cd4ee0fd3bE23FfDF29': 72 * 60 * 60, // 72 hours
  // 42 - stkBNB/UNIv2
  '0x0900a05910E7d4811f9FC17843120D6412df2968': 72 * 60 * 60, // 72 hours
  // 43 - stkBNB/DODOv2
  '0x67A4c8d130ED95fFaB9F2CDf001811Ada1077875': 72 * 60 * 60, // 72 hours
  // 44 - stkBNB/ALPHAv2
  '0x6C6d105066462EE9b5Cfc7628e2edB1000e887F1': 72 * 60 * 60, // 72 hours
  // 45 - stkBNB/ADAv2
  '0x73099318dfBB1C59e473322F29C215132A14Ab86': 72 * 60 * 60, // 72 hours
  // 46 - stkBUSD/USTv2
  '0xB2b5dba919Da2E06d6cDd15dF17bA4b99D3eB1bD': 72 * 60 * 60, // 72 hours
  // 47 - stkBUSD/BTCBv2
  '0xf30D01da4257c696e537E2fdF0a2Ce6C9D627352': 72 * 60 * 60, // 72 hours
  // 48 - stkbeltBNBv2
  '0xeC97D2e53e34Aa8E5C6a843D9cd74641E645681A': 48 * 60 * 60, // 48 hours
  // 49 - stkbeltBTCv2
  '0x04abDB55DCd0167BFcE8FA0fA125F102c4734C62': 48 * 60 * 60, // 48 hours
  // 50 - stkbeltETHv2
  '0xE70aA236f2c2dABC346e193F606986Bb843bA3d9': 48 * 60 * 60, // 48 hours
  // 51 - stk4BELTv2
  '0xeB8e1c316694742E7042882be1ac55ebbD2bCEbB': 48 * 60 * 60, // 48 hours

  // - stkBNB/BUSDv2
  '0x4046492479a5bA18c2a947A1db75f4f1ef227BF1': 72 * 60 * 60, // 72 hours
  // - stkBNB/BTCBv2
  '0xc1d3F1dB60DE17afD7770464BAb05c58129d7Ee0': 72 * 60 * 60, // 72 hours
  // - stkBNB/ETHv2
  '0x9C009595F330CA8070e78b889183e7b8a96cB962': 72 * 60 * 60, // 72 hours
  // - stkBNB/CAKEv2
  '0x1f48dCbCE7fC91180492a7b083472924b4e8a44b': 72 * 60 * 60, // 72 hours
  // - stkBUSD/USDCv2
  '0xd802621F65Bd96D76e84E49EecdED49C5acb105d': 72 * 60 * 60, // 72 hours
  // - stkBNB/USDTv2
  '0xE0327dA3f94Efe600569Ca68Aa02e6921FD89Bfa': 72 * 60 * 60, // 27 hours
  // - stkBNB/PANTHERv2
  '0x358582CEeeB0F008495C06206973F5F6e495accd': 24 * 60 * 60, // 24 hours
  // - stkBUSD/PANTHERv2
  '0x1A51686Fb42861AA7E38c1CF8868877F43F82aA4': 24 * 60 * 60, // 24 hours

  // CAKE collector
  '0x14bAc5f216337F8da5f41Bb920514Af98ef62c36': 24 * 60 * 60, // 24 hours
  // AUTO/CAKE collector adapter
  '0x626E98ef225A6f79523C9004E8731B793dfd0F68': 48 * 60 * 60, // 48 hours
  // CAKE buyback
  '0xC351706C3212D45fc24F6B89e686f07fAb048b16': 24 * 60 * 60, // 24 hours

  // PANTHER buyback adapter
  '0x495089390569d47807F1Db83F14e053002DB25b4': 48 * 60 * 60, // 48 hours
  // Universal buyback
  '0x01d1c4eC99D0A7D8f4141D42D1624fffa054D7Ae': 48 * 60 * 60, // 48 hours
};
* /

const strategyCache = {};

async function readStrategy(privateKey, network, pid) {
  if (strategyCache[pid]) return strategyCache[pid];
  const { lpToken: strategy } = await poolInfo(privateKey, network, pid);
  strategyCache[pid] = strategy;
  return strategy;
}

const collectorCache = {};

async function readCollector(privateKey, network, strategy) {
  if (collectorCache[strategy]) return collectorCache[strategy];
  const collector = await getCollector(privateKey, network, strategy);
  collectorCache[strategy] = collector;
  return collector;
}

const buybackCache = {};

async function readBuyback(privateKey, network, collector) {
  if (collectorCache[collector]) return collectorCache[collector];
  const buyback = await getBuyback(privateKey, network, collector);
  collectorCache[collector] = buyback;
  return buyback;
}

*/
let lastPoke;

function readLastPoke() {
  try { lastPoke = JSON.parse(fs.readFileSync('pokebot.json')); } catch (e) { }
}

function writeLastPoke() {
  try { fs.writeFileSync('pokebot.json', JSON.stringify(lastPoke, undefined, 2)); } catch (e) { }
}
/*
async function safeGulp(privateKey, network, address) {
  const now = Date.now();
/ *
  const timestamp = lastGulp[address] || 0;
  const ellapsed = (now - timestamp) / 1000;
  const interval = GULP_INTERVAL[address] || DEFAULT_GULP_INTERVAL;
  if (ellapsed < interval) return null;
* /
  const nonce = await getNonce(privateKey, network);
  try {
    let messages = [address];
    try { const txId = await gulp0(privateKey, network, address, nonce); return txId; } catch (e) { messages.push(e.message); }
    try { const txId = await gulp1(privateKey, network, address, '0', nonce); return txId; } catch (e) { messages.push(e.message); }
    try { const txId = await gulp2(privateKey, network, address, '0', '0', nonce); return txId; } catch (e) { messages.push(e.message); }
    throw new Error(messages.join('\n'));
  } finally {
    lastGulp[address] = now;
    writeLastGulp();
  }
}

async function listContracts(privateKey, network) {
  const length = await poolLength(privateKey, network);
  console.log('pid', 'strategy', 'collector', 'buyback');
  for (let pid = 0; pid < length; pid++) {
    if (!ACTIVE_PIDS.includes(pid)) continue;
    const strategy = await readStrategy(privateKey, network, pid);
    const collector = await readCollector(privateKey, network, strategy);
    const buyback = await readBuyback(privateKey, network, collector);
    console.log(pid, strategy, collector, buyback);
  }
}

async function gulpAll(privateKey, network) {

  {
    // 5 - stkCAKE
    const address = '0x84BA65DB2da175051E25F86e2f459C863CBb3E0C';
    const amount = await pendingReward(privateKey, network, address);
    const MINIMUM_AMOUNT = 50000000000000000000n; // 50 CAKE
    if (BigInt(amount) >= MINIMUM_AMOUNT) {
      const tx = await safeGulp(privateKey, network, address);
      if (tx !== null) {
        const name = await getTokenSymbol(privateKey, network, address);
        return { name, type: 'PancakeStrategy', address, tx };
      }
    }
  }

  {
    // AUTO strategies
    const addresses = [
      // 33 - stkBNB/CAKEv2
      '0x86c15Efe94320Cd139eA4875b7ceF336e1F91f16',
      // 34 - stkBNB/BUSDv2
      '0xd5ffd8318b1c82FDE321f7BC1a553462A13A2E14',
      // 35 - stkBNB/USDTv2
      '0x7259CeBc6D8f84afdce4B81a3a33D53A526521F8',
      // 36 - stkBNB/BTCBv2
      '0x074fD0f3289cF3F5E0E80c969F62B21cB38Ad3b5',
      // 37 - stkBNB/ETHv2
      '0x15B310c8D9d0Ac9aefB94BF492e7eAbC43B4f93e',
      // 38 - stkBUSD/USDTv2
      '0x6f1c4303bC40AEee0aa60dD90e4eeC353487b66f',
      // 39 - stkBUSD/VAIv2
      '0xC8daDd57BD9342b7ba9449B952DBE11B4f3D1648',
      // 40 - stkBNB/DOTv2
      '0x5C96941B28B824c3E9d01E5cb2D77B3f7801560e',
      // 41 - stkBNB/LINKv2
      '0x501382584a3DBF1471918Cd4ee0fd3bE23FfDF29',
      // 42 - stkBNB/UNIv2
      '0x0900a05910E7d4811f9FC17843120D6412df2968',
      // 43 - stkBNB/DODOv2
      '0x67A4c8d130ED95fFaB9F2CDf001811Ada1077875',
      // 44 - stkBNB/ALPHAv2
      '0x6C6d105066462EE9b5Cfc7628e2edB1000e887F1',
      // 45 - stkBNB/ADAv2
      '0x73099318dfBB1C59e473322F29C215132A14Ab86',
      // 46 - stkBUSD/USTv2
      '0xB2b5dba919Da2E06d6cDd15dF17bA4b99D3eB1bD',
      // 47 - stkBUSD/BTCBv2
      '0xf30D01da4257c696e537E2fdF0a2Ce6C9D627352',
      // 48 - stkbeltBNBv2
      '0xeC97D2e53e34Aa8E5C6a843D9cd74641E645681A',
      // 49 - stkbeltBTCv2
      '0x04abDB55DCd0167BFcE8FA0fA125F102c4734C62',
      // 50 - stkbeltETHv2
      '0xE70aA236f2c2dABC346e193F606986Bb843bA3d9',
      // 51 - stk4BELTv2
      '0xeB8e1c316694742E7042882be1ac55ebbD2bCEbB',
    ];
    for (const address of addresses) {
      const fee = await performanceFee(privateKey, network, address);
      const feeAmount = await pendingPerformanceFee(privateKey, network, address);
      const MINIMUM_AMOUNT = 1000000000000000000n; // 1 AUTO
      if (BigInt(feeAmount) * 1000000000000000000n / BigInt(fee) >= MINIMUM_AMOUNT) {
        const tx = await safeGulp(privateKey, network, address);
        if (tx !== null) {
          const name = await getTokenSymbol(privateKey, network, address);
          return { name, type: 'AutoFarmStrategy', address, tx };
        }
      }
    }
  }

/ *
  {
    // PANTHER strategies
    const addresses = [
      // - stkBNB/BUSDv2
      '0x4046492479a5bA18c2a947A1db75f4f1ef227BF1',
      // - stkBNB/BTCBv2
      '0xc1d3F1dB60DE17afD7770464BAb05c58129d7Ee0',
      // - stkBNB/ETHv2
      '0x9C009595F330CA8070e78b889183e7b8a96cB962',
      // - stkBNB/CAKEv2
      '0x1f48dCbCE7fC91180492a7b083472924b4e8a44b',
      // - stkBUSD/USDCv2
      '0xd802621F65Bd96D76e84E49EecdED49C5acb105d',
      // - stkBNB/USDTv2
      '0xE0327dA3f94Efe600569Ca68Aa02e6921FD89Bfa',
      // - stkBNB/PANTHERv2
      '0x358582CEeeB0F008495C06206973F5F6e495accd',
      // - stkBUSD/PANTHERv2
      '0x1A51686Fb42861AA7E38c1CF8868877F43F82aA4',
    ];
    for (const address of addresses) {
      const fee = await performanceFee(privateKey, network, address);
      const feeAmount = await pendingPerformanceFee(privateKey, network, address);
      const MINIMUM_AMOUNT = 6000000000000000000000n; // 6000 PANTHER
      if (BigInt(feeAmount) * 1000000000000000000n / BigInt(fee) >= MINIMUM_AMOUNT) {
        const tx = await safeGulp(privateKey, network, address);
        if (tx !== null) {
          const name = await getTokenSymbol(privateKey, network, address);
          return { name, type: 'PantherStrategy', address, tx };
        }
      }
    }
  }
* /

  {
    // CAKE collector
    const address = '0x14bAc5f216337F8da5f41Bb920514Af98ef62c36';
    const amount = await pendingReward(privateKey, network, address);
    const MINIMUM_AMOUNT = 50000000000000000000n; // 50 CAKE
    if (BigInt(amount) >= MINIMUM_AMOUNT) {
      const tx = await safeGulp(privateKey, network, address);
      if (tx !== null) {
        return { name: 'CAKE', type: 'PancakeCollector', address, tx };
      }
    }
  }

  {
    // AUTO/CAKE collector adapter
    const address = '0x626E98ef225A6f79523C9004E8731B793dfd0F68';
    const amount = await pendingSource(privateKey, network, address);
    const MINIMUM_AMOUNT = 1000000000000000000n; // 1 AUTO
    if (BigInt(amount) >= MINIMUM_AMOUNT) {
      const tx = await safeGulp(privateKey, network, address);
      if (tx !== null) {
        return { name: 'AUTO/CAKE', type: 'AutoFarmCollectorAdapter', address, tx };
      }
    }
  }

/ *
  {
    // PANTHER buyback adapter
    const address = '0x495089390569d47807F1Db83F14e053002DB25b4';
    const amount = await pendingSource(privateKey, network, address);
    const MINIMUM_AMOUNT = 2000000000000000000000n; // 2000 PANTHER
    if (BigInt(amount) >= MINIMUM_AMOUNT) {
      const tx = await safeGulp(privateKey, network, address);
      if (tx !== null) {
        return { name: 'PANTHER/BNB', type: 'PantherBuybackAdapter', address, tx };
      }
    }
  }
* /

  {
    // CAKE buyback
    const address = '0xC351706C3212D45fc24F6B89e686f07fAb048b16';
    const amount = await pendingBuyback(privateKey, network, address);
    const MINIMUM_AMOUNT = 50000000000000000000n; // 50 CAKE
    if (BigInt(amount) >= MINIMUM_AMOUNT) {
      const tx = await safeGulp(privateKey, network, address);
      if (tx !== null) {
        return { name: 'CAKE', type: 'PancakeBuyback', address, tx };
      }
    }
  }

  {
    // universal buyback
    const address = '0x01d1c4eC99D0A7D8f4141D42D1624fffa054D7Ae';
    const amount = await pendingBuyback(privateKey, network, address);
    const MINIMUM_AMOUNT = 1000000000000000000n; // 1 BNB
    if (BigInt(amount) >= MINIMUM_AMOUNT) {
      const tx = await safeGulp(privateKey, network, address);
      if (tx !== null) {
        return { name: 'BNB', type: 'UniversalBuyback', address, tx };
      }
    }
  }

  return false;

/ *
  const length = await poolLength(privateKey, network);

  for (let pid = 0; pid < length; pid++) {
    if (!ACTIVE_PIDS.includes(pid)) continue;
    const strategy = await readStrategy(privateKey, network, pid);
    const [reward, fee] = await Promise.all([
      pendingReward(privateKey, network, strategy),
      pendingPerformanceFee(privateKey, network, strategy),
    ]);
    if (BigInt(reward) > 0n || BigInt(fee) > 0n) {
      const tx = await safeGulp(privateKey, network, strategy);
      if (tx !== null) {
        const symbol = await getTokenSymbol(privateKey, network, strategy);
        return { name: symbol, type: 'Strategy', address: strategy, tx };
      }
    }
  }

  for (let pid = 0; pid < length; pid++) {
    if (!ACTIVE_PIDS.includes(pid)) continue;
    const strategy = await readStrategy(privateKey, network, pid);
    const collector = await readCollector(privateKey, network, strategy);
    let deposit, reward;
    try {
      [deposit, reward] = await Promise.all([
        pendingDeposit(privateKey, network, collector),
        pendingReward(privateKey, network, collector),
      ]);
    } catch {
      try {
        [deposit, reward] = await Promise.all([
          pendingSource(privateKey, network, collector),
          pendingTarget(privateKey, network, collector),
        ]);
      } catch {
        [deposit, reward] = [1, 1];
      }
    }
    if (BigInt(deposit) > 0n || BigInt(reward) > 0n) {
      const tx = await safeGulp(privateKey, network, collector);
      if (tx !== null) {
        const symbol = await getTokenSymbol(privateKey, network, strategy);
        return { name: symbol, type: 'FeeCollector', address: collector, tx };
      }
    }
  }

  for (let pid = 0; pid < length; pid++) {
    if (!ACTIVE_PIDS.includes(pid)) continue;
    const strategy = await readStrategy(privateKey, network, pid);
    const collector = await readCollector(privateKey, network, strategy);
    let buyback;
    try {
      buyback = await readBuyback(privateKey, network, collector);
    } catch {
      continue;
    }
    const [reward] = await Promise.all([
      pendingBuyback(privateKey, network, buyback),
    ]);
    if (BigInt(reward) > 0n) {
      const tx = await safeGulp(privateKey, network, buyback);
      if (tx !== null) {
        const symbol = await getTokenSymbol(privateKey, network, strategy);
        return { name: symbol, type: 'Buyback', address: buyback, tx };
      }
    }
  }

  return false;
* /
}
*/

async function pokeAll(network) {
  const pips = {};

  // poke PIPs
  for (const name in PIP_LIST) {
    const { address, type } = PIP_LIST[name];
    const data = { name, address, type };
    if (type === 'univ2lp') {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = Number(await zph(privateKey, network, address));
      data.wait = timestamp > now ? timestamp - now : 0;
      if (data.wait === 0) {
        if (name === 'PCSETHUSDC') {
          const name = 'BANANA';
          const address = pips[name].address;
          const nonce = await getNonce(privateKey, network);
          console.log('Poking ' + name + ' at nonce ' + nonce + '...');
          await poke(privateKey, network, address, nonce);
          do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
        }
        if (name === 'APEMORBUSD') {
          const name = 'MOR';
          const address = pips[name].address;
          const nonce = await getNonce(privateKey, network);
          console.log('Poking ' + name + ' at nonce ' + nonce + '...');
          await poke(privateKey, network, address, nonce);
          do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
        }
        const nonce = await getNonce(privateKey, network);
        console.log('Poking ' + name + ' at nonce ' + nonce + '...');
        await poke(privateKey, network, address, nonce);
        do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
        const timestamp = Number(await zph(privateKey, network, address));
        data.wait = timestamp > now ? timestamp - now : 0;
      }
      {
        const [price, has] = await peep(privateKey, network, address);
        if (has) data.nextValue = price;
      }
    }
    {
      const [price, has] = await peek(privateKey, network, address);
      if (has) data.value = price;
    }
    pips[name] = data;
    console.log(data);
  }

  // poke spotter ILKs
  for (const name of ILK_LIST) {
    const [token, ilk] = name.split('-');
    const { value } = pips[token];
    if (value !== undefined) {
      const { spot } = await vat_ilk(privateKey, network, name);
      const { mat } = await spot_ilk(privateKey, network, name);
      const calcSpot = (100 * Number(value) / Number(mat)).toFixed(27);
      const deviation = Math.abs((Number(calcSpot) - Number(spot)) / Number(calcSpot)).toFixed(6);
      console.log({ name, value, mat, spot, calcSpot, deviation });
      if (Number(deviation) >= 0.05) { // 5%
        const nonce = await getNonce(privateKey, network);
        console.log('Poking ' + name + ' at nonce ' + nonce + '...');
        await spot_poke(privateKey, network, name, nonce);
        do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
      }
    }
  }
}

async function main(args) {
  const network = 'bscmain';

  const TIMEFRAME = 4 * 60 * 60 * 1000; // 4 hours

  await readLastPoke();

  for (;;) {
    const when = lastPoke + TIMEFRAME;
    const delay = Math.max(when - Date.now(), 0);
    console.log('WAITING ' + Math.floor(delay / 1000) + 's');
    await sleep(delay);

    try {
      await pokeAll(network);
    } catch {
      console.log('ERROR');
      continue;
    }

    lastPoke = Date.now();
    await writeLastPoke();

    console.log('CYCLE COMPLETED');
  }

/*
  let [binary, script, network] = args;
  network = network || 'bscmain';

  // handy to list all contracts
  // await listContracts(privateKey, network);
  // return;

  readLastGulp();

  await sendTelegramMessage('<i>GulpBot (' + network + ') Initiated</i>');

  let interrupted = false;
  interrupt(async (e) => {
    if (!interrupted) {
      interrupted = true;
      console.error('error', e, e instanceof Error ? e.stack : undefined);
      const message = e instanceof Error ? e.message : String(e);
      await sendTelegramMessage('<i>GulpBot (' + network + ') Interrupted (' + escapeHTML(message) + ')</i>');
      exit();
    }
  });
  while (true) {
    await sleep(MONITORING_INTERVAL * 1000);
    const lines = [];
    try {
      const account = getDefaultAccount(privateKey, network);
      const accountUrl = ADDRESS_URL_PREFIX[network] + account;
      const value = await getNativeBalance(privateKey, network);
      const balance = Number(coins(value, 18)).toFixed(4);
      lines.push('<a href="' + accountUrl + '">GulpBot</a>');
      lines.push('<code>' + balance + ' ' + NATIVE_SYMBOL[network] + '</code>');
      const result = await gulpAll(privateKey, network);
      if (result === false) continue;
      const { name, type, address, tx } = result;
      const url = ADDRESS_URL_PREFIX[network] + address;
      const txUrl = TX_URL_PREFIX[network] + tx;
      const txPrefix = tx.substr(0, 6);
      lines.push('<a href="' + url + '">' + type + '</a>.gulp() at <a href="' + txUrl + '">' + txPrefix + '</a> for ' + name);
    } catch (e) {
      console.error('error', e, e instanceof Error ? e.stack : undefined);
      const message = e instanceof Error ? e.message : String(e);
      lines.push('<i>GulpBot (' + network + ') Failure (' + escapeHTML(message) + ')</i>');
    }
    await sendTelegramMessage(lines.join('\n'));
  }
*/


}

entrypoint(main);
