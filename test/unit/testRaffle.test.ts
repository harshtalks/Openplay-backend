import { expect } from "chai";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { SmartLottery } from "../../typechain-types/contracts/SmartLottery";
import { VRFCoordinatorV2Mock } from "../../typechain-types/@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock";
import { developmentChains, networkConfig } from "../../helper-hardhat.config";
import assert from "assert";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("we will test the SmartLottery Smart Contract here but on a local network.", () => {
      let lotteryContract: SmartLottery;
      let mockV2Interface: VRFCoordinatorV2Mock;
      let player: SignerWithAddress;
      let lotteryContractPlayer: SmartLottery;

      beforeEach(async () => {
        const accounts = await ethers.getSigners();
        player = accounts[1];
        await deployments.fixture(["all"]);
        lotteryContract = await ethers.getContract("SmartLottery");
        lotteryContractPlayer = lotteryContract.connect(player);
        mockV2Interface = await ethers.getContract("VRFCoordinatorV2Mock");
        const subId = await lotteryContractPlayer.getSubscriptionId();
        await mockV2Interface.addConsumer(subId, lotteryContractPlayer.address);
      });

      describe("Constructor", () => {
        it("the state of the lottery should be OPEN.", async () => {
          const state = await lotteryContractPlayer.getState();
          expect(state.toString()).equals("0");
        });

        it("interval should be equal to 30", async () => {
          const interval = await lotteryContractPlayer.getInterval();
          const chainID = network.config?.chainId;
          const intervalFromNetwork =
            networkConfig[chainID as number].keepersUpdateInterval;
          expect(interval.toString()).equals(intervalFromNetwork);
        });

        it("players length should be zero. ", async () => {
          const len = await lotteryContractPlayer.numPlayers();
          expect(len.toString()).equals("0");
        });
      });

      describe("Enter Lottery Function", () => {
        it("if not sent enough ETH, the function will revert", async () => {
          await expect(lotteryContractPlayer.enterLottery()).to.be
            .revertedWithCustomError;
        });

        it("The new player should be recorded on the players list.", async () => {
          const entryFree = await lotteryContractPlayer.getEntranceFee();
          await lotteryContractPlayer.enterLottery({ value: entryFree });
          const num = await lotteryContractPlayer.numPlayers();
          assert.equal(num.toString(), "1");
        });

        it("the new player recorded", async () => {
          const entryFree = await lotteryContractPlayer.getEntranceFee();
          await lotteryContractPlayer.enterLottery({ value: entryFree });
          const playerAdd = await lotteryContractPlayer.getPlayer(0);
          assert.equal(playerAdd, player.address);
        });

        it("emitted event when entered the lottery.", async () => {
          const entryFree = await lotteryContractPlayer.getEntranceFee();
          await expect(
            lotteryContractPlayer.enterLottery({ value: entryFree })
          ).to.emit(lotteryContractPlayer, "RaffleEnter");
        });

        it("when the calculating state, the new participant can't enter", async () => {
          const entryFree = await lotteryContractPlayer.getEntranceFee();
          await lotteryContractPlayer.enterLottery({ value: entryFree });
          const interval = await lotteryContract.getInterval();
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });

          await lotteryContractPlayer.performUpkeep([]);
          await expect(
            lotteryContractPlayer.enterLottery({ value: entryFree })
          ).to.be.revertedWith("Raffle not open");
        });

        describe("ChainUpKeep", () => {
          it("return false if the fund is zero", async () => {
            const interval = await lotteryContractPlayer.getInterval();
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
            const { upkeepNeeded } = await lotteryContractPlayer.checkUpkeep(
              "0x"
            );
            assert(!upkeepNeeded);
          });

          it("return false if the raffle is not open.", async () => {
            const interval = await lotteryContractPlayer.getInterval();
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
            await lotteryContractPlayer.checkUpkeep([]);
            const { upkeepNeeded } = await lotteryContractPlayer.checkUpkeep(
              "0x"
            );
            assert(!upkeepNeeded);
          });

          it("return false if the enough time is not passed.", async () => {
            const interval = await lotteryContractPlayer.getInterval();
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() - 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
            const { upkeepNeeded } = await lotteryContractPlayer.checkUpkeep(
              "0x"
            );
            assert(!upkeepNeeded);
          });

          it("return true if the enough time is passed, is open, and has enough money.", async () => {
            const interval = await lotteryContractPlayer.getInterval();
            const entryFree = await lotteryContractPlayer.getEntranceFee();
            await lotteryContractPlayer.enterLottery({ value: entryFree });
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
            const { upkeepNeeded } = await lotteryContractPlayer.checkUpkeep(
              "0x"
            );
            assert(upkeepNeeded);
          });
        });

        describe("performUpKeep", () => {
          it("can only run if checkUpKeep is true", async () => {
            const entryFree = await lotteryContractPlayer.getEntranceFee();
            const interval = await lotteryContractPlayer.getInterval();
            await lotteryContractPlayer.enterLottery({ value: entryFree });
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const tx = await lotteryContractPlayer.performUpkeep([]);
            assert(tx);
          });

          it("revert if checkupKeep is false", async () => {
            await expect(lotteryContractPlayer.performUpkeep([])).to.be
              .revertedWithCustomError;
          });

          it("updates the raffle state and emits a requestId through the event.", async () => {
            const entryFree = await lotteryContractPlayer.getEntranceFee();
            const interval = await lotteryContractPlayer.getInterval();
            await lotteryContractPlayer.enterLottery({ value: entryFree });

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const tx = await lotteryContractPlayer.performUpkeep([]);
            const txRec = await tx.wait(1);
            const state = await lotteryContractPlayer.getState();
            const reqId = txRec.events && txRec.events[1].args?.requestId;
            assert(reqId.toNumber() > 0);
            assert.equal(state.toString(), "1");
          });
        });

        describe("fullFillRandomWords", () => {
          beforeEach(async () => {
            const entryFree = await lotteryContractPlayer.getEntranceFee();
            const interval = await lotteryContractPlayer.getInterval();
            await lotteryContractPlayer.enterLottery({ value: entryFree });

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
          });

          it("can only be called after performupkeep", async () => {
            await expect(
              mockV2Interface.fulfillRandomWords(
                0,
                lotteryContractPlayer.address
              ) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request");
            await expect(
              mockV2Interface.fulfillRandomWords(
                1,
                lotteryContractPlayer.address
              ) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request");
          });

          it("picks a winner and then reset the lottery", async () => {
            const additionalEntrees = 3;
            const startingIndex = 2;
            const accounts = await ethers.getSigners();
            const entryFree = await lotteryContractPlayer.getEntranceFee();

            for (
              let i = startingIndex;
              i < startingIndex + additionalEntrees;
              i++
            ) {
              lotteryContractPlayer = lotteryContract.connect(accounts[i]);
              await lotteryContractPlayer.enterLottery({ value: entryFree });
            }

            const startingTimeStamp =
              await lotteryContractPlayer.getLastTimeStamp();

            await new Promise<void>(async (resolve, reject) => {
              lotteryContract.once("WinnerPicked", async () => {
                console.log("winner event fired.");

                try {
                  const recentWinner =
                    await lotteryContractPlayer.getRecentWinner();
                  const state = await lotteryContractPlayer.getState();
                  const winnerBalance = await accounts[2].getBalance();
                  const endingTimeStamp =
                    await lotteryContractPlayer.getLastTimeStamp();
                  await expect(lotteryContractPlayer.getPlayer(0)).to.be
                    .reverted;

                  assert.equal(recentWinner.toString(), accounts[2].address);
                  assert.equal(state, 0);
                  assert.equal(
                    winnerBalance.toString(),
                    startingBalance
                      .add(entryFree.mul(additionalEntrees).add(entryFree))
                      .toString()
                  );
                  assert(endingTimeStamp > startingTimeStamp);
                  resolve();
                } catch (e: any) {
                  reject(e);
                }
              });
              const tx = await lotteryContractPlayer.performUpkeep([]);
              const txRec = await tx.wait(1);
              const startingBalance = await accounts[2].getBalance();
              const reqId = txRec.events && txRec.events[1].args?.requestId;
              await mockV2Interface.fulfillRandomWords(
                reqId,
                lotteryContractPlayer.address
              );
            });
          });
        });
      });
    });
