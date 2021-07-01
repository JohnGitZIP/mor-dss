const ProxyFactory = artifacts.require('ProxyFactory');
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

const NOW = Math.floor(Date.now() / 1000);

const CHAIN_ID = 56; // bscmain
const GRO = '0x336eD56D8615271b38EcEE6F4786B55d0EE91b96'; // bscmain (needs mint() move() burn())
const PAUSE_DELAY = '0';
const DS_AUTHORITY = '0x0000000000000000000000000000000000000000'; // review this
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

  console.log('Publishing Proxy Factory...');
  await deployer.deploy(ProxyFactory);
  const proxyFactory = await ProxyFactory.deployed();

  console.log('Publishing Proxy Registry...');
  await deployer.deploy(ProxyRegistry, proxyFactory.address);
  const proxyRegistry = await ProxyRegistry.deployed();

  // deploys VatFab
  console.log('Publishing Gov Token contract...');
  await deployer.deploy(DSToken, "MKR");
  const token = await DSToken.deployed();
  const GOV = token.address;

  // deploys VatFab
  console.log('Publishing VatFab contract...');
  await deployer.deploy(VatFab);
  const vatFab = await VatFab.deployed();

  // deploys JugFab
  console.log('Publishing JugFab contract...');
  await deployer.deploy(JugFab);
  const jugFab = await JugFab.deployed();

  // deploys VowFab
  console.log('Publishing VowFab contract...');
  await deployer.deploy(VowFab);
  const vowFab = await VowFab.deployed();

  // deploys CatFab
  console.log('Publishing CatFab contract...');
  await deployer.deploy(CatFab);
  const catFab = await CatFab.deployed();

  // deploys DogFab
  console.log('Publishing DogFab contract...');
  await deployer.deploy(DogFab);
  const dogFab = await DogFab.deployed();

  // deploys DaiFab
  console.log('Publishing DaiFab contract...');
  await deployer.deploy(DaiFab);
  const daiFab = await DaiFab.deployed();

  // deploys DaiJoinFab
  console.log('Publishing DaiJoinFab contract...');
  await deployer.deploy(DaiJoinFab);
  const daiJoinFab = await DaiJoinFab.deployed();

  // deploys FlapFab
  console.log('Publishing FlapFab contract...');
  await deployer.deploy(FlapFab);
  const flapFab = await FlapFab.deployed();

  // deploys FlopFab
  console.log('Publishing FlopFab contract...');
  await deployer.deploy(FlopFab);
  const flopFab = await FlopFab.deployed();

  // deploys FlipFab
  console.log('Publishing FlipFab contract...');
  await deployer.deploy(FlipFab);
  const flipFab = await FlipFab.deployed();

  // deploys ClipFab
  console.log('Publishing ClipFab contract...');
  await deployer.deploy(ClipFab);
  const clipFab = await ClipFab.deployed();

  // deploys SpotFab
  console.log('Publishing SpotFab contract...');
  await deployer.deploy(SpotFab);
  const spotFab = await SpotFab.deployed();

  // deploys PotFab
  console.log('Publishing PotFab contract...');
  await deployer.deploy(PotFab);
  const potFab = await PotFab.deployed();

  // deploys EndFab
  console.log('Publishing EndFab contract...');
  await deployer.deploy(EndFab);
  const endFab = await EndFab.deployed();

  // deploys ESMFab
  console.log('Publishing ESMFab contract...');
  await deployer.deploy(ESMFab);
  const esmFab = await ESMFab.deployed();

  // deploys PauseFab
  console.log('Publishing PauseFab contract...');
  await deployer.deploy(PauseFab);
  const pauseFab = await PauseFab.deployed();

  // deploys DssDeploy
  console.log('Publishing DssDeploy contract...');
  await deployer.deploy(DssDeploy);
  const dssDeploy = await DssDeploy.deployed();

  console.log('Adding fabs #1...');
  await dssDeploy.addFabs1(vatFab.address, jugFab.address, vowFab.address, catFab.address, dogFab.address, daiFab.address, daiJoinFab.address);

  console.log('Adding fabs #2...');
  await dssDeploy.addFabs2(flapFab.address, flopFab.address, flipFab.address, clipFab.address, spotFab.address, potFab.address, endFab.address, esmFab.address, pauseFab.address);

  console.log('Deploying Vat...');
  await dssDeploy.deployVat();

  console.log('Deploying Dai...');
  await dssDeploy.deployDai(CHAIN_ID);

  console.log('Deploying Taxation...');
  await dssDeploy.deployTaxation();

  console.log('Deploying Auctions...');
  await dssDeploy.deployAuctions(GOV);

  console.log('Deploying Liquidator...');
  await dssDeploy.deployLiquidator();

  console.log('Deploying End...');
  await dssDeploy.deployEnd();

  console.log('Deploying Pause...');
  await dssDeploy.deployPause(PAUSE_DELAY, DS_AUTHORITY);
  const pause = await DSPause.at(await dssDeploy.pause());

  console.log('Deploying ESM...');
  await dssDeploy.deployESM(GOV, ESM_MIN);

  console.log('Deploying Collateral Flip #1...');
  {
    await deployer.deploy(Median);
    const median = await Median.deployed();
    await deployer.deploy(OSM, median.address);
    const osm = await OSM.deployed();
    await median.setBar(MEDIAN_BAR);
    await median.lift(MEDIAN_ADDRESS_LIST);
    await median.kiss(osm.address);
    await median.rely(await pause.proxy());
    await median.deny(await dssDeploy.owner());
    await osm.kiss(await dssDeploy.end());
    await osm.kiss(await dssDeploy.spotter());
    await osm.rely(await pause.proxy());
    await osm.deny(await dssDeploy.owner());
    await deployer.deploy(GemJoin, await dssDeploy.vat(), web3.utils.asciiToHex('ETH-A'), ETH);
    const gemJoin = await GemJoin.deployed();
    await gemJoin.rely(await pause.proxy());
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
    await median.rely(await pause.proxy());
    await median.deny(await dssDeploy.owner());
    await osm.kiss(await dssDeploy.end());
    await osm.kiss(await dssDeploy.spotter());
    await osm.rely(await pause.proxy());
    await osm.deny(await dssDeploy.owner());
    await deployer.deploy(GemJoin, await dssDeploy.vat(), web3.utils.asciiToHex('BAT-A'), BAT);
    const gemJoin = await GemJoin.deployed();
    await gemJoin.rely(await pause.proxy());
    await gemJoin.deny(await dssDeploy.owner());
    await dssDeploy.deployCollateralFlip(web3.utils.asciiToHex('BAT-A'), gemJoin.address, osm.address);
  }

  console.log('Deploying Proxy Actions...');
  await deployer.deploy(DssProxyActions);
  const dssProxyActions = await DssProxyActions.deployed();

  await deployer.deploy(DssProxyActionsEnd);
  const dssProxyActionsEnd = await DssProxyActionsEnd.deployed();

  await deployer.deploy(DssProxyActionsDsr);
  const dssProxyActionsDsr = await DssProxyActionsDsr.deployed();

  console.log('Deploying CDP Manager...');
  await deployer.deploy(DssCdpManager, await dssDeploy.vat());
  const dssCdpManager = await DssCdpManager.deployed();

  await deployer.deploy(GetCdps);
  const getCdps = await GetCdps.deployed();

  console.log('Deploying DSR Manager...');
  await deployer.deploy(DsrManager, await dssDeploy.pot(), await dssDeploy.daiJoin());
  const dsrManager = await DsrManager.deployed();

  console.log('Deploying OSM Mom...');
  await deployer.deploy(OsmMom);
  const osmMom = await OsmMom.deployed();

  console.log('Deploying Flipper Mom...');
  await deployer.deploy(FlipperMom, await dssDeploy.cat());
  const flipperMom = await FlipperMom.deployed();

  console.log('Deploying Clipper Mom...');
  await deployer.deploy(ClipperMom, await dssDeploy.spotter());
  const clipperMom = await ClipperMom.deployed();

  console.log('Deploying IlkRegistry Mom...');
  await deployer.deploy(IlkRegistry, await dssDeploy.vat(), await dssDeploy.dog(), await dssDeploy.cat(), await dssDeploy.spotter());
  const ilkRegistry = await IlkRegistry.deployed();

  console.log('Releasing Auth...');
  await dssDeploy.releaseAuth();

  console.log('Releasing Auth Flip #1');
  await dssDeploy.releaseAuthFlip(web3.utils.asciiToHex('ETH-A'));

  console.log('Releasing Auth Flip #2');
  await dssDeploy.releaseAuthFlip(web3.utils.asciiToHex('BAT-A'));

  console.log('Deploying AuthGemJoin5...');
  await deployer.deploy(AuthGemJoin5, await dssDeploy.vat(), web3.utils.asciiToHex('PSM-USDC-A'), vUSDC);
  const authGemJoin5 = await AuthGemJoin5.deployed();

  console.log('Deploying DssPsm...');
  await deployer.deploy(DssPsm, authGemJoin5.address, await dssDeploy.daiJoin(), await dssDeploy.vow());
  const dssPsm = await DssPsm.deployed();

  console.log('Deploying Lerp...');
  await deployer.deploy(Lerp, dssPsm.address, web3.utils.asciiToHex('tin'), LERP_START_TIME, LERP_START, LERP_END, LERP_DURATION);
  const lerp = await Lerp.deployed();

  await authGemJoin5.rely(await pause.proxy());
  await authGemJoin5.rely(dssPsm.address);
  await authGemJoin5.deny(await dssDeploy.owner());

  await dssPsm.rely(await pause.proxy());
  await dssPsm.rely(lerp.address);
  await dssPsm.deny(await dssDeploy.owner());
};
