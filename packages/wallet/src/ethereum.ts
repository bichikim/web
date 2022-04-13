import {Wallet as EthersWallet} from 'ethers'
import type {Socket} from 'net'
import {Account, OpenProps, Wallet} from './types'

export interface CreateEthereumWalletOptions {
  saveKey?: string
}

export const createEthereumWallet = (
  provider?: any,
  net?: Socket,
  options: CreateEthereumWalletOptions = {},
): Wallet => {
  const {saveKey = 'winter-love--ethereum-wallet'} = options
  let wallet: EthersWallet | undefined
  const createAccount = () => {
    wallet = EthersWallet.createRandom()
    console.log(wallet)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }
  const saveAccount = async (password, progress?: (value: number) => any): Promise<boolean> => {
    if (!wallet) {
      return false
    }
    if (typeof globalThis.localStorage === 'object') {
      const jsonString = await wallet.encrypt(password, progress)
      globalThis.localStorage.setItem(saveKey, jsonString)
      return true
    }
    return false
  }
  const loadAccount = async (password: string, progress?: (value: number) => any): Promise<Account | void> => {
    if (typeof globalThis.localStorage !== 'object') {
      return
    }
    const jsonString = globalThis.localStorage.getItem(saveKey)
    if (typeof jsonString === 'string') {
      wallet = await EthersWallet.fromEncryptedJson(jsonString, password, progress)
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
      }
    }
  }
  const restoreAccount = (mnemonic: string): Account => {
    wallet = EthersWallet.fromMnemonic(mnemonic)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    }
  }
  const sign = (message: string): Promise<string | void> => {
    if (wallet) {
      return wallet.signMessage(message)
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
