import {getWindow} from '@winter-love/utils'
import {ref} from 'vue'
import type Wallet from '@project-serum/sol-wallet-adapter'

const DEFAULT_PROVIDER_URL = 'https://solflare.com/provider'

const MAIN_NET = 'mainnet'

export const useSolana = (providerUrl: unknown = getSolflare() ?? getSolana() ?? DEFAULT_PROVIDER_URL) => {
  const walletAddress = ref<string | undefined>()
  const messageSignature = ref<string | undefined>()
  const publicKeyRef = ref<string | undefined>()

  const wallet = ref<undefined | Wallet>()

  const getWallet = async (): Promise<undefined | Wallet> => {
    if (wallet.value) {
      return wallet.value
    }

    const window = getWindow()
    if (!window) {
      return
    }

    if (typeof providerUrl !== 'string') {
      wallet.value = providerUrl as Wallet
      return wallet.value
    }

    const WalletModule = await import('@project-serum/sol-wallet-adapter')

    const Wallet = WalletModule?.default ?? WalletModule

    wallet.value = new Wallet(providerUrl, MAIN_NET)
    return wallet.value
  }

  const connect = async () => {
    const wallet = await getWallet()
    console.log(wallet)
    if (wallet) {
      return wallet.connect()
    }
  }

  const disconnect = async () => {
    const wallet = await getWallet()
    if (wallet) {
      return wallet.disconnect()
    }
  }

  const sign = async (message: string) => {
    const wallet = await getWallet()
    if (!wallet) {
      return
    }
    const data = new TextEncoder().encode(message)
    const signMessage = wallet.sign ?? (wallet as any).signMessage
    const {signature} = await signMessage(data, 'utf8')
    messageSignature.value = signature.toString()
    return signature
  }

  return {
    connect,
    disconnect,
    messageSignature,
    publicKey: publicKeyRef,
    sign,
    walletAddress,
  }
}

export const getSolana = () => {
  return getWindow()?.solana
}

export const getSolflare = () => {
  return getWindow()?.solflare
}
