import {createStore} from 'vare'
import {useCryptoSignMessageQuery} from 'src/graphql'
import {computed, reactive, ref, toRefs, UnwrapNestedRefs} from 'vue'

interface UseCryptoProps {
  email?: string | number | null
}

const useCrypto = (props: UnwrapNestedRefs<UseCryptoProps>) => {
  const {email} = toRefs(props)
  const cryptoSignMessageVariables = computed(() => {
    return {
      input: {
        email: email?.value,
      },
    }
  })
  const cryptoSignMessage = useCryptoSignMessageQuery({
    pause: true,
    variables: cryptoSignMessageVariables as any,
  })
  const getCryptoSignMessage = () => {
    return cryptoSignMessage.executeQuery({})
  }

  return {
    cryptoSignMessage: cryptoSignMessage.data,
    getCryptoSignMessage,
  }
}

export const useUser = createStore({
  name: 'user',
  setup() {
    const email = ref<string | number | null>()
    const {cryptoSignMessage, getCryptoSignMessage} = useCrypto(reactive({email}))

    return {
      cryptoSignMessage,
      email,
      getCryptoSignMessage,
    }
  },
})
