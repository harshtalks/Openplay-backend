import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import * as dotenv from "dotenv";
import "hardhat-abi-exporter";

dotenv.config({ path: __dirname + "/.env" });

const accs = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      chainId: 5,
      url: process.env.GOERLI_RPC_LINK,
      accounts: accs,
      gas: 2100000,
      gasPrice: 8000000000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    currency: "USD",
  },
  mocha: {
    timeout: 500000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API,
  },
  abiExporter: {
    path: "../frontend/abi",
    clear: true,
  },
};

export default config;
