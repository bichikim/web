import {createStore} from 'vare'
import {computed, reactive, ref} from 'vue'
import {useSolanaSign} from './modules/solana-sign'

export const useUser = createStore({
  name: 'user',
  setup() {
    const email = ref<string | number | null>()
    const {signInWithWallet: _signInWithWallet} = useSolanaSign(reactive({email}))
    const info = ref()
    const sessionTokenRef = ref()
    const signInMethod = ref('solana')
    const isSignIn = computed(() => {
      return Boolean(sessionTokenRef.value)
    })

    const signInWithCrypto = async () => {
      const result = await _signInWithWallet()
      if (result) {
        const {item, sessionToken} = result
        if (item) {
          info.value = item
        }
        if (sessionToken) {
          sessionTokenRef.value = sessionToken
        }
      }
    }

    // const singIn = () => {

    // }

    return {
      email,
      isSignIn,
      sessionToken: sessionTokenRef,
      signInMethod,
      signInWithCrypto,
    }
  },
})
