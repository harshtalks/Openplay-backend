import { ethers } from "hardhat";
import { SmartLottery } from "../typechain-types/contracts/SmartLottery";

async function enterRaffle() {
  const raffle: SmartLottery = await ethers.getContract("SmartLottery");
  const entranceFee = await raffle.getEntranceFee();
  await raffle.enterLottery({ value: entranceFee });
  console.log("Entered!");
}

enterRaffle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
