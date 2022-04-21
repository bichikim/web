import {toUndefined} from '@winter-love/utils'
import {useRequest} from 'boot/graphql-request'
import {computed, reactive, ref, toRefs} from 'vue'
import {useSolana} from './solana'

export type ProviderName = 'solana' | 'ethereum'

export const useWallet = () => {
  const request = useRequest()
  const solana = useSolana()

  const signMessageRef = ref<string | undefined>()
  const providerNameRef = ref<ProviderName>('solana')
  const providerRef = computed(() => {
    switch (providerNameRef.value) {
      case 'solana':
        return solana
      default:
        return solana
    }
  })
  const {
    walletAddress: walletAddressRef,
    connected: connectedRef,
    signature: signatureRef,
  } = toRefs(providerRef.value)

  const requestCryptoSignMessage = async (email: string) => {
    const data = await request.cryptoSignMessage({input: {email}})
    signMessageRef.value = toUndefined(data.authenticateCryptoSignMessage)
  }

  const providerSign = async () => {
    const provider = providerRef.value
    if (!provider) {
      return
    }
    const signMessage = signMessageRef.value
    if (!signMessage) {
      return
    }
    await provider.sign(signMessage)
  }

  const sign = async (email: string) => {
    await requestCryptoSignMessage(email)
    const signMessage = signMessageRef.value
    if (!signMessage) {
      return
    }
    await providerSign()
  }

  return reactive({
    connected: connectedRef,
    sign,
    signMessage: signMessageRef,
    signature: signatureRef,
    walletAddress: walletAddressRef,
  })
}
