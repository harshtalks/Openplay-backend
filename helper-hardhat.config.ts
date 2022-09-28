import { networkConfigType } from "./types/networkTypes";

export const networkConfig: networkConfigType = {
  default: {
    name: "hardhat",
    keepersUpdateInterval: "30",
    blockConfirmations: 1,
  },
  5: {
    name: "goerli",
    subscriptionId: "245",
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    raffleEntreeFee: "100000000000000000",
    callbackGasLimit: "500000",
    keepersUpdateInterval: "10",
    blockConfirmations: 3,
  },
  31337: {
    name: "localhost",
    subscriptionId: "588",
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    keepersUpdateInterval: "30",
    raffleEntreeFee: "100000000000000000", // 0.1 ETH
    callbackGasLimit: "500000", // 500,000 gas
    blockConfirmations: 1,
  },
};

export const developmentChains = ["hardhat", "localhost"];
