import type {Unsubscribe} from 'nanoevents'

export interface Account {
  address: string
  privateKey: string
}

export interface OpenNewReturn extends Account {
  mnemonic: string
}

export type Event = 'update:wallet' | 'saved'

export interface WalletEvent {
  emit: (event: Event, ...args: any[]) => void
  on: (event: Event, callback: (account: Account) => any) => Unsubscribe
  once: (event: Event, callback: (account: Account) => any) => Unsubscribe
  stopAll: () => void
}

export interface Wallet extends WalletEvent {
  accountAddress?: string
  createAccount: (entropy?: string) => Account
  isOpen: boolean
  loadAccount: (password: string, progress?: (value: number) => any) => Promise<Account | void>
  mnemonicPhrase: string | undefined
  restoreAccount: (mnemonic: string) => Account
  saveAccount: (password: string, progress?: (value: number) => any) => Promise<Account | void>
  sign: (message: string) => Promise<string | void>
}
