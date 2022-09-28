export type networkConfigType = {
  [key: number | string]: {
    name: string;
    keepersUpdateInterval: string;
    subscriptionId?: string;
    gasLane?: string;
    callbackGasLimit?: string;
    raffleEntreeFee?: string;
    vrfCoordinatorV2?: string;
    blockConfirmations: number;
  };
};
