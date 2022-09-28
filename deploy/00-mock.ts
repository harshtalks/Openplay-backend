import { network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const BASE_FEE = "250000000000000000"; // 0.25 is this the premium in LINK?
const GAS_PRICE_LINK = 1e9;

const deploy = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const chainId = network.config.chainId;

  const { deployer } = await getNamedAccounts();

  if (chainId == 31337) {
    log("***************************");
    log(
      "Local network has been detected. mock will be deployed on this network."
    );
    const deployRes = await deploy("VRFCoordinatorV2Mock", {
      log: true,
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });

    log("Mock has been deployed....");
    log("----------------------------------------------------------");
    log(`Mock deployed with  address: ${deployRes.address}`);
    log("----------------------------------------------------------");
    log(
      "You are deploying to a local network, you'll need a local network running to interact"
    );
    log(
      "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
    );
    log("----------------------------------------------------------");
  }
};

deploy.tags = ["mock", "all"];

export default deploy;
