export interface OpenProps {
  mnemonic?: string
  password?: string
  privateKey?: string
}

export interface Account {
  address: string
  privateKey: string
}

export interface OpenNewReturn extends Account {
  mnemonic: string
}

export interface Wallet {
  accountAddress?: string
  createAccount: (entropy?: string) => Account
  isOpen: boolean
  loadAccount: (password: string, progress?: (value: number) => any) => Promise<Account | void>
  restoreAccount: (mnemonic: string) => Account
  saveAccount: (password: string, progress?: (value: number) => any) => Promise<boolean>
  sign: (message: string) => Promise<string | void>
}
