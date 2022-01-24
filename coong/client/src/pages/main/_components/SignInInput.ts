import {useClassName} from '@winter-love/hyper-components'
import {computed, defineComponent, h, PropType, toRefs} from 'vue'
import {QBtn, QInput} from 'quasar'
import {ionMailSharp, ionWalletSharp} from '@quasar/extras/ionicons-v6'

export type SignInKind = 'email' | 'wallet'

export const SignInInput = defineComponent({
  emits: ['update:active'],
  props: {
    active: {default: 'email', type: String as PropType<SignInKind>},
    email: {type: String},
  },
  render() {
    const {email, active, placeholder, onChangeActive} = this
    const className = useClassName()

    const container = () => [
      className({
        borderRight: '1px solid #ccc !important',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        px: 10,
        width: 200,
      }),
      className({
        '@bp1': {
          width: '200px !important',
        },
        '@bp2': {
          width: '300px !important',
        },
        '@bp3': {
          width: '300px !important',
        },
      }),
    ]
    const signInInput = () => [
      className({
        flexGrow: 1,
        px: 10,
      }),
    ]

    const menuButton = (active: boolean) => className({
      borderRadius: 0,
      color: active ? 'black' : 'gray',
      flexShrink: 0,
    })

    return (
      h('div', {class: container()}, [
        h(QInput, {
          borderless: true,
          class: signInInput(),
          dense: true,
          modelValue: email,
          placeholder,
        }),
        h(QBtn, {
          class: menuButton(active === 'email'),
          dense: true,
          flat: true,
          icon: ionMailSharp,
          noCaps: true,
          onClick: () => onChangeActive('email'),
        }),
        h(QBtn, {
          class: menuButton(active === 'wallet'),
          dense: true,
          flat: true,
          icon: ionWalletSharp,
          noCaps: true,
          onClick: () => onChangeActive('wallet'),
        }),
      ])
    )
  },
  setup(props, {emit}) {
    const {active} = toRefs(props)
    const placeholder = computed(() => {
      switch (active.value) {
        case 'email':
          return 'Your Email'
        case 'wallet':
          return 'Your Wallet'
      }
    })

    const onChangeActive = (kind: SignInKind) => {
      emit('update:active', kind)
    }

    return {
      onChangeActive,
      placeholder,
    }
  },
})
