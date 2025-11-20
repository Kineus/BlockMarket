const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('BlockParityPrediction', function () {
  let contract, stableToken, owner, player, other, contractAddress

  beforeEach(async () => {
    ;[owner, player, other] = await ethers.getSigners()
    const MockToken = await ethers.getContractFactory('MockERC20')
    stableToken = await MockToken.deploy('Mock cUSD', 'mcUSD')
    await stableToken.waitForDeployment()

    const Factory = await ethers.getContractFactory('BlockParityPrediction')
    contract = await Factory.deploy(await stableToken.getAddress())
    await contract.waitForDeployment()

    await stableToken.mint(player.address, ethers.parseEther('100'))
    contractAddress = await contract.getAddress()
    await stableToken.mint(contractAddress, ethers.parseEther('500'))
    await stableToken
      .connect(player)
      .approve(await contract.getAddress(), ethers.MaxUint256)
  })

  it('records bet and transfers stake', async () => {
    const currentBlock = await ethers.provider.getBlockNumber()
    const expectedTarget = BigInt(currentBlock + 2)
    const stake = ethers.parseEther('1')
    const predictEven = expectedTarget % 2n === 0n
    const contractBalanceBefore = await stableToken.balanceOf(contractAddress)
    await expect(contract.connect(player).placeBet(predictEven, stake))
      .to.emit(contract, 'BetPlaced')
      .withArgs(1, player.address, stake, expectedTarget, predictEven)

    const bet = await contract.bets(1)
    expect(bet.player).to.equal(player.address)
    const contractBalanceAfter = await stableToken.balanceOf(contractAddress)
    expect(contractBalanceAfter - contractBalanceBefore).to.equal(stake)
    expect(bet.targetBlock).to.equal(expectedTarget)
  })

  it('settles winning bet and pays out', async () => {
    const currentBlock = await ethers.provider.getBlockNumber()
    const expectedTarget = BigInt(currentBlock + 2)
    const stake = ethers.parseEther('2')
    const isTargetEven = expectedTarget % 2n === 0n
    const predictEven = isTargetEven
    await contract.connect(player).placeBet(predictEven, stake)

    await ethers.provider.send('hardhat_mine', ['0x2'])

    const preBalance = await stableToken.balanceOf(player.address)
    await expect(contract.connect(other).settleBet(1))
      .to.emit(contract, 'BetSettled')
      .withArgs(1, player.address, true, stake * 2n)
    const postBalance = await stableToken.balanceOf(player.address)
    expect(postBalance - preBalance).to.equal(stake * 2n)
  })

  it('settles losing bet and keeps funds', async () => {
    const currentBlock = await ethers.provider.getBlockNumber()
    const expectedTarget = BigInt(currentBlock + 2)
    const stake = ethers.parseEther('1')
    const isTargetEven = expectedTarget % 2n === 0n
    const bankrollBefore = await stableToken.balanceOf(contractAddress)
    await contract.connect(player).placeBet(!isTargetEven, stake)

    await ethers.provider.send('hardhat_mine', ['0x2'])
    await expect(contract.connect(other).settleBet(1))
      .to.emit(contract, 'BetSettled')
      .withArgs(1, player.address, false, 0)

    const bankrollAfter = await stableToken.balanceOf(contractAddress)
    expect(bankrollAfter - bankrollBefore).to.equal(stake)
  })
})
