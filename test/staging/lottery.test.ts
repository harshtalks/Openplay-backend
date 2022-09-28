import assert from "assert";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { SmartLottery } from "../../typechain-types/contracts/SmartLottery";

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Smart Lottery staging test on goerli network", () => {
      let lotteryContract: SmartLottery;
      let deployer: string;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        lotteryContract = await ethers.getContract("SmartLottery", deployer);
      });

      describe("fullfillRandomWords", () => {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
          const entryFee = await lotteryContract.getEntranceFee();
          console.log("setting up the staging...");
          const startingTime = await lotteryContract.getLastTimeStamp();
          const accounts = await ethers.getSigners();

          console.log("Setting up the listener for the vrf...");

          await new Promise<void>(async (resolve, reject) => {
            lotteryContract.once("WinnerPicked", async () => {
              console.log("winner picking event is fired.");

              try {
                const recentWinner = await lotteryContract.getRecentWinner();
                const state = await lotteryContract.getState();
                const winnerBalance = await accounts[0].getBalance();
                const endingStamp = await lotteryContract.getLastTimeStamp();

                await expect(lotteryContract.getPlayer(0)).to.be.reverted;
                assert.equal(
                  winnerBalance.toString(),
                  startBalance.add(entryFee).toString()
                );
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(state.toString(), "0");
                assert(endingStamp > startingTime);
                resolve();
              } catch (e: any) {
                reject(e);
              }
            });
            console.log("Entering Raffle...");
            const tx = await lotteryContract.enterLottery({
              value: entryFee,
            });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            const startBalance = await accounts[0].getBalance();
          });
        });
      });
    });
