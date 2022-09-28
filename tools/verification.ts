import { run } from "hardhat";

const verification = async (contractAddress: string, args: string[]) => {
  console.log("verifiying contract on the etherscan.");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(e);
    }
  }
};

export default verification;
