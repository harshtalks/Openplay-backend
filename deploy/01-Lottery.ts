import { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains, networkConfig } from "../helper-hardhat.config";
const FUND_AMOUNT = "1000000000000000000000";
import verification from "../tools/verification";

const deploy = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { log, deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainId = network.config.chainId;
  let vrfCoordinatorAddress, subscriptionId, blockConfirmations;

  if (chainId == 31337) {
    log("deploying this contract on localhost network. mock is required.");
    const vrfCoordinatorMock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorAddress = vrfCoordinatorMock.address;
    log(`Mock has been deployed on ${vrfCoordinatorAddress}`);
    // because we are mocking the vrfCoordinatorV2 here. hence subscription is needed.
    const txResponse = await vrfCoordinatorMock.createSubscription();
    const txReceipt = await txResponse.wait();
    subscriptionId = txReceipt.events[0].args.subId;
    blockConfirmations = 1;

    const fundingResponse = await vrfCoordinatorMock.fundSubscription(
      subscriptionId,
      FUND_AMOUNT
    );
    log("Mock has been funded with the funding amount 1000000000000000000000");
  } else {
    if (chainId) {
      vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinatorV2;
      subscriptionId = networkConfig[chainId].subscriptionId;
      blockConfirmations = networkConfig[chainId].blockConfirmations;
    }
  }

  log("----------------------------------------------------");
  if (chainId) {
    const args: string[] = [
      vrfCoordinatorAddress,
      subscriptionId,
      networkConfig[chainId].gasLane,
      networkConfig[chainId].callbackGasLimit,
      networkConfig[chainId].raffleEntreeFee,
      networkConfig[chainId].keepersUpdateInterval,
    ];

    log("deploying contract...");
    const lottery = await deploy("SmartLottery", {
      from: deployer,
      log: true,
      args: args,
      waitConfirmations: blockConfirmations,
    });

    const lotteryAddress = lottery.address;
    log("----------------------------------------------------");
    log(`contract has been deployed on the address: ${lotteryAddress}`);

    if (
      !developmentChains.includes(network.name) &&
      process.env.ETHERSCAN_API
    ) {
      await verification(lotteryAddress, args);
    }
  }
};

deploy.tags = ["lottery", "raffle", "all"];

export default deploy;
