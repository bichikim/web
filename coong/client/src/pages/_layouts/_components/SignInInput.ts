import {ionMailSharp, ionWalletSharp} from '@quasar/extras/ionicons-v6'
import {HBtn, HInput} from '@winter-love/hyper-components'
import {className} from 'boot/hyper-components'
import {QTooltip} from 'quasar'
import {defineComponent, h, PropType, toRefs} from 'vue'
import {SignInMethod} from 'src/graphql'

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
export const SignInInput = defineComponent({
  emits: ['update:method', 'update:email'],
  name: 'SignInInput',
  props: {
    email: {type: String},
    method: {default: 'email', type: String as PropType<SignInMethod>},
  },
  setup(props, {emit}) {
    const {email, method} = toRefs(props)
    const onUpdateMethod = (kind: SignInMethod) => {
      emit('update:method', kind)
    }

    const onUpdateEmail = (email: string | number | null) => {
      emit('update:email', email)
    }

    return () => (
      h('div', {class: container()}, [
        h(HInput, {
          borderless: true,
          css: {
            flexGrow: 1,
            px: 10,
          },
          dense: true,
          label: 'Your Email',
          modelValue: email.value,
          'onUpdate:modelValue': onUpdateEmail,
        }),
        h(HBtn, {
          css: {
            borderRadius: 0,
            color: 'black',
            flexShrink: 0,
            opacity: method.value === 'email' ? 1 : '0.5',
          },
          dense: true,
          flat: true,
          icon: ionMailSharp,
          noCaps: true,
          onClick: () => onUpdateMethod('email'),
          size: 'sm',
        }, () => [
          h(QTooltip, () => 'By email authentication'),
        ]),
        h(HBtn, {
          css: {
            borderRadius: 0,
            color: 'black',
            flexShrink: 0,
            opacity: method.value === 'wallet' ? 1 : '0.5',
          },
          dense: true,
          flat: true,
          icon: ionWalletSharp,
          noCaps: true,
          onClick: () => onUpdateMethod('wallet'),
          size: 'sm',
        }, () => [
          h(QTooltip, () => 'By wallet authentication (WIP)'),
        ]),
      ])
    )
  },
})
