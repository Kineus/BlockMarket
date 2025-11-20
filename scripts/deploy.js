const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  console.log('Deploying with:', deployer.address)

  const stableToken = process.env.CUSD_ADDRESS_SEPOLIA || '0xYourCUSDAddress'
  if (!stableToken || stableToken === '0xYourCUSDAddress') {
    console.warn(
      '⚠️  Using placeholder cUSD address. Update CUSD_ADDRESS_SEPOLIA in .env.'
    )
  }

  const Factory = await hre.ethers.getContractFactory('BlockParityPrediction')
  const contract = await Factory.deploy(stableToken)
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log('BlockParityPrediction deployed to:', address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
