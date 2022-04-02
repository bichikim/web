import {createStore} from 'vare'
import {computed, reactive, ref} from 'vue'
import {useWallet} from 'src/store/wallet'

export const useUser = createStore({
  name: 'user',
  setup() {
    const email = ref<string>()
    const info = ref()
    const sessionTokenRef = ref()
    const signInMethod = ref('solana')
    const isSignIn = computed(() => {
      return Boolean(sessionTokenRef.value)
    })

    const signInWithCrypto = async () => {
      //
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
