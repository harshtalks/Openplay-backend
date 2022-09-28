// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

//import

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
// errors

error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);
error Raffle__TransferFailed();
error Raffle__SendMoreToEnterRaffle();
error Raffle__RaffleNotOpen();

contract SmartLottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    // state variables
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    // chainlink variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionID;
    bytes32 private immutable i_keyHash; // gas lane value
    uint16 private immutable REQUEST_CONFIRMATION = 3;
    uint32 private constant NUM_WORDS = 2;
    uint32 private immutable i_callbackGasLimit;

    // local variables

    uint private immutable i_interval;
    uint private immutable i_entranceFee;
    uint private lastTimeStamp;
    address private recentWinner;
    address payable[] private players;
    LotteryState private state;

    // events

    event RequestedRaffleWinner(uint256 indexed requestId);
    event RaffleEnter(address indexed player);
    event WinnerPicked(address indexed player);

    constructor(
        address vrfCoordinator,
        uint64 subsId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        uint256 entranceFee,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_subscriptionID = subsId;
        i_keyHash = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        lastTimeStamp = block.timestamp;
        i_entranceFee = entranceFee;
        state = LotteryState.OPEN;
        i_interval = interval;
    }

    // pure view functions - to get state variables values;

    function getState() public view returns (LotteryState) {
        return state;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getRequestConfirmationNums() public pure returns (uint16) {
        return REQUEST_CONFIRMATION;
    }

    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS;
    }

    function getCallBackLimits() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return lastTimeStamp;
    }

    function getRecentWinner() public view returns (address) {
        return recentWinner;
    }

    function getPlayer(uint index) public view returns (address) {
        return players[index];
    }

    function numPlayers() public view returns (uint) {
        return players.length;
    }

    function getSubscriptionId() public view returns (uint) {
        return i_subscriptionID;
    }

    // Main functions (methods)

    /**
     * @dev
     * this function will let people join the lottery.
     * payable function
     */

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__SendMoreToEnterRaffle();
        }

        if (state != LotteryState.OPEN) {
            revert("Raffle not open");
        }

        players.push(payable(msg.sender));

        emit RaffleEnter(msg.sender);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % players.length;
        address payable winner = players[indexOfWinner];
        recentWinner = winner;

        // re initializing the contract for the next round;

        players = new address payable[](0);
        state = LotteryState.OPEN;
        lastTimeStamp = block.timestamp;

        // sending money to the winner

        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(winner);
    }

    function checkUpkeep(
        bytes memory /*checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = LotteryState.OPEN == state;
        bool timePassed = ((block.timestamp - lastTimeStamp) > i_interval);
        bool hasBalance = address(this).balance > 0;
        bool hasPlayers = players.length > 0;
        upkeepNeeded = isOpen && timePassed && hasBalance && hasPlayers;
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");

        bool isOpen = LotteryState.OPEN == state;
        bool timePassed = ((block.timestamp - lastTimeStamp) > i_interval);
        bool hasBalance = address(this).balance > 0;
        bool hasPlayers = players.length > 0;

        upkeepNeeded = isOpen && timePassed && hasBalance && hasPlayers;

        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                players.length,
                uint256(state)
            );
        }

        state = LotteryState.CALCULATING;

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionID,
            REQUEST_CONFIRMATION,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }
}
