const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const NOW = Math.floor(Date.now() / 1000);

const USDC = { // < 18 decimals
  '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',      // mainnet
  '3': '0xB37a76e727AD2c2DD09549Cf30ef4433E2ee87a1',      // ropsten
  '4': '0x6830707Ba5C9632c44Cf78dCbc172c09788b047b',      // rinkeby
  '42': '0x7079f3762805CFf9C979a5bDC6f5648bCFEE76C8',     // kovan
  '5': '0x78670902A9fb64d9F82BC9672c5FbF29c08ec29D',      // goerli
  '56': '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8',     // bscmain (vUSDC)
  '97': '0x9780881Bf45B83Ee028c4c1De7e0C168dF8e9eEF',     // bsctest
  '137': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',    // maticmain
  '80001': '0x6D4dd09982853F08d9966aC3cA4Eb5885F16f2b2',  // matictest
};

const LERP_START_TIME = NOW + 10 * 24 * 60 * 60;
const LERP_START = 10000000000000000n;
const LERP_END = 1000000000000000n;
const LERP_DURATION = 7 * 24 * 60 * 60;

function units(coins, decimals) {
  if (typeof coins !== 'string') throw new Error('Invalid amount');
  let i = coins.indexOf('.');
  if (i < 0) i = coins.length;
  const s = coins.slice(i + 1);
  if (decimals < s.length) throw new Error('Invalid decimals');
  return BigInt(coins.slice(0, i) + s + '0'.repeat(decimals - s.length));
}

