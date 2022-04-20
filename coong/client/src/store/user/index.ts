import {useRequest} from 'boot/graphql-request'
import {SignInMethod} from 'src/graphql'
import {useWallet} from 'src/hooks/wallet'
import {defineStore} from 'vare'
import {computed, ref} from 'vue'

export const useUser = defineStore({
  name: 'user',
  setup() {
    const email = ref<string>('')
    const cryptoKind = ref('solana')
    const request = useRequest()
    const wallet = useWallet()
    const sessionTokenRef = ref<string | undefined>()
    const isSignIn = computed(() => {
      return Boolean(sessionTokenRef.value)
    })
    const method = ref<SignInMethod>('wallet')
    const name = ref<string | undefined>()
    const id = ref<string | undefined>()
    const postsCount = ref<string | undefined>()
    const followingCount = ref<string | undefined>()
    const followerCount = ref<string | undefined>()
    const postLikesCount = ref<string | undefined>()

    const signInWithCrypto = async () => {
      const response = await wallet.sign()
      sessionTokenRef.value = response?.sessionToken
      id.value = response?.id
      name.value = response?.name
    }

    const signInWithEmail = () => {
      //
    }

    const signInWithWebAuth = () => {
      //
    }

    const singIn = () => {
      switch (method.value) {
        case 'wallet':
          return signInWithCrypto()
        case 'email':
          return signInWithEmail()
        case 'web-auth':
          return signInWithWebAuth()
      }
    }

    return {
      cryptoKind,
      email,
      followerCount,
      followingCount,
      id,
      isSignIn,
      method,
      name,
      postLikesCount,
      postsCount,
      sessionToken: sessionTokenRef,
      signInWithCrypto,
      singIn,
    }
  },
})
