const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const now = new Date();
const NOW = BigInt(Math.floor(now.getTime() / 1000));
const NOW_PREFIX = now.toISOString().substr(0, 10).split('-').join('');

function units(coins, decimals) {
  if (typeof coins !== 'string') throw new Error('Invalid amount');
  if (typeof decimals !== 'number') throw new Error('Invalid decimals');
  let i = coins.indexOf('.');
  if (i < 0) i = coins.length;
  const s = coins.slice(i + 1);
  if (decimals < s.length) throw new Error('Invalid decimals');
  return BigInt(coins.slice(0, i) + s + '0'.repeat(decimals - s.length));
}

const CONFIG = {
  '1': 'mainnet',     // mainnet
  '3': 'testnet',     // ropsten
  '4': 'testnet',     // rinkeby
  '42': 'testnet',    // kovan
  '5': 'testnet',     // goerli
  '56': 'bscmain',    // bscmain
  '97': 'testnet',    // bsctest
  '137': 'maticmain', // maticmain
  '80001': 'testnet', // matictest
  '43114': 'avaxmain',// avaxmain
  '43113': 'testnet', // avaxtest
};

const MULTISIG_CONFIG = {
  '1': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce',     // mainnet
  '3': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce',     // ropsten
  '4': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce',     // rinkeby
  '42': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce',    // kovan
  '5': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce',     // goerli
  '56': '0x392681Eaf8AD9BC65e74BE37Afe7503D92802b7d',    // bscmain
  '97': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce',    // bsctest
  '137': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce',   // maticmain
  '80001': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce', // matictest
  '43114': '0x1d64CeAF2cDBC9b6d41eB0f2f7CDA8F04c47d1Ac', // avaxmain
  '43113': '0x2F80922CF7350e06F4924766Cb7EEEC783c1C8ce', // avaxtest
};

