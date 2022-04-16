import {entropyToMnemonic, mnemonicToEntropy} from '@ethersproject/hdnode'
import {computed, effect, reactive, ref, UnwrapNestedRefs} from '@vue/reactivity'
import {parseJson, stringifyJson} from '@winter-love/utils'
import type {
  AccountWithFunctions,
  default as Caver,
  CreateTransactionObject,
  RequestProvider,
  TransactionReceipt,
} from 'caver-js'
import type {Socket} from 'net'
import {createEvents} from './events'
import {Account, Wallet, WalletItemTypes} from './types'

export interface CreateKlaytnWalletOptions {
  saveKey?: string
}

export interface KlaytnWalletItemTypes extends WalletItemTypes {
  privateKey: string
  transaction: CreateTransactionObject
  transactionResponse: TransactionReceipt
}

// eslint-disable-next-line functional/no-class
export class CaverModuleError extends Error {
  //
}

const getAccounts = (account: AccountWithFunctions): Account<string> => {
  return {
    address: account.address,
    privateKey: account.privateKey,
  }
}
// eslint-disable-next-line max-lines-per-function
export const createKlaytnWallet = (
  provider?: RequestProvider,
  net?: Socket,
  options: CreateKlaytnWalletOptions = {},
): UnwrapNestedRefs<Wallet<KlaytnWalletItemTypes>> => {
  const events = createEvents()
  const {saveKey = 'winter-love--klaytn-wallet'} = options
  const caver: Caver | undefined = typeof window === 'object' ? (window as any).caver : undefined
  const accountRef = ref<AccountWithFunctions | undefined>()
  const mnemonicPhraseRef = ref<string | undefined>()

  const createAccount = (entropy?: string): Account<string> => {
    if (!caver) {
      // eslint-disable-next-line functional/no-throw-statement
      throw new CaverModuleError('omg')
    }
    const account = caver.klay.accounts.create(entropy)
    mnemonicPhraseRef.value = entropyToMnemonic(account.privateKey)
    accountRef.value = account
    return getAccounts(account)
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
    const deprecateAccount = caver.klay.accounts.decrypt(parseJson(jsonString), password)
    const account = caver.klay.accounts.privateKeyToAccount(deprecateAccount.privateKey)
    accountRef.value = account
    progress?.(1)
    return Promise.resolve(getAccounts(account))
  }

  const restoreAccount = (mnemonic: string): Account<string> => {
    if (!caver) {
      // eslint-disable-next-line functional/no-throw-statement
      throw new CaverModuleError('omg')
    }
    const privateKey = mnemonicToEntropy(mnemonic)
    const account = caver.klay.accounts.privateKeyToAccount(privateKey)
    accountRef.value = account
    return getAccounts(account)
  }

  const saveAccount = (password: string, progress?: (value: number) => any): Promise<Account<string> | void> => {
    const account = accountRef.value
    if (!caver || !account) {
      return Promise.resolve()
    }
    if (typeof globalThis.localStorage === 'object') {
      progress?.(0)
      const jsonObject = account.encrypt(password)
      globalThis.localStorage.setItem(saveKey, stringifyJson(jsonObject))
      progress?.(1)
      return Promise.resolve(getAccounts(account))
    }
    return Promise.resolve()
  }

  const sign = (message: string) => {
    const account = accountRef.value
    if (!caver || !account) {
      return Promise.resolve()
    }

    // type error
    const result: any = account.sign(message)
    return Promise.resolve(result?.signature)
  }

  const sendTransaction = async (transaction: CreateTransactionObject) => {
    const account = accountRef.value
    if (caver && account) {
      const valueTransfer = caver.transaction.valueTransfer.create(transaction)
      await caver.wallet.sign(account?.address, valueTransfer)
      const rlpEncoded = valueTransfer.getRLPEncoding()
      return caver.rpc.klay.sendRawTransaction(rlpEncoded)
    }
  }

  const createContract = (contractAddress: string, abi: any) => {
    if (caver) {
      return caver.contract.create(abi, contractAddress)
    }
  }

  const accountAddressRef = computed(() => {
    return accountRef.value?.address
  })

  const providerRef = computed({
    get: () => {
      if (caver) {
        return (caver as any).currentProvider
      }
    },
    set: (value) => {
      if (caver) {
        (caver as any).currentProvider = value
      }
    },
  })

  effect(() => {
    const account = accountRef.value
    if (!caver || !account) {
      return
    }
    // caver 는 전역으로 keyring 이란걸 들고 있고 전송 요청등에서 사용 한다
    caver.wallet.add(caver.wallet.keyring.createFromPrivateKey(account.privateKey))
    events.emit('update:wallet', getAccounts(account))
  })

  return reactive({
    ...events,
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
