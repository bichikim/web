import type {Unsubscribe} from 'nanoevents'

export interface Account<PrivateKey> {
  address: string
  privateKey: PrivateKey
}

export type Bytes = ArrayLike<number>
export type BytesLike = Bytes | string
export type Event = 'update:wallet' | 'saved' | 'connected'

export interface OnEvent {
  (event: 'update:wallet', callback: (account: Account<any>) => any): Unsubscribe

  (event: 'saved', callback: (account: Account<any>) => any): Unsubscribe
}

export interface WalletEvent {
  emit: (event: Event, ...args: any[]) => void
  on: OnEvent
  once: (event: Event, callback: (wallet: Wallet<any>) => any) => Unsubscribe
  stopAll: () => void
}

export interface WalletItemTypes {
  encrypt: any
  privateKey: any
  transaction: any
  transactionResponse: any
}

export interface Wallet<TransactionRequest extends WalletItemTypes> {
  readonly accountAddress?: string | undefined
  readonly createAccount: (entropy?: string) => Account<WalletItemTypes['privateKey']>
  readonly createContract: (contractAddress: string, abi: any) => any
  readonly loadAccount: (
    password: string,
    progress?: (value: number) => any,
  ) => Promise<Account<WalletItemTypes['privateKey']> | void>
  readonly mnemonicPhrase: string | undefined
  provider: any | undefined
  readonly restoreAccount: (mnemonic: string) => Account<WalletItemTypes['privateKey']>
  readonly saveAccount: (
    password: string,
    progress?: (value: number) => any,
    options?: WalletItemTypes['encrypt'],
  ) => Promise<Account<WalletItemTypes['privateKey']> | void>
  readonly sendTransaction: (
    transaction: TransactionRequest['transaction'],
  ) => Promise<WalletItemTypes['transactionResponse'] | undefined>
  readonly sign: (message: string) => Promise<string | void>
}
