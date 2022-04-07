import * as dotenv from 'dotenv';
import { DeployFunction, DeployResult } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { deploymentConfigs } from './configs/config';
import { ICodecConfig } from './configs/types';

dotenv.config();

const deployCodecs = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = parseInt(await hre.getChainId(), 10);
  const conf = deploymentConfigs[chainId];

  const codecDeployResults: DeployResult[] = [];
  const codecConfigs: ICodecConfig[] = [];
  for (const codec of conf.codecs) {
    const res = await deploy(codec.name, {
      from: deployer,
      log: true,
      args: codec.args
    });
    codecDeployResults.push(res);
    codecConfigs.push(codec);
  }
  return { codecDeployResults, codecConfigs };
};

const deployTransferSwapper: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = parseInt(await hre.getChainId(), 10);
  const config = deploymentConfigs[chainId];

  const { codecDeployResults, codecConfigs } = await deployCodecs(hre);

  const args = [
    config.messageBus,
    config.nativeWrap,
    deploymentConfigs.feeSigner,
    deploymentConfigs.feeCollector,
    codecConfigs.map((codecConfig) => codecConfig.swapFunc),
    codecDeployResults.map((codecDeployment) => codecDeployment.address),
    config.supportedDex
  ];
  console.log(args);
  const deployResult = await deploy('TransferSwapper', { from: deployer, log: true, args });

  // verify newly deployed TransferSwapper
  if (deployResult.newlyDeployed) {
    await hre.run('verify:verify', {
      address: deployResult.address,
      constructorArguments: args
    });
  }

  // verify newly deployed codecs
  for (const result of codecDeployResults) {
    if (result.newlyDeployed) {
      await hre.run('verify:verify', { address: result.address });
    }
  }
};

deployTransferSwapper.tags = ['TransferSwapper'];
deployTransferSwapper.dependencies = [];
export default deployTransferSwapper;
