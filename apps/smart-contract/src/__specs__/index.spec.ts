import Web3 from 'web3'
import * as ganache from 'ganache-cli'
const web3 = new Web3(ganache.provider())
import compile from 'scripts/compile'

describe('main', () => {
  let accounts
  let inbox

  beforeEach(async () => {
    accounts = await web3.eth.getAccounts()
    inbox = await new web3.eth.Contract(JSON.parse(compile.interface))
      .deploy({
        arguments: ['Hi there!'],
        data: compile.bytecode,
      })
      .send({from: accounts[0], gas: 1_000_000})
  })

  it('should deploy a contract', () => {
    console.log(inbox)
  })
})
