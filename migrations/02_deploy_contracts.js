const DSProxyFactory = artifacts.require('DSProxyFactory');
const ProxyRegistry = artifacts.require('ProxyRegistry');
const VatFab = artifacts.require('VatFab');
const JugFab = artifacts.require('JugFab');
const VowFab = artifacts.require('VowFab');
const CatFab = artifacts.require('CatFab');
const DogFab = artifacts.require('DogFab');
const DaiFab = artifacts.require('DaiFab');
const DaiJoinFab = artifacts.require('DaiJoinFab');
const FlapFab = artifacts.require('FlapFab');
const FlopFab = artifacts.require('FlopFab');
const FlipFab = artifacts.require('FlipFab');
const ClipFab = artifacts.require('ClipFab');
const SpotFab = artifacts.require('SpotFab');
const PotFab = artifacts.require('PotFab');
const EndFab = artifacts.require('EndFab');
const ESMFab = artifacts.require('ESMFab');
const PauseFab = artifacts.require('PauseFab');
const DssDeploy = artifacts.require('DssDeploy');
const DSRoles = artifacts.require('DSRoles');
const GemJoin = artifacts.require('GemJoin');
const DSPause = artifacts.require('DSPause');
const OSM = artifacts.require('OSM');
const Median = artifacts.require('Median');
const AuthGemJoin5 = artifacts.require('AuthGemJoin5');
const DssPsm = artifacts.require('DssPsm');
const Lerp = artifacts.require('Lerp');
const DSToken = artifacts.require('DSToken');
const DssProxyActions = artifacts.require('DssProxyActions');
const DssProxyActionsEnd = artifacts.require('DssProxyActionsEnd');
const DssProxyActionsDsr = artifacts.require('DssProxyActionsDsr');
const DssCdpManager = artifacts.require('DssCdpManager');
const GetCdps = artifacts.require('GetCdps');
const DsrManager = artifacts.require('DsrManager');
const OsmMom = artifacts.require('OsmMom');
const FlipperMom = artifacts.require('FlipperMom');
const ClipperMom = artifacts.require('ClipperMom');
const IlkRegistry = artifacts.require('IlkRegistry');
const GovActions = artifacts.require('GovActions');
const DssDeployPauseProxyActions = artifacts.require('DssDeployPauseProxyActions');
const DSProxy = artifacts.require('DSProxy');
const DSChief = artifacts.require('DSChief');
const VoteProxyFactory = artifacts.require('VoteProxyFactory');
const DssAutoLine = artifacts.require('DssAutoLine');

const NOW = Math.floor(Date.now() / 1000);

const ESM_MIN = '50000000000000000000000'; // review this
const ETH = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'; // bscmain
const BAT = '0x101d82428437127bF1608F699CD651e6Abf9766E'; // bscmain
const vUSDC = '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8'; // bscmain (< 18 decimals)
const MEDIAN_BAR = 13;
const MEDIAN_ADDRESS_LIST = [];
const LERP_START_TIME = NOW + 10 * 24 * 60 * 60;
const LERP_START = 10000000000000000n;
const LERP_END = 1000000000000000n;
const LERP_DURATION = 7 * 24 * 60 * 60;

