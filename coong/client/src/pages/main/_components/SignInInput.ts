import {defineComponent, h, PropType} from 'vue'
import {QBtn, QInput, QTooltip} from 'quasar'
import {ionMailSharp, ionWalletSharp} from '@quasar/extras/ionicons-v6'
import {className} from 'src/plugins/hyper-components'

export type SignInKind = 'email' | 'wallet'

const container = () => [
  className({
    bg: 'white',
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
  color: 'black',
  flexShrink: 0,
  opacity: active ? 1 : '0.5',
})

export const SignInInput = defineComponent({
  emits: ['update:active', 'update:email'],
  name: 'SignInInput',
  props: {
    active: {default: 'email', type: String as PropType<SignInKind>},
    email: {type: String},
  },
  render() {
    const {email, active, onChangeActive, onUpdateEmail} = this

    return (
      h('div', {class: container()}, [
        h(QInput, {
          borderless: true,
          class: signInInput(),
          dense: true,
          label: 'Your Email',
          modelValue: email,
          'onUpdate:modelValue': onUpdateEmail,
        }),
        h(QBtn, {
          class: menuButton(active === 'email'),
          dense: true,
          flat: true,
          icon: ionMailSharp,
          noCaps: true,
          onClick: () => onChangeActive('email'),
        }, () => [
          h(QTooltip, () => 'By email authentication'),
        ]),
        h(QBtn, {
          class: menuButton(active === 'wallet'),
          dense: true,
          disable: true,
          flat: true,
          icon: ionWalletSharp,
          noCaps: true,
          onClick: () => onChangeActive('wallet'),
        }, () => [
          h(QTooltip, () => 'By wallet authentication (WIP)'),
        ]),
      ])
    )
  },
  setup(props, {emit}) {

    const onChangeActive = (kind: SignInKind) => {
      emit('update:active', kind)
    }

    const onUpdateEmail = (email: string) => {
      emit('update:email', email)
    }

    return {
      onChangeActive,
      onUpdateEmail,
    }
  },
})
