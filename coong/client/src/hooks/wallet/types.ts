export interface SignResult {
  id?: string
  name?: string
  sessionToken: string
}
export interface UseWalletReturn {
  sign: () => Promise<SignResult | undefined>
  signature?: string
}

export interface UseWalletUnitReturn {
  connected: boolean
  sign: (message: string) => Promise<void>
  signature?: string
  walletAddress?: string
}
