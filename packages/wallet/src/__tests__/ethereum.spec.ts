import {createEthereumWallet} from '../ethereum'

describe('createEthereumWallet', () => {
  describe('createAccount', () => {
    // fix ethers nextTick Error
    let keep: any
    beforeAll(() => {
      keep = globalThis.setImmediate
      globalThis.setImmediate = undefined as any
    })
    afterAll(() => {
      globalThis.setImmediate = keep
    })
    it('should create an account', () => {
      const wallet = createEthereumWallet()
      const account = wallet.createAccount()
      expect(typeof account.address).toBe('string')
      expect(typeof account.privateKey).toBe('string')
    })
    // it('should open an account', async () => {
    //   // eslint-disable-next-line unicorn/numeric-separators-style
    //
    //   console.log(typeof setImmediate)
    //   const wallet = createEthereumWallet()
    //   wallet.createAccount()
    //   const result = await wallet.saveAccount('foo-bar')
    //   expect(result).toBe(true)
    // })
  })
})