module.exports = async (deployer, network, [account]) => {

  function lift(object) {
    return new Proxy(object, {
      'get': (target, property, proxy) => {
        const func = target[property];
        if (typeof func !== 'function') return func;
        let i = 0;
        const liftedFunc = (...args) => {
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
      },
    });
  }

  function sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  async function artifact_deploy(artifact, ...params) {
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

  const DssDeploy = artifacts.require('DssDeploy');

  const web3 = DssDeploy.interfaceAdapter.web3;
  const initialBalance = await web3.eth.getBalance(account);

  const chainId = await web3.eth.net.getId();

  const config = require('./config/maticmain.json');
  const config_import = config.import || {};
  const config_tokens = config.tokens || {};

  // FEEDS

  const VAL_ = {};
  const PIP_ = {};
  const DSValue = artifacts.require('DSValue');
  const Median = artifacts.require('Median');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    VAL_[token_name] = token_import.pip;
    if (token_import.pip === undefined) {
      if (token_pipDeploy.type == 'median') {
        console.log('Publishing Median...');
        const wat = web3.utils.asciiToHex(token_name + 'USD');
        const median = await artifact_deploy(Median, wat);
        VAL_[token_name] = median.address;
        console.log('VAL_' + token_name + '=' + VAL_[token_name]);
        await median.lift(token_pipDeploy.signers);
        await median.setBar(3);
      }
      if (token_pipDeploy.type == 'value') {
        console.log('Publishing DsValue...');
        const dsValue = await artifact_deploy(DSValue);
        VAL_[token_name] = dsValue.address;
        console.log('VAL_' + token_name + '=' + VAL_[token_name]);
      }
    }
    PIP_[token_name] = VAL_[token_name];
  }

  // FAUCET

  let FAUCET = config_import.faucet;
  const RestrictedTokenFaucet = artifacts.require('RestrictedTokenFaucet');
  if (config_import.faucet === undefined) {
    console.log('Publishing Token Faucet...');
    const restrictedTokenFaucet = await artifact_deploy(RestrictedTokenFaucet);
    FAUCET = restrictedTokenFaucet.address;
    console.log('FAUCET=' + FAUCET);
    restrictedTokenFaucet.hope(ZERO_ADDRESS);
  }
  const restrictedTokenFaucet = await artifact_at(RestrictedTokenFaucet, FAUCET);

  // PROXY REGISTRY

  let PROXY_REGISTRY = config_import.proxyRegistry;
  const ProxyRegistry = artifacts.require('ProxyRegistry');
  if (config_import.proxyRegistry === undefined) {
    console.log('Publishing Proxy Factory...');
    const DSProxyFactory = artifacts.require('DSProxyFactory');
    const dsProxyFactory = await artifact_deploy(DSProxyFactory);
    const PROXY_FACTORY = dsProxyFactory.address;
    console.log('PROXY_FACTORY=' + PROXY_FACTORY);

    console.log('Publishing Proxy Registry...');
    const proxyRegistry = await artifact_deploy(ProxyRegistry, PROXY_FACTORY);
    PROXY_REGISTRY = proxyRegistry.address;
    console.log('PROXY_REGISTRY=' + PROXY_REGISTRY);
  }
  const proxyRegistry = await artifact_at(ProxyRegistry, PROXY_REGISTRY);

  // FABS

  console.log('Publishing VatFab...');
  const VatFab = artifacts.require('VatFab');
  const vatFab = await artifact_deploy(VatFab);
  const VAT_FAB = vatFab.address;
  console.log('VAT_FAB=' + VAT_FAB);

  console.log('Publishing JugFab...');
  const JugFab = artifacts.require('JugFab');
  const jugFab = await artifact_deploy(JugFab);
  const JUG_FAB = jugFab.address;
  console.log('JUG_FAB=' + JUG_FAB);

  console.log('Publishing VowFab...');
  const VowFab = artifacts.require('VowFab');
  const vowFab = await artifact_deploy(VowFab);
  const VOW_FAB = vowFab.address;
  console.log('VOW_FAB=' + VOW_FAB);

  console.log('Publishing CatFab...');
  const CatFab = artifacts.require('CatFab');
  const catFab = await artifact_deploy(CatFab);
  const CAT_FAB = catFab.address;
  console.log('CAT_FAB=' + CAT_FAB);

  console.log('Publishing DogFab...');
  const DogFab = artifacts.require('DogFab');
  const dogFab = await artifact_deploy(DogFab);
  const DOG_FAB = dogFab.address;
  console.log('DOG_FAB=' + DOG_FAB);

  console.log('Publishing DaiFab...');
  const DaiFab = artifacts.require('DaiFab');
  const daiFab = await artifact_deploy(DaiFab);
  const DAI_FAB = daiFab.address;
  console.log('DAI_FAB=' + DAI_FAB);

  console.log('Publishing DaiJoinFab...');
  const DaiJoinFab = artifacts.require('DaiJoinFab');
  const daiJoinFab = await artifact_deploy(DaiJoinFab);
  const MCD_JOIN_FAB = daiJoinFab.address;
  console.log('MCD_JOIN_FAB=' + MCD_JOIN_FAB);

  console.log('Publishing FlapFab...');
  const FlapFab = artifacts.require('FlapFab');
  const flapFab = await artifact_deploy(FlapFab);
  const FLAP_FAB = flapFab.address;
  console.log('FLAP_FAB=' + FLAP_FAB);

  console.log('Publishing FlopFab...');
  const FlopFab = artifacts.require('FlopFab');
  const flopFab = await artifact_deploy(FlopFab);
  const FLOP_FAB = flopFab.address;
  console.log('FLOP_FAB=' + FLOP_FAB);

  console.log('Publishing FlipFab...');
  const FlipFab = artifacts.require('FlipFab');
  const flipFab = await artifact_deploy(FlipFab);
  const FLIP_FAB = flipFab.address;
  console.log('FLIP_FAB=' + FLIP_FAB);

  console.log('Publishing ClipFab...');
  const ClipFab = artifacts.require('ClipFab');
  const clipFab = await artifact_deploy(ClipFab);
  const CLIP_FAB = clipFab.address;
  console.log('CLIP_FAB=' + CLIP_FAB);

  console.log('Publishing SpotFab...');
  const SpotFab = artifacts.require('SpotFab');
  const spotFab = await artifact_deploy(SpotFab);
  const SPOT_FAB = spotFab.address;
  console.log('SPOT_FAB=' + SPOT_FAB);

  console.log('Publishing PotFab...');
  const PotFab = artifacts.require('PotFab');
  const potFab = await artifact_deploy(PotFab);
  const POT_FAB = potFab.address;
  console.log('POT_FAB=' + POT_FAB);

  console.log('Publishing EndFab...');
  const EndFab = artifacts.require('EndFab');
  const endFab = await artifact_deploy(EndFab);
  const END_FAB = endFab.address;
  console.log('END_FAB=' + END_FAB);

  console.log('Publishing ESMFab...');
  const ESMFab = artifacts.require('ESMFab');
  const esmFab = await artifact_deploy(ESMFab);
  const ESM_FAB = esmFab.address;
  console.log('ESM_FAB=' + ESM_FAB);

  console.log('Publishing PauseFab...');
  const PauseFab = artifacts.require('PauseFab');
  const pauseFab = await artifact_deploy(PauseFab);
  const PAUSE_FAB = pauseFab.address;
  console.log('PAUSE_FAB=' + PAUSE_FAB);

  // GOV TOKEN

  let MCD_GOV = config_import.gov;
  const DSToken = artifacts.require('DSToken');
  if (config_import.gov === undefined) {
    console.log('Publishing Gov Token...');
    const govToken = await artifact_deploy(DSToken, 'GOV');
    MCD_GOV = govToken.address;
    console.log('MCD_GOV=' + MCD_GOV);
    await govToken.setName('Governance');
  }
  const govToken = await artifact_at(DSToken, MCD_GOV);

  // CORE DEPLOYER

  console.log('Publishing DssDeploy...');
  const dssDeploy = await artifact_deploy(DssDeploy, VAT_FAB, JUG_FAB, VOW_FAB, CAT_FAB, DOG_FAB, DAI_FAB, MCD_JOIN_FAB, FLAP_FAB, FLOP_FAB, FLIP_FAB, CLIP_FAB, SPOT_FAB, POT_FAB, END_FAB, ESM_FAB, PAUSE_FAB);
  const MCD_DEPLOY = dssDeploy.address;
  console.log('MCD_DEPLOY=' + MCD_DEPLOY);

  // AUTHORITY

  // if (true) {
    console.log('Deploying DSRoles...');
    const DSRoles = artifacts.require('DSRoles');
    const dsRoles = await artifact_deploy(DSRoles);
    const MCD_ADM = dsRoles.address;
    console.log('MCD_ADM=' + MCD_ADM);
    await dsRoles.setRootUser(account, true);
  // }

  // CORE

  console.log('Deploying Core...');
  await dssDeploy.deploy1(chainId, MCD_GOV);
  await dssDeploy.deploy2(MCD_GOV, 0, MCD_ADM, units(config.esm_min, 18));
  const mods = await dssDeploy.mods();
  const MCD_VAT = mods.vat;
  const MCD_SPOT = mods.spotter;
  const MCD_DAI = mods.dai;
  const MCD_JOIN_DAI = mods.daiJoin;
  const MCD_JUG = mods.jug;
  const MCD_POT = mods.pot;
  const MCD_FLAP = mods.flap;
  const MCD_FLOP = mods.flop;
  const MCD_VOW = mods.vow;
  const MCD_CAT = mods.cat;
  const MCD_DOG = mods.dog;
  const MCD_END = mods.end;
  const MCD_PAUSE = mods.pause;
  const MCD_ESM = mods.esm;
  console.log('MCD_VAT=' + MCD_VAT);
  console.log('MCD_SPOT=' + MCD_SPOT);
  console.log('MCD_DAI=' + MCD_DAI);
  console.log('MCD_JOIN_DAI=' + MCD_JOIN_DAI);
  console.log('MCD_JUG=' + MCD_JUG);
  console.log('MCD_POT=' + MCD_POT);
  console.log('MCD_FLAP=' + MCD_FLAP);
  console.log('MCD_FLOP=' + MCD_FLOP);
  console.log('MCD_VOW=' + MCD_VOW);
  console.log('MCD_CAT=' + MCD_CAT);
  console.log('MCD_DOG=' + MCD_DOG);
  console.log('MCD_END=' + MCD_END);
  console.log('MCD_PAUSE=' + MCD_PAUSE);
  console.log('MCD_ESM=' + MCD_ESM);

  const DSPause = artifacts.require('DSPause');
  const pause = await artifact_at(DSPause, MCD_PAUSE);
  const MCD_PAUSE_PROXY = await pause.proxy();
  console.log('MCD_PAUSE_PROXY=' + MCD_PAUSE_PROXY);

  // FAUCET CONFIG

  let mkrAuthority;
  if (config_import.gov === undefined) {
    console.log('Configuring Faucet...');
    await govToken.mint(FAUCET, units('1000000', 18));
    await restrictedTokenFaucet.gulp(MCD_GOV);

    console.log('Publishing MKR Authority ...');
    const MkrAuthority = artifacts.require('MkrAuthority');
    mkrAuthority = await artifact_deploy(MkrAuthority);
    const GOV_GUARD = mkrAuthority.address;
    console.log('GOV_GUARD=' + GOV_GUARD);
    govToken.setAuthority(GOV_GUARD);
    mkrAuthority.rely(MCD_FLOP);
  }

  // DEPLOY COLLATERALS

  const T_ = {};
  const MCD_JOIN_ = {};
  const MCD_FLIP_ = {};
  const MCD_CLIP_ = {};
  const MCD_CLIP_CALC_ = {};
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_gemDeploy = token_config.gemDeploy || {};
    const token_joinDeploy = token_config.joinDeploy || {};
    const token_ilks = token_config.ilks || {};

    T_[token_name] = token_import.gem;
    if (token_import.gem === undefined) {
      const src = token_gemDeploy.src;
      const params = token_gemDeploy.params;
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

    MCD_JOIN_[token_name] = MCD_JOIN_[token_name] || {};
    MCD_FLIP_[token_name] = MCD_FLIP_[token_name] || {};
    MCD_CLIP_[token_name] = MCD_CLIP_[token_name] || {};
    MCD_CLIP_CALC_[token_name] = MCD_CLIP_CALC_[token_name] || {};
    {
      const src = token_joinDeploy.src;
      const extraParams = token_joinDeploy.extraParams;
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
        console.log('MCD_JOIN_' + token_name + '_' + ilk + '=' + MCD_JOIN_[token_name][ilk]);

        if (ilk_config.flipDeploy !== undefined) {
          await dssDeploy.deployCollateralFlip(ilk_name, MCD_JOIN_[token_name][ilk], PIP_[token_name]);
          const { flip } = await dssDeploy.ilks(ilk_name);
          MCD_FLIP_[token_name][ilk] = flip;
          console.log('MCD_FLIP_' + token_name + '_' + ilk + '=' + MCD_FLIP_[token_name][ilk]);
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
          console.log('MCD_CLIP_CALC_' + token_name + '_' + ilk + '=' + MCD_CLIP_CALC_[token_name][ilk]);
          await calc.rely(MCD_PAUSE_PROXY);
          await calc.deny(account);
          await dssDeploy.deployCollateralClip(ilk_name, MCD_JOIN_[token_name][ilk], PIP_[token_name], MCD_CLIP_CALC_[token_name][ilk]);
          const { clip } = await dssDeploy.ilks(ilk_name);
          MCD_CLIP_[token_name][ilk] = clip;
          console.log('MCD_CLIP_' + token_name + '_' + ilk + '=' + MCD_CLIP_[token_name][ilk]);
        }
      }
    }
  }

  // PROXY ACTIONS

  console.log('Deploying Proxy Actions...');
  const DssProxyActions = artifacts.require('DssProxyActions');
  const dssProxyActions = await artifact_deploy(DssProxyActions);
  const PROXY_ACTIONS = dssProxyActions.address;
  console.log('PROXY_ACTIONS=' + PROXY_ACTIONS);

  console.log('Deploying Proxy Actions End...');
  const DssProxyActionsEnd = artifacts.require('DssProxyActionsEnd');
  const dssProxyActionsEnd = await artifact_deploy(DssProxyActionsEnd);
  const PROXY_ACTIONS_END = dssProxyActionsEnd.address;
  console.log('PROXY_ACTIONS_END=' + PROXY_ACTIONS_END);

  console.log('Deploying Proxy Actions Dsr...');
  const DssProxyActionsDsr = artifacts.require('DssProxyActionsDsr');
  const dssProxyActionsDsr = await artifact_deploy(DssProxyActionsDsr);
  const PROXY_ACTIONS_DSR = dssProxyActionsDsr.address;
  console.log('PROXY_ACTIONS_DSR=' + PROXY_ACTIONS_DSR);

  // CDP MANAGER

  console.log('Deploying CDP Manager...');
  const DssCdpManager = artifacts.require('DssCdpManager');
  const dssCdpManager = await artifact_deploy(DssCdpManager, MCD_VAT);
  const CDP_MANAGER = dssCdpManager.address;
  console.log('CDP_MANAGER=' + CDP_MANAGER);

  console.log('Deploying Get CDPs...');
  const GetCdps = artifacts.require('GetCdps');
  const getCdps = await artifact_deploy(GetCdps);
  const GET_CDPS = getCdps.address;
  console.log('GET_CDPS=' + GET_CDPS);

  // DSR MANAGER

  console.log('Deploying DSR Manager...');
  const DsrManager = artifacts.require('DsrManager');
  const dsrManager = await artifact_deploy(DsrManager, MCD_POT, MCD_JOIN_DAI);
  const DSR_MANAGER = dsrManager.address;
  console.log('DSR_MANAGER=' + DSR_MANAGER);

  // OSM MOM

  console.log('Deploying OSM Mom...');
  const OSM = artifacts.require('OSM');
  const OsmMom = artifacts.require('OsmMom');
  const osmMom = await artifact_deploy(OsmMom);
  const OSM_MOM = osmMom.address;
  console.log('OSM_MOM=' + OSM_MOM);

  // FLIPPER MOM

  console.log('Deploying Flipper Mom...');
  const FlipperMom = artifacts.require('FlipperMom');
  const flipperMom = await artifact_deploy(FlipperMom, MCD_CAT);
  const FLIPPER_MOM = flipperMom.address;
  console.log('FLIPPER_MOM=' + FLIPPER_MOM);

  // CLIPPER MOM

  console.log('Deploying Clipper Mom...');
  const ClipperMom = artifacts.require('ClipperMom');
  const clipperMom = await artifact_deploy(ClipperMom, MCD_SPOT);
  const CLIPPER_MOM = clipperMom.address;
  console.log('CLIPPER_MOM=' + CLIPPER_MOM);

  // ILK REGISTRY

  console.log('Deploying ILK Registry...');
  const IlkRegistry = artifacts.require('IlkRegistry');
  const ilkRegistry = await artifact_deploy(IlkRegistry, MCD_VAT, MCD_DOG, MCD_CAT, MCD_SPOT);
  const ILK_REGISTRY = ilkRegistry.address;
  console.log('ILK_REGISTRY=' + ILK_REGISTRY);

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
      await gemJoin.deny(account);
      if (ilk_config.flipDeploy !== undefined) {
        await dssDeploy.releaseAuthFlip(ilk_name);
      }
      if (ilk_config.clipDeploy !== undefined) {
        await dssDeploy.releaseAuthClip(ilk_name);
      }
    }
  }

  // GOV ACTIONS

  console.log('Deploying Gov Actions...');
  const GovActions = artifacts.require('GovActions');
  const govActions = await artifact_deploy(GovActions);
  const MCD_GOV_ACTIONS = govActions.address;
  console.log('MCD_GOV_ACTIONS=' + MCD_GOV_ACTIONS);

  // PAUSE PROXY ACTIONS

  console.log('Deploying Pause Proxy Actions...');
  const DssDeployPauseProxyActions = artifacts.require('DssDeployPauseProxyActions');
  const dssDeployPauseProxyActions = await artifact_deploy(DssDeployPauseProxyActions);
  const PROXY_PAUSE_ACTIONS = dssDeployPauseProxyActions.address;
  console.log('PROXY_PAUSE_ACTIONS=' + PROXY_PAUSE_ACTIONS);

  // PROXY DEPLOYER

  let PROXY_DEPLOYER = await proxyRegistry.proxies(account);
  if (PROXY_DEPLOYER === ZERO_ADDRESS) {
    console.log('Building Proxy Deployer...');
    await proxyRegistry.build();
    PROXY_DEPLOYER = await proxyRegistry.proxies(account);
  }
  console.log('PROXY_DEPLOYER=' + PROXY_DEPLOYER);
  const DSProxy = artifacts.require('DSProxy');
  const proxyDeployer = await artifact_at(DSProxy, PROXY_DEPLOYER);
  await dsRoles.setRootUser(PROXY_DEPLOYER, true);

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

  let MCD_ADM_CHIEF = config_import.authority;
  if (MCD_ADM_CHIEF === undefined) {
    console.log('Publishing IOU Token...');
    const iouToken = await artifact_deploy(DSToken, 'IOU');
    const MCD_IOU = iouToken.address;
    console.log('MCD_IOU=' + MCD_IOU);

    console.log('Publishing DS Chief...');
    const DSChief = artifacts.require('DSChief');
    const dsChief = await artifact_deploy(DSChief, MCD_GOV, MCD_IOU, 5);
    MCD_ADM_CHIEF = dsChief.address;
    console.log('MCD_ADM_CHIEF=' + MCD_ADM_CHIEF);
    iouToken.setOwner(MCD_ADM_CHIEF);

    console.log('Publishing Vote Proxy Factory...');
    const VoteProxyFactory = artifacts.require('VoteProxyFactory');
    const voteProxyFactory = await artifact_deploy(VoteProxyFactory, dsChief.address);
    const VOTE_PROXY_FACTORY = voteProxyFactory.address;
    console.log('VOTE_PROXY_FACTORY=' + VOTE_PROXY_FACTORY);
  }

  // GOV GUARD CONFIG

  if (config_import.gov === undefined) {
    await mkrAuthority.setRoot(MCD_PAUSE_PROXY);
  }

  // AUTO LINE

  console.log('Publishing Auto Line...');
  const DssAutoLine = artifacts.require('DssAutoLine');
  const dssAutoLine = await artifact_deploy(DssAutoLine, MCD_VAT);
  const MCD_IAM_AUTO_LINE = dssAutoLine.address;
  console.log('MCD_IAM_AUTO_LINE=' + MCD_IAM_AUTO_LINE);
  await rely(MCD_VAT, MCD_IAM_AUTO_LINE);

  // FLASH

  console.log('Publishing Flash...');
  const DssFlash = artifacts.require('DssFlash');
  const dssFlash = await artifact_deploy(DssFlash, MCD_JOIN_DAI, MCD_VOW);
  const MCD_FLASH = dssFlash.address;
  console.log('MCD_FLASH=' + MCD_FLASH);
  await rely(MCD_VAT, MCD_FLASH);
  await dssFlash.rely(MCD_PAUSE_PROXY);
  await dssFlash.deny(account);

  // CORE CONFIG

  console.log('Configuring Core...');
  if (Number(config.vat_line) > 0) {
    const vat_line = units(config.vat_line, 45);
    await file(MCD_VAT, 'Line', vat_line);
  }
  if (Number(config.vow_wait) >= 0) {
    const vow_wait = units(config.vow_wait, 0);
    await file(MCD_VOW, 'wait', vow_wait);
  }
  if (Number(config.vow_bump) >= 0) {
    const vow_bump = units(config.vow_bump, 45);
    await file(MCD_VOW, 'bump', vow_bump);
  }
  if (Number(config.vow_dump) >= 0) {
    const vow_dump = units(config.vow_dump, 18);
    await file(MCD_VOW, 'dump', vow_dump);
  }
  if (Number(config.vow_sump) >= 0) {
    const vow_sump = units(config.vow_sump, 45);
    await file(MCD_VOW, 'sump', vow_sump);
  }
  if (Number(config.vow_hump) >= 0) {
    const vow_hump = units(config.vow_hump, 45);
    await file(MCD_VOW, 'hump', vow_hump);
  }
  if (Number(config.cat_box) > 0) {
    const cat_box = units(config.cat_box, 45);
    await file(MCD_CAT, 'box', cat_box);
  }
  if (Number(config.dog_hole) > 0) {
    const dog_hole = units(config.dog_hole, 45);
    await file(MCD_DOG, 'Hole', dog_hole);
  }
  if (Number(config.jug_base) >= 0) {
    const jug_base = units(Math.exp(Math.log(Number(config.jug_base) / 100 + 1) / (60 * 60 * 24 * 365)).toFixed(27), 27) - 10n ** 27n; // review
    await file(MCD_JUG, 'base', jug_base);
  }
  if (Number(config.pot_dsr) >= 0) {
    const pot_dsr = units(Math.exp(Math.log(Number(config.pot_dsr) / 100 + 1) / (60 * 60 * 24 * 365)).toFixed(27), 27); // review
    await dripAndFile(MCD_POT, 'dsr', pot_dsr);
  }
  if (Number(config.end_wait) >= 0) {
    const end_wait = units(config.end_wait, 0);
    await file(MCD_END, 'wait', end_wait);
  }
  if (Number(config.flap_beg) >= 0) {
    const flap_beg = units(config.flap_beg, 16) + units('100', 16);
    await file(MCD_FLAP, 'beg', flap_beg);
  }
  if (Number(config.flap_ttl) >= 0) {
    const flap_ttl = units(config.flap_ttl, 0);
    await file(MCD_FLAP, 'ttl', flap_ttl);
  }
  if (Number(config.flap_tau) >= 0) {
    const flap_tau = units(config.flap_tau, 0);
    await file(MCD_FLAP, 'tau', flap_tau);
  }
  if (Number(config.flop_beg) >= 0) {
    const flop_beg = units(config.flop_beg, 16) + units('100', 16);
    await file(MCD_FLOP, 'beg', flop_beg);
  }
  if (Number(config.flop_pad) >= 0) {
    const flop_pad = units(config.flop_pad, 16) + units('100', 16);
    await file(MCD_FLOP, 'pad', flop_pad);
  }
  if (Number(config.flop_ttl) >= 0) {
    const flop_ttl = units(config.flop_ttl, 0);
    await file(MCD_FLOP, 'ttl', flop_ttl);
  }
  if (Number(config.flop_tau) >= 0) {
    const flop_tau = units(config.flop_tau, 0);
    await file(MCD_FLOP, 'tau', flop_tau);
  }
  if (Number(config.flash_max) >= 0) {
    const flash_max = units(config.flash_max, 18);
    await file(MCD_FLASH, 'max', flash_max);
  }
  if (Number(config.flash_toll) >= 0) {
    const flash_toll = units(config.flash_toll, 16);
    await file(MCD_FLASH, 'toll', flash_toll);
  }

  // SET ILKS PRICE

  console.log('Configuring ILK Prices...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_import = token_config.import || {};
    const token_pipDeploy = token_config.pipDeploy || {};

    if (token_import.pip === undefined) {
      if (token_pipDeploy.type == 'value') {
        const price = units(token_pipDeploy.price, 18);
        const dsValue = await artifact_at(DSValue, VAL_[token_name]);
        await dsValue.poke(web3.utils.numberToHex(String(price)));
      }
    }
  }

  // SET ILKS PIP WHITELIST

  console.log('Configuring ILK PIP Whitelists...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    const osm = await artifact_at(OSM, PIP_[token_name]);
    let relied;
    try {
      relied = Number(await osm.wards(account)) === 1;
    } catch {
      relied = false;
    }
    if (relied) {
      osm.methods['kiss(address)'](MCD_SPOT);
      osm.methods['kiss(address)'](MCD_END);
      for (const ilk in token_ilks) {
        const ilk_config = token_ilks[ilk];
        const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

        if (ilk_config.clipDeploy !== undefined) {
          osm.methods['kiss(address)'](MCD_CLIP_[token_name][ilk]);
          osm.methods['kiss(address)'](CLIPPER_MOM);
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
      if (line > 0n && autoLine === 0n) {
        await filex(MCD_VAT, ilk_name, 'line', line);
      }
      if (autoLine > 0n) {
        const autoLineGap = units(ilk_config.autoLineGap, 45);
        const autoLineTtl = units(ilk_config.autoLineTtl, 0);
        await dssAutoLine.setIlk(ilk_name, autoLine, autoLineGap, autoLineTtl);
        await dssAutoLine.exec(ilk_name);
      }
    }
  }
  await dssAutoLine.rely(MCD_PAUSE_PROXY);
  await dssAutoLine.deny(account);

  // SET ILKS DUST

  console.log('Configuring ILK Dusts...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    for (const ilk in token_ilks) {
      const ilk_config = token_ilks[ilk];
      const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

      const dust = units(ilk_config.dust, 45);
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

      const duty = units(Math.exp(Math.log(Number(ilk_config.dust) / 100 + 1) / (60 * 60 * 24 * 365)).toFixed(27), 27); // review
      await dripAndFilex(MCD_JUG, ilk_name, 'duty', duty);
    }
  }

  // SET ILKS SPOTTER POKE

  console.log('Configuring ILK Spotter Pokes...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    const osm = await artifact_at(OSM, PIP_[token_name]);
    let whitelisted;
    try {
      whitelist = Number(await osm.bud(MCD_SPOT)) === 1;
    } catch {
      whitelist = true;
    }
    if (whitelisted) {
      for (const ilk in token_ilks) {
        const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

        await spot.poke(ilk_name);
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
        await filex(MCD_CAT, ilk_name, 'chop', chop);
      }
      if (ilk_config.clipDeploy !== undefined) {
        const chop = units(ilk_clipDeploy.chop, 16) + units('100', 16);
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
          await file(MCD_CLIP_CALC_[token_name][ilk], 'tau', tau);
        }
        if (calc_config.type === 'StairstepExponentialDecrease' || calc_config.type === 'ExponentialDecrease') {
          const cut = units((Number(calc_config.cut) / 100).toFixed(27), 27);
          await file(MCD_CLIP_CALC_[token_name][ilk], 'cut', cut);
        }
        if (calc_config.type === 'StairstepExponentialDecrease') {
          const step = units(calc_config.step, 0);
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
        console.log('Deploying OSM...');
        const osm = await artifact_deploy(OSM, VAL_[token_name]);
        PIP_[token_name] = osm.address;
        console.log('PIP_' + token_name + '=' + PIP_[token_name]);
        await osm.step(osmDelay);
        if (token_pipDeploy.type == 'median') {
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
        await osm.deny(account);
      }
    }
  }

  // SET ILKS OSM-MOM

  console.log('Configuring OSM Mom...');
  for (const token_name in config_tokens) {
    const token_config = config_tokens[token_name];
    const token_ilks = token_config.ilks || {};

    const osm = await artifact_at(OSM, PIP_[token_name]);
    let src;
    try {
      src = await osm.src();
    } catch {
      src = '';
    }
    if (src !== '') {
      for (const ilk in token_ilks) {
        const ilk_name = web3.utils.asciiToHex(token_name + '-' + ilk);

        await osmMom.setOsm(ilk_name, PIP_[token_name]);
        const wards = await osm.wards(account);
        if (Number(wards) === 1) {
          await osm.rely(OSM_MOM);
        }
      }
    }
  }
  await osmMom.setAuthority(MCD_ADM_CHIEF);
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
  await flipperMom.setAuthority(MCD_ADM_CHIEF);
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
        await clipperMom.setPriceTolerance(MCD_CLIP_[token_name][ilk], cm_tolerance);
      }
    }
  }
  await clipperMom.setAuthority(MCD_ADM_CHIEF);
  await clipperMom.setOwner(MCD_PAUSE_PROXY);

  // SET PAUSE AUTH DELAY

  console.log('Configuring Authority & Delay...');
  if (Number(config.pauseDelay) >= 0) {
    await setAuthorityAndDelay(MCD_ADM_CHIEF, units(config.pauseDelay, 0));
  }

  // PSM

  // review PSM deploy
  console.log('Deploying AuthGemJoin5...');
  const AuthGemJoin5 = artifacts.require('AuthGemJoin5');
  const authGemJoin5 = await artifact_deploy(AuthGemJoin5, MCD_VAT, web3.utils.asciiToHex('PSM-USDC-A'), USDC[chainId]);

  console.log('Deploying DssPsm...');
  const DssPsm = artifacts.require('DssPsm');
  const dssPsm = await artifact_deploy(DssPsm, authGemJoin5.address, MCD_JOIN_DAI, MCD_VOW);
  const DSS_PSM = dssPsm.address;
  console.log('DSS_PSM=' + DSS_PSM);

  console.log('Deploying Lerp...');
  const Lerp = artifacts.require('Lerp');
  const lerp = await artifact_deploy(Lerp, DSS_PSM, web3.utils.asciiToHex('tin'), LERP_START_TIME, LERP_START, LERP_END, LERP_DURATION);
  const LERP = lerp.address;
  console.log('LERP=' + LERP);

  await authGemJoin5.rely(MCD_PAUSE_PROXY);
  await authGemJoin5.rely(DSS_PSM);
  await authGemJoin5.deny(account);

  await dssPsm.rely(MCD_PAUSE_PROXY);
  await dssPsm.rely(LERP);
  await dssPsm.deny(account);

  const finalBalance = await web3.eth.getBalance(account);
  console.log('TOTAL COST:', BigInt(initialBalance) - BigInt(finalBalance));
};
