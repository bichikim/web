import type Wallet from '@project-serum/sol-wallet-adapter'
import {getWindow} from '@winter-love/utils'
import {template} from 'lodash'
import WalletModule from 'src/browser-modules/sol-wallet-adapter'
import {computed, reactive, ref, toRefs, UnwrapNestedRefs, watch} from 'vue'

const MAIN_NET = 'mainnet'
const DEFAULT_PROVIDER_URL = 'https://solflare.com/provider'

export interface UseSolanaProps {
  providerUrl?: any
}

export interface ExtraWallet extends Wallet {
  isConnected: boolean
}

export const useSolana = (props: UnwrapNestedRefs<UseSolanaProps> = {}) => {
  const {providerUrl} = toRefs(props)
  const providerRef = computed(() => {
    return providerUrl?.value ?? getSolflare() ?? getSolana() ?? DEFAULT_PROVIDER_URL
  })
  const connectedRef = ref(false)
  const walletRef = ref<undefined | ExtraWallet>()
  const walletAddressRef = ref<string | undefined>()

  const refresh = () => {
    const wallet = walletRef.value
    if (!wallet) {
      return
    }
    walletAddressRef.value = wallet.publicKey?.toBase58()
    connectedRef.value = wallet.isConnected
  }

  const connectCallback = () => {
    refresh()
  }

  const disconnectCallback = () => {
    walletAddressRef.value = undefined
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

  const initWallet = () => {
    const provider = providerRef?.value
    if (typeof provider !== 'string') {
      walletRef.value = provider as ExtraWallet
      return
    }
    if (!WalletModule) {
      return
    }
    walletRef.value = new WalletModule(provider, MAIN_NET)
  }

  const connect = async () => {
    initWallet()
    const wallet = walletRef.value
    if (wallet) {
      return wallet.connect()
    }
  }

  const sing = async (message: string) => {
    await connect()
    const walletAddress = walletAddressRef.value
    const connected = connectedRef.value
    const wallet = walletRef.value
    if (!walletAddress || !connected || !wallet) {
      return
    }

    const data = new TextEncoder().encode(message)
    const signMessage = wallet.sign ?? (wallet as any).signMessage
    const {signature} = await signMessage(data, 'utf8')
    return signature.toString('utf8')
  }

  return reactive({
    connected: connectedRef,
    sing,
    walletAddress: walletAddressRef,
  })
}

export const getSolana = () => {
  return getWindow()?.solana
}

export const getSolflare = () => {
  return getWindow()?.solflare
}
