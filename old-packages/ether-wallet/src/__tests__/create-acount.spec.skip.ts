import {createEthereumWallet} from '../'

describe('createEthereumWallet', () => {
  describe('createAccount', () => {
    // fix ethers nextTick Error
    let keep: any
    beforeAll(() => {
      keep = window.setImmediate
      window.setImmediate = undefined as any
    })
    afterAll(() => {
      window.setImmediate = keep
    })
    it('should create an account', () => {
      const wallet = createEthereumWallet()
      const account = wallet.createAccount()
      expect(typeof account.address).toBe('string')
      expect(typeof account.privateKey).toBe('string')
    })
  })
})
