const fs = require("fs");
const path = require("path");

const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "BlockParityPrediction.sol", "BlockParityPrediction.json");
const frontendDir = path.join(__dirname, "..", "frontend", "config");
const abiOutput = path.join(frontendDir, "abi.json");

async function run() {
  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found. Run `npx hardhat compile` first.");
    process.exit(1);
  }
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  fs.writeFileSync(abiOutput, JSON.stringify(artifact.abi, null, 2));
  console.log("✅ ABI exported to frontend/config/abi.json");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

