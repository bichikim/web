import {TransactionResponse} from '@ethersproject/abstract-provider'
import {BigNumberish} from '@ethersproject/bignumber'
import {AccessListish} from '@ethersproject/transactions'
import {computed, reactive, ref, UnwrapNestedRefs} from 'vue'
import {Contract, Wallet as EthersWallet, providers} from 'ethers'
import type {Socket} from 'net'
import {Account, BytesLike, Wallet, WalletItemTypes} from '../types'
import {EncryptOptions} from '@ethersproject/json-wallets'

export interface CreateEthereumWalletOptions {
  saveKey?: string
}

const getAccounts = (wallet: EthersWallet): Account<any> => {
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  }
}
export type TransactionRequest = {
  accessList?: AccessListish
  ccipReadEnabled?: boolean
  chainId?: number

  customData?: Record<string, any>
  data?: BytesLike

  from?: string
  gasLimit?: BigNumberish
  gasPrice?: BigNumberish

  maxFeePerGas?: BigNumberish
  maxPriorityFeePerGas?: BigNumberish

  nonce?: BigNumberish
  to?: string

  type?: number
  value?: BigNumberish
}

export interface EthereumWalletItemTypes extends WalletItemTypes {
  encrypt: EncryptOptions
  privateKey: string
  transaction: TransactionRequest
  transactionResponse: TransactionResponse
}

// eslint-disable-next-line max-lines-per-function
export const createEthereumWallet = (
  provider?: any,
  net?: Socket,
  options: CreateEthereumWalletOptions = {},
): UnwrapNestedRefs<Wallet<EthereumWalletItemTypes>> => {
  const {saveKey = 'winter-love--ethereum-wallet'} = options
  const walletRef = ref<EthersWallet | undefined>()

  const createAccount = () => {
    const wallet = EthersWallet.createRandom()
    walletRef.value = wallet
    return getAccounts(wallet)
  }

  const saveAccount = async (
    password: string,
    progress?: (value: number) => any,
    options?: EncryptOptions,
  ): Promise<Account<string> | void> => {
    const wallet = walletRef.value
    if (!wallet) {
      return
    }
    if (typeof globalThis.localStorage === 'object') {
      const jsonString = await wallet.encrypt(password, options, progress)
      globalThis.localStorage.setItem(saveKey, jsonString)
      return getAccounts(wallet)
    }
  }

  const loadAccount = async (
    password: string,
    progress?: (value: number) => any,
  ): Promise<Account<string> | void> => {
    if (typeof globalThis.localStorage !== 'object') {
      return
    }
    const jsonString = globalThis.localStorage.getItem(saveKey)
    if (typeof jsonString === 'string') {
      const wallet = await EthersWallet.fromEncryptedJson(jsonString, password, progress)
      walletRef.value = wallet
      return getAccounts(wallet)
    }
  }

  const restoreAccount = (mnemonic: string): Account<string> => {
    const wallet = EthersWallet.fromMnemonic(mnemonic)
    walletRef.value = wallet
    return getAccounts(wallet)
  }

  const sign = (message: string): Promise<string | void> => {
    const wallet = walletRef.value
    if (!wallet) {
      return Promise.resolve()
    }
    return wallet.signMessage(message)
  }

  const _connect = (provider?: any) => {
    const wallet = walletRef.value
    if (!wallet) {
      return
    }
    wallet.connect(provider ?? wallet.provider ?? new providers.InfuraProvider('ropsten'))
  }

  const sendTransaction = (transaction: TransactionRequest): Promise<any> => {
    const wallet = walletRef.value
    if (!wallet) {
      return Promise.resolve()
    }
    return wallet.sendTransaction(transaction)
  }

  const createContract = (contractAddress: string, abi: any) => {
    const wallet = walletRef.value
    if (!wallet) {
      return
    }
    return new Contract(contractAddress, abi, wallet)
  }

  const accountAddressRef = computed(() => {
    return walletRef.value?.address
  })

  const providerRef = computed({
    get: () => {
      return walletRef.value?.address
    },
    set: (value) => {
      _connect(value)
    },
  })

  const mnemonicPhraseRef = computed(() => {
    return walletRef.value?.mnemonic?.phrase
  })

  return reactive({
    accountAddress: accountAddressRef,
    createAccount,
    createContract,
    loadAccount,
    mnemonicPhrase: mnemonicPhraseRef,
    provider: providerRef,
    restoreAccount,
    saveAccount,
    sendTransaction,
    sign,
  })
}
