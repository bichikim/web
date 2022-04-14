import {Wallet as EthersWallet} from 'ethers'
import type {Socket} from 'net'
import {Account, Wallet} from './types'
import {createEvents} from './events'

export interface CreateEthereumWalletOptions {
  saveKey?: string
}
const getAccounts = (wallet: EthersWallet): Account => {
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  }
}

export const createEthereumWallet = (
  provider?: any,
  net?: Socket,
  options: CreateEthereumWalletOptions = {},
): Wallet => {
  const events = createEvents()
  const {saveKey = 'winter-love--ethereum-wallet'} = options
  let wallet: EthersWallet | undefined

  const createAccount = () => {
    wallet = EthersWallet.createRandom()
    const account: Account = getAccounts(wallet)
    events.emit('update:wallet', account)
    return account
  }
  const saveAccount = async (password, progress?: (value: number) => any): Promise<Account | void> => {
    if (!wallet) {
      return
    }
    if (typeof globalThis.localStorage === 'object') {
      const jsonString = await wallet.encrypt(password, progress)
      globalThis.localStorage.setItem(saveKey, jsonString)
      const account: Account = getAccounts(wallet)
      events.emit('saved', account)
      return account
    }
  }
  const loadAccount = async (password: string, progress?: (value: number) => any): Promise<Account | void> => {
    if (typeof globalThis.localStorage !== 'object') {
      return
    }
    const jsonString = globalThis.localStorage.getItem(saveKey)
    if (typeof jsonString === 'string') {
      wallet = await EthersWallet.fromEncryptedJson(jsonString, password, progress)
      const account: Account = getAccounts(wallet)
      events.emit('update:wallet', account)
      return account
    }
  }
  const restoreAccount = (mnemonic: string): Account => {
    wallet = EthersWallet.fromMnemonic(mnemonic)
    return getAccounts(wallet)
  }
  const sign = (message: string): Promise<string | void> => {
    if (wallet) {
      return wallet.signMessage(message)
    }
    return Promise.resolve()
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
      return wallet?.mnemonic?.phrase
    },
    restoreAccount,
    saveAccount,
    sign,
  }
}
