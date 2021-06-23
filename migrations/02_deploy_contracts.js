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

module.exports = async (deployer, network, [account]) => {
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
};
