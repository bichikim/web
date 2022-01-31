import {user} from 'src/store/user'
import {computed, defineComponent, h, ref} from 'vue'
import {SignInButton} from './SignInButton'

export const SignIn = defineComponent({
  name: 'IndexPage',
  render() {
    const {
      isWaiting,
      onSignIn,
      email,
    } = this

    return (
      h(SignInButton, {email, isWaiting, onSignIn})
    )
  },
  setup() {
    const email = computed(() => user.email)
    const isWaiting = ref(false)

    const onSignIn = (email: string) => {
      isWaiting.value = true
      return user.$.signInWithEmailOnly(email)
    }

    return {
      email,
      hasEmail: user.$.hasEmail,
      isWaiting,
      onSignIn,
    }
  },
})
