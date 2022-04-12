import {useRequest} from 'boot/graphql-request'
import {UseWalletReturn} from 'hooks/wallet/types'
import {computed, reactive, ref, toRefs, UnwrapNestedRefs} from 'vue'
import {useSolana} from './solana'
import {toUndefined} from '@winter-love/utils'

export type ProviderName = 'solana' | 'ethereum'

export const useWallet = (): UnwrapNestedRefs<UseWalletReturn> => {
  const emailRef = ref('')
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

  const requestCryptoSignMessage = async () => {
    const email = emailRef?.value
    if (!email) {
      return
    }
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

  const requestAuthData = async () => {
    const signMessage = signMessageRef.value
    const walletAddress = walletAddressRef?.value
    const signature = signatureRef?.value
    const connected = connectedRef.value
    if (!walletAddress || !signature || !connected || !signMessage) {
      return
    }
    const data = await request.authenticateUserWithCryptoSignature({
      input: {
        message: signMessage,
        publicKey: walletAddress,
        signature,
      },
    })
    const response = data.authenticateUserWithCryptoSignature
    if (!response) {
      return
    }
    const {sessionToken, item = {}} = response
    if (!sessionToken) {
      return
    }
    return {
      ...item,
      sessionToken,
    }
  }

  const sign = async () => {
    await requestCryptoSignMessage()
    const signMessage = signMessageRef.value
    if (!signMessage) {
      return
    }
    await providerSign()
    return requestAuthData()
  }

  return reactive({
    connected: connectedRef,
    sign,
    signature: signatureRef,
    walletAddress: walletAddressRef,
  })
}
