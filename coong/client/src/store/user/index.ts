import {createStore} from 'vare'
import {computed, reactive, ref} from 'vue'
import {useWallet} from 'src/store/wallet'
import {SignInMethod} from 'src/graphql'
import {toUndefined} from '@winter-love/utils'

export const useUser = createStore({
  name: 'user',
  setup() {
    const email = ref<string>('')
    const cryptoKind = ref('solana')
    const wallet = useWallet(reactive({
      email,
      kind: cryptoKind,
    }))
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
      if (!response) {
        return
      }
      const {sessionToken, item} = response
      if (item) {
        name.value = toUndefined(item.name)
        id.value = toUndefined(item.id)
        postsCount.value = toUndefined(item.postsCount)
        postLikesCount.value = toUndefined(item.postLikesCount)
        followingCount.value = toUndefined(item.followingCount)
        followerCount.value = toUndefined(item.followerCount)
      }
      sessionTokenRef.value = toUndefined(sessionToken)
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
