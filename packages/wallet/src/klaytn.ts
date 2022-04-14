import {createEvents} from './events'
import {Account, Wallet} from './types'
import type {default as Caver, AccountWithFunctions as CaverWallet, RequestProvider} from 'caver-js'
import type {Socket} from 'net'
import {parseJson, stringifyJson} from '@winter-love/utils'
import {entropyToMnemonic, mnemonicToEntropy} from '@ethersproject/hdnode'
export interface CreateKlaytnWalletOptions {
  saveKey?: string
}

// eslint-disable-next-line functional/no-class
export class CaverModuleError extends Error {}

export const createKlaytnWallet = (
  provider?: RequestProvider,
  net?: Socket,
  options: CreateKlaytnWalletOptions = {},
): Wallet => {
  const events = createEvents()
  const {saveKey = 'winter-love--klaytn-wallet'} = options
  const caver: Caver | undefined = typeof window === 'object' ? (window as any).caver : undefined
  let wallet: CaverWallet | undefined
  let mnemonic: string | undefined
  const createAccount = (entropy?: string): Account => {
    if (!caver) {
      // eslint-disable-next-line functional/no-throw-statement
      throw new CaverModuleError('omg')
    }
    wallet = caver.klay.accounts.create(entropy)
    mnemonic = entropyToMnemonic(wallet.privateKey)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }
  const loadAccount = (password: string, progress?: (value: number) => any) => {
    if (!caver || typeof globalThis.localStorage !== 'object') {
      return Promise.resolve()
    }
    const jsonString = globalThis.localStorage.getItem(saveKey)
    if (typeof jsonString !== 'string') {
      return Promise.resolve()
    }
    progress?.(0)
    const account = caver.klay.accounts.decrypt(parseJson(jsonString), password)
    wallet = caver.klay.accounts.privateKeyToAccount(account.privateKey)
    mnemonic = entropyToMnemonic(wallet.privateKey)
    progress?.(1)
    return Promise.resolve({
      address: wallet.address,
      privateKey: wallet.privateKey,
    })
  }
  const restoreAccount = (mnemonic: string): Account => {
    if (!caver) {
      // eslint-disable-next-line functional/no-throw-statement
      throw new CaverModuleError('omg')
    }
    const privateKey = mnemonicToEntropy(mnemonic)
    wallet = caver.klay.accounts.privateKeyToAccount(privateKey)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }
  const saveAccount = (password: string, progress?: (value: number) => any): Promise<Account | void> => {
    if (!caver || !wallet) {
      return Promise.resolve()
    }
    if (typeof globalThis.localStorage === 'object') {
      progress?.(0)
      const jsonObject = wallet.encrypt(password)
      globalThis.localStorage.setItem(saveKey, stringifyJson(jsonObject))
      progress?.(1)
      return Promise.resolve({
        address: wallet.address,
        privateKey: wallet.privateKey,
      })
    }
    return Promise.resolve()
  }
  const sign = (message: string) => {
    if (!caver || !wallet) {
      return Promise.resolve()
    }

    // type error
    const result: any = wallet.sign(message)
    // console.log(result)
    return Promise.resolve(result?.signature)
  }
  return {
    ...events,
    get accountAddress(): string | undefined {
      return wallet?.address
    },
    createAccount,
    get isOpen(): boolean {
      return Boolean(wallet)
    },
    loadAccount,
    get mnemonicPhrase(): string | undefined {
      return mnemonic
    },
    restoreAccount,
    saveAccount,
    sign,
  }
}
