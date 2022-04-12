import {useRequest} from 'boot/graphql-request'
import {ref, toRefs} from 'vue'
import {useSolana} from './solana'

export const useWallet = () => {
  const emailRef = ref('')
  const request = useRequest()
  const solana = useSolana()
  const {walletAddress: walletAddressRef, connected: connectedRef} = toRefs(solana)
  const signMessageRef = ref<string | null | undefined>(null)

  const cryptoSignMessage = async () => {
    const email = emailRef?.value
    if (!email) {
      return
    }
    const data = await request.cryptoSignMessage({input: {email}})
    signMessageRef.value = data.authenticateCryptoSignMessage
  }

  const sign = async () => {
    await cryptoSignMessage()
    const signMessage = signMessageRef.value
    if (!signMessage) {
      return
    }
    const signature = await solana.sing(signMessage)
    const walletAddress = walletAddressRef.value
    const connected = connectedRef.value
    if (!walletAddress || !signature || !connected) {
      return
    }
    const data = await request.authenticateUserWithCryptoSignature({
      input: {
        message: signMessage,
        publicKey: walletAddress,
        signature,
      },
    })
    return data.authenticateUserWithCryptoSignature
  }

  return {
    sign,
  }
}
