import {
  QCard,
  QPage,
  // QSpinner,
} from 'quasar'
import {useLayout} from 'src/pages/_layout/use-layout'
import {className} from 'src/plugins/hyper-components'
import {user} from 'src/store/user'
import {computed, defineComponent, h, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'

const pageStyle = () => className({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',
})

const cardStyle = () => className({
  alignItems: 'center',
  display: 'flex',
  gap: 10,
  p: 10,
})

// const closeStyle = () => className({
//   '&:hover': {
//     textDecoration: 'underline',
//   },
//   color: 'blue',
//   cursor: 'pointer',
// })

// const goHomeStyle = () => className({
//   '&:hover': {
//     textDecoration: 'underline',
//   },
//   color: 'blue',
//   cursor: 'pointer',
// })

const MagicAuthLink = defineComponent({
  name: 'MagicAuthLink',
  render() {
    // const {
    // email,
    // isSignIn,
    //   name,
    //   onClose,
    //   onGoHome,
    // } = this
    return (
      h(QPage, {class: pageStyle()}, () => [
        h(QCard, {class: cardStyle()}, () => [
          // isSignIn ?
          //   h('div', [
          //     h('span', `Hello ${name ?? email} `),
          //     h('a', {class: closeStyle(), onClick: onClose}, 'close'),
          //     h('span', ' or '),
          //     h('a', {class: goHomeStyle(), onClick: onGoHome}, 'go home'),
          //   ]) :
          //   h('div', {}, [
          //     h('span', `Sign in as ${email} `),
          //     h(QSpinner),
          //   ]),
        ]),
      ])
    )
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const layout = useLayout()
    // const email = computed(() => user.email)
    // const token = computed(() => route.query.token)
    const email = ref('')
    const token = ref('')
    const name = computed(() => user.name)

    onMounted(() => {
      return user.$.signInWithEmailToken(email.value, token.value)
    })

    const onClose = () => {
      window.close()
    }

    const onGoHome = () => {
      return router.replace('/')
    }

    return {
      email,
      // isSignIn: user.$.isSignIn,
      name,
      onClose,
      onGoHome,
    }
  },
})

export default MagicAuthLink
