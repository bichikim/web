import {useAuthenticateUserWithCryptoSignatureMutation, useCryptoSignMessageQuery} from 'src/graphql'
import {useSolana} from 'src/hooks'
import {computed, toRefs, UnwrapNestedRefs} from 'vue'
export interface UseCryptoProps {
  email?: string | number | null
}

export const useCryptoSign = (props: UnwrapNestedRefs<UseCryptoProps>) => {
  const {email} = toRefs(props)
  const cryptoSignMessageVariables = computed(() => {
    return {
      input: {
        email: email?.value,
      },
    }
  })
  const cryptoSignMessageQuery = useCryptoSignMessageQuery({
    pause: true,
    variables: cryptoSignMessageVariables as any,
  })

  const authenticateUserWithCryptoSignatureMutation = useAuthenticateUserWithCryptoSignatureMutation()

  const solana = useSolana()

  const getCryptoSignMessage = () => {
    return cryptoSignMessageQuery.executeQuery({})
  }

  const cryptoSignMessage = computed(() => cryptoSignMessageQuery.data.value?.authenticateCryptoSignMessage)

  const signInWithSignature = () => {
    const signature = solana.messageSignature.value
    const publicKey = solana.publicKey.value
    const message = cryptoSignMessage.value
    if (!signature || !publicKey || !message) {
      return
    }
    return authenticateUserWithCryptoSignatureMutation.executeMutation({
      input: {
        message,
        publicKey,
        signature,
      },
    })
  }

  const signInWithWallet = async () => {
    // skip waiting
    const waitCryptoSignMessage = getCryptoSignMessage()
    await solana.init()
    await solana.connect()
    // wait waitCryptoSignMessage
    await waitCryptoSignMessage
    // sign wallet
    if (cryptoSignMessage.value) {
      await solana.sign(cryptoSignMessage.value)
      const result = await signInWithSignature()
      return result?.data?.authenticateUserWithCryptoSignature
    }
  }

  return {
    cryptoSignMessage,
    getCryptoSignMessage,
    messageSignature: solana.messageSignature,
    signInWithWallet,
  }
}
