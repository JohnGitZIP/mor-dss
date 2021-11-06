const fs = require('fs')
require('dotenv').config();
const axios = require('axios');
const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

// process

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

function interrupt(f) {
  process.on('SIGINT', f);
  process.on('SIGTERM', f);
  process.on('SIGUSR1', f);
  process.on('SIGUSR2', f);
  process.on('uncaughtException', f);
  process.on('unhandledRejection', f);
}

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

const ADDRESS_URL_PREFIX = {
  'bscmain': 'https://bscscan.com/address/',
  'avaxmain': 'https://snowtrace.io/address/',
};

const TX_URL_PREFIX = {
  'bscmain': 'https://bscscan.com/tx/',
  'avaxmain': 'https://snowtrace.io/tx/',
};

const NATIVE_SYMBOL = {
  'bscmain': 'BNB',
  'bscmain': 'AVAX',
};

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
  'avaxmain': [
    'https://api.avax.network/ext/bc/C/rpc',
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

// lib

const MCD_VAT = '0x713C28b2Ef6F89750BDf97f7Bbf307f6F949b3fF';
const MCD_SPOT = '0x7C4925D62d24A826F8d945130E620fdC510d0f68';

const VAT_ABI = require('../build/contracts/Vat.json').abi;
const SPOTTER_ABI = require('../build/contracts/Spotter.json').abi;
const PIPLIKE_ABI = require('../build/contracts/PipLike.json').abi;
const UNIV2LPORACLE_ABI = require('../build/contracts/UNIV2LPOracle.json').abi;

const PIP_LIST = {
  'bscmain': {
    'PSM_BUSD': { address: '0x4C4119f8438CC66CE21414dC7d09437954433C78', type: 'value' },

    'BUSD': { address: '0x08F39c96E6A954894252171a5300dECD350d3fA8', type: 'chainlink' },
    'USDC': {  address: '0xd4d7BCF6c7b54349C91f39cAd89B228C53FE6BD7', type: 'chainlink' },
    'BNB': { address: '0x63c2E42758EF8776BF7b70afb00E0e2748Ad3F05', type: 'chainlink' },
    'ETH': { address: '0x7622ce6588116c1C7F1a4E61A153C1efC7226f78', type: 'chainlink' },
    'BTCB': { address: '0x585707c57413e09a4BE58e89798f5074b2B89De1', type: 'chainlink' },
    'CAKE': { address: '0x447FE0cc2145F27127Cf60C6FD6D9025A4208b8B', type: 'chainlink' },
    'BANANA': { address: '0x6Ee2E2d648698357Cc518D1D5E8170586dca5348', type: 'twap' },
    'MOR': { address: '0x3Ac5DF5d1a97E66d9a20c90961daaBcf9EC34B06', type: 'twap' },

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
  },

  'avaxmain': {
    'PSM_STKUSDC': { address: '0x68697fF7Ec17F528E3E4862A1dbE6d7D9cBBd5C6', type: 'value' },

    'AVAX': { address: '0xd4d7BCF6c7b54349C91f39cAd89B228C53FE6BD7', type: 'chainlink' },
    'WETH': { address: '0x63c2E42758EF8776BF7b70afb00E0e2748Ad3F05', type: 'chainlink' },
    'WBTC': { address: '0x7622ce6588116c1C7F1a4E61A153C1efC7226f78', type: 'chainlink' },
    'DAI': { address: '0x585707c57413e09a4BE58e89798f5074b2B89De1', type: 'chainlink' },
    'USDC': { address: '0x447FE0cc2145F27127Cf60C6FD6D9025A4208b8B', type: 'chainlink' },
    'USDT': { address: '0x6Ee2E2d648698357Cc518D1D5E8170586dca5348', type: 'chainlink' },
    'LINK': { address: '0x326Db2b9640e51077fD9B70767855f5c2128e91A', type: 'chainlink' },
    'MIM': { address: '0x1B87083Af792cB8355C4c954c491255482992E79', type: 'chainlink' },
    'JOE': { address: '0x1a06452B84456728Ee4054AE6157d3feDF56C295', type: 'twap' },

    'XJOE': { address: '0xF49390eE384C5df2e82ac99909a6236051a4E82B', type: 'xsushi' },
    'JAVAX': { address: '0x8BBcd7E4da4395E391Fbfc2A11775debe3ca0D58', type: 'comp' },
    'JWETH': { address: '0xAB47baC3C131eD3ac9d8F993fD2D902cad460c0f', type: 'comp' },
    'JWBTC': { address: '0xcf55226EE56F174B3cB3F75a5182d2300e788e91', type: 'comp' },
    'JLINK': { address: '0xB31fF116f5fEC1C0Aee2Aa86d5E78e3105CC4274', type: 'comp' },

    'TDJAVAXJOE': { address: '0xC5065b47A133071fe8cD94f46950fCfBA53864C6', type: 'univ2lp' },
    'TDJAVAXWETH': { address: '0x3d4604395595Bb30A8B7754b5dDBF0B3F680564b', type: 'univ2lp' },
    'TDJAVAXWBTC': { address: '0x1e1ee1AcD4B7ad405A0D701884F093d54DF7fba4', type: 'univ2lp' },
    'TDJAVAXDAI': { address: '0x58849cE72b4E4338C00f0760Ca6AfCe11b5ee370', type: 'univ2lp' },
    'TDJAVAXUSDC': { address: '0xc690F38430Db2057C992c3d3190D9902CD7E0294', type: 'univ2lp' },
    'TDJAVAXUSDT': { address: '0xeE991787C4ffE1de8c8c7c45e3EF14bFc47A2735', type: 'univ2lp' },
    'TDJAVAXLINK': { address: '0x5Df1B3212EB26f506af448cE25cd4E315BEdf630', type: 'univ2lp' },
    'TDJAVAXMIM': { address: '0x0Ca167778392473E0868503522a11f1e749bbF82', type: 'univ2lp' },
    'TDJUSDCJOE': { address: '0x7bA715959A52ef046BE76c4E32f1de1d161E2888', type: 'univ2lp' },
    'TDJUSDTJOE': { address: '0xeBcb52E5696A2a90D684C76cDf7095534F265370', type: 'univ2lp' },

    'STKXJOE': { address: '0xf72f07b96D4Ee64d1065951cAfac032B63C767bb', type: 'vault' },
    'STKJAVAX': { address: '0xeeF286Af1d7601EA5E40473741D79e55770498d8', type: 'vault' },
    'STKJWETH': { address: '0xa9b68E3E65966B1C08cfa6002E8527E091e5664e', type: 'vault' },
    'STKJWBTC': { address: '0x5ef900FD5aACd6CFe994b2E13c3d4aBDD9fFea2b', type: 'vault' },
    'STKJLINK': { address: '0x3728Bd61F582dA0b22cFe7EDC59aC33f7402c4e0', type: 'vault' },

    'STKTDJAVAXJOE': { address: '0xca70528209917F4D0443Dd3e90C863b19584CCAF', type: 'vault' },
    'STKTDJAVAXWETH': { address: '0x352C748Ff550Eec6355e37Ee62459210909709DD', type: 'vault' },
    'STKTDJAVAXWBTC': { address: '0x260e6061233A3F05213a54103A9F0460857f9E9c', type: 'vault' },
    'STKTDJAVAXDAI': { address: '0x9605863bf02E983861C0a4ac28a7527Fcf36732b', type: 'vault' },
    'STKTDJAVAXUSDC': { address: '0x2117C852417B008d18E292D18ab196f49AA896cf', type: 'vault' },
    'STKTDJAVAXUSDT': { address: '0x6B61e028199BCC4760fD9CC5DEfC7430d977FC08', type: 'vault' },
    'STKTDJAVAXLINK': { address: '0x4A1dB63A8240A030C7E8678c594711D139a1c39f', type: 'vault' },
    'STKTDJAVAXMIM': { address: '0x842B07b7D9C77A6bE833a660FB628C6d28Bda0a8', type: 'vault' },
    'STKTDJUSDCJOE': { address: '0x7253bC2Ca443807391451a54cAF1bC1915A8b584', type: 'vault' },
    'STKTDJUSDTJOE': { address: '0xed219cD2aF00625e0c1aD21b7cC7aa0f77601860', type: 'vault' },
  },
};

const ILK_LIST = {
  'bscmain': [
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
  ],

  'avaxmain': [
    'STKXJOE-A',
    'STKJAVAX-A',
    'STKJWETH-A',
    'STKJWBTC-A',
    'STKJLINK-A',
    'STKTDJAVAXJOE-A',
    'STKTDJAVAXWETH-A',
    'STKTDJAVAXWBTC-A',
    'STKTDJAVAXDAI-A',
    'STKTDJAVAXUSDC-A',
    'STKTDJAVAXUSDT-A',
    'STKTDJAVAXLINK-A',
    'STKTDJAVAXMIM-A',
    'STKTDJUSDCJOE-A',
    'STKTDJUSDTJOE-A',
  ],
};

function getDefaultAccount(privateKey, network) {
  const web3 = getWeb3(privateKey, network);
  const [account] = web3.currentProvider.getAddresses();
  return account;
}

async function getNonce(privateKey, network) {
  const web3 = getWeb3(privateKey, network);
  const [from] = web3.currentProvider.getAddresses();
  try {
    return await web3.eth.getTransactionCount(from);
  } catch (e) {
    throw new Error(e.message);
  }
}

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

let lastPoke;

function readLastPoke() {
  try { lastPoke = JSON.parse(fs.readFileSync('pokebot.json')); } catch (e) { }
}

function writeLastPoke() {
  try { fs.writeFileSync('pokebot.json', JSON.stringify(lastPoke, undefined, 2)); } catch (e) { }
}

async function pokeAll(network, lines = []) {
  const pips = {};

  function log(name, type, address, tx) {
    const url = ADDRESS_URL_PREFIX[network] + address;
    const txUrl = TX_URL_PREFIX[network] + tx;
    const txPrefix = tx.substr(0, 6);
    lines.push('<a href="' + url + '">' + type + '</a>.poke() at <a href="' + txUrl + '">' + txPrefix + '</a> for ' + name);
  }

  // poke PIPs
  for (const name in PIP_LIST[network]) {
    const { address, type } = PIP_LIST[network][name];
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
          const tx = await poke(privateKey, network, address, nonce);
          do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
          log(name, 'twap', address, tx);
        }
        if (name === 'APEMORBUSD') {
          const name = 'MOR';
          const address = pips[name].address;
          const nonce = await getNonce(privateKey, network);
          console.log('Poking ' + name + ' at nonce ' + nonce + '...');
          const tx = await poke(privateKey, network, address, nonce);
          do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
          log(name, 'twap', address, tx);
        }
        if (name === 'TDJUSDTJOE') {
          const name = 'JOE';
          const address = pips[name].address;
          const nonce = await getNonce(privateKey, network);
          console.log('Poking ' + name + ' at nonce ' + nonce + '...');
          const tx = await poke(privateKey, network, address, nonce);
          do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
          log(name, 'twap', address, tx);
        }
        const nonce = await getNonce(privateKey, network);
        console.log('Poking ' + name + ' at nonce ' + nonce + '...');
        const tx = await poke(privateKey, network, address, nonce);
        do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
        log(name, type, address, tx);
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
  for (const name of ILK_LIST[network]) {
    const [token, ilk] = name.split('-');
    const { value } = pips[token];
    if (value !== undefined) {
      const { spot } = await vat_ilk(privateKey, network, name);
      const { mat } = await spot_ilk(privateKey, network, name);
      const calcSpot = (100 * Number(value) / Number(mat)).toFixed(27);
      const deviation = Math.abs((Number(calcSpot) - Number(spot)) / Number(calcSpot)).toFixed(6);
      console.log({ name, value, mat, spot, calcSpot, deviation });
      if (Number(deviation) >= 0.03) { // 3%
        const nonce = await getNonce(privateKey, network);
        console.log('Poking ' + name + ' at nonce ' + nonce + '...');
        const tx = await spot_poke(privateKey, network, name, nonce);
        do { await sleep(3 * 1000); } while (await getNonce(privateKey, network) <= nonce);
        log(name, 'spot', MCD_SPOT, tx);
      }
    }
  }
}

async function main(args) {
  const network = 'bscmain';

  const TIMEFRAME = 4 * 60 * 60 * 1000; // 4 hours

  readLastPoke();

  await sendTelegramMessage('<i>PokeBot (' + network + ') Initiated</i>');

  let interrupted = false;
  interrupt(async (e) => {
    if (!interrupted) {
      interrupted = true;
      console.error('error', e, e instanceof Error ? e.stack : undefined);
      const message = e instanceof Error ? e.message : String(e);
      await sendTelegramMessage('<i>PokeBot (' + network + ') Interrupted (' + escapeHTML(message) + ')</i>');
      exit();
    }
  });

  for (;;) {
    const when = lastPoke + TIMEFRAME;
    const delay = Math.max(when - Date.now(), 0);
    console.log('WAITING ' + Math.floor(delay / 1000) + 's');
    await sleep(delay);

    const lines = [];
    try {
      const account = getDefaultAccount(privateKey, network);
      const accountUrl = ADDRESS_URL_PREFIX[network] + account;
      const value = await getNativeBalance(privateKey, network);
      const balance = Number(coins(value, 18)).toFixed(4);
      lines.push('<a href="' + accountUrl + '">PokeBot</a>');
      lines.push('<code>' + balance + ' ' + NATIVE_SYMBOL[network] + '</code>');
      await pokeAll(network, lines);
    } catch (e) {
      console.error('ERROR', e, e instanceof Error ? e.stack : undefined);
      const message = e instanceof Error ? e.message : String(e);
      lines.push('<i>PokeBot (' + network + ') Failure (' + escapeHTML(message) + ')</i>');
      continue;
    } finally {
      await sendTelegramMessage(lines.join('\n'));
    }

    lastPoke = Date.now();
    writeLastPoke();

    console.log('CYCLE COMPLETED');
  }
}

entrypoint(main);
