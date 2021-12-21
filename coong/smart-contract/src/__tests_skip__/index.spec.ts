import Web3 from 'web3'
import * as ganache from 'ganache-cli'
const web3 = new Web3(ganache.provider())

describe('main', () => {

  beforeEach(async () => {
    const item = await web3.eth.getAccounts()
  })

  it('should deploy a contract', () => {
    // empty
  })
})
