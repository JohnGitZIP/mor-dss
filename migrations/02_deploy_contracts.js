const DssDeploy = artifacts.require('DssDeploy');

module.exports = async (deployer, network, [account]) => {
  // deploys DssDeploy
  console.log('Publishing DssDeploy contract...');
  await deployer.deploy(DssDeploy);
  const dssDeploy = await DssDeploy.deployed();
};
