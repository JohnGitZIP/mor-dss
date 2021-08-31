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

  // FAUCET

  const FAUCET = ZERO_ADDRESS;

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

  // FAUCET CONFIG

  const GOV_GUARD = ZERO_ADDRESS;

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

  // ADDS BACK AUTH

  await vat.rely(MCD_DEPLOY);
  await cat.rely(MCD_DEPLOY);
  await dog.rely(MCD_DEPLOY);
  await vow.rely(MCD_DEPLOY);
  await jug.rely(MCD_DEPLOY);
  await pot.rely(MCD_DEPLOY);
  await dai.rely(MCD_DEPLOY);
  await spotter.rely(MCD_DEPLOY);
  await flap.rely(MCD_DEPLOY);
  await flop.rely(MCD_DEPLOY);
  await end.rely(MCD_DEPLOY);

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
      console.log(token_name.replace('-', '_') + '=' + T_[token_name]);
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
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    VAL_[token_name] = token_import.pip;
    if (token_import.pip === undefined) {
      if (token_pipDeploy.type === 'twap') {
        console.log('Publishing TWAP Oracle...');
        const stwap = token_pipDeploy.stwap;
        const ltwap = token_pipDeploy.ltwap;
        const src = token_pipDeploy.src;
        const token = await artifact_at(DSToken, T_[token_name]);
        const dec = Number(await token.decimals());
        const cap = units(token_pipDeploy.cap, dec);
        console.log('@pip.cap', token_pipDeploy.cap, cap);
        const univ2twapOracle = await artifact_deploy(UniV2TwapOracle, stwap, ltwap, src, token.address, cap);
        VAL_[token_name] = univ2twapOracle.address;
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'vault') {
        console.log('Publishing Vault Oracle...');
        const src = T_[token_name];
        const res = T_[token_pipDeploy.reserve];
        const orb = VAL_[token_pipDeploy.reserve];
        const vaultOracle = await artifact_deploy(VaultOracle, src, res, orb);
        VAL_[token_name] = vaultOracle.address;
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'univ2lp') {
        console.log('Publishing Uniswap V2 LP Oracle...');
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
        const univ2lpOracle = await artifact_deploy(UNIV2LPOracle, src, wat, orb0, orb1);
        VAL_[token_name] = univ2lpOracle.address;
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
        const hop = units(token_pipDeploy.hop, 0);
        console.log('@pip.hop', token_pipDeploy.hop, hop);
        await univ2lpOracle.step(hop);
      }
      if (token_pipDeploy.type === 'chainlink') {
        console.log('Publishing LinkOracle...');
        const src = token_pipDeploy.src;
        const linkOracle = await artifact_deploy(LinkOracle, src);
        VAL_[token_name] = linkOracle.address;
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
      if (token_pipDeploy.type === 'median') {
        console.log('Publishing Median...');
        const wat = web3.utils.asciiToHex(token_name.replace('-', '_') + 'USD');
        const median = await artifact_deploy(Median, wat);
        VAL_[token_name] = median.address;
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
        await median.lift(token_pipDeploy.signers);
        await median.setBar(3);
      }
      if (token_pipDeploy.type === 'value') {
        console.log('Publishing DsValue...');
        const dsValue = await artifact_deploy(DSValue);
        VAL_[token_name] = dsValue.address;
        console.log('VAL_' + token_name.replace('-', '_') + '=' + VAL_[token_name]);
      }
    }
    PIP_[token_name] = VAL_[token_name];
  }

  // DEPLOY ILKS

  const MCD_JOIN_ = {};
  const MCD_FLIP_ = {};
  const MCD_CLIP_ = {};
  const MCD_CLIP_CALC_ = {};
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

      console.log('Publishing Gem Join...');
      const gemJoin = await artifact_deploy(GemJoin, MCD_VAT, ilk_name, T_[token_name], ...extraParams);
      MCD_JOIN_[token_name][ilk] = gemJoin.address;
      console.log('MCD_JOIN_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_JOIN_[token_name][ilk]);

      if (ilk_config.flipDeploy !== undefined) {
        console.log('Publishing Flip...');
        await dssDeploy.deployCollateralFlip(ilk_name, MCD_JOIN_[token_name][ilk], PIP_[token_name]);
        const { flip } = await dssDeploy.ilks(ilk_name);
        MCD_FLIP_[token_name][ilk] = flip;
        console.log('MCD_FLIP_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_FLIP_[token_name][ilk]);
        // const Flipper = artifacts.require('Flipper');
        // const flip = await artifact_deploy(Flipper, MCD_VAT, MCD_CAT, ilk_name);
        // MCD_FLIP_[token_name][ilk] = flip.address;
        // console.log('MCD_FLIP_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_FLIP_[token_name][ilk]);
        // await spotter.file(ilk_name, web3.utils.asciiToHex('pip'), PIP_[token_name]);
        // await cat.file(ilk_name, web3.utils.asciiToHex('flip'), MCD_FLIP_[token_name][ilk]);
        // await vat.init(ilk_name);
        // await jug.init(ilk_name);
        // await vat.rely(MCD_JOIN_[token_name][ilk]);
        // await cat.rely(MCD_FLIP_[token_name][ilk]);
        // await flip.rely(MCD_CAT);
        // await flip.rely(MCD_END);
        // await flip.rely(MCD_ESM);
        // await flip.rely(MCD_PAUSE_PROXY);
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

        console.log('Publishing Calc...');
        const calc = await artifact_deploy(Calc);
        MCD_CLIP_CALC_[token_name][ilk] = calc.address;
        console.log('MCD_CLIP_CALC_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_CLIP_CALC_[token_name][ilk]);
        await calc.rely(MCD_PAUSE_PROXY);

        console.log('Publishing Clip...');
        await dssDeploy.deployCollateralClip(ilk_name, MCD_JOIN_[token_name][ilk], PIP_[token_name], MCD_CLIP_CALC_[token_name][ilk]);
        const { clip } = await dssDeploy.ilks(ilk_name);
        MCD_CLIP_[token_name][ilk] = clip;
        console.log('MCD_CLIP_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_CLIP_[token_name][ilk]);
        // const Clipper = artifacts.require('Clipper');
        // const clip = await artifact_deploy(Clipper, MCD_VAT, MCD_SPOT, MCD_DOG, ilk_name);
        // MCD_CLIP_[token_name][ilk] = clip.address;
        // console.log('MCD_CLIP_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_CLIP_[token_name][ilk]);
        // await spotter.file(ilk_name, web3.utils.asciiToHex('pip'), PIP_[token_name]);
        // await dog.file(ilk_name, web3.utils.asciiToHex('clip'), MCD_CLIP_[token_name][ilk]);
        // await clip.file(web3.utils.asciiToHex('vow'), MCD_VOW);
        // await clip.file(web3.utils.asciiToHex('calc'), MCD_CLIP_CALC_[token_name][ilk]);
        // await vat.init(ilk_name);
        // await jug.init(ilk_name);
        // await vat.rely(MCD_JOIN_[token_name][ilk]);
        // await vat.rely(MCD_CLIP_[token_name][ilk]);
        // await dog.rely(MCD_CLIP_[token_name][ilk]);
        // await clip.rely(MCD_DOG);
        // await clip.rely(MCD_END);
        // await clip.rely(MCD_ESM);
        // await clip.rely(MCD_PAUSE_PROXY);
      }
    }
  }

  // PSM

  const MCD_PSM_ = {};
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
        console.log('@psm.tin', ilk_psmDeploy.tin, tin);
        console.log('@psm.tout', ilk_psmDeploy.tout, tout);

        console.log('Deploying Dss Psm...');
        const DssPsm = artifacts.require('DssPsm');
        const dssPsm = await artifact_deploy(DssPsm, MCD_JOIN_[token_name][ilk], MCD_JOIN_DAI, MCD_VOW);
        MCD_PSM_[token_name][ilk] = dssPsm.address;
        console.log('MCD_' + token_name.replace('-', '_') + '_' + ilk + '=' + MCD_PSM_[token_name][ilk]);
        await dssPsm.file(web3.utils.asciiToHex('tin'), tin);
        await dssPsm.file(web3.utils.asciiToHex('tout'), tout);
        await dssPsm.rely(MCD_PAUSE_PROXY);

        const AuthGemJoin = artifacts.require('AuthGemJoin');
        const authGemJoin = await artifact_at(AuthGemJoin, MCD_JOIN_[token_name][ilk]);
        await authGemJoin.rely(MCD_PSM_[token_name][ilk]);
      }
    }
  }

  // REMOVE AUTH

  console.log('Releasing Auth...');
  await dssDeploy.releaseAuth();

  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const GemJoin = artifacts.require('GemJoin');
      const gemJoin = await artifact_at(GemJoin, MCD_JOIN_[token_name][ilk]);
      await gemJoin.rely(MCD_PAUSE_PROXY);
      if (ilk_config.flipDeploy !== undefined) {
        await dssDeploy.releaseAuthFlip(ilk_name);
        // const Flipper = artifacts.require('Flipper');
        // const flip = await artifact_at(Flipper, MCD_FLIP_[token_name][ilk]);
        // await flip.deny(DEPLOYER);
      }
      if (ilk_config.clipDeploy !== undefined) {
        await dssDeploy.releaseAuthClip(ilk_name);
        // const Clipper = artifacts.require('Clipper');
        // const clip = await artifact_at(Clipper, MCD_CLIP_[token_name][ilk]);
        // await clip.deny(DEPLOYER);
      }
    }
  }

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

  // LERP

  const LerpFactory = artifacts.require('LerpFactory');
  const LERP_FAB = '0x8a54d489B2B21E9FE5f762f73b8e7e929345C994';
  const lerpFactory = await artifact_at(LerpFactory, LERP_FAB);
  console.log('LERP_FAB=' + LERP_FAB);

  // SET ILKS PRICE

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

  // SET ILKS PIP WHITELIST

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
        if (token_pipDeploy.type === 'univ2lp') {
          const osmToken0 = await artifact_at(OSM, VAL_[token_pipDeploy.token0]);
          await osmToken0.methods['kiss(address)'](PIP_[token_name]);
          const osmToken1 = await artifact_at(OSM, VAL_[token_pipDeploy.token1]);
          await osmToken1.methods['kiss(address)'](PIP_[token_name]);
        }
      }
    }
  }

  // SET ILKS MAT

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

  // SET ILKS LINE

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
      }
      if (token_pipDeploy.type === 'vault') {
        const vaultOracle = await artifact_at(VaultOracle, VAL_[token_name]);
        await vaultOracle.rely(MCD_PAUSE_PROXY);
      }
      if (token_pipDeploy.type === 'univ2lp') {
        const univ2lpOracle = await artifact_at(UNIV2LPOracle, VAL_[token_name]);
        await univ2lpOracle.rely(MCD_PAUSE_PROXY);
      }
      if (token_pipDeploy.type === 'chainlink') {
        const linkOracle = await artifact_at(LinkOracle, VAL_[token_name]);
        await linkOracle.rely(MCD_PAUSE_PROXY);
      }
      if (token_pipDeploy.type === 'median') {
        const median = await artifact_at(Median, VAL_[token_name]);
        await median.rely(MCD_PAUSE_PROXY);
      }
      if (token_pipDeploy.type === 'value') {
        const dsValue = await artifact_at(DSValue, VAL_[token_name]);
        await dsValue.setOwner(MCD_PAUSE_PROXY);
      }
      if (Number(token_pipDeploy.osmDelay) > 0) {
        const osm = await artifact_at(OSM, PIP_[token_name]);
        await osm.rely(MCD_PAUSE_PROXY);
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

  const finalBalance = await web3.eth.getBalance(DEPLOYER);
  console.log('TOTAL COST:', BigInt(initialBalance) - BigInt(finalBalance));
};
