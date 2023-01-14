/* eslint-disable id-length */
import {createEthereumWallet} from '../'

describe('save-account', () => {
  // fix ethers nextTick Error
  let keep: any
  beforeAll(() => {
    keep = globalThis.setImmediate
    globalThis.setImmediate = undefined as any
  })
  afterAll(() => {
    globalThis.setImmediate = keep
  })
  it('should save and load a account', async () => {
    const progress = jest.fn()
    const wallet = createEthereumWallet()
    // const account = wallet.createAccount()

    await wallet.saveAccount('foo-bar', progress)
    // const savedAccount = localStorage.getItem('winter-love--ethereum-wallet')
    const wallet2 = createEthereumWallet()
    await wallet2.loadAccount('foo-bar')
    expect(wallet.accountAddress).toBe(wallet2.accountAddress)
  })
})
