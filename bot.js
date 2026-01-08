import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const CONTRACT = process.env.CONTRACT_ADDRESS;

// minimum send: 1000 gwei
const MIN_SEND = ethers.parseUnits("1000", "gwei");

// extra safety buffer
const GAS_BUFFER = ethers.parseEther("0.000001");

// simple random BigInt helper
function randomBigInt(min, max) {
  const range = max - min;
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  return min + rand;
}

async function sendRandomTx() {
  const balance = await provider.getBalance(wallet.address);
  const feeData = await provider.getFeeData();

  const gasLimit = 80_000n;
  const maxFeePerGas = feeData.maxFeePerGas ?? ethers.parseUnits("1", "gwei");
  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas ?? ethers.parseUnits("0", "gwei");

  const gasCost = gasLimit * maxFeePerGas;
  const maxSend = balance - gasCost - GAS_BUFFER;

  if (maxSend <= MIN_SEND) {
    console.log("⚠️ Balance too low — stopping bot safely");
    process.exit(0);
  }

  const value = randomBigInt(MIN_SEND, maxSend);

  console.log(`➡️ Sending ${ethers.formatEther(value)} ETH`);

  const tx = await wallet.sendTransaction({
    to: CONTRACT,
    value,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas
  });

  console.log(`📤 Tx hash: ${tx.hash}`);

  const receipt = await tx.wait(1);
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🤖 Base transaction bot started");
  console.log("Wallet:", wallet.address);
  console.log("Contract:", CONTRACT);

  while (true) {
    try {
      await sendRandomTx();
    } catch (err) {
      console.error("❌ Error:", err.message ?? err);
    }

    // random delay between txs (3–15 seconds)
    const delay = 3000 + Math.random() * 12000;
    await sleep(delay);
  }
}

main();