module.exports = async (deployer, network, [account]) => {

  function sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  function liftFunc(address, name, func) {
    let i = 0;
    const liftedFunc = (...args) => {
      console.log('>> CALL ' + address + '.' + name + '(' + args.join(', ') + ')');
      const result = func(...args);
      if (Object.prototype.toString.call(result) !== '[object Promise]') return result;
      return new Promise((resolve, reject) => {
        result.then(resolve, (e) => {
          if (i >= 3) return reject(e);
          console.log('! lift.func #' + i + ': ' + e.message);
          i++;
          setTimeout(() => liftedFunc(...args).then(resolve, reject), 3000);
        });
      });
    };
    return liftedFunc;
  }

  function lift(object) {
    return new Proxy(object, {
      'get': (target, property, proxy) => {
        if (property === 'methods') {
          const methods = {};
          for (const sig in target[property]) {
            methods[sig] = liftFunc(target.address, sig, target[property][sig]);
          }
          return methods;
        }
        const func = target[property];
        if (typeof func !== 'function') return func;
        return liftFunc(target.address, property, func);
      },
    });
  }

  async function artifact_deploy(artifact, ...params) {
    console.log('>> CREATE ' + artifact._json.contractName + '(' + params.join(', ') + ')');
    for (let i = 0; ; i++) {
      try {
        await deployer.deploy(artifact, ...params);
        break;
      } catch (e) {
        if (i >= 3) throw e;
        console.log('! deployer.deploy #' + i + ': ' + e.message);
        await sleep(3000);
        continue;
      }
    }
    for (let i = 0; ; i++) {
      try {
        return lift(await artifact.deployed());
      } catch (e) {
        if (i >= 3) throw e;
        console.log('! artifact.deployed #' + i + ': ' + e.message);
        await sleep(3000);
        continue;
      }
    }
  }

  async function artifact_at(artifact, address) {
    for (let i = 0; ; i++) {
      try {
        return lift(await artifact.at(address));
      } catch (e) {
        if (i >= 3) throw e;
        console.log('! artifact.at #' + i + ': ' + e.message);
        await sleep(3000);
        continue;
      }
    }
  }

  const DEPLOYER = account;

  const DssDeploy = artifacts.require('DssDeploy');

  const web3 = DssDeploy.interfaceAdapter.web3;
  const initialBalance = await web3.eth.getBalance(DEPLOYER);

  const chainId = await web3.eth.getChainId();

  const config = require('./config/' + CONFIG[chainId] + '.json');
  const config_import = config.import || {};
  const config_tokens = config.tokens || {};

  const MULTISIG = MULTISIG_CONFIG[chainId];

  const MULTICALL = '0x0b78ad358dDa2887285eaD72e84b47242360b872';
  const PROXY_FACTORY = '0xb05b13496A6451A1Eb2fB18393232368b345C577';
  const PROXY_REGISTRY = '0x4939C03546FEAeC270507e8D4a819BeB40A2BD59';
  const VAT_FAB = '0x741C6E1ef20f3932148468b97d18267520D94994';
  const JUG_FAB = '0x8A1F8ce3De0F3d54F8D3218b42390637eF6037E0';
  const VOW_FAB = '0xe090fbA275a39A66f37487801D86EE099F75148a';
  const CAT_FAB = '0x2eb0DCb9eDfCA6DcC944Aa541B9f075Cb54D4576';
  const DOG_FAB = '0x2a276BB021426EA89536e918e0105D3243FD3b86';
  const DAI_FAB = '0x0B9D71FecE78E8F93Ab6C35A12A02513Eb0D8e79';
  const MCD_JOIN_FAB = '0x45777E44d2d59b4d3bADB198CC5ece59524c7cce';
  const FLAP_FAB = '0xB319297a68E6b3d25D6d3C34b773614186EdB0C5';
  const FLOP_FAB = '0x17dC3B78E2eCb298187B8d0c2929B00C8A154746';
  const FLIP_FAB = '0x30623E39aed9483c033FEd109f5fd009ff7F0bAf';
  const CLIP_FAB = '0xC1A9385d9953d4C0552db4Ad321b71B97309b1b1';
  const SPOT_FAB = '0xc652b9c2aB4Fe6E17EBA677dcc7Bb0b7F6e76770';
  const POT_FAB = '0x7E98Da8124baa6d800f9c021643996595485BA80';
  const END_FAB = '0x1e674E1D2B8a1bF8431AD099B94a3B6E49847ED6';
  const ESM_FAB = '0xA7E3ef1BCE9f894d9f8205AAbD478a8e461e0610';
  const PAUSE_FAB = '0xa5e94e7BB58df6471FcFFdeaE14F3e4b16a48420';
  const MCD_DEPLOY = '0xa10d039d4AD03f15FFF3e49916F62D35923238f6';
  const MCD_ADM_TEMP = '0xDacf9095314275E65b9aF40c0e6b0BB8969ad684';
  const MCD_VAT = '0x713C28b2Ef6F89750BDf97f7Bbf307f6F949b3fF';
  const MCD_SPOT = '0x7C4925D62d24A826F8d945130E620fdC510d0f68';
  const MCD_DAI = '0x87BAde473ea0513D4aA7085484aEAA6cB6EBE7e3';
  const MCD_JOIN_DAI = '0x9438760f1ac27F7cFE638D686d889C56eb42F4D0';
  const MCD_JUG = '0xb2d474EAAB89DD0134B8A98a9AB38aC41a537c6C';
  const MCD_POT = '0x6e22DA49b28dc5aB70aC7527CC0cc04bD35eB615';
  const MCD_FLAP = '0x3Bf3C5146c5b1259f8886d3B2480aD53A835F795';
  const MCD_FLOP = '0xbb37ccb8eFd844abD260AfC68025F5491570AC9d';
  const MCD_VOW = '0x3fD4046b25cD0a43f6d8076D06160E005e388490';
  const MCD_CAT = '0xDea7563440195eA7Ea83900DE38F603C25a37594';
  const MCD_DOG = '0x0dA4fefdAef2d283B438fDb5453934B7aF6f0B57';
  const MCD_END = '0x67D8cda3131890a0603379B03cd1B8Ed39753DA6';
  const MCD_PAUSE = '0x194964F933be66736c55E672239b2A3c07B564BB';
  const MCD_PAUSE_PROXY = '0x309bdB8C09Ab92dBEC88001A51Bf54E74b346C10';
  const MCD_ESM = '0x7d46C7685A3c44Ad65c4dCc84b51BE4b189b52D3';

  // MULTICALL

  const Multicall = artifacts.require('Multicall');
  const multicall = await artifact_at(Multicall, MULTICALL);
  console.log('MULTICALL=' + MULTICALL);

  // FAUCET

  let FAUCET = config_import.faucet;
  let restrictedTokenFaucet;
  const RestrictedTokenFaucet = artifacts.require('RestrictedTokenFaucet');
  if (config_import.faucet === undefined) {
    restrictedTokenFaucet = await artifact_at(RestrictedTokenFaucet, FAUCET);
    console.log('FAUCET=' + FAUCET);
  }

  // PROXY REGISTRY

  const ProxyRegistry = artifacts.require('ProxyRegistry');
  if (config_import.proxyRegistry === undefined) {
    const DSProxyFactory = artifacts.require('DSProxyFactory');
    const dsProxyFactory = await artifact_at(DSProxyFactory, PROXY_FACTORY);
    console.log('PROXY_FACTORY=' + PROXY_FACTORY);

    const proxyRegistry = await artifact_at(ProxyRegistry, PROXY_REGISTRY);
    console.log('PROXY_REGISTRY=' + PROXY_REGISTRY);
  }
  const proxyRegistry = await artifact_at(ProxyRegistry, PROXY_REGISTRY);

  // FABS

  const VatFab = artifacts.require('VatFab');
  const vatFab = await artifact_at(VatFab, VAT_FAB);
  console.log('VAT_FAB=' + VAT_FAB);

  const JugFab = artifacts.require('JugFab');
  const jugFab = await artifact_at(JugFab, JUG_FAB);
  console.log('JUG_FAB=' + JUG_FAB);

  const VowFab = artifacts.require('VowFab');
  const vowFab = await artifact_at(VowFab, VOW_FAB);
  console.log('VOW_FAB=' + VOW_FAB);

  const CatFab = artifacts.require('CatFab');
  const catFab = await artifact_at(CatFab, CAT_FAB);
  console.log('CAT_FAB=' + CAT_FAB);

  const DogFab = artifacts.require('DogFab');
  const dogFab = await artifact_at(DogFab, DOG_FAB);
  console.log('DOG_FAB=' + DOG_FAB);

  const DaiFab = artifacts.require('DaiFab');
  const daiFab = await artifact_at(DaiFab, DAI_FAB);
  console.log('DAI_FAB=' + DAI_FAB);

  const DaiJoinFab = artifacts.require('DaiJoinFab');
  const daiJoinFab = await artifact_at(DaiJoinFab, MCD_JOIN_FAB);
  console.log('MCD_JOIN_FAB=' + MCD_JOIN_FAB);

  const FlapFab = artifacts.require('FlapFab');
  const flapFab = await artifact_at(FlapFab, FLAP_FAB);
  console.log('FLAP_FAB=' + FLAP_FAB);

  const FlopFab = artifacts.require('FlopFab');
  const flopFab = await artifact_at(FlopFab, FLOP_FAB);
  console.log('FLOP_FAB=' + FLOP_FAB);

  const FlipFab = artifacts.require('FlipFab');
  const flipFab = await artifact_at(FlipFab, FLIP_FAB);
  console.log('FLIP_FAB=' + FLIP_FAB);

  const ClipFab = artifacts.require('ClipFab');
  const clipFab = await artifact_at(ClipFab, CLIP_FAB);
  console.log('CLIP_FAB=' + CLIP_FAB);

  const SpotFab = artifacts.require('SpotFab');
  const spotFab = await artifact_at(SpotFab, SPOT_FAB);
  console.log('SPOT_FAB=' + SPOT_FAB);

  const PotFab = artifacts.require('PotFab');
  const potFab = await artifact_at(PotFab, POT_FAB);
  console.log('POT_FAB=' + POT_FAB);

  const EndFab = artifacts.require('EndFab');
  const endFab = await artifact_at(EndFab, END_FAB);
  console.log('END_FAB=' + END_FAB);

  const ESMFab = artifacts.require('ESMFab');
  const esmFab = await artifact_at(ESMFab, ESM_FAB);
  console.log('ESM_FAB=' + ESM_FAB);

  const PauseFab = artifacts.require('PauseFab');
  const pauseFab = await artifact_at(PauseFab, PAUSE_FAB);
  console.log('PAUSE_FAB=' + PAUSE_FAB);

  // GOV TOKEN

  let MCD_GOV = config_import.gov;
  const DSToken = artifacts.require('DSToken');
  if (config_import.gov === undefined) {
    const govToken = await artifact_at(DSToken, MCD_GOV);
    console.log('MCD_GOV=' + MCD_GOV);
  }
  const govToken = await artifact_at(DSToken, MCD_GOV);

  // CORE DEPLOYER

  const dssDeploy = await artifact_at(DssDeploy, MCD_DEPLOY);
  console.log('MCD_DEPLOY=' + MCD_DEPLOY);

  // AUTHORITY

  const DSRoles = artifacts.require('DSRoles');
  const dsRoles = await artifact_at(DSRoles, MCD_ADM_TEMP);
  console.log('MCD_ADM_TEMP=' + MCD_ADM_TEMP);

  // CORE

  // Deploy Vat
  const Vat = artifacts.require('Vat');
  const vat = await artifact_at(Vat, MCD_VAT);
  console.log('MCD_VAT=' + MCD_VAT);
  const Spotter = artifacts.require('Spotter');
  const spotter = await artifact_at(Spotter, MCD_SPOT);
  console.log('MCD_SPOT=' + MCD_SPOT);

  // Deploy Dai
  const Dai = artifacts.require('Dai');
  const dai = await artifact_at(Dai, MCD_DAI);
  console.log('MCD_DAI=' + MCD_DAI);
  const dai_name = await dai.symbol();
  const DaiJoin = artifacts.require('DaiJoin');
  const daiJoin = await artifact_at(DaiJoin, MCD_JOIN_DAI);
  console.log('MCD_JOIN_DAI=' + MCD_JOIN_DAI);

  // Deploy Taxation
  const Jug = artifacts.require('Jug');
  const jug = await artifact_at(Jug, MCD_JUG);
  console.log('MCD_JUG=' + MCD_JUG);
  const Pot = artifacts.require('Pot');
  const pot = await artifact_at(Pot, MCD_POT);
  console.log('MCD_POT=' + MCD_POT);

  // Deploy Auctions
  const Flapper = artifacts.require('Flapper');
  const flap = await artifact_at(Flapper, MCD_FLAP);
  console.log('MCD_FLAP=' + MCD_FLAP);
  const Flopper = artifacts.require('Flopper');
  const flop = await artifact_at(Flopper, MCD_FLOP);
  console.log('MCD_FLOP=' + MCD_FLOP);
  const Vow = artifacts.require('Vow');
  const vow = await artifact_at(Vow, MCD_VOW);
  console.log('MCD_VOW=' + MCD_VOW);

  // Deploy Liquidator
  const Cat = artifacts.require('Cat');
  const cat = await artifact_at(Cat, MCD_CAT);
  console.log('MCD_CAT=' + MCD_CAT);
  const Dog = artifacts.require('Dog');
  const dog = await artifact_at(Dog, MCD_DOG);
  console.log('MCD_DOG=' + MCD_DOG);

  // Deploy End
  const End = artifacts.require('End');
  const end = await artifact_at(End, MCD_END);
  console.log('MCD_END=' + MCD_END);

  // Deploy Pause
  const DSPause = artifacts.require('DSPause');
  const pause = await artifact_at(DSPause, MCD_PAUSE);
  console.log('MCD_PAUSE=' + MCD_PAUSE);
  console.log('MCD_PAUSE_PROXY=' + MCD_PAUSE_PROXY);

  // Deploy ESM
  const esm_min = units(config.esm_min, 18);
  const ESM = artifacts.require('ESM');
  const esm = await artifact_at(ESM, MCD_ESM);
  console.log('MCD_ESM=' + MCD_ESM);

  // FAUCET CONFIG

  let GOV_GUARD  = ZERO_ADDRESS;
  let mkrAuthority;
  if (config_import.gov === undefined) {
    const MkrAuthority = artifacts.require('MkrAuthority');
    mkrAuthority = await artifact_at(MkrAuthority, GOV_GUARD);
    console.log('GOV_GUARD=' + GOV_GUARD);
  }

  // DEPLOY COLLATERALS

  const T_ = {};
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_gemDeploy = token_config.gemDeploy || {};

    T_[token_name] = token_import.gem;
    if (token_import.gem === undefined) {
      const src = token_gemDeploy.src;
      const params = token_gemDeploy.params || [];
      let GemToken;
      switch (src) {
      case 'ds-weth/WETH9_': GemToken = artifacts.require('WETH9_'); break;
      case 'dss-gem-joins/AAVE': GemToken = artifacts.require('AAVE'); break;
      case 'dss-gem-joins/BAL': GemToken = artifacts.require('BAL'); break;
      case 'dss-gem-joins/BAT': GemToken = artifacts.require('BAT'); break;
      case 'dss-gem-joins/COMP': GemToken = artifacts.require('COMP'); break;
      case 'dss-gem-joins/DGD': GemToken = artifacts.require('DGD'); break;
      case 'dss-gem-joins/GNT': GemToken = artifacts.require('GNT'); break;
      case 'dss-gem-joins/GUSD': GemToken = artifacts.require('GUSD'); break;
      case 'dss-gem-joins/KNC': GemToken = artifacts.require('KNC'); break;
      case 'dss-gem-joins/LINK': GemToken = artifacts.require('LINK'); break;
      case 'dss-gem-joins/LRC': GemToken = artifacts.require('LRC'); break;
      case 'dss-gem-joins/MANA': GemToken = artifacts.require('MANA'); break;
      case 'dss-gem-joins/OMG': GemToken = artifacts.require('OMG'); break;
      case 'dss-gem-joins/PAXUSD': GemToken = artifacts.require('PAXUSD'); break;
      case 'dss-gem-joins/RENBTC': GemToken = artifacts.require('RENBTC'); break;
      case 'dss-gem-joins/REP': GemToken = artifacts.require('REP'); break;
      case 'dss-gem-joins/TUSD': GemToken = artifacts.require('TUSD'); break;
      case 'dss-gem-joins/UNI': GemToken = artifacts.require('UNI'); break;
      case 'dss-gem-joins/USDC': GemToken = artifacts.require('USDC'); break;
      case 'dss-gem-joins/USDT': GemToken = artifacts.require('USDT'); break;
      case 'dss-gem-joins/WBTC': GemToken = artifacts.require('WBTC'); break;
      case 'dss-gem-joins/YFI': GemToken = artifacts.require('YFI'); break;
      case 'dss-gem-joins/ZRX': GemToken = artifacts.require('ZRX'); break;
      default: throw new Error('Unknown gem: ' + src);
      }
      const gemToken = await artifact_at(GemToken, T_[token_name]);
      console.log(token_name.replace('-', '_') + '=' + T_[token_name]);
    }
  }

  // FEEDS

  const VAL_ = {};
  const PIP_ = {};
  VAL_['AVAX'] = '0xd4d7BCF6c7b54349C91f39cAd89B228C53FE6BD7';
  VAL_['WETH'] = '0x63c2E42758EF8776BF7b70afb00E0e2748Ad3F05';
  VAL_['WBTC'] = '0x7622ce6588116c1C7F1a4E61A153C1efC7226f78';
  VAL_['DAI'] = '0x585707c57413e09a4BE58e89798f5074b2B89De1';
  VAL_['USDC'] = '0x447FE0cc2145F27127Cf60C6FD6D9025A4208b8B';
  VAL_['USDT'] = '0x6Ee2E2d648698357Cc518D1D5E8170586dca5348';
  VAL_['LINK'] = '0x326Db2b9640e51077fD9B70767855f5c2128e91A';
  VAL_['MIM'] = '0x1B87083Af792cB8355C4c954c491255482992E79';
  VAL_['JOE'] = '0x1a06452B84456728Ee4054AE6157d3feDF56C295';
  VAL_['XJOE'] = '0xF49390eE384C5df2e82ac99909a6236051a4E82B';
  VAL_['JAVAX'] = '0x8BBcd7E4da4395E391Fbfc2A11775debe3ca0D58';
  VAL_['JWETH'] = '0xAB47baC3C131eD3ac9d8F993fD2D902cad460c0f';
  VAL_['JWBTC'] = '0xcf55226EE56F174B3cB3F75a5182d2300e788e91';
  VAL_['JLINK'] = '0xB31fF116f5fEC1C0Aee2Aa86d5E78e3105CC4274';
  VAL_['TDJAVAXJOE'] = '0xC5065b47A133071fe8cD94f46950fCfBA53864C6';
  VAL_['TDJAVAXWETH'] = '0x3d4604395595Bb30A8B7754b5dDBF0B3F680564b';
  VAL_['TDJAVAXWBTC'] = '0x1e1ee1AcD4B7ad405A0D701884F093d54DF7fba4';
  VAL_['TDJAVAXDAI'] = '0x58849cE72b4E4338C00f0760Ca6AfCe11b5ee370';
  VAL_['TDJAVAXUSDC'] = '0xc690F38430Db2057C992c3d3190D9902CD7E0294';
  VAL_['TDJAVAXUSDT'] = '0xeE991787C4ffE1de8c8c7c45e3EF14bFc47A2735';
  VAL_['TDJAVAXLINK'] = '0x5Df1B3212EB26f506af448cE25cd4E315BEdf630';
  VAL_['TDJAVAXMIM'] = '0x0Ca167778392473E0868503522a11f1e749bbF82';
  VAL_['TDJUSDCJOE'] = '0x7bA715959A52ef046BE76c4E32f1de1d161E2888';
  VAL_['TDJUSDTJOE'] = '0xeBcb52E5696A2a90D684C76cDf7095534F265370';
  VAL_['PSM-STKUSDC'] = '0x68697fF7Ec17F528E3E4862A1dbE6d7D9cBBd5C6';
  VAL_['STKXJOE'] = '0xf72f07b96D4Ee64d1065951cAfac032B63C767bb';
  VAL_['STKJAVAX'] = '0xeeF286Af1d7601EA5E40473741D79e55770498d8';
  VAL_['STKJWETH'] = '0xa9b68E3E65966B1C08cfa6002E8527E091e5664e';
  VAL_['STKJWBTC'] = '0x5ef900FD5aACd6CFe994b2E13c3d4aBDD9fFea2b';
  VAL_['STKJLINK'] = '0x3728Bd61F582dA0b22cFe7EDC59aC33f7402c4e0';
  VAL_['STKTDJAVAXJOE'] = '0xca70528209917F4D0443Dd3e90C863b19584CCAF';
  VAL_['STKTDJAVAXWETH'] = '0x352C748Ff550Eec6355e37Ee62459210909709DD';
  VAL_['STKTDJAVAXWBTC'] = '0x260e6061233A3F05213a54103A9F0460857f9E9c';
  VAL_['STKTDJAVAXDAI'] = '0x9605863bf02E983861C0a4ac28a7527Fcf36732b';
  VAL_['STKTDJAVAXUSDC'] = '0x2117C852417B008d18E292D18ab196f49AA896cf';
  VAL_['STKTDJAVAXUSDT'] = '0x6B61e028199BCC4760fD9CC5DEfC7430d977FC08';
  VAL_['STKTDJAVAXLINK'] = '0x4A1dB63A8240A030C7E8678c594711D139a1c39f';
  VAL_['STKTDJAVAXMIM'] = '0x842B07b7D9C77A6bE833a660FB628C6d28Bda0a8';
  VAL_['STKTDJUSDCJOE'] = '0x7253bC2Ca443807391451a54cAF1bC1915A8b584';
  VAL_['STKTDJUSDTJOE'] = '0xed219cD2aF00625e0c1aD21b7cC7aa0f77601860';
  const DSValue = artifacts.require('DSValue');
  const Median = artifacts.require('Median');
  const LinkOracle = artifacts.require('LinkOracle');
  const UNIV2LPOracle = artifacts.require('UNIV2LPOracle');
  const CompOracle = artifacts.require('CompOracle');
  const XSushiOracle = artifacts.require('XSushiOracle');
  const VaultOracle = artifacts.require('VaultOracle');
  const UniV2TwapOracle = artifacts.require('UniV2TwapOracle');
  const UniswapV2PairLike = artifacts.require('UniswapV2PairLike');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    if (token_import.pip === undefined) {
      if (token_pipDeploy.type === 'twap') {
        const stwap = token_pipDeploy.stwap;
        const ltwap = token_pipDeploy.ltwap;
        const src = token_pipDeploy.src;
        const token = await artifact_at(DSToken, T_[token_name]);
        const dec = Number(await token.decimals());
        const cap = units(token_pipDeploy.cap, dec);
        const univ2twapOracle = await artifact_at(UniV2TwapOracle, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'vault') {
        const src = T_[token_name];
        const res = T_[token_pipDeploy.reserve];
        const orb = VAL_[token_pipDeploy.reserve];
        const vaultOracle = await artifact_at(VaultOracle, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'xsushi') {
        const src = T_[token_name];
        const res = T_[token_pipDeploy.reserve];
        const orb = VAL_[token_pipDeploy.reserve];
        const xsushiOracle = await artifact_at(XSushiOracle, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'comp') {
        const src = T_[token_name];
        const res = T_[token_pipDeploy.reserve];
        const orb = VAL_[token_pipDeploy.reserve];
        const compOracle = await artifact_at(CompOracle, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'univ2lp') {
        const src = T_[token_name];
        const wat = web3.utils.asciiToHex(token_name);
        const orb0 = VAL_[token_pipDeploy.token0];
        const orb1 = VAL_[token_pipDeploy.token1];
        const pair = await artifact_at(UniswapV2PairLike, src);
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        if (token0 !== T_[token_pipDeploy.token0] || token1 !== T_[token_pipDeploy.token1]) {
          throw new Error('Configuration Inconsistency')
        }
        const univ2lpOracle = await artifact_at(UNIV2LPOracle, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'chainlink') {
        const src = token_pipDeploy.src;
        const linkOracle = await artifact_at(LinkOracle, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'median') {
        const wat = web3.utils.asciiToHex(token_name.replace('-', '_') + 'USD');
        const median = await artifact_at(Median, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'value') {
        const dsValue = await artifact_at(DSValue, VAL_[token_name]);
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
    } else {
      VAL_[token_name] = token_import.pip;
    }
    PIP_[token_name] = VAL_[token_name];
  }

  // DEPLOY ILKS

  const MCD_JOIN_ = {};
  const MCD_FLIP_ = {};
  const MCD_CLIP_ = {};
  const MCD_CLIP_CALC_ = {};

  MCD_JOIN_['PSM-STKUSDC']= {};
  MCD_CLIP_CALC_['PSM-STKUSDC'] = {};
  MCD_CLIP_['PSM-STKUSDC'] = {};
  MCD_JOIN_['STKXJOE'] = {};
  MCD_CLIP_CALC_['STKXJOE'] = {};
  MCD_CLIP_['STKXJOE'] = {};
  MCD_JOIN_['STKJAVAX'] = {};
  MCD_CLIP_CALC_['STKJAVAX'] = {};
  MCD_CLIP_['STKJAVAX'] = {};
  MCD_JOIN_['STKJWETH'] = {};
  MCD_CLIP_CALC_['STKJWETH'] = {};
  MCD_CLIP_['STKJWETH'] = {};
  MCD_JOIN_['STKJWBTC'] = {};
  MCD_CLIP_CALC_['STKJWBTC'] = {};
  MCD_CLIP_['STKJWBTC'] = {};
  MCD_JOIN_['STKJLINK'] = {};
  MCD_CLIP_CALC_['STKJLINK'] = {};
  MCD_CLIP_['STKJLINK'] = {};
  MCD_JOIN_['STKTDJAVAXJOE'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXJOE'] = {};
  MCD_CLIP_['STKTDJAVAXJOE'] = {};
  MCD_JOIN_['STKTDJAVAXWETH'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXWETH'] = {};
  MCD_CLIP_['STKTDJAVAXWETH'] = {};
  MCD_JOIN_['STKTDJAVAXWBTC'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXWBTC'] = {};
  MCD_CLIP_['STKTDJAVAXWBTC'] = {};
  MCD_JOIN_['STKTDJAVAXDAI'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXDAI'] = {};
  MCD_CLIP_['STKTDJAVAXDAI'] = {};
  MCD_JOIN_['STKTDJAVAXUSDC'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXUSDC'] = {};
  MCD_CLIP_['STKTDJAVAXUSDC'] = {};
  MCD_JOIN_['STKTDJAVAXUSDT'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXUSDT'] = {};
  MCD_CLIP_['STKTDJAVAXUSDT'] = {};
  MCD_JOIN_['STKTDJAVAXLINK'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXLINK'] = {};
  MCD_CLIP_['STKTDJAVAXLINK'] = {};
  MCD_JOIN_['STKTDJAVAXMIM'] = {};
  MCD_CLIP_CALC_['STKTDJAVAXMIM'] = {};
  MCD_CLIP_['STKTDJAVAXMIM'] = {};
  MCD_JOIN_['STKTDJUSDCJOE'] = {};
  MCD_CLIP_CALC_['STKTDJUSDCJOE'] = {};
  MCD_CLIP_['STKTDJUSDCJOE'] = {};
  MCD_JOIN_['STKTDJUSDTJOE'] = {};
  MCD_CLIP_CALC_['STKTDJUSDTJOE'] = {};
  MCD_CLIP_['STKTDJUSDTJOE'] = {};
  MCD_JOIN_['PSM-STKUSDC']['A'] = '0x65764167EC4B38D611F961515B51a40628614018';
  MCD_CLIP_CALC_['PSM-STKUSDC']['A'] = '0x74a08d8D88Aaf7d83087aa159B5e17F017cd1cFD';
  MCD_CLIP_['PSM-STKUSDC']['A'] = '0x61C8CF1e4E1DBdF88fceDd55e2956345b4df6B21';
  MCD_JOIN_['STKXJOE']['A'] = '0x3a6a2d813Bc8C51E72d3348311c62EB2D1D9dEe2';
  MCD_CLIP_CALC_['STKXJOE']['A'] = '0xbC60e5B3E667f0EE15647c31bE0a7b27D306aC44';
  MCD_CLIP_['STKXJOE']['A'] = '0xFFAee04Db99530DeCAe1133DbEc5fD7Cc3BcC4aD';
  MCD_JOIN_['STKJAVAX']['A'] = '0x0c88e124AF319af1A1a6BD4C3d1CB70070Fd421f';
  MCD_CLIP_CALC_['STKJAVAX']['A'] = '0x554F427Bda6Cf8f972E518389da3e1c492fe75D4';
  MCD_CLIP_['STKJAVAX']['A'] = '0x62711202EF9368e5401eCeaFD90E71A411286Edd';
  MCD_JOIN_['STKJWETH']['A'] = '0x7a96803F857D854878A95fa07F290B34Ab2981a7';
  MCD_CLIP_CALC_['STKJWETH']['A'] = '0x77a5E69955E1837B0c3f50159577ccb7468d6a4d';
  MCD_CLIP_['STKJWETH']['A'] = '0x0c6eEaE3a36ec66B30A58917166D526f499e431B';
  MCD_JOIN_['STKJWBTC']['A'] = '0x781E44923fb912b1d0aa892BBf62dD1b4dfC9cd5';
  MCD_CLIP_CALC_['STKJWBTC']['A'] = '0xd6e80B0ae1f84A37AB145084a80893854c27ecc0';
  MCD_CLIP_['STKJWBTC']['A'] = '0x6f77799B3D36a61FdF8eb82E0DdEDcF4BA041042';
  MCD_JOIN_['STKJLINK']['A'] = '0x972F78558B4F8D677d84c8d1d4A73836c8DE4900';
  MCD_CLIP_CALC_['STKJLINK']['A'] = '0x579Ef8feFE39Edbefc00141ED7fB5f3D3221d2aB';
  MCD_CLIP_['STKJLINK']['A'] = '0x940aA35E47d54a5EE4dc3C6Ff6Eb1bdec065c2A5';
  MCD_JOIN_['STKTDJAVAXJOE']['A'] = '0x136EF4EbB71c147969AFB9666D4b900756C64b27';
  MCD_CLIP_CALC_['STKTDJAVAXJOE']['A'] = '0x563d13664023a7d63463b8cdc443552c047642Cb';
  MCD_CLIP_['STKTDJAVAXJOE']['A'] = '0x8641BdBECE44c3f05b1991922f721C4585f22456';
  MCD_JOIN_['STKTDJAVAXWETH']['A'] = '0x7dB700723a20511Beb367694e8c33b8dc23418bB';
  MCD_CLIP_CALC_['STKTDJAVAXWETH']['A'] = '0xD56d12F8afaE2bf9CfcF1201F00a3c4560B93276';
  MCD_CLIP_['STKTDJAVAXWETH']['A'] = '0x226d0e1AC4C8b6253caf5CEda067fb5a6EDCDF6F';
  MCD_JOIN_['STKTDJAVAXWBTC']['A'] = '0x8cCC3E5EAe76977C65936332d0BB082c50f21433';
  MCD_CLIP_CALC_['STKTDJAVAXWBTC']['A'] = '0xCB30401313dfB5Eaa63978b61aC4E5555AD28B8D';
  MCD_CLIP_['STKTDJAVAXWBTC']['A'] = '0x435D4017b6A4C21f25077ccd5849F083F3e20452';
  MCD_JOIN_['STKTDJAVAXDAI']['A'] = '0x6061A183Ce7b75b78E60F8662cfbb88f69324d54';
  MCD_CLIP_CALC_['STKTDJAVAXDAI']['A'] = '0xeF5f65443D1208d8aD44b884eE1f60fC908460Ce';
  MCD_CLIP_['STKTDJAVAXDAI']['A'] = '0x754e4D6fbbDdE2e77c390E4BAC54C7e0E48901Ab';
  MCD_JOIN_['STKTDJAVAXUSDC']['A'] = '0x85A837a58abcF09c45C7871aC395039951F1Ba9c';
  MCD_CLIP_CALC_['STKTDJAVAXUSDC']['A'] = '0x397c5613b83C214198264BB548BB9F6e5fe2B8A9';
  MCD_CLIP_['STKTDJAVAXUSDC']['A'] = '0xbCa0650FF329211D3784C82196421A885FDB0451';
  MCD_JOIN_['STKTDJAVAXUSDT']['A'] = '0x60C725d424a057d5DFD1d9d2d5e5dd2Bf08B31cb';
  MCD_CLIP_CALC_['STKTDJAVAXUSDT']['A'] = '0x591B511aE03c29c52d6F6B624B2651D5C02E8715';
  MCD_CLIP_['STKTDJAVAXUSDT']['A'] = '0x9E4D1b626a39065142420d518adA0654606e9AEa';
  MCD_JOIN_['STKTDJAVAXLINK']['A'] = '0x99F1F47393079FD19D206a935B09016619Cb3bd2';
  MCD_CLIP_CALC_['STKTDJAVAXLINK']['A'] = '0xbD69CD541E7676222d4003aB0dB6ecff59E9503c';
  MCD_CLIP_['STKTDJAVAXLINK']['A'] = '0xa4f9600534190d96bc60D33A3594E0b0869cAdaB';
  MCD_JOIN_['STKTDJAVAXMIM']['A'] = '0x5E0978e898A03463D9De497991E1C6278271c323';
  MCD_CLIP_CALC_['STKTDJAVAXMIM']['A'] = '0x926E0b08522B6bA732551E548e9d85d5c982Cf0A';
  MCD_CLIP_['STKTDJAVAXMIM']['A'] = '0x97B9187242fAB11A6b0922F1ba328B1C760e7d0f';
  MCD_JOIN_['STKTDJUSDCJOE']['A'] = '0xc1E1d478296F3b0F2CA9Cc88F620de0b791aBf27';
  MCD_CLIP_CALC_['STKTDJUSDCJOE']['A'] = '0xb28854F44478f8e0C4De2EF14f3CdfF868354637';
  MCD_CLIP_['STKTDJUSDCJOE']['A'] = '0x8A0baDba6E13097AAa869b5BC25a8f32FbD46b3c';
  MCD_JOIN_['STKTDJUSDTJOE']['A'] = '0xC4861931532bcf4fb59Ead8080c22A3363389a76';
  MCD_CLIP_CALC_['STKTDJUSDTJOE']['A'] = '0xd8BfF1BE3d57d874003340A91018480BD53a17C4';
  MCD_CLIP_['STKTDJUSDTJOE']['A'] = '0x2C5972dCc9886F5FaF9230148D7076dba5C39002';
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_joinDeploy = token_config.joinDeploy || {};
    const token_ilks = token_config.ilks || {};
    const src = token_joinDeploy.src || 'GemJoin';
    const extraParams = token_joinDeploy.extraParams || [];

    MCD_JOIN_[token_name] = MCD_JOIN_[token_name] || {};
    MCD_FLIP_[token_name] = MCD_FLIP_[token_name] || {};
    MCD_CLIP_[token_name] = MCD_CLIP_[token_name] || {};
    MCD_CLIP_CALC_[token_name] = MCD_CLIP_CALC_[token_name] || {};

    let GemJoin;
    switch (src) {
    case 'GemJoin': GemJoin = artifacts.require('GemJoin'); break;
    case 'GemJoin2': GemJoin = artifacts.require('GemJoin2'); break;
    case 'GemJoin3': GemJoin = artifacts.require('GemJoin3'); break;
    case 'GemJoin4': GemJoin = artifacts.require('GemJoin4'); break;
    case 'GemJoin5': GemJoin = artifacts.require('GemJoin5'); break;
    case 'GemJoin6': GemJoin = artifacts.require('GemJoin6'); break;
    case 'GemJoin7': GemJoin = artifacts.require('GemJoin7'); break;
    case 'GemJoin8': GemJoin = artifacts.require('GemJoin8'); break;
    case 'AuthGemJoin': GemJoin = artifacts.require('AuthGemJoin'); break;
    case 'AuthGemJoin5': GemJoin = artifacts.require('AuthGemJoin5'); break;
    default: throw new Error('Unknown join: ' + src);
    }

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_flipDeploy = ilk_config.flipDeploy || {};
      const ilk_clipDeploy = ilk_config.clipDeploy || {};
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const gemJoin = await artifact_at(GemJoin, MCD_JOIN_[token_name][ilk]);
      console.log('MCD_JOIN_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_JOIN_[token_name][ilk]);

      if (ilk_config.flipDeploy !== undefined) {
        console.log('MCD_FLIP_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_FLIP_[token_name][ilk]);
      }

      if (ilk_config.clipDeploy !== undefined) {
        const calc_config = ilk_clipDeploy.calc || {};

        let Calc;
        switch (calc_config.type) {
        case 'LinearDecrease': Calc = artifacts.require('LinearDecrease'); break;
        case 'StairstepExponentialDecrease': Calc = artifacts.require('StairstepExponentialDecrease'); break;
        case 'ExponentialDecrease': Calc = artifacts.require('ExponentialDecrease'); break;
        default: throw new Error('Unknown calc: ' + calc_config.type);
        }

        const calc = await artifact_at(Calc, MCD_CLIP_CALC_[token_name][ilk]);
        console.log('MCD_CLIP_CALC_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_CLIP_CALC_[token_name][ilk]);

        console.log('MCD_CLIP_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_CLIP_[token_name][ilk]);
      }
    }
  }

  const PROXY_ACTIONS = '0x90bEF2f1531d3a28ffc8e889631E67476b5EA970';
  const PROXY_ACTIONS_END = '0x4c74e6A914F748125cFB3f0978A19531aDA1784E';
  const PROXY_ACTIONS_DSR = '0x737Ebe8814F9D8ec472Eb25808775FD9EaA5f2dd';
  const CDP_MANAGER = '0x224C2697f5D0d999c2018CE71393AEB0A9ba02f4';
  const GET_CDPS = '0x4b841367a5D10Efe58877269a866da02D9DCE5b5';
  const DSR_MANAGER = '0xb38163E59b508Af28B12be8fE17A880aa2508d2d';
  const OSM_MOM = '0x21E4F0d97422fE6A119bE3f3F148cb0189eDF4Fe';
  const FLIPPER_MOM = '0x9F42FDEfd78EBdF401928bE2CFCBBA80b12a3363';
  const CLIPPER_MOM = '0xa4F76146B4fB439363e83d3F9391a763F1fd6F34';
  const ILK_REGISTRY = '0x03A90f53DeEac9104Ef699DB8Ca6Cc1EFfc7a0DC';

  // PROXY ACTIONS

  const DssProxyActions = artifacts.require('DssProxyActions');
  const dssProxyActions = await artifact_at(DssProxyActions, PROXY_ACTIONS);
  console.log('PROXY_ACTIONS=' + PROXY_ACTIONS);

  const DssProxyActionsEnd = artifacts.require('DssProxyActionsEnd');
  const dssProxyActionsEnd = await artifact_at(DssProxyActionsEnd, PROXY_ACTIONS_END);
  console.log('PROXY_ACTIONS_END=' + PROXY_ACTIONS_END);

  const DssProxyActionsDsr = artifacts.require('DssProxyActionsDsr');
  const dssProxyActionsDsr = await artifact_at(DssProxyActionsDsr, PROXY_ACTIONS_DSR);
  console.log('PROXY_ACTIONS_DSR=' + PROXY_ACTIONS_DSR);

  // CDP MANAGER

  const DssCdpManager = artifacts.require('DssCdpManager');
  const dssCdpManager = await artifact_at(DssCdpManager, CDP_MANAGER);
  console.log('CDP_MANAGER=' + CDP_MANAGER);

  const GetCdps = artifacts.require('GetCdps');
  const getCdps = await artifact_at(GetCdps, GET_CDPS);
  console.log('GET_CDPS=' + GET_CDPS);

  // DSR MANAGER

  const DsrManager = artifacts.require('DsrManager');
  const dsrManager = await artifact_at(DsrManager, DSR_MANAGER);
  console.log('DSR_MANAGER=' + DSR_MANAGER);

  // OSM MOM

  const OSM = artifacts.require('OSM');
  const OsmMom = artifacts.require('OsmMom');
  const osmMom = await artifact_at(OsmMom, OSM_MOM);
  console.log('OSM_MOM=' + OSM_MOM);

  // FLIPPER MOM

  const FlipperMom = artifacts.require('FlipperMom');
  const flipperMom = await artifact_at(FlipperMom, FLIPPER_MOM);
  console.log('FLIPPER_MOM=' + FLIPPER_MOM);

  // CLIPPER MOM

  const ClipperMom = artifacts.require('ClipperMom');
  const clipperMom = await artifact_at(ClipperMom, CLIPPER_MOM);
  console.log('CLIPPER_MOM=' + CLIPPER_MOM);

  // ILK REGISTRY

  const IlkRegistry = artifacts.require('IlkRegistry');
  const ilkRegistry = await artifact_at(IlkRegistry, ILK_REGISTRY);
  console.log('ILK_REGISTRY=' + ILK_REGISTRY);

  // PSM

  const MCD_PSM_ = {};
  MCD_PSM_['PSM-STKUSDC'] = {};
  MCD_PSM_['PSM-STKUSDC']['A'] = '0xd86f2618e32235969EA700FE605ACF0fb10129e3';
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    MCD_PSM_[token_name] = MCD_PSM_[token_name] || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_psmDeploy = ilk_config.psmDeploy;

      if (ilk_psmDeploy !== undefined) {
        const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);
        const tin = units(ilk_psmDeploy.tin, 18);
        const tout = units(ilk_psmDeploy.tout, 18);
        const donors = ilk_psmDeploy.donors || [];

        const DssPsm = artifacts.require('DssPsm');
        const dssPsm = await artifact_at(DssPsm, MCD_PSM_[token_name][ilk]);
        console.log('MCD_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_PSM_[token_name][ilk]);

        const AuthGemJoin = artifacts.require('AuthGemJoin');
        const authGemJoin = await artifact_at(AuthGemJoin, MCD_JOIN_[token_name][ilk]);
      }
    }
  }

  // REMOVE AUTH

  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const GemJoin = artifacts.require('GemJoin');
      const gemJoin = await artifact_at(GemJoin, MCD_JOIN_[token_name][ilk]);
      if (ilk_config.flipDeploy !== undefined) {
      }
      if (ilk_config.clipDeploy !== undefined) {
      }
    }
  }

  const MCD_GOV_ACTIONS = '0xEC2EbC6e5C53Def0bc3AF8d612bC75972CA401E8';
  const PROXY_PAUSE_ACTIONS = '0x123d878dbFD90112890ac8DF1063930E70C880Ba';

  // GOV ACTIONS

  const GovActions = artifacts.require('GovActions');
  const govActions = await artifact_at(GovActions, MCD_GOV_ACTIONS);
  console.log('MCD_GOV_ACTIONS=' + MCD_GOV_ACTIONS);

  // PAUSE PROXY ACTIONS

  const DssDeployPauseProxyActions = artifacts.require('DssDeployPauseProxyActions');
  const dssDeployPauseProxyActions = await artifact_at(DssDeployPauseProxyActions, PROXY_PAUSE_ACTIONS);
  console.log('PROXY_PAUSE_ACTIONS=' + PROXY_PAUSE_ACTIONS);

  // PROXY DEPLOYER

  let PROXY_DEPLOYER = await proxyRegistry.proxies(DEPLOYER);
  if (PROXY_DEPLOYER === ZERO_ADDRESS) {
    await proxyRegistry.build();
    PROXY_DEPLOYER = await proxyRegistry.proxies(DEPLOYER);
  }
  console.log('PROXY_DEPLOYER=' + PROXY_DEPLOYER);
  const DSProxy = artifacts.require('DSProxy');
  const proxyDeployer = await artifact_at(DSProxy, PROXY_DEPLOYER);

  async function rely(who, to) {
    const jsonInterface = {
      type: 'function',
      name: 'rely',
      inputs: [
        { type: 'address', name: 'pause' },
        { type: 'address', name: 'actions' },
        { type: 'address', name: 'who' },
        { type: 'address', name: 'to' },
      ],
    };
    const calldata = web3.eth.abi.encodeFunctionCall(jsonInterface, [MCD_PAUSE, MCD_GOV_ACTIONS, who, to]);
    return await proxyDeployer.methods['execute(address,bytes)'](PROXY_PAUSE_ACTIONS, calldata);
  }

  async function file(who, what, data) {
    const jsonInterface = {
      type: 'function',
      name: 'file',
      inputs: [
        { type: 'address', name: 'pause' },
        { type: 'address', name: 'actions' },
        { type: 'address', name: 'who' },
        { type: 'bytes32', name: 'what' },
        { type: 'uint256', name: 'data' },
      ],
    };
    const calldata = web3.eth.abi.encodeFunctionCall(jsonInterface, [MCD_PAUSE, MCD_GOV_ACTIONS, who, web3.utils.asciiToHex(what), data]);
    return await proxyDeployer.methods['execute(address,bytes)'](PROXY_PAUSE_ACTIONS, calldata);
  }

  async function filex(who, ilk, what, data) {
    const jsonInterface = {
      type: 'function',
      name: 'file',
      inputs: [
        { type: 'address', name: 'pause' },
        { type: 'address', name: 'actions' },
        { type: 'address', name: 'who' },
        { type: 'bytes32', name: 'ilk' },
        { type: 'bytes32', name: 'what' },
        { type: 'uint256', name: 'data' },
      ],
    };
    const calldata = web3.eth.abi.encodeFunctionCall(jsonInterface, [MCD_PAUSE, MCD_GOV_ACTIONS, who, ilk, web3.utils.asciiToHex(what), data]);
    return await proxyDeployer.methods['execute(address,bytes)'](PROXY_PAUSE_ACTIONS, calldata);
  }

  async function dripAndFile(who, what, data) {
    const jsonInterface = {
      type: 'function',
      name: 'dripAndFile',
      inputs: [
        { type: 'address', name: 'pause' },
        { type: 'address', name: 'actions' },
        { type: 'address', name: 'who' },
        { type: 'bytes32', name: 'what' },
        { type: 'uint256', name: 'data' },
      ],
    };
    const calldata = web3.eth.abi.encodeFunctionCall(jsonInterface, [MCD_PAUSE, MCD_GOV_ACTIONS, who, web3.utils.asciiToHex(what), data]);
    return await proxyDeployer.methods['execute(address,bytes)'](PROXY_PAUSE_ACTIONS, calldata);
  }

  async function dripAndFilex(who, ilk, what, data) {
    const jsonInterface = {
      type: 'function',
      name: 'dripAndFile',
      inputs: [
        { type: 'address', name: 'pause' },
        { type: 'address', name: 'actions' },
        { type: 'address', name: 'who' },
        { type: 'bytes32', name: 'ilk' },
        { type: 'bytes32', name: 'what' },
        { type: 'uint256', name: 'data' },
      ],
    };
    const calldata = web3.eth.abi.encodeFunctionCall(jsonInterface, [MCD_PAUSE, MCD_GOV_ACTIONS, who, ilk, web3.utils.asciiToHex(what), data]);
    return await proxyDeployer.methods['execute(address,bytes)'](PROXY_PAUSE_ACTIONS, calldata);
  }

  async function setAuthorityAndDelay(newAuthority, newDelay) {
    const jsonInterface = {
      type: 'function',
      name: 'setAuthorityAndDelay',
      inputs: [
        { type: 'address', name: 'pause' },
        { type: 'address', name: 'actions' },
        { type: 'address', name: 'newAuthority' },
        { type: 'uint256', name: 'newDelay' },
      ],
    };
    const calldata = web3.eth.abi.encodeFunctionCall(jsonInterface, [MCD_PAUSE, MCD_GOV_ACTIONS, newAuthority, newDelay]);
    return await proxyDeployer.methods['execute(address,bytes)'](PROXY_PAUSE_ACTIONS, calldata);
  }

  const MCD_IOU = '0x56D323395aB03d1f964535b334062D4C28ce7752';
  const MCD_ADM = '0x86fCF1b49372d98fA275cA916D6c1a08fE05A125';
  const VOTE_PROXY_FACTORY = '0xBa548526f9390666d52B3F482300d77871D228fb';
  const MCD_POLLING_EMITTER = '0xB5e8f7f2D7c1523b1Fa23E225c8Ed253e41B4FC2';
  const VOTE_DELEGATE_PROXY_FACTORY = '0x5F1c3fcEc7b0FbA96a797272Ed899aFf67f3b2aa';
  const MCD_IAM_AUTO_LINE = '0xd2Adc9747FB2F64b8474C446B4f8DB5b39EdfcFC';
  const MCD_FLASH = '0xcEE5b4497F8A041efB79aa4FC2fd81Ad07b73Ec0';
  const CHANGELOG = '0xd1a85349D73BaA4fFA6737474fdce9347B887cB2';

  // ADM CHIEF

  const symbol = await govToken.symbol();
  const iouToken = await artifact_at(DSToken, MCD_IOU);
  console.log('MCD_IOU=' + MCD_IOU);

  const DSChief = artifacts.require('DSChief');
  const dsChief = await artifact_at(DSChief, MCD_ADM);
  console.log('MCD_ADM=' + MCD_ADM);

  // VOTE PROXY FACTORY

  const VoteProxyFactory = artifacts.require('VoteProxyFactory');
  const voteProxyFactory = await artifact_at(VoteProxyFactory, VOTE_PROXY_FACTORY);
  console.log('VOTE_PROXY_FACTORY=' + VOTE_PROXY_FACTORY);

  // POLLING EMITTER

  const PollingEmitter = artifacts.require('PollingEmitter');
  const pollingEmitter = await artifact_at(PollingEmitter, MCD_POLLING_EMITTER);
  console.log('MCD_POLLING_EMITTER=' + MCD_POLLING_EMITTER);

  // VOTE DELEGATE FACTORY

  const VoteDelegateFactory = artifacts.require('VoteDelegateFactory');
  const voteDelegateFactory = await artifact_at(VoteDelegateFactory, VOTE_DELEGATE_PROXY_FACTORY);
  console.log('VOTE_DELEGATE_PROXY_FACTORY=' + VOTE_DELEGATE_PROXY_FACTORY);

  // AUTO LINE

  const DssAutoLine = artifacts.require('DssAutoLine');
  const dssAutoLine = await artifact_at(DssAutoLine, MCD_IAM_AUTO_LINE);
  console.log('MCD_IAM_AUTO_LINE=' + MCD_IAM_AUTO_LINE);

  // FLASH

  const DssFlash = artifacts.require('DssFlash');
  const dssFlash = await artifact_at(DssFlash, MCD_FLASH);
  console.log('MCD_FLASH=' + MCD_FLASH);

  // CHAIN LOG

  const ChainLog = artifacts.require('ChainLog');
  const chainLog = await artifact_at(ChainLog, CHANGELOG);
  console.log('CHANGELOG=' + CHANGELOG);

  // CORE CONFIG
/*
  console.log('Configuring Core...');
  if (Number(config.vat_line) > 0) {
    const vat_line = units(config.vat_line, 45);
    console.log('@vat_line', config.vat_line, vat_line);
    await file(MCD_VAT, 'Line', vat_line);
  }
  if (Number(config.vow_wait) >= 0) {
    const vow_wait = units(config.vow_wait, 0);
    console.log('@vow_wait', config.vow_wait, vow_wait);
    await file(MCD_VOW, 'wait', vow_wait);
  }
  if (Number(config.vow_bump) >= 0) {
    const vow_bump = units(config.vow_bump, 45);
    console.log('@vow_bump', config.vow_bump, vow_bump);
    await file(MCD_VOW, 'bump', vow_bump);
  }
  if (Number(config.vow_dump) >= 0) {
    const vow_dump = units(config.vow_dump, 18);
    console.log('@vow_dump', config.vow_dump, vow_dump);
    await file(MCD_VOW, 'dump', vow_dump);
  }
  if (Number(config.vow_sump) >= 0) {
    const vow_sump = units(config.vow_sump, 45);
    console.log('@vow_sump', config.vow_sump, vow_sump);
    await file(MCD_VOW, 'sump', vow_sump);
  }
  if (Number(config.vow_hump) >= 0) {
    const vow_hump = units(config.vow_hump, 45);
    console.log('@vow_hump', config.vow_hump, vow_hump);
    await file(MCD_VOW, 'hump', vow_hump);
  }
  if (Number(config.cat_box) > 0) {
    const cat_box = units(config.cat_box, 45);
    console.log('@cat_box', config.cat_box, cat_box);
    await file(MCD_CAT, 'box', cat_box);
  }
  if (Number(config.dog_hole) > 0) {
    const dog_hole = units(config.dog_hole, 45);
    console.log('@dog_hole', config.dog_hole, dog_hole);
    await file(MCD_DOG, 'Hole', dog_hole);
  }
  if (Number(config.jug_base) >= 0) {
    const jug_base = units(Math.exp(Math.log(Number(config.jug_base) / 100 + 1) / (60 * 60 * 24 * 365)).toFixed(27), 27) - 10n ** 27n;
    console.log('@jug_base', config.jug_base, jug_base);
    await file(MCD_JUG, 'base', jug_base);
  }
  if (Number(config.pot_dsr) >= 0) {
    const pot_dsr = units(Math.exp(Math.log(Number(config.pot_dsr) / 100 + 1) / (60 * 60 * 24 * 365)).toFixed(27), 27);
    console.log('@pot_dsr', config.pot_dsr, pot_dsr);
    await dripAndFile(MCD_POT, 'dsr', pot_dsr);
  }
  if (Number(config.end_wait) >= 0) {
    const end_wait = units(config.end_wait, 0);
    console.log('@end_wait', config.end_wait, end_wait);
    await file(MCD_END, 'wait', end_wait);
  }
  if (Number(config.flap_beg) >= 0) {
    const flap_beg = units(config.flap_beg, 16) + units('100', 16);
    console.log('@flap_beg', config.flap_beg, flap_beg);
    await file(MCD_FLAP, 'beg', flap_beg);
  }
  if (Number(config.flap_ttl) >= 0) {
    const flap_ttl = units(config.flap_ttl, 0);
    console.log('@flap_ttl', config.flap_ttl, flap_ttl);
    await file(MCD_FLAP, 'ttl', flap_ttl);
  }
  if (Number(config.flap_tau) >= 0) {
    const flap_tau = units(config.flap_tau, 0);
    console.log('@flap_tau', config.flap_tau, flap_tau);
    await file(MCD_FLAP, 'tau', flap_tau);
  }
  if (Number(config.flop_beg) >= 0) {
    const flop_beg = units(config.flop_beg, 16) + units('100', 16);
    console.log('@flop_beg', config.flop_beg, flop_beg);
    await file(MCD_FLOP, 'beg', flop_beg);
  }
  if (Number(config.flop_pad) >= 0) {
    const flop_pad = units(config.flop_pad, 16) + units('100', 16);
    console.log('@flop_pad', config.flop_pad, flop_pad);
    await file(MCD_FLOP, 'pad', flop_pad);
  }
  if (Number(config.flop_ttl) >= 0) {
    const flop_ttl = units(config.flop_ttl, 0);
    console.log('@flop_ttl', config.flop_ttl, flop_ttl);
    await file(MCD_FLOP, 'ttl', flop_ttl);
  }
  if (Number(config.flop_tau) >= 0) {
    const flop_tau = units(config.flop_tau, 0);
    console.log('@flop_tau', config.flop_tau, flop_tau);
    await file(MCD_FLOP, 'tau', flop_tau);
  }
  if (Number(config.flash_max) >= 0) {
    const flash_max = units(config.flash_max, 18);
    console.log('@flash_max', config.flash_max, flash_max);
    await file(MCD_FLASH, 'max', flash_max);
  }
  if (Number(config.flash_toll) >= 0) {
    const flash_toll = units(config.flash_toll, 16);
    console.log('@flash_toll', config.flash_toll, flash_toll);
    await file(MCD_FLASH, 'toll', flash_toll);
  }
*/
  // SET ORACLE PRICES VISIBLE BY DEPLOYER
/*
  console.log('Configuring ILK OSM...');
  for (const token_name in config_tokens) {

    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    if (token_import.pip === undefined) {
      if (token_pipDeploy.type === 'twap') {
        const univ2twapOracle = await artifact_at(UniV2TwapOracle, VAL_[token_name]);
        await univ2twapOracle.methods['kiss(address)'](DEPLOYER);
      }
      if (token_pipDeploy.type === 'vault') {
        const vaultOracle = await artifact_at(VaultOracle, VAL_[token_name]);
        await vaultOracle.methods['kiss(address)'](DEPLOYER);
      }
      if (token_pipDeploy.type === 'xsushi') {
        const xsushiOracle = await artifact_at(XSushiOracle, VAL_[token_name]);
        await xsushiOracle.methods['kiss(address)'](DEPLOYER);
      }
      if (token_pipDeploy.type === 'comp') {
        const compOracle = await artifact_at(CompOracle, VAL_[token_name]);
        await compOracle.methods['kiss(address)'](DEPLOYER);
      }
      if (token_pipDeploy.type === 'univ2lp') {
        const univ2lpOracle = await artifact_at(UNIV2LPOracle, VAL_[token_name]);
        await univ2lpOracle.methods['kiss(address)'](DEPLOYER);
      }
      if (token_pipDeploy.type === 'chainlink') {
        const linkOracle = await artifact_at(LinkOracle, VAL_[token_name]);
        await linkOracle.methods['kiss(address)'](DEPLOYER);
      }
      if (token_pipDeploy.type === 'median') {
        const median = await artifact_at(Median, VAL_[token_name]);
        await median.methods['kiss(address)'](DEPLOYER);
      }
    }
  }
*/
  // SET ILKS PRICE
/*
  console.log('Configuring ILK Prices...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    if (token_import.pip === undefined) {
      if (token_pipDeploy.type === 'twap') {
        const univ2twapOracle = await artifact_at(UniV2TwapOracle, VAL_[token_name]);
        await univ2twapOracle.poke();
      }
      if (token_pipDeploy.type === 'value') {
        const token = await artifact_at(DSToken, T_[token_name]);
        const dec = Number(await token.decimals());
        const price = units(token_pipDeploy.price, dec);
        console.log('@pip.price', token_pipDeploy.price, price);
        const dsValue = await artifact_at(DSValue, VAL_[token_name]);
        await dsValue.poke('0x' + web3.utils.numberToHex(String(price)).substring(2).padStart(64, '0'));
      }
      if (Number(token_pipDeploy.osmDelay) > 0) {
        const osm = await artifact_at(OSM, PIP_[token_name]);
        await osm.poke();
      }
    }
  }
*/
  // SET ILKS PIP WHITELIST
/*
  console.log('Configuring ILK PIP Whitelists...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};
    const token_ilks = token_config.ilks || {};

    if (token_import.pip === undefined) {
      const osm = await artifact_at(OSM, PIP_[token_name]);
      if (token_pipDeploy.type !== 'value' && Number(await osm.wards(DEPLOYER)) === 1) {
        await osm.methods['kiss(address)'](MCD_SPOT);
        await osm.methods['kiss(address)'](MCD_END);
        for (const ilk in token_ilks) {
          const ilk_config = token_ilks[ilk];
          const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

          if (ilk_config.clipDeploy !== undefined) {
            await osm.methods['kiss(address)'](MCD_CLIP_[token_name][ilk]);
            await osm.methods['kiss(address)'](CLIPPER_MOM);
          }
        }
        if (token_pipDeploy.type === 'vault') {
          const osmReserve = await artifact_at(OSM, VAL_[token_pipDeploy.reserve]);
          await osmReserve.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'xsushi') {
          const osmReserve = await artifact_at(OSM, VAL_[token_pipDeploy.reserve]);
          await osmReserve.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'comp') {
          const osmReserve = await artifact_at(OSM, VAL_[token_pipDeploy.reserve]);
          await osmReserve.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'univ2lp') {
          const osmToken0 = await artifact_at(OSM, VAL_[token_pipDeploy.token0]);
          await osmToken0.methods['kiss(address)'](PIP_[token_name]);
          const osmToken1 = await artifact_at(OSM, VAL_[token_pipDeploy.token1]);
          await osmToken1.methods['kiss(address)'](PIP_[token_name]);
        }
      }
    }
  }
*/
  // SET ILKS MAT
/*
  console.log('Configuring ILK Mats...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const mat = units(ilk_config.mat, 25);
      console.log('@ilk.mat', ilk_config.mat, mat);
      await filex(MCD_SPOT, ilk_name, 'mat', mat);
    }
  }
*/
  // SET ILKS LINE

  await rely(MCD_VAT, MCD_IAM_AUTO_LINE);

  console.log('Configuring ILK Lines...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const line = units(ilk_config.line, 45);
      const autoLine = units(ilk_config.autoLine, 45);
      console.log('@ilk.line', ilk_config.line, line);
      console.log('@ilk.autoLine', ilk_config.autoLine, autoLine);
      if (line > 0n && autoLine === 0n) {
        await filex(MCD_VAT, ilk_name, 'line', line);
      }
      if (autoLine > 0n) {
        const autoLineGap = units(ilk_config.autoLineGap, 45);
        const autoLineTtl = units(ilk_config.autoLineTtl, 0);
        console.log('@ilk.autoLineGap', ilk_config.autoLineGap, autoLineGap);
        console.log('@ilk.autoLineTtl', ilk_config.autoLineTtl, autoLineTtl);
        await dssAutoLine.setIlk(ilk_name, autoLine, autoLineGap, autoLineTtl);
        await dssAutoLine.exec(ilk_name);
      }
    }
  }
  await dssAutoLine.rely(MCD_PAUSE_PROXY);
  await dssAutoLine.deny(DEPLOYER);

  // SET ILKS DUST

  console.log('Configuring ILK Dusts...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const dust = units(ilk_config.dust, 45);
      console.log('@ilk.dust', ilk_config.dust, dust);
      await filex(MCD_VAT, ilk_name, 'dust', dust);
    }
  }

  // SET ILKS DUTY

  console.log('Configuring ILK Duties...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const duty = units(Math.exp(Math.log(Number(ilk_config.duty) / 100 + 1) / (60 * 60 * 24 * 365)).toFixed(27), 27);
      console.log('@ilk.duty', ilk_config.duty, duty);
      await dripAndFilex(MCD_JUG, ilk_name, 'duty', duty);
    }
  }

  // SET ILKS SPOTTER POKE

  console.log('Configuring ILK Spotter Pokes...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};
    const token_ilks = token_config.ilks || {};

    if (token_import.pip === undefined) {
      const osm = await artifact_at(OSM, PIP_[token_name]);
      if (token_pipDeploy.type === 'value' || Number(await osm.bud(MCD_SPOT)) === 1) {
        for (const ilk in token_ilks) {
          const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

          await spotter.poke(ilk_name);
        }
      }
    }
  }

  // SET ILKS CHOP

  console.log('Configuring ILK Chops...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_flipDeploy = ilk_config.flipDeploy || {};
      const ilk_clipDeploy = ilk_config.clipDeploy || {};
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      if (ilk_config.flipDeploy !== undefined) {
        const chop = units(ilk_flipDeploy.chop, 16) + units('100', 16);
        console.log('@flip.chop', ilk_flipDeploy.chop, chop);
        await filex(MCD_CAT, ilk_name, 'chop', chop);
      }
      if (ilk_config.clipDeploy !== undefined) {
        const chop = units(ilk_clipDeploy.chop, 16) + units('100', 16);
        console.log('@clip.chop', ilk_clipDeploy.chop, chop);
        await filex(MCD_DOG, ilk_name, 'chop', chop);
        const Clipper = artifacts.require('Clipper');
        const clipper = await artifact_at(Clipper, MCD_CLIP_[token_name][ilk]);
        await clipper.upchost();
      }
    }
  }

  // SET ILKS DUNK

  console.log('Configuring ILK Dunks...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_flipDeploy = ilk_config.flipDeploy || {};
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      if (ilk_config.flipDeploy !== undefined) {
        const dunk = units(ilk_flipDeploy.dunk, 45);
        console.log('@flip.dunk', ilk_flipDeploy.dunk, dunk);
        await filex(MCD_CAT, ilk_name, 'dunk', dunk);
      }
    }
  }

  // SET ILKS BEG

  console.log('Configuring ILK Begs...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_flipDeploy = ilk_config.flipDeploy || {};

      if (ilk_config.flipDeploy !== undefined) {
        const beg = units(ilk_flipDeploy.beg, 16) + units('100', 16);
        console.log('@flip.beg', ilk_flipDeploy.beg, beg);
        await file(MCD_FLIP_[token_name][ilk], 'beg', beg);
      }
    }
  }

  // SET ILKS TTL

  console.log('Configuring ILK TTLs...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_flipDeploy = ilk_config.flipDeploy || {};

      if (ilk_config.flipDeploy !== undefined) {
        const ttl = units(ilk_flipDeploy.ttl, 0);
        console.log('@flip.ttl', ilk_flipDeploy.ttl, ttl);
        await file(MCD_FLIP_[token_name][ilk], 'ttl', ttl);
      }
    }
  }

  // SET ILKS TAU

  console.log('Configuring ILK Taus...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_flipDeploy = ilk_config.flipDeploy || {};

      if (ilk_config.flipDeploy !== undefined) {
        const tau = units(ilk_flipDeploy.tau, 0);
        console.log('@flip.tau', ilk_flipDeploy.tau, tau);
        await file(MCD_FLIP_[token_name][ilk], 'tau', tau);
      }
    }
  }

  // SET ILKS HOLE

  console.log('Configuring ILK Holes...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      if (ilk_config.clipDeploy !== undefined) {
        const hole = units(ilk_clipDeploy.hole, 45);
        console.log('@clip.hole', ilk_clipDeploy.hole, hole);
        await filex(MCD_DOG, ilk_name, 'hole', hole);
      }
    }
  }

  // SET ILKS CHIP

  console.log('Configuring ILK Chips...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};

      if (ilk_config.clipDeploy !== undefined) {
        const chip = units(ilk_clipDeploy.chip, 16);
        console.log('@clip.chip', ilk_clipDeploy.chip, chip);
        await file(MCD_CLIP_[token_name][ilk], 'chip', chip);
      }
    }
  }

  // SET ILKS TIP

  console.log('Configuring ILK Tips...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};

      if (ilk_config.clipDeploy !== undefined) {
        const tip = units(ilk_clipDeploy.tip, 45);
        console.log('@clip.tip', ilk_clipDeploy.tip, tip);
        await file(MCD_CLIP_[token_name][ilk], 'tip', tip);
      }
    }
  }

  // SET ILKS BUF

  console.log('Configuring ILK Bufs...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};

      if (ilk_config.clipDeploy !== undefined) {
        const buf = units(ilk_clipDeploy.buf, 25);
        console.log('@clip.buf', ilk_clipDeploy.buf, buf);
        await file(MCD_CLIP_[token_name][ilk], 'buf', buf);
      }
    }
  }

  // SET ILKS TAIL

  console.log('Configuring ILK Tails...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};

      if (ilk_config.clipDeploy !== undefined) {
        const tail = units(ilk_clipDeploy.tail, 0);
        console.log('@clip.tail', ilk_clipDeploy.tail, tail);
        await file(MCD_CLIP_[token_name][ilk], 'tail', tail);
      }
    }
  }

  // SET ILKS CUSP

  console.log('Configuring ILK Cusps...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};

      if (ilk_config.clipDeploy !== undefined) {
        const cusp = units(ilk_clipDeploy.cusp, 25);
        console.log('@clip.cusp', ilk_clipDeploy.cusp, cusp);
        await file(MCD_CLIP_[token_name][ilk], 'cusp', cusp);
      }
    }
  }

  // SET ILKS CALC PARAMS

  console.log('Configuring ILK Calc Params...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      if (ilk_config.clipDeploy !== undefined) {
        const calc_config = ilk_clipDeploy.calc || {};

        if (calc_config.type === 'LinearDecrease') {
          const tau = units(calc_config.tau, 0);
          console.log('@calc.tau', calc_config.tau, tau);
          await file(MCD_CLIP_CALC_[token_name][ilk], 'tau', tau);
        }
        if (calc_config.type === 'StairstepExponentialDecrease' || calc_config.type === 'ExponentialDecrease') {
          const cut = units(calc_config.cut, 25);
          console.log('@calc.cut', calc_config.cut, cut);
          await file(MCD_CLIP_CALC_[token_name][ilk], 'cut', cut);
        }
        if (calc_config.type === 'StairstepExponentialDecrease') {
          const step = units(calc_config.step, 0);
          console.log('@calc.step', calc_config.step, step);
          await file(MCD_CLIP_CALC_[token_name][ilk], 'step', step);
        }
      }
    }
  }

  // SET ILKS FAUCET

  console.log('Configuring ILK Faucets...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_gemDeploy = token_config.gemDeploy || {};

    if (Number(token_gemDeploy.faucetSupply) > 0) {
      const supply = units(token_gemDeploy.faucetSupply, 0);
      const newToken = await artifact_at(DSToken, T_[token_name]);
      await newToken.transfer(FAUCET, supply);
    }
    if (config_import.faucet === undefined) {
      if (Number(token_gemDeploy.faucetAmount) > 0) {
        const amount = units(token_gemDeploy.faucetAmount, 0);
        await restrictedTokenFaucet.setAmt(T_[token_name], amount);
      }
    }
  }

  // SET ILKS OSM

  console.log('Configuring ILK OSM...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    if (token_import.pip === undefined) {
      if (Number(token_pipDeploy.osmDelay) > 0) {
        const osmDelay = units(token_pipDeploy.osmDelay, 0);
        console.log('@pip.osmDelay', token_pipDeploy.osmDelay, osmDelay);
        console.log('Deploying OSM...');
        const osm = await artifact_deploy(OSM, VAL_[token_name]);
        PIP_[token_name] = osm.address;
        console.log('PIP_' + token_name.replace('-', '_') + '=' + PIP_[token_name]);
        await osm.step(osmDelay);
        if (token_pipDeploy.type === 'twap') {
          const univ2twapOracle = await artifact_at(UniV2TwapOracle, VAL_[token_name]);
          await univ2twapOracle.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'vault') {
          const vaultOracle = await artifact_at(VaultOracle, VAL_[token_name]);
          await vaultOracle.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'xsushi') {
          const xsushiOracle = await artifact_at(XSushiOracle, VAL_[token_name]);
          await xsushiOracle.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'comp') {
          const compOracle = await artifact_at(CompOracle, VAL_[token_name]);
          await compOracle.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'univ2lp') {
          const univ2lpOracle = await artifact_at(UNIV2LPOracle, VAL_[token_name]);
          await univ2lpOracle.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'chainlink') {
          const linkOracle = await artifact_at(LinkOracle, VAL_[token_name]);
          await linkOracle.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'median') {
          const median = await artifact_at(Median, VAL_[token_name]);
          await median.methods['kiss(address)'](PIP_[token_name]);
        }
        await osm.methods['kiss(address)'](MCD_SPOT);
        await osm.methods['kiss(address)'](MCD_END);
        for (const ilk in token_ilks) {
          const ilk_config = token_ilks[ilk];
          const ilk_clipDeploy = ilk_config.clipDeploy || {};
          const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

          if (ilk_config.clipDeploy !== undefined) {
            await osm.methods['kiss(address)'](MCD_CLIP_[token][ilk]);
            await osm.methods['kiss(address)'](CLIPPER_MOM);
          }
          await filex(MCD_SPOT, ilk_name, 'pip', PIP_[token_name]);
        }
        await osm.rely(MCD_PAUSE_PROXY);
        await osm.deny(DEPLOYER);
      }
    }
  }

  // SET ILKS OSM-MOM

  console.log('Configuring OSM Mom...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};
    const token_ilks = token_config.ilks || {};

    if (token_import.pip === undefined) {
      if (Number(token_pipDeploy.osmDelay) > 0) {
        const osm = await artifact_at(OSM, PIP_[token_name]);
        for (const ilk in token_ilks) {
          const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

          await osmMom.setOsm(ilk_name, PIP_[token_name]);
          if (Number(await osm.wards(DEPLOYER)) === 1) {
            await osm.rely(OSM_MOM);
          }
        }
      }
    }
  }
  await osmMom.setAuthority(MCD_ADM);
  await osmMom.setOwner(MCD_PAUSE_PROXY);

  // SET ILKS FLIPPER-MOM

  console.log('Configuring Flipper Mom...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_flipDeploy = ilk_config.flipDeploy || {};

      if (ilk_config.flipDeploy !== undefined) {
        await rely(MCD_FLIP_[token_name][ilk], FLIPPER_MOM);
      }
    }
  }
  await flipperMom.setAuthority(MCD_ADM);
  await flipperMom.setOwner(MCD_PAUSE_PROXY);

  // SET ILKS CLIPPER-MOM

  console.log('Configuring Clipper Mom...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_clipDeploy = ilk_config.clipDeploy || {};

      if (ilk_config.clipDeploy !== undefined) {
        await rely(MCD_CLIP_[token_name][ilk], CLIPPER_MOM);
        const cm_tolerance = units(ilk_clipDeploy.cm_tolerance, 25);
        console.log('@clip.cm_tolerance', ilk_clipDeploy.cm_tolerance, cm_tolerance);
        await clipperMom.setPriceTolerance(MCD_CLIP_[token_name][ilk], cm_tolerance);
      }
    }
  }
  await clipperMom.setAuthority(MCD_ADM);
  await clipperMom.setOwner(MCD_PAUSE_PROXY);

  // SET PIPS RIGHTS

  console.log('Configuring PIPs Rights...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    if (token_import.pip === undefined) {
      if (token_pipDeploy.type === 'twap') {
        const univ2twapOracle = await artifact_at(UniV2TwapOracle, VAL_[token_name]);
        await univ2twapOracle.rely(MCD_PAUSE_PROXY);
        await univ2twapOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'vault') {
        const vaultOracle = await artifact_at(VaultOracle, VAL_[token_name]);
        await vaultOracle.rely(MCD_PAUSE_PROXY);
        await vaultOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'xsushi') {
        const xsushiOracle = await artifact_at(XSushiOracle, VAL_[token_name]);
        await xsushiOracle.rely(MCD_PAUSE_PROXY);
        await xsushiOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'comp') {
        const compOracle = await artifact_at(CompOracle, VAL_[token_name]);
        await compOracle.rely(MCD_PAUSE_PROXY);
        await compOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'univ2lp') {
        const univ2lpOracle = await artifact_at(UNIV2LPOracle, VAL_[token_name]);
        await univ2lpOracle.rely(MCD_PAUSE_PROXY);
        await univ2lpOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'chainlink') {
        const linkOracle = await artifact_at(LinkOracle, VAL_[token_name]);
        await linkOracle.rely(MCD_PAUSE_PROXY);
        await linkOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'median') {
        const median = await artifact_at(Median, VAL_[token_name]);
        await median.rely(MCD_PAUSE_PROXY);
        await median.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'value') {
        const dsValue = await artifact_at(DSValue, VAL_[token_name]);
        await dsValue.setOwner(MCD_PAUSE_PROXY);
      }
      if (Number(token_pipDeploy.osmDelay) > 0) {
        const osm = await artifact_at(OSM, PIP_[token_name]);
        await osm.rely(MCD_PAUSE_PROXY);
        await osm.deny(DEPLOYER);
      }
    }
  }

  // SET ILK REGISTRY

  console.log('Configuring ILK Registry...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      await ilkRegistry.add(MCD_JOIN_[token_name][ilk]);
    }
  }
  await ilkRegistry.rely(MCD_PAUSE_PROXY);
  await ilkRegistry.deny(DEPLOYER);

  // LERP

  console.log('Deploying Lerp Factory...');
  const LerpFactory = artifacts.require('LerpFactory');
  const lerpFactory = await artifact_deploy(LerpFactory);
  const LERP_FAB = lerpFactory.address;
  console.log('LERP_FAB=' + LERP_FAB);
  await lerpFactory.rely(MCD_PAUSE_PROXY);
  await lerpFactory.deny(DEPLOYER);

  // CONFIGURE CHAIN LOG

  console.log('Configuring Chain Log...');
  for (const token_name in T_) {
    await chainLog.setAddress(web3.utils.asciiToHex(token_name), T_[token_name]);
  }
  for (const token_name in PIP_) {
    await chainLog.setAddress(web3.utils.asciiToHex('PIP_' + token_name.replace('-', '_')), PIP_[token_name]);
  }
  for (const token_name in MCD_JOIN_) {
    for (const ilk in MCD_JOIN_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_JOIN_' + token_name.replace('-', '_') + '_' + ilk), MCD_JOIN_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_FLIP_) {
    for (const ilk in MCD_FLIP_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_FLIP_' + token_name.replace('-', '_') + '_' + ilk), MCD_FLIP_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_CLIP_) {
    for (const ilk in MCD_CLIP_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_CLIP_' + token_name.replace('-', '_') + '_' + ilk), MCD_CLIP_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_CLIP_CALC_) {
    for (const ilk in MCD_CLIP_CALC_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_CLIP_CALC_' + token_name.replace('-', '_') + '_' + ilk), MCD_CLIP_CALC_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_PSM_) {
    for (const ilk in MCD_PSM_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_' + token_name.replace('-', '_') + '_' + ilk), MCD_PSM_[token_name][ilk]);
    }
  }
  await chainLog.setAddress(web3.utils.asciiToHex('CDP_MANAGER'), CDP_MANAGER);
  await chainLog.setAddress(web3.utils.asciiToHex('CHANGELOG'), CHANGELOG);
  await chainLog.setAddress(web3.utils.asciiToHex('CLIP_FAB'), CLIP_FAB);
  await chainLog.setAddress(web3.utils.asciiToHex('CLIPPER_MOM'), CLIPPER_MOM);
  await chainLog.setAddress(web3.utils.asciiToHex('DSR_MANAGER'), DSR_MANAGER);
  await chainLog.setAddress(web3.utils.asciiToHex('FAUCET'), FAUCET);
  await chainLog.setAddress(web3.utils.asciiToHex('FLIP_FAB'), FLIP_FAB);
  await chainLog.setAddress(web3.utils.asciiToHex('FLIPPER_MOM'), FLIPPER_MOM);
  await chainLog.setAddress(web3.utils.asciiToHex('GET_CDPS'), GET_CDPS);
  await chainLog.setAddress(web3.utils.asciiToHex('GOV_GUARD'), GOV_GUARD);
  await chainLog.setAddress(web3.utils.asciiToHex('ILK_REGISTRY'), ILK_REGISTRY);
  await chainLog.setAddress(web3.utils.asciiToHex('LERP_FAB'), LERP_FAB);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_ADM'), MCD_ADM);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_CAT'), MCD_CAT);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_DAI'), MCD_DAI);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_DEPLOY'), MCD_DEPLOY);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_DOG'), MCD_DOG);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_END'), MCD_END);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_ESM'), MCD_ESM);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_FLAP'), MCD_FLAP);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_FLASH'), MCD_FLASH);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_FLOP'), MCD_FLOP);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_GOV'), MCD_GOV);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_GOV_ACTIONS'), MCD_GOV_ACTIONS);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_IAM_AUTO_LINE'), MCD_IAM_AUTO_LINE);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_JOIN_DAI'), MCD_JOIN_DAI);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_JUG'), MCD_JUG);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_PAUSE'), MCD_PAUSE);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_PAUSE_PROXY'), MCD_PAUSE_PROXY);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_POT'), MCD_POT);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_SPOT'), MCD_SPOT);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_VAT'), MCD_VAT);
  await chainLog.setAddress(web3.utils.asciiToHex('MCD_VOW'), MCD_VOW);
  await chainLog.setAddress(web3.utils.asciiToHex('MULTICALL'), MULTICALL);
  await chainLog.setAddress(web3.utils.asciiToHex('OSM_MOM'), OSM_MOM);
  await chainLog.setAddress(web3.utils.asciiToHex('PROXY_ACTIONS'), PROXY_ACTIONS);
  await chainLog.setAddress(web3.utils.asciiToHex('PROXY_ACTIONS_DSR'), PROXY_ACTIONS_DSR);
  await chainLog.setAddress(web3.utils.asciiToHex('PROXY_ACTIONS_END'), PROXY_ACTIONS_END);
  await chainLog.setAddress(web3.utils.asciiToHex('PROXY_DEPLOYER'), PROXY_DEPLOYER);
  await chainLog.setAddress(web3.utils.asciiToHex('PROXY_FACTORY'), PROXY_FACTORY);
  await chainLog.setAddress(web3.utils.asciiToHex('PROXY_PAUSE_ACTIONS'), PROXY_PAUSE_ACTIONS);
  await chainLog.setAddress(web3.utils.asciiToHex('PROXY_REGISTRY'), PROXY_REGISTRY);
  await chainLog.setAddress(web3.utils.asciiToHex('VOTE_DELEGATE_PROXY_FACTORY'), VOTE_DELEGATE_PROXY_FACTORY);
  await chainLog.setAddress(web3.utils.asciiToHex('VOTE_PROXY_FACTORY'), VOTE_PROXY_FACTORY);
  await chainLog.deny(DEPLOYER);

  // SET PAUSE AUTH DELAY

  //console.log('Configuring Authority & Delay...');
  //if (Number(config.pauseDelay) >= 0) {
  //  await setAuthorityAndDelay(MCD_ADM, units(config.pauseDelay, 0));
  //}

  // TRANSFER DEPLOYER ADMIN RIGHTS TO MULTISIG

  await dsRoles.setRootUser(MULTISIG, true);
  await dsRoles.setRootUser(DEPLOYER, false);
  await dsRoles.setOwner(MULTISIG);
  await proxyDeployer.setOwner(MULTISIG);

  const finalBalance = await web3.eth.getBalance(DEPLOYER);
  console.log('TOTAL COST:', BigInt(initialBalance) - BigInt(finalBalance));
};
