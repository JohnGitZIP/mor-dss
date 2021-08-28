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

  const chainId = await web3.eth.net.getId();

  const config = require('./config/' + CONFIG[chainId] + '.json');
  const config_import = config.import || {};
  const config_tokens = config.tokens || {};

  // MULTICALL

  const Multicall = artifacts.require('Multicall');
  const MULTICALL = '0x0b78ad358dDa2887285eaD72e84b47242360b872';
  const multicall = await artifact_at(Multicall, MULTICALL);
  console.log('MULTICALL=' + MULTICALL);

  // PROXY REGISTRY

  const PROXY_FACTORY = '0xb05b13496A6451A1Eb2fB18393232368b345C577';
  console.log('PROXY_FACTORY=' + PROXY_FACTORY);
  const PROXY_REGISTRY = '0x4939C03546FEAeC270507e8D4a819BeB40A2BD59';
  console.log('PROXY_REGISTRY=' + PROXY_REGISTRY);
  const ProxyRegistry = artifacts.require('ProxyRegistry');
  const proxyRegistry = await artifact_at(ProxyRegistry, PROXY_REGISTRY);

  // FABS

  const VatFab = artifacts.require('VatFab');
  const VAT_FAB = '0x741C6E1ef20f3932148468b97d18267520D94994';
  const vatFab = await artifact_at(VatFab, VAT_FAB);
  console.log('VAT_FAB=' + VAT_FAB);

  const JugFab = artifacts.require('JugFab');
  const JUG_FAB = '0x8A1F8ce3De0F3d54F8D3218b42390637eF6037E0';
  const jugFab = await artifact_at(JugFab, JUG_FAB);
  console.log('JUG_FAB=' + JUG_FAB);

  const VowFab = artifacts.require('VowFab');
  const VOW_FAB = '0xe090fbA275a39A66f37487801D86EE099F75148a';
  const vowFab = await artifact_at(VowFab, VOW_FAB);
  console.log('VOW_FAB=' + VOW_FAB);

  const CatFab = artifacts.require('CatFab');
  const CAT_FAB = '0x2eb0DCb9eDfCA6DcC944Aa541B9f075Cb54D4576';
  const catFab = await artifact_at(CatFab, CAT_FAB);
  console.log('CAT_FAB=' + CAT_FAB);

  const DogFab = artifacts.require('DogFab');
  const DOG_FAB = '0x2a276BB021426EA89536e918e0105D3243FD3b86';
  const dogFab = await artifact_at(DogFab, DOG_FAB);
  console.log('DOG_FAB=' + DOG_FAB);

  const DaiFab = artifacts.require('DaiFab');
  const DAI_FAB = '0x0B9D71FecE78E8F93Ab6C35A12A02513Eb0D8e79';
  const daiFab = await artifact_at(DaiFab, DAI_FAB);
  console.log('DAI_FAB=' + DAI_FAB);

  const DaiJoinFab = artifacts.require('DaiJoinFab');
  const MCD_JOIN_FAB = '0x45777E44d2d59b4d3bADB198CC5ece59524c7cce';
  const daiJoinFab = await artifact_at(DaiJoinFab, MCD_JOIN_FAB);
  console.log('MCD_JOIN_FAB=' + MCD_JOIN_FAB);

  const FlapFab = artifacts.require('FlapFab');
  const FLAP_FAB = '0xB319297a68E6b3d25D6d3C34b773614186EdB0C5';
  const flapFab = await artifact_at(FlapFab, FLAP_FAB);
  console.log('FLAP_FAB=' + FLAP_FAB);

  const FlopFab = artifacts.require('FlopFab');
  const FLOP_FAB = '0x17dC3B78E2eCb298187B8d0c2929B00C8A154746';
  const flopFab = await artifact_at(FlopFab, FLOP_FAB);
  console.log('FLOP_FAB=' + FLOP_FAB);

  const FlipFab = artifacts.require('FlipFab');
  const FLIP_FAB = '0x30623E39aed9483c033FEd109f5fd009ff7F0bAf';
  const flipFab = await artifact_at(FlipFab, FLIP_FAB);
  console.log('FLIP_FAB=' + FLIP_FAB);

  const ClipFab = artifacts.require('ClipFab');
  const CLIP_FAB = '0xC1A9385d9953d4C0552db4Ad321b71B97309b1b1';
  const clipFab = await artifact_at(ClipFab, CLIP_FAB);
  console.log('CLIP_FAB=' + CLIP_FAB);

  const SpotFab = artifacts.require('SpotFab');
  const SPOT_FAB = '0xc652b9c2aB4Fe6E17EBA677dcc7Bb0b7F6e76770';
  const spotFab = await artifact_at(SpotFab, SPOT_FAB);
  console.log('SPOT_FAB=' + SPOT_FAB);

  const PotFab = artifacts.require('PotFab');
  const POT_FAB = '0x7E98Da8124baa6d800f9c021643996595485BA80';
  const potFab = await artifact_at(PotFab, POT_FAB);
  console.log('POT_FAB=' + POT_FAB);

  const EndFab = artifacts.require('EndFab');
  const END_FAB = '0x1e674E1D2B8a1bF8431AD099B94a3B6E49847ED6';
  const endFab = await artifact_at(EndFab, END_FAB);
  console.log('END_FAB=' + END_FAB);

  const ESMFab = artifacts.require('ESMFab');
  const ESM_FAB = '0xA7E3ef1BCE9f894d9f8205AAbD478a8e461e0610';
  const esmFab = await artifact_at(ESMFab, ESM_FAB);
  console.log('ESM_FAB=' + ESM_FAB);

  const PauseFab = artifacts.require('PauseFab');
  const PAUSE_FAB = '0xa5e94e7BB58df6471FcFFdeaE14F3e4b16a48420';
  const pauseFab = await artifact_at(PauseFab, PAUSE_FAB);
  console.log('PAUSE_FAB=' + PAUSE_FAB);

  // GOV TOKEN

  let MCD_GOV = '0x336eD56D8615271b38EcEE6F4786B55d0EE91b96';
  const DSToken = artifacts.require('DSToken');
  const govToken = await artifact_at(DSToken, MCD_GOV);

  // CORE DEPLOYER

  const MCD_DEPLOY = '0xa10d039d4AD03f15FFF3e49916F62D35923238f6';
  const dssDeploy = await artifact_at(DssDeploy, MCD_DEPLOY);
  console.log('MCD_DEPLOY=' + MCD_DEPLOY);

  // AUTHORITY

  const DSRoles = artifacts.require('DSRoles');
  const MCD_ADM_TEMP = '0xDacf9095314275E65b9aF40c0e6b0BB8969ad684';
  const dsRoles = await artifact_at(DSRoles, MCD_ADM_TEMP);
  console.log('MCD_ADM_TEMP=' + MCD_ADM_TEMP);

  // CORE

  // Deploy Vat
  const Vat = artifacts.require('Vat');
  const MCD_VAT = '0x713C28b2Ef6F89750BDf97f7Bbf307f6F949b3fF';
  const vat = await artifact_at(Vat, MCD_VAT);
  console.log('MCD_VAT=' + MCD_VAT);
  const Spotter = artifacts.require('Spotter');
  const MCD_SPOT = '0x7C4925D62d24A826F8d945130E620fdC510d0f68';
  const spotter = await artifact_at(Spotter, MCD_SPOT);
  console.log('MCD_SPOT=' + MCD_SPOT);

  // Deploy Dai
  const Dai = artifacts.require('Dai');
  const MCD_DAI = '0x87BAde473ea0513D4aA7085484aEAA6cB6EBE7e3';
  const dai = await artifact_at(Dai, MCD_DAI);
  console.log('MCD_DAI=' + MCD_DAI);
  const dai_name = await dai.symbol();
  const DaiJoin = artifacts.require('DaiJoin');
  const MCD_JOIN_DAI = '0x9438760f1ac27F7cFE638D686d889C56eb42F4D0';
  const daiJoin = await artifact_at(DaiJoin, MCD_JOIN_DAI);
  console.log('MCD_JOIN_DAI=' + MCD_JOIN_DAI);

  // Deploy Taxation
  const Jug = artifacts.require('Jug');
  const MCD_JUG = '0xb2d474EAAB89DD0134B8A98a9AB38aC41a537c6C';
  const jug = await artifact_at(Jug, MCD_JUG);
  console.log('MCD_JUG=' + MCD_JUG);
  const Pot = artifacts.require('Pot');
  const MCD_POT = '0x6e22DA49b28dc5aB70aC7527CC0cc04bD35eB615';
  const pot = await artifact_at(Pot, MCD_POT);
  console.log('MCD_POT=' + MCD_POT);

  // Deploy Auctions
  const Flapper = artifacts.require('Flapper');
  const MCD_FLAP = '0x3Bf3C5146c5b1259f8886d3B2480aD53A835F795';
  const flap = await artifact_at(Flapper, MCD_FLAP);
  console.log('MCD_FLAP=' + MCD_FLAP);
  const Flopper = artifacts.require('Flopper');
  const MCD_FLOP = '0x1DC6298DCa4A433581802144Da9bA1640d90FEFc';
  const flop = await artifact_at(Flopper, MCD_FLOP);
  console.log('MCD_FLOP=' + MCD_FLOP);
  const Vow = artifacts.require('Vow');
  const MCD_VOW = '0xbb37ccb8eFd844abD260AfC68025F5491570AC9d';
  const vow = await artifact_at(Vow, MCD_VOW);
  console.log('MCD_VOW=' + MCD_VOW);

  // Deploy Liquidator
  const Cat = artifacts.require('Cat');
  const MCD_CAT = '0x22db688102b2Fa5bD0456252Fc4a9EA6ca70F9dE';
  const cat = await artifact_at(Cat, MCD_CAT);
  console.log('MCD_CAT=' + MCD_CAT);
  const Dog = artifacts.require('Dog');
  const MCD_DOG = '0xDea7563440195eA7Ea83900DE38F603C25a37594';
  const dog = await artifact_at(Dog, MCD_DOG);
  console.log('MCD_DOG=' + MCD_DOG);

  // Deploy End
  const End = artifacts.require('End');
  const MCD_END = '0x7f70639F3aC04b2919d5bA1b397aDe484D87be4e';
  const end = await artifact_at(End, MCD_END);
  console.log('MCD_END=' + MCD_END);

  // Deploy Pause
  const DSPause = artifacts.require('DSPause');
  const MCD_PAUSE = '0xb93949F3b910A6cfAc8d76B1677BA331183498A4';
  const pause = await artifact_at(DSPause, MCD_PAUSE);
  console.log('MCD_PAUSE=' + MCD_PAUSE);
  const MCD_PAUSE_PROXY = '0x8Ab3Ce4138fA46C2E0FcaA89e8A721A6252e5Fae';
  console.log('MCD_PAUSE_PROXY=' + MCD_PAUSE_PROXY);

  // Deploy ESM
  const ESM = artifacts.require('ESM');
  const MCD_ESM = '0x9C482597dA255549F53406b2D57498d2959F2EA7';
  const esm = await artifact_at(ESM, MCD_ESM);
  console.log('MCD_ESM=' + MCD_ESM);

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
      console.log('Publishing Gem Token...');
      const gemToken = await artifact_deploy(GemToken, ...params);
      T_[token_name] = gemToken.address;
      console.log(token_name + '=' + T_[token_name]);
    }
  }

  // FEEDS

  const VAL_ = {};
  const PIP_ = {};
  const DSValue = artifacts.require('DSValue');
  const Median = artifacts.require('Median');
  const LinkOracle = artifacts.require('LinkOracle');
  const UNIV2LPOracle = artifacts.require('UNIV2LPOracle');
  const VaultOracle = artifacts.require('VaultOracle');
  const UniV2TwapOracle = artifacts.require('UniV2TwapOracle');
  const UniswapV2PairLike = artifacts.require('UniswapV2PairLike');
  PIP_['BUSD'] = VAL_['BUSD'] = '0x08F39c96E6A954894252171a5300dECD350d3fA8';
  PIP_['USDC'] = VAL_['USDC'] = '0xd4d7BCF6c7b54349C91f39cAd89B228C53FE6BD7';
  PIP_['BNB'] = VAL_['BNB'] = '0x63c2E42758EF8776BF7b70afb00E0e2748Ad3F05';
  PIP_['ETH'] = VAL_['ETH'] = '0x7622ce6588116c1C7F1a4E61A153C1efC7226f78';
  PIP_['BTCB'] = VAL_['BTCB'] = '0x585707c57413e09a4BE58e89798f5074b2B89De1';
  PIP_['CAKE'] = VAL_['CAKE'] = '0x447FE0cc2145F27127Cf60C6FD6D9025A4208b8B';
  PIP_['BANANA'] = VAL_['BANANA'] = '0x6Ee2E2d648698357Cc518D1D5E8170586dca5348';
  PIP_['PCSBNBCAKE'] = VAL_['PCSBNBCAKE'] = '0x326Db2b9640e51077fD9B70767855f5c2128e91A';
  PIP_['PCSBNBBUSD'] = VAL_['PCSBNBBUSD'] = '0x1a06452B84456728Ee4054AE6157d3feDF56C295';
  PIP_['PCSBNBETH'] = VAL_['PCSBNBETH'] = '0x8BBcd7E4da4395E391Fbfc2A11775debe3ca0D58';
  PIP_['PCSBNBBTCB'] = VAL_['PCSBNBBTCB'] = '0xcf55226EE56F174B3cB3F75a5182d2300e788e91';
  PIP_['PCSBUSDUSDC'] = VAL_['PCSBUSDUSDC'] = '0xC5065b47A133071fe8cD94f46950fCfBA53864C6';
  PIP_['PCSBUSDBTCB'] = VAL_['PCSBUSDBTCB'] = '0x3d4604395595Bb30A8B7754b5dDBF0B3F680564b';
  PIP_['PCSBUSDCAKE'] = VAL_['PCSBUSDCAKE'] = '0x1e1ee1AcD4B7ad405A0D701884F093d54DF7fba4';
  PIP_['PCSETHBTCB'] = VAL_['PCSETHBTCB'] = '0x58849cE72b4E4338C00f0760Ca6AfCe11b5ee370';
  PIP_['PCSETHUSDC'] = VAL_['PCSETHUSDC'] = '0xc690F38430Db2057C992c3d3190D9902CD7E0294';
  PIP_['STKCAKE'] = VAL_['STKCAKE'] = '0xeE991787C4ffE1de8c8c7c45e3EF14bFc47A2735';
  PIP_['STKBANANA'] = VAL_['STKBANANA'] = '0xE4d5a6E0581646f5a5806F9c171E96879ae8b385';
  PIP_['STKPCSBNBCAKE'] = VAL_['STKPCSBNBCAKE'] = '0x5Df1B3212EB26f506af448cE25cd4E315BEdf630';
  PIP_['STKPCSBNBBUSD'] = VAL_['STKPCSBNBBUSD'] = '0x8a8eA20937BBC38c0952b206892e9A273E7180E1';
  PIP_['STKPCSBNBETH'] = VAL_['STKPCSBNBETH'] = '0x0Ca167778392473E0868503522a11f1e749bbF82';
  PIP_['STKPCSBNBBTCB'] = VAL_['STKPCSBNBBTCB'] = '0x7e7C92D432307218b94052488B2CD54D8b826546';
  PIP_['STKPCSBUSDUSDC'] = VAL_['STKPCSBUSDUSDC'] = '0x7bA715959A52ef046BE76c4E32f1de1d161E2888';
  PIP_['STKPCSBUSDBTCB'] = VAL_['STKPCSBUSDBTCB'] = '0x8652883985B39D85B6432e3Ec5D9bea77edc31b0';
  PIP_['STKPCSBUSDCAKE'] = VAL_['STKPCSBUSDCAKE'] = '0xeBcb52E5696A2a90D684C76cDf7095534F265370';
  PIP_['STKPCSETHBTCB'] = VAL_['STKPCSETHBTCB'] = '0x70AF6F516f9E167620a5bdd970c671c69C81E92F';
  PIP_['STKPCSETHUSDC'] = VAL_['STKPCSETHUSDC'] = '0x68697fF7Ec17F528E3E4862A1dbE6d7D9cBBd5C6';
  for (const token_name in VAL_) {
    console.log('VAL_' + token_name + '=' + VAL_[token_name]);
  }

  // DEPLOY ILKS

  const MCD_JOIN_ = {};
  const MCD_FLIP_ = {};
  const MCD_CLIP_ = {};
  const MCD_CLIP_CALC_ = {};
  MCD_JOIN_['STKCAKE'] = {};
  MCD_CLIP_CALC_['STKCAKE'] = {};
  MCD_CLIP_['STKCAKE'] = {};
  MCD_JOIN_['STKBANANA'] = {};
  MCD_CLIP_CALC_['STKBANANA'] = {};
  MCD_CLIP_['STKBANANA'] = {};
  MCD_JOIN_['STKPCSBNBCAKE'] = {};
  MCD_CLIP_CALC_['STKPCSBNBCAKE'] = {};
  MCD_CLIP_['STKPCSBNBCAKE'] = {};
  MCD_JOIN_['STKPCSBNBBUSD'] = {};
  MCD_CLIP_CALC_['STKPCSBNBBUSD'] = {};
  MCD_CLIP_['STKPCSBNBBUSD'] = {};
  MCD_JOIN_['STKPCSBNBETH'] = {};
  MCD_CLIP_CALC_['STKPCSBNBETH'] = {};
  MCD_CLIP_['STKPCSBNBETH'] = {};
  MCD_JOIN_['STKPCSBNBBTCB'] = {};
  MCD_CLIP_CALC_['STKPCSBNBBTCB'] = {};
  MCD_CLIP_['STKPCSBNBBTCB'] = {};
  MCD_JOIN_['STKPCSBUSDUSDC'] = {};
  MCD_CLIP_CALC_['STKPCSBUSDUSDC'] = {};
  MCD_CLIP_['STKPCSBUSDUSDC'] = {};
  MCD_JOIN_['STKPCSBUSDBTCB'] = {};
  MCD_CLIP_CALC_['STKPCSBUSDBTCB'] = {};
  MCD_CLIP_['STKPCSBUSDBTCB'] = {};
  MCD_JOIN_['STKPCSBUSDCAKE'] = {};
  MCD_CLIP_CALC_['STKPCSBUSDCAKE'] = {};
  MCD_CLIP_['STKPCSBUSDCAKE'] = {};
  MCD_JOIN_['STKPCSETHBTCB'] = {};
  MCD_CLIP_CALC_['STKPCSETHBTCB'] = {};
  MCD_CLIP_['STKPCSETHBTCB'] = {};
  MCD_JOIN_['STKPCSETHUSDC'] = {};
  MCD_CLIP_CALC_['STKPCSETHUSDC'] = {};
  MCD_CLIP_['STKPCSETHUSDC'] = {};
  MCD_JOIN_['STKCAKE']['A'] = '0xf72f07b96D4Ee64d1065951cAfac032B63C767bb';
  MCD_CLIP_CALC_['STKCAKE']['A'] = '0xeeF286Af1d7601EA5E40473741D79e55770498d8';
  MCD_CLIP_['STKCAKE']['A'] = '0x61C8CF1e4E1DBdF88fceDd55e2956345b4df6B21';
  MCD_JOIN_['STKBANANA']['A'] = '0x3728Bd61F582dA0b22cFe7EDC59aC33f7402c4e0';
  MCD_CLIP_CALC_['STKBANANA']['A'] = '0xca70528209917F4D0443Dd3e90C863b19584CCAF';
  MCD_CLIP_['STKBANANA']['A'] = '0xFFAee04Db99530DeCAe1133DbEc5fD7Cc3BcC4aD';
  MCD_JOIN_['STKPCSBNBCAKE']['A'] = '0x9605863bf02E983861C0a4ac28a7527Fcf36732b';
  MCD_CLIP_CALC_['STKPCSBNBCAKE']['A'] = '0x2117C852417B008d18E292D18ab196f49AA896cf';
  MCD_CLIP_['STKPCSBNBCAKE']['A'] = '0x62711202EF9368e5401eCeaFD90E71A411286Edd';
  MCD_JOIN_['STKPCSBNBBUSD']['A'] = '0x842B07b7D9C77A6bE833a660FB628C6d28Bda0a8';
  MCD_CLIP_CALC_['STKPCSBNBBUSD']['A'] = '0x7253bC2Ca443807391451a54cAF1bC1915A8b584';
  MCD_CLIP_['STKPCSBNBBUSD']['A'] = '0x0c6eEaE3a36ec66B30A58917166D526f499e431B';
  MCD_JOIN_['STKPCSBNBETH']['A'] = '0x65764167EC4B38D611F961515B51a40628614018';
  MCD_CLIP_CALC_['STKPCSBNBETH']['A'] = '0x74a08d8D88Aaf7d83087aa159B5e17F017cd1cFD';
  MCD_CLIP_['STKPCSBNBETH']['A'] = '0x6f77799B3D36a61FdF8eb82E0DdEDcF4BA041042';
  MCD_JOIN_['STKPCSBNBBTCB']['A'] = '0x7ae7E7D2efCBB0289E451Fc167DF91b996390d7C';
  MCD_CLIP_CALC_['STKPCSBNBBTCB']['A'] = '0x3a6a2d813Bc8C51E72d3348311c62EB2D1D9dEe2';
  MCD_CLIP_['STKPCSBNBBTCB']['A'] = '0x940aA35E47d54a5EE4dc3C6Ff6Eb1bdec065c2A5';
  MCD_JOIN_['STKPCSBUSDUSDC']['A'] = '0xd312EC88F0CE9512804db1e08b1EB6901c278d0f';
  MCD_CLIP_CALC_['STKPCSBUSDUSDC']['A'] = '0x6ef32c6cF03B83Ab3A0DcA92f03E67A40CC45f7D';
  MCD_CLIP_['STKPCSBUSDUSDC']['A'] = '0x8641BdBECE44c3f05b1991922f721C4585f22456';
  MCD_JOIN_['STKPCSBUSDBTCB']['A'] = '0x6ADeB113EbD9a6a9B7CaB380Ba0A204DC08456b5';
  MCD_CLIP_CALC_['STKPCSBUSDBTCB']['A'] = '0xDD8E350052537bE8A621c8431117969E9B96343d';
  MCD_CLIP_['STKPCSBUSDBTCB']['A'] = '0x226d0e1AC4C8b6253caf5CEda067fb5a6EDCDF6F';
  MCD_JOIN_['STKPCSBUSDCAKE']['A'] = '0x77a5E69955E1837B0c3f50159577ccb7468d6a4d';
  MCD_CLIP_CALC_['STKPCSBUSDCAKE']['A'] = '0xD9241689BBcaa6BF11854Af5f9c18AA642a98C23';
  MCD_CLIP_['STKPCSBUSDCAKE']['A'] = '0x435D4017b6A4C21f25077ccd5849F083F3e20452';
  MCD_JOIN_['STKPCSETHBTCB']['A'] = '0x781E44923fb912b1d0aa892BBf62dD1b4dfC9cd5';
  MCD_CLIP_CALC_['STKPCSETHBTCB']['A'] = '0xd6e80B0ae1f84A37AB145084a80893854c27ecc0';
  MCD_CLIP_['STKPCSETHBTCB']['A'] = '0x754e4D6fbbDdE2e77c390E4BAC54C7e0E48901Ab';
  MCD_JOIN_['STKPCSETHUSDC']['A'] = '0x754B2f8704A3D453151eE69875ECde4C610F2BEa';
  MCD_CLIP_CALC_['STKPCSETHUSDC']['A'] = '0x972F78558B4F8D677d84c8d1d4A73836c8DE4900';
  MCD_CLIP_['STKPCSETHUSDC']['A'] = '0xbCa0650FF329211D3784C82196421A885FDB0451';
  for (const token_name in MCD_JOIN_) {
    for (const ilk in MCD_JOIN_[token_name]) {
      console.log('MCD_JOIN_' + token_name + '_' + ilk + '=' + MCD_JOIN_[token_name][ilk]);
      console.log('MCD_CLIP_CALC_' + token_name + '_' + ilk + '=' + MCD_CLIP_CALC_[token_name][ilk]);
      console.log('MCD_CLIP_' + token_name + '_' + ilk + '=' + MCD_CLIP_[token_name][ilk]);
    }
  }

  // PROXY ACTIONS

  const DssProxyActions = artifacts.require('DssProxyActions');
  const PROXY_ACTIONS = '0xF33b8A3fe8c6cE09F2670c28EE2bc4F7ddd2551e';
  const dssProxyActions = await artifact_at(DssProxyActions, PROXY_ACTIONS);
  console.log('PROXY_ACTIONS=' + PROXY_ACTIONS);

  const DssProxyActionsEnd = artifacts.require('DssProxyActionsEnd');
  const PROXY_ACTIONS_END = '0xB651Ec511675925ebCa7B035baf5B77190FD3440';
  const dssProxyActionsEnd = await artifact_at(DssProxyActionsEnd, PROXY_ACTIONS_END);
  console.log('PROXY_ACTIONS_END=' + PROXY_ACTIONS_END);

  const DssProxyActionsDsr = artifacts.require('DssProxyActionsDsr');
  const PROXY_ACTIONS_DSR = '0x136EF4EbB71c147969AFB9666D4b900756C64b27';
  const dssProxyActionsDsr = await artifact_at(DssProxyActionsDsr, PROXY_ACTIONS_DSR);
  console.log('PROXY_ACTIONS_DSR=' + PROXY_ACTIONS_DSR);

  // CDP MANAGER

  const DssCdpManager = artifacts.require('DssCdpManager');
  const CDP_MANAGER = '0x563d13664023a7d63463b8cdc443552c047642Cb';
  const dssCdpManager = await artifact_at(DssCdpManager, CDP_MANAGER);
  console.log('CDP_MANAGER=' + CDP_MANAGER);

  const GetCdps = artifacts.require('GetCdps');
  const GET_CDPS = '0x62705B32e873e939738064c9a1009a037Df7615e';
  const getCdps = await artifact_at(GetCdps, GET_CDPS);
  console.log('GET_CDPS=' + GET_CDPS);

  // DSR MANAGER

  const DsrManager = artifacts.require('DsrManager');
  const DSR_MANAGER = '0xbB0613d967411394626Ecc48e019960c4724364E';
  const dsrManager = await artifact_at(DsrManager, DSR_MANAGER);
  console.log('DSR_MANAGER=' + DSR_MANAGER);

  // OSM MOM

  const OSM = artifacts.require('OSM');
  const OsmMom = artifacts.require('OsmMom');
  const OSM_MOM = '0x6d6e37f4fFC13ebA4B6e0158cE8753549152BF35';
  const osmMom = await artifact_at(OsmMom, OSM_MOM);
  console.log('OSM_MOM=' + OSM_MOM);

  // FLIPPER MOM

  const FlipperMom = artifacts.require('FlipperMom');
  const FLIPPER_MOM = '0x7dB700723a20511Beb367694e8c33b8dc23418bB';
  const flipperMom = await artifact_at(FlipperMom, FLIPPER_MOM);
  console.log('FLIPPER_MOM=' + FLIPPER_MOM);

  // CLIPPER MOM

  const ClipperMom = artifacts.require('ClipperMom');
  const CLIPPER_MOM = '0xD56d12F8afaE2bf9CfcF1201F00a3c4560B93276';
  const clipperMom = await artifact_at(ClipperMom, CLIPPER_MOM);
  console.log('CLIPPER_MOM=' + CLIPPER_MOM);

  // ILK REGISTRY

  const IlkRegistry = artifacts.require('IlkRegistry');
  const ILK_REGISTRY = '0x32Ea492a11450B5292A5E6EFc059c851cB096d04';
  const ilkRegistry = await artifact_at(IlkRegistry, ILK_REGISTRY);
  console.log('ILK_REGISTRY=' + ILK_REGISTRY);

  // GOV ACTIONS

  const GovActions = artifacts.require('GovActions');
  const MCD_GOV_ACTIONS = '0xbD69CD541E7676222d4003aB0dB6ecff59E9503c';
  const govActions = await artifact_at(GovActions, MCD_GOV_ACTIONS);
  console.log('MCD_GOV_ACTIONS=' + MCD_GOV_ACTIONS);

  // PAUSE PROXY ACTIONS

  const DssDeployPauseProxyActions = artifacts.require('DssDeployPauseProxyActions');
  const PROXY_PAUSE_ACTIONS = '0x689c75aF6272409f8C9cD904DAE1945EBa2129BF';
  const dssDeployPauseProxyActions = await artifact_at(DssDeployPauseProxyActions, PROXY_PAUSE_ACTIONS);
  console.log('PROXY_PAUSE_ACTIONS=' + PROXY_PAUSE_ACTIONS);

  // PROXY DEPLOYER

  const DSProxy = artifacts.require('DSProxy');
  const PROXY_DEPLOYER = '0xC68776AC66De86B4DEB240E9619054C90A758d7c';
  const proxyDeployer = await artifact_at(DSProxy, PROXY_DEPLOYER);
  console.log('PROXY_DEPLOYER=' + PROXY_DEPLOYER);

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

  // ADM CHIEF

  const VOTE_DELEGATE_PROXY_FACTORY = '0x66Fd8cFf13815D7b333f1205023C7af6Aa4020FB';
  const VOTE_PROXY_FACTORY = '0x926E0b08522B6bA732551E548e9d85d5c982Cf0A';
  const MCD_ADM = '0x790AE603e560457D3aFab286A2E27C0502AE17E5';
  console.log('MCD_ADM=' + MCD_ADM);
  console.log('VOTE_PROXY_FACTORY=' + VOTE_PROXY_FACTORY);
  console.log('VOTE_DELEGATE_PROXY_FACTORY=' + VOTE_DELEGATE_PROXY_FACTORY);

  // AUTO LINE

  const DssAutoLine = artifacts.require('DssAutoLine');
  const MCD_IAM_AUTO_LINE = '0x25B92928363E591D1b6f02bFe3c8dBdDEf5e0BD5';
  const dssAutoLine = await artifact_at(DssAutoLine, MCD_IAM_AUTO_LINE);
  console.log('MCD_IAM_AUTO_LINE=' + MCD_IAM_AUTO_LINE);

  // FLASH

  const DssFlash = artifacts.require('DssFlash');
  const MCD_FLASH = '0xb0947C3aeCC1C0FEA1F25e1cFadD4087102943Bf';
  const dssFlash = await artifact_at(DssFlash, MCD_FLASH);
  console.log('MCD_FLASH=' + MCD_FLASH);

  // CHAIN LOG

  const ChainLog = artifacts.require('ChainLog');
  const CHANGELOG = '0xc1E1d478296F3b0F2CA9Cc88F620de0b791aBf27';
  const chainLog = await artifact_at(ChainLog, CHANGELOG);
  console.log('CHANGELOG=' + CHANGELOG);

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
        console.log('PIP_' + token_name + '=' + PIP_[token_name]);
        await osm.step(osmDelay);
        if (token_pipDeploy.type === 'twap') {
          const univ2twapOracle = await artifact_at(UniV2TwapOracle, VAL_[token_name]);
          await univ2twapOracle.methods['kiss(address)'](PIP_[token_name]);
        }
        if (token_pipDeploy.type === 'vault') {
          const vaultOracle = await artifact_at(VaultOracle, VAL_[token_name]);
          await vaultOracle.methods['kiss(address)'](PIP_[token_name]);
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
        // await osm.deny(DEPLOYER);
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
        // await univ2twapOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'vault') {
        const vaultOracle = await artifact_at(VaultOracle, VAL_[token_name]);
        await vaultOracle.rely(MCD_PAUSE_PROXY);
        // await vaultOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'univ2lp') {
        const univ2lpOracle = await artifact_at(UNIV2LPOracle, VAL_[token_name]);
        await univ2lpOracle.rely(MCD_PAUSE_PROXY);
        // await univ2lpOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'chainlink') {
        const linkOracle = await artifact_at(LinkOracle, VAL_[token_name]);
        await linkOracle.rely(MCD_PAUSE_PROXY);
        // await linkOracle.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'median') {
        const median = await artifact_at(Median, VAL_[token_name]);
        await median.rely(MCD_PAUSE_PROXY);
        // await median.deny(DEPLOYER);
      }
      if (token_pipDeploy.type === 'value') {
        const dsValue = await artifact_at(DSValue, VAL_[token_name]);
        await dsValue.setOwner(MCD_PAUSE_PROXY);
      }
      if (Number(token_pipDeploy.osmDelay) > 0) {
        const osm = await artifact_at(OSM, PIP_[token_name]);
        await osm.rely(MCD_PAUSE_PROXY);
        // await osm.deny(DEPLOYER);
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
  // await ilkRegistry.deny(DEPLOYER);

  return;

  // PSM

  console.log('Deploying Lerp Factory...');
  const LerpFactory = artifacts.require('LerpFactory');
  const lerpFactory = await artifact_deploy(LerpFactory);
  const LERP_FAB = lerpFactory.address;
  console.log('LERP_FAB=' + LERP_FAB);
  await lerpFactory.rely(MCD_PAUSE_PROXY);

  const MCD_JOIN_PSM_ = {};
  const MCD_PSM_ = {};
  const LERP_ = {};
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_psmDeploy = token_config.psmDeploy;

    if (token_psmDeploy !== undefined) {
      MCD_JOIN_PSM_[token_name] = MCD_JOIN_PSM_[token_name] || {};
      MCD_PSM_[token_name] = MCD_PSM_[token_name] || {};
      LERP_[token_name] = LERP_[token_name] || {};

      const src = token_psmDeploy.src;
      const extraParams = token_psmDeploy.extraParams || [];
      const token_ilks = token_psmDeploy.ilks || {};
      let AuthGemJoin;
      switch (src) {
      case 'AuthGemJoin': AuthGemJoin = artifacts.require('AuthGemJoin'); break;
      case 'AuthGemJoin5': AuthGemJoin = artifacts.require('AuthGemJoin5'); break;
      default: throw new Error('Unknown auth join: ' + src);
      }

      for (const ilk in token_ilks) {
        const ilk_config = token_ilks[ilk];
        const line = units(ilk_config.line, 45);
        const tin = units(ilk_config.tin, 18);
        const tout = units(ilk_config.tout, 18);
        const ilk_name = web3.utils.asciiToHex('PSM-' + token_name + '-' + ilk);

        console.log('@psm.line', ilk_config.line, line);
        console.log('@psm.tin', ilk_config.tin, tin);
        console.log('@psm.tout', ilk_config.tout, tout);

        // const ilk_lerpDelay = units(ilk_config.lerpDelay, 0);
        // const ilk_lerpStart = units(ilk_config.lerpStart, 18);
        // const ilk_lerpEnd = units(ilk_config.lerpEnd, 18);
        // const ilk_lerpDuration = units(ilk_config.lerpDuration, 0);
        // const lerp_name = web3.utils.asciiToHex(NOW_PREFIX + '_PSM_' + token_name + '_' + ilk + '_TIN');

        console.log('Publishing Auth Gem Join...');
        const authGemJoin = await artifact_deploy(AuthGemJoin, MCD_VAT, ilk_name, T_[token_name], ...extraParams);
        MCD_JOIN_PSM_[token_name][ilk] = authGemJoin.address;
        console.log('MCD_JOIN_PSM_' + token_name + '_' + ilk + '=' + MCD_JOIN_PSM_[token_name][ilk]);

        console.log('Deploying Dss Psm...');
        const DssPsm = artifacts.require('DssPsm');
        const dssPsm = await artifact_deploy(DssPsm, MCD_JOIN_PSM_[token_name][ilk], MCD_JOIN_DAI, MCD_VOW);
        MCD_PSM_[token_name][ilk] = dssPsm.address;
        console.log('MCD_PSM_' + token_name + '_' + ilk + '=' + MCD_PSM_[token_name][ilk]);
        await dssPsm.file(web3.utils.asciiToHex('tin'), tin);
        await dssPsm.file(web3.utils.asciiToHex('tout'), tout);
        await filex(MCD_VAT, ilk_name, 'line', line);

        // console.log('Deploying Lerp...');
        // await lerpFactory.newLerp(lerp_name, MCD_PSM_[token_name][ilk], web3.utils.asciiToHex('tin'), NOW + ilk_lerpDelay, ilk_lerpStart, ilk_lerpEnd, ilk_lerpDuration);
        // const lerpAddress = await lerpFactory.lerps(lerp_name);
        // const Lerp = artifacts.require('Lerp');
        // const lerp = await artifact_at(Lerp, lerpAddress);
        // LERP_[token_name][ilk] = lerp.address;
        // console.log('LERP_' + token_name + '_' + ilk + '=' + LERP_[token_name][ilk]);

        await authGemJoin.rely(MCD_PSM_[token_name][ilk]);
        // await dssPsm.rely(LERP_[token_name][ilk]);

        await authGemJoin.rely(MCD_PAUSE_PROXY);
        // await authGemJoin.deny(DEPLOYER);

        await dssPsm.rely(MCD_PAUSE_PROXY);
        // await dssPsm.deny(DEPLOYER);
      }
    }
  }
  await lerpFactory.rely(MCD_PAUSE_PROXY);
  // await lerpFactory.deny(DEPLOYER);

  // CONFIGURE CHAIN LOG

  console.log('Configuring Chain Log...');
  for (const token_name in T_) {
    await chainLog.setAddress(web3.utils.asciiToHex(token_name), T_[token_name]);
  }
  for (const token_name in PIP_) {
    await chainLog.setAddress(web3.utils.asciiToHex('PIP_' + token_name), PIP_[token_name]);
  }
  for (const token_name in MCD_JOIN_) {
    for (const ilk in MCD_JOIN_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_JOIN_' + token_name + '_' + ilk), MCD_JOIN_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_FLIP_) {
    for (const ilk in MCD_FLIP_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_FLIP_' + token_name + '_' + ilk), MCD_FLIP_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_CLIP_) {
    for (const ilk in MCD_CLIP_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_CLIP_' + token_name + '_' + ilk), MCD_CLIP_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_CLIP_CALC_) {
    for (const ilk in MCD_CLIP_CALC_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_CLIP_CALC_' + token_name + '_' + ilk), MCD_CLIP_CALC_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_PSM_) {
    for (const ilk in MCD_PSM_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_PSM_' + token_name + '_' + ilk), MCD_PSM_[token_name][ilk]);
    }
  }
  for (const token_name in MCD_JOIN_PSM_) {
    for (const ilk in MCD_JOIN_PSM_[token_name]) {
      await chainLog.setAddress(web3.utils.asciiToHex('MCD_JOIN_PSM_' + token_name + '_' + ilk), MCD_JOIN_PSM_[token_name][ilk]);
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
  await chainLog.rely(MCD_PAUSE_PROXY);
  // await chainLog.deny(DEPLOYER);

  // SET PAUSE AUTH DELAY

  console.log('Configuring Authority & Delay...');
  if (Number(config.pauseDelay) >= 0) {
    await setAuthorityAndDelay(MCD_ADM, units(config.pauseDelay, 0));
  }

  const finalBalance = await web3.eth.getBalance(DEPLOYER);
  console.log('TOTAL COST:', BigInt(initialBalance) - BigInt(finalBalance));
};
