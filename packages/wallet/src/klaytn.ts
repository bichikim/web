import {Account, Wallet} from './types'
import Caver, {AccountWithFunctions as CaverWallet, RequestProvider} from 'caver-js'
import type {Socket} from 'net'
import {entropyToMnemonic, mnemonicToEntropy} from 'bip39'
import {parseJson, stringifyJson} from '@winter-love/utils'
export interface CreateKlaytnWalletOptions {
  saveKey?: string
}
export const createKlaytnWallet = (
  provider?: RequestProvider,
  net?: Socket,
  options: CreateKlaytnWalletOptions = {},
): Wallet => {
  const {saveKey = 'winter-love--klaytn-wallet'} = options
  const caver = new Caver(provider, net)
  let wallet: CaverWallet | undefined
  let mnemonic: string | undefined
  const createAccount = (entropy?: string): Account => {
    wallet = caver.klay.accounts.create(entropy)
    mnemonic = entropyToMnemonic(wallet.privateKey)
    console.log(wallet, mnemonic)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }
  const loadAccount = (password: string) => {
    if (typeof globalThis.localStorage !== 'object') {
      return Promise.resolve()
    }
    const jsonString = globalThis.localStorage.getItem(saveKey)
    if (typeof jsonString !== 'string') {
      return Promise.resolve()
    }
    const account = caver.klay.accounts.decrypt(parseJson(jsonString), password)
    wallet = caver.klay.accounts.createWithAccountKey(account.address, account.accountKey)
    return Promise.resolve({
      address: wallet.address,
      privateKey: wallet.privateKey,
    })
  }
  const restoreAccount = (): any => {
    // const privateKey = mnemonicToEntropy
  }
  const saveAccount = (password: string): Promise<boolean> => {
    if (!wallet) {
      return Promise.resolve(false)
    }
    if (typeof globalThis.localStorage === 'object') {
      const jsonObject = wallet.encrypt(password)
      globalThis.localStorage.setItem(saveKey, stringifyJson(jsonObject))
      return Promise.resolve(true)
    }
    return Promise.resolve(false)
  }
  const sign = (message: string) => {
    if (wallet) {
      const result = wallet.sign(message)
      console.log(result)
      return Promise.resolve()
    }
    return Promise.resolve()
  }
  return {
    get accountAddress(): string | undefined {
      return wallet?.address
    },
    createAccount,
    get isOpen(): boolean {
      return Boolean(wallet)
    },
    loadAccount,
    restoreAccount,
    saveAccount,
    sign,
  }
}
