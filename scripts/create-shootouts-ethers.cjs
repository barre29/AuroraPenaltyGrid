const { ethers } = require("ethers");
require("dotenv").config();

const CONTRACT_ADDRESS = "0xe2F42146646CBe30E2Cbeab4A5F9D888E22AC67e";
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const ABI = [
  {
    type: "function",
    name: "createReplicaShootout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shootoutId", type: "string" },
      { name: "entryFee", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "kickLabels", type: "string[]" }
    ],
    outputs: []
  }
];

const shootouts = [
  {
    id: "euro-final-2025",
    kickLabels: ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"],
    duration: 7 * 24 * 60 * 60, // 7 days
    entryFee: "0.001"
  },
  {
    id: "champions-semi-2025",
    kickLabels: ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"],
    duration: 5 * 24 * 60 * 60, // 5 days
    entryFee: "0.001"
  },
  {
    id: "world-cup-quarter-2025",
    kickLabels: ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5", "Kick 6", "Kick 7"],
    duration: 9 * 24 * 60 * 60, // 9 days (max is 10)
    entryFee: "0.002"
  },
  {
    id: "league-cup-final-2025",
    kickLabels: ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"],
    duration: 3 * 24 * 60 * 60, // 3 days
    entryFee: "0.0015"
  },
  {
    id: "super-cup-2025",
    kickLabels: ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5", "Kick 6"],
    duration: 8 * 24 * 60 * 60, // 8 days (changed from 14)
    entryFee: "0.0025"
  }
];

async function main() {
  console.log("⚽ Creating shootout markets with pure ethers.js...\n");

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("📝 Using account:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get contract instance
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log("📋 Creating shootouts:\n");

  for (const shootout of shootouts) {
    try {
      console.log(`   🎯 Creating: ${shootout.id}`);
      console.log(`      Kicks: ${shootout.kickLabels.length}`);
      console.log(`      Duration: ${shootout.duration / (24 * 60 * 60)} days`);
      console.log(`      Entry Fee: ${shootout.entryFee} ETH`);

      const tx = await contract.createReplicaShootout(
        shootout.id,
        ethers.parseEther(shootout.entryFee),
        shootout.duration,
        shootout.kickLabels
      );

      console.log(`      Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`      ✅ Created! Tx: ${receipt.hash}`);
      console.log(`      Gas used: ${receipt.gasUsed.toString()}\n`);

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`      ❌ Failed: ${error.message}\n`);
    }
  }

  console.log("✨ Shootout creation complete!");
  console.log(`\n📊 View on Etherscan: https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
