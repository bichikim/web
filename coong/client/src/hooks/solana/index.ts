import {getWindow} from '@winter-love/utils'
import {readonly, ref, watch} from 'vue'
import {MayRef, wrapRef} from '@winter-love/use'
import type Wallet from '@project-serum/sol-wallet-adapter'

const DEFAULT_PROVIDER_URL = 'https://solflare.com/provider'

const MAIN_NET = 'mainnet'

export interface ExtraWallet extends Wallet {
  isConnected: boolean
}

export const useSolana = (providerUrl?: MayRef<unknown>) => {
  const providerUrlRef = wrapRef(providerUrl, {defaultValue: getSolflare() ?? getSolana() ?? DEFAULT_PROVIDER_URL})
  const messageSignature = ref<string | undefined>()
  const publicKeyRef = ref<string | undefined>()
  const connectedRef = ref(false)
  const walletRef = ref<undefined | ExtraWallet>()
  const initPromise = ref<any>()

  const refresh = () => {
    const wallet = walletRef.value
    if (!wallet) {
      return
    }
    publicKeyRef.value = wallet.publicKey?.toBase58()
    connectedRef.value = wallet.isConnected
  }

  const connectCallback = () => {
    refresh()
  }

  const disconnectCallback = () => {
    publicKeyRef.value = undefined
    connectedRef.value = false
  }

  watch(walletRef, (wallet, oldWallet) => {
    if (oldWallet) {
      oldWallet.off('connect', connectCallback)
      oldWallet.off('disconnect', disconnectCallback)
    }
    if (wallet) {
      wallet.on('connect', connectCallback)
      wallet.on('disconnect', disconnectCallback)
    }
  })

  const initWallet = async (): Promise<undefined | Wallet> => {
    const providerUrl = providerUrlRef.value
    if (walletRef.value) {
      return walletRef.value
    }

    const window = getWindow()
    if (!window) {
      return
    }

    if (typeof providerUrl !== 'string') {
      walletRef.value = providerUrl as ExtraWallet
      return walletRef.value
    }

    const WalletModule = await import('@project-serum/sol-wallet-adapter')

    const Wallet = WalletModule?.default ?? WalletModule

    walletRef.value = (new Wallet(providerUrl, MAIN_NET)) as ExtraWallet
    return walletRef.value
  }

  const connect = async () => {
    const wallet = walletRef.value
    if (wallet) {
      return wallet.connect()
    }
  }

  const disconnect = async () => {
    await initPromise.value
    const wallet = walletRef.value
    if (wallet) {
      return wallet.disconnect()
    }
  }

  const sign = async (message: string) => {
    await initPromise.value
    if (!walletRef.value || !connectedRef.value) {
      await connect()
    }
    const wallet = walletRef.value
    if (wallet) {
      const data = new TextEncoder().encode(message)
      const signMessage = wallet.sign ?? (wallet as any).signMessage
      const {signature} = await signMessage(data, 'utf8')
      messageSignature.value = signature.toString()
      return signature
    }
  }

  return {
    connect,
    connected: readonly(connectedRef),
    disconnect,
    init: initWallet,
    messageSignature,
    publicKey: readonly(publicKeyRef),
    sign,
  }
}

export const getSolana = () => {
  return getWindow()?.solana
}

export const getSolflare = () => {
  return getWindow()?.solflare
}