module.exports = async (deployer, network, [account]) => {
  const web3 = DssDeploy.interfaceAdapter.web3;

  const chainId = await web3.eth.net.getId();

  // deploys DSProxyFactory
  console.log('Publishing Proxy Factory...');
  await deployer.deploy(DSProxyFactory);
  const dsProxyFactory = await DSProxyFactory.deployed();
  const PROXY_FACTORY = dsProxyFactory.address;
  console.log('PROXY_FACTORY=' + PROXY_FACTORY);

  // deploys ProxyRegistry
  console.log('Publishing Proxy Registry...');
  await deployer.deploy(ProxyRegistry, PROXY_FACTORY);
  const proxyRegistry = await ProxyRegistry.deployed();
  const PROXY_REGISTRY = proxyRegistry.address;
  console.log('PROXY_REGISTRY=' + PROXY_REGISTRY);

  // deploys VatFab
  console.log('Publishing VatFab...');
  await deployer.deploy(VatFab);
  const vatFab = await VatFab.deployed();
  const VAT_FAB = vatFab.address;
  console.log('VAT_FAB=' + VAT_FAB);

  // deploys JugFab
  console.log('Publishing JugFab...');
  await deployer.deploy(JugFab);
  const jugFab = await JugFab.deployed();
  const JUG_FAB = jugFab.address;
  console.log('JUG_FAB=' + JUG_FAB);

  // deploys VowFab
  console.log('Publishing VowFab...');
  await deployer.deploy(VowFab);
  const vowFab = await VowFab.deployed();
  const VOW_FAB = vowFab.address;
  console.log('VOW_FAB=' + VOW_FAB);

  // deploys CatFab
  console.log('Publishing CatFab...');
  await deployer.deploy(CatFab);
  const catFab = await CatFab.deployed();
  const CAT_FAB = catFab.address;
  console.log('CAT_FAB=' + CAT_FAB);

  // deploys DogFab
  console.log('Publishing DogFab...');
  await deployer.deploy(DogFab);
  const dogFab = await DogFab.deployed();
  const DOG_FAB = dogFab.address;
  console.log('DOG_FAB=' + DOG_FAB);

  // deploys DaiFab
  console.log('Publishing DaiFab...');
  await deployer.deploy(DaiFab);
  const daiFab = await DaiFab.deployed();
  const DAI_FAB = daiFab.address;
  console.log('DAI_FAB=' + DAI_FAB);

  // deploys DaiJoinFab
  console.log('Publishing DaiJoinFab...');
  await deployer.deploy(DaiJoinFab);
  const daiJoinFab = await DaiJoinFab.deployed();
  const MCD_JOIN_FAB = daiJoinFab.address;
  console.log('MCD_JOIN_FAB=' + MCD_JOIN_FAB);

  // deploys FlapFab
  console.log('Publishing FlapFab...');
  await deployer.deploy(FlapFab);
  const flapFab = await FlapFab.deployed();
  const FLAP_FAB = flapFab.address;
  console.log('FLAP_FAB=' + FLAP_FAB);

  // deploys FlopFab
  console.log('Publishing FlopFab...');
  await deployer.deploy(FlopFab);
  const flopFab = await FlopFab.deployed();
  const FLOP_FAB = flopFab.address;
  console.log('FLOP_FAB=' + FLOP_FAB);

  // deploys FlipFab
  console.log('Publishing FlipFab...');
  await deployer.deploy(FlipFab);
  const flipFab = await FlipFab.deployed();
  const FLIP_FAB = flipFab.address;
  console.log('FLIP_FAB=' + FLIP_FAB);

  // deploys ClipFab
  console.log('Publishing ClipFab...');
  await deployer.deploy(ClipFab);
  const clipFab = await ClipFab.deployed();
  const CLIP_FAB = clipFab.address;
  console.log('CLIP_FAB=' + CLIP_FAB);

  // deploys SpotFab
  console.log('Publishing SpotFab...');
  await deployer.deploy(SpotFab);
  const spotFab = await SpotFab.deployed();
  const SPOT_FAB = spotFab.address;
  console.log('SPOT_FAB=' + SPOT_FAB);

  // deploys PotFab
  console.log('Publishing PotFab...');
  await deployer.deploy(PotFab);
  const potFab = await PotFab.deployed();
  const POT_FAB = potFab.address;
  console.log('POT_FAB=' + POT_FAB);

  // deploys EndFab
  console.log('Publishing EndFab...');
  await deployer.deploy(EndFab);
  const endFab = await EndFab.deployed();
  const END_FAB = endFab.address;
  console.log('END_FAB=' + END_FAB);

  // deploys ESMFab
  console.log('Publishing ESMFab...');
  await deployer.deploy(ESMFab);
  const esmFab = await ESMFab.deployed();
  const ESM_FAB = esmFab.address;
  console.log('ESM_FAB=' + ESM_FAB);

  // deploys PauseFab
  console.log('Publishing PauseFab...');
  await deployer.deploy(PauseFab);
  const pauseFab = await PauseFab.deployed();
  const PAUSE_FAB = pauseFab.address;
  console.log('PAUSE_FAB=' + PAUSE_FAB);

  console.log('Publishing Gov Token...');
  await deployer.deploy(DSToken, "MKR");
  const govToken = await DSToken.deployed();
  const MCD_GOV = govToken.address;
  console.log('MCD_GOV=' + MCD_GOV);

  // deploys DssDeploy
  console.log('Publishing DssDeploy...');
  await deployer.deploy(DssDeploy);
  const dssDeploy = await DssDeploy.deployed();
  await dssDeploy.addFabs1(VAT_FAB, JUG_FAB, VOW_FAB, CAT_FAB, DOG_FAB, DAI_FAB, MCD_JOIN_FAB);
  await dssDeploy.addFabs2(FLAP_FAB, FLOP_FAB, FLIP_FAB, CLIP_FAB, SPOT_FAB, POT_FAB, END_FAB, ESM_FAB, PAUSE_FAB);

  console.log('Deploying DSRoles...');
  await deployer.deploy(DSRoles);
  const dsRoles = await DSRoles.deployed();
  const MCD_ADM = dsRoles.address;
  console.log('MCD_ADM=' + MCD_ADM);
  await dsRoles.setRootUser(account, true);

  console.log('Deploying Vat...');
  await dssDeploy.deployVat();
  const MCD_VAT = await dssDeploy.vat();
  console.log('MCD_VAT=' + MCD_VAT);
  const MCD_SPOT = await dssDeploy.spotter();
  console.log('MCD_SPOT=' + MCD_SPOT);

  console.log('Deploying Dai...');
  await dssDeploy.deployDai(chainId);
  const MCD_DAI = await dssDeploy.dai();
  console.log('MCD_DAI=' + MCD_DAI);
  const MCD_JOIN_DAI = await dssDeploy.daiJoin();
  console.log('MCD_JOIN_DAI=' + MCD_JOIN_DAI);

  console.log('Deploying Taxation...');
  await dssDeploy.deployTaxation();
  const MCD_JUG = await dssDeploy.jug();
  console.log('MCD_JUG=' + MCD_JUG);
  const MCD_POT = await dssDeploy.pot();
  console.log('MCD_POT=' + MCD_POT);

  console.log('Deploying Auctions...');
  await dssDeploy.deployAuctions(MCD_GOV);
  const MCD_FLAP = await dssDeploy.flap();
  console.log('MCD_FLAP=' + MCD_FLAP);
  const MCD_FLOP = await dssDeploy.flop();
  console.log('MCD_FLOP=' + MCD_FLOP);
  const MCD_VOW = await dssDeploy.vow();
  console.log('MCD_VOW=' + MCD_VOW);

  console.log('Deploying Liquidator...');
  await dssDeploy.deployLiquidator();
  const MCD_CAT = await dssDeploy.cat();
  console.log('MCD_CAT=' + MCD_CAT);
  const MCD_DOG = await dssDeploy.dog();
  console.log('MCD_DOG=' + MCD_DOG);

  console.log('Deploying End...');
  await dssDeploy.deployEnd();
  const MCD_END = await dssDeploy.end();
  console.log('MCD_END=' + MCD_END);

  console.log('Deploying Pause...');
  await dssDeploy.deployPause(0, MCD_ADM);
  const MCD_PAUSE = await dssDeploy.pause();
  console.log('MCD_PAUSE=' + MCD_PAUSE);
  const pause = await DSPause.at(MCD_PAUSE);
  const MCD_PAUSE_PROXY = await pause.proxy();
  console.log('MCD_PAUSE_PROXY=' + MCD_PAUSE_PROXY);

  console.log('Deploying ESM...');
  await dssDeploy.deployESM(MCD_GOV, ESM_MIN);
  const MCD_ESM = await dssDeploy.esm();
  console.log('MCD_ESM=' + MCD_ESM);

  console.log('Deploying Collateral Flip #1...');
  {
    await deployer.deploy(Median);
    const median = await Median.deployed();
    await deployer.deploy(OSM, median.address);
    const osm = await OSM.deployed();
    await median.setBar(MEDIAN_BAR);
    await median.lift(MEDIAN_ADDRESS_LIST);
    await median.kiss(osm.address);
    await median.rely(MCD_PAUSE_PROXY);
    await median.deny(await dssDeploy.owner());
    await osm.kiss(MCD_END);
    await osm.kiss(MCD_SPOT);
    await osm.rely(MCD_PAUSE_PROXY);
    await osm.deny(await dssDeploy.owner());
    await deployer.deploy(GemJoin, MCD_VAT, web3.utils.asciiToHex('ETH-A'), ETH);
    const gemJoin = await GemJoin.deployed();
    await gemJoin.rely(MCD_PAUSE_PROXY);
    await gemJoin.deny(await dssDeploy.owner());
    await dssDeploy.deployCollateralFlip(web3.utils.asciiToHex('ETH-A'), gemJoin.address, osm.address);
  }

  console.log('Deploying Collateral Flip #2...');
  {
    await deployer.deploy(Median);
    const median = await Median.deployed();
    await deployer.deploy(OSM, median.address);
    const osm = await OSM.deployed();
    await median.setBar(MEDIAN_BAR);
    await median.lift(MEDIAN_ADDRESS_LIST);
    await median.kiss(osm.address);
    await median.rely(MCD_PAUSE_PROXY);
    await median.deny(await dssDeploy.owner());
    await osm.kiss(MCD_END);
    await osm.kiss(MCD_SPOT);
    await osm.rely(MCD_PAUSE_PROXY);
    await osm.deny(await dssDeploy.owner());
    await deployer.deploy(GemJoin, MCD_VAT, web3.utils.asciiToHex('BAT-A'), BAT);
    const gemJoin = await GemJoin.deployed();
    await gemJoin.rely(MCD_PAUSE_PROXY);
    await gemJoin.deny(await dssDeploy.owner());
    await dssDeploy.deployCollateralFlip(web3.utils.asciiToHex('BAT-A'), gemJoin.address, osm.address);
  }

  console.log('Deploying Proxy Actions...');
  await deployer.deploy(DssProxyActions);
  const dssProxyActions = await DssProxyActions.deployed();
  const PROXY_ACTIONS = dssProxyActions.address;
  console.log('PROXY_ACTIONS=' + PROXY_ACTIONS);

  await deployer.deploy(DssProxyActionsEnd);
  const dssProxyActionsEnd = await DssProxyActionsEnd.deployed();
  const PROXY_ACTIONS_END = dssProxyActionsEnd.address;
  console.log('PROXY_ACTIONS_END=' + PROXY_ACTIONS_END);

  await deployer.deploy(DssProxyActionsDsr);
  const dssProxyActionsDsr = await DssProxyActionsDsr.deployed();
  const PROXY_ACTIONS_DSR = dssProxyActionsDsr.address;
  console.log('PROXY_ACTIONS_DSR=' + PROXY_ACTIONS_DSR);

  console.log('Deploying CDP Manager...');
  await deployer.deploy(DssCdpManager, MCD_VAT);
  const dssCdpManager = await DssCdpManager.deployed();
  const CDP_MANAGER = dssCdpManager.address;
  console.log('CDP_MANAGER=' + CDP_MANAGER);

  await deployer.deploy(GetCdps);
  const getCdps = await GetCdps.deployed();
  const GET_CDPS = getCdps.address;
  console.log('GET_CDPS=' + GET_CDPS);

  console.log('Deploying DSR Manager...');
  await deployer.deploy(DsrManager, MCD_POT, MCD_JOIN_DAI);
  const dsrManager = await DsrManager.deployed();
  const DSR_MANAGER = dsrManager.address;
  console.log('DSR_MANAGER=' + DSR_MANAGER);

  console.log('Deploying OSM Mom...');
  await deployer.deploy(OsmMom);
  const osmMom = await OsmMom.deployed();
  const OSM_MOM = osmMom.address;
  console.log('OSM_MOM=' + OSM_MOM);

  console.log('Deploying Flipper Mom...');
  await deployer.deploy(FlipperMom, MCD_CAT);
  const flipperMom = await FlipperMom.deployed();
  const FLIPPER_MOM = flipperMom.address;
  console.log('FLIPPER_MOM=' + FLIPPER_MOM);

  console.log('Deploying Clipper Mom...');
  await deployer.deploy(ClipperMom, MCD_SPOT);
  const clipperMom = await ClipperMom.deployed();
  const CLIPPER_MOM = clipperMom.address;
  console.log('CLIPPER_MOM=' + CLIPPER_MOM);

  console.log('Deploying ILK Registry...');
  await deployer.deploy(IlkRegistry, MCD_VAT, MCD_DOG, MCD_CAT, MCD_SPOT);
  const ilkRegistry = await IlkRegistry.deployed();
  const ILK_REGISTRY = ilkRegistry.address;
  console.log('ILK_REGISTRY=' + ILK_REGISTRY);

  console.log('Releasing Auth...');
  await dssDeploy.releaseAuth();

  console.log('Releasing Auth Flip #1');
  await dssDeploy.releaseAuthFlip(web3.utils.asciiToHex('ETH-A'));

  console.log('Releasing Auth Flip #2');
  await dssDeploy.releaseAuthFlip(web3.utils.asciiToHex('BAT-A'));

  console.log('Deploying Gov Actions...');
  await deployer.deploy(GovActions);
  const govActions = await GovActions.deployed();
  const MCD_GOV_ACTIONS = govActions.address;
  console.log('MCD_GOV_ACTIONS=' + MCD_GOV_ACTIONS);

  console.log('Deploying Pause Proxy Actions...');
  await deployer.deploy(DssDeployPauseProxyActions);
  const dssDeployPauseProxyActions = await DssDeployPauseProxyActions.deployed();
  const PROXY_PAUSE_ACTIONS = dssDeployPauseProxyActions.address;
  console.log('PROXY_PAUSE_ACTIONS=' + PROXY_PAUSE_ACTIONS);

  console.log('Building Proxy Deployer...');
  await proxyRegistry.build();
  const PROXY_DEPLOYER = await proxyRegistry.proxies(account);
  console.log('PROXY_DEPLOYER=' + PROXY_DEPLOYER);
  const proxyDeployer = await DSProxy.at(PROXY_DEPLOYER);
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

  console.log('Publishing IOU Token...');
  await deployer.deploy(DSToken, "IOU");
  const iouToken = await DSToken.deployed();
  const MCD_IOU = iouToken.address;
  console.log('MCD_IOU=' + MCD_IOU);

  console.log('Publishing DS Chief...');
  await deployer.deploy(DSChief, MCD_GOV, MCD_IOU, 5);
  const dsChief = await DSChief.deployed();
  const MCD_ADM_CHIEF = dsChief.address;
  console.log('MCD_ADM_CHIEF=' + MCD_ADM_CHIEF);
  iouToken.setOwner(MCD_ADM_CHIEF);

  console.log('Publishing Vote Proxy Factory...');
  await deployer.deploy(VoteProxyFactory, dsChief.address);
  const voteProxyFactory = await VoteProxyFactory.deployed();
  const VOTE_PROXY_FACTORY = voteProxyFactory.address;
  console.log('VOTE_PROXY_FACTORY=' + VOTE_PROXY_FACTORY);

  console.log('Publishing Auto Line...');
  await deployer.deploy(DssAutoLine, MCD_VAT);
  const dssAutoLine = await DssAutoLine.deployed();
  const MCD_IAM_AUTO_LINE = dssAutoLine.address;
  console.log('MCD_IAM_AUTO_LINE=' + MCD_IAM_AUTO_LINE);
  await rely(MCD_VAT, MCD_IAM_AUTO_LINE);

  // PSM

  console.log('Deploying AuthGemJoin5...');
  await deployer.deploy(AuthGemJoin5, MCD_VAT, web3.utils.asciiToHex('PSM-USDC-A'), vUSDC);
  const authGemJoin5 = await AuthGemJoin5.deployed();

  console.log('Deploying DssPsm...');
  await deployer.deploy(DssPsm, authGemJoin5.address, MCD_JOIN_DAI, MCD_VOW);
  const dssPsm = await DssPsm.deployed();

  console.log('Deploying Lerp...');
  await deployer.deploy(Lerp, dssPsm.address, web3.utils.asciiToHex('tin'), LERP_START_TIME, LERP_START, LERP_END, LERP_DURATION);
  const lerp = await Lerp.deployed();

  await authGemJoin5.rely(MCD_PAUSE_PROXY);
  await authGemJoin5.rely(dssPsm.address);
  await authGemJoin5.deny(await dssDeploy.owner());

  await dssPsm.rely(MCD_PAUSE_PROXY);
  await dssPsm.rely(lerp.address);
  await dssPsm.deny(await dssDeploy.owner());
};
