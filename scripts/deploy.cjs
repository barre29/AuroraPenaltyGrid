const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AuroraPenaltyGrid contract to Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  console.log("📦 Deploying AuroraPenaltyGrid...");
  const AuroraPenaltyGrid = await hre.ethers.getContractFactory("AuroraPenaltyGrid");
  const contract = await AuroraPenaltyGrid.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ AuroraPenaltyGrid deployed to:", address);

  // Read contract constants
  const minEntryFee = await contract.MIN_ENTRY_FEE();
  const minDuration = await contract.MIN_DURATION();
  const maxDuration = await contract.MAX_DURATION();
  const minKicks = await contract.MIN_KICKS();
  const maxKicks = await contract.MAX_KICKS();

  console.log("\n📋 Contract Constants:");
  console.log("   MIN_ENTRY_FEE:", hre.ethers.formatEther(minEntryFee), "ETH");
  console.log("   MIN_DURATION:", minDuration.toString(), "seconds");
  console.log("   MAX_DURATION:", maxDuration.toString(), "seconds");
  console.log("   MIN_KICKS:", minKicks.toString());
  console.log("   MAX_KICKS:", maxKicks.toString());

  console.log("\n🔗 Update frontend constants:");
  console.log(`   AURORA_PENALTY_GRID_ADDRESS = "${address}"`);

  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
