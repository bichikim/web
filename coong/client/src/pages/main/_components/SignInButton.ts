/* eslint-disable max-nested-callbacks */
import {computed, defineComponent, h, ref, toRefs, Transition} from 'vue'
import {QBtn, QCard, QTooltip} from 'quasar'
import {HGlow} from '@winter-love/hyper-components'
import {ionChevronBackSharp, ionChevronForwardSharp} from '@quasar/extras/ionicons-v6'
import {SignInInput, SignInKind} from './SignInInput'
import {className} from 'src/plugins/hyper-components'

const containerStyle = () => className({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
})

const cardStyle = () => className({
  '& .input-enter-from,.input-leave-to': {
    width: '0 !important',
  },
  '& .input-leave-active,.input-enter-active': {
    transition: 'width 0.5s ease',
  },
  borderRadius: 0,
  display: 'flex',
  height: 40,
  mb: 10,
  mt: 20,
  pr: 10,
}, {
  linearGradient: 'hyper',
})

const signInButtonStyle = () => className({
  borderRadius: 0,
  color: 'white',
  flexShrink: 0,
  fontSize: '$b1',
  whiteSpace: 'nowrap',
  width: 75,
})

const showInputButtonStyle = () => className({
  borderRadius: 0,
  color: 'white',
  flexShrink: 0,
})

const descriptionStyle = () => className({
  color: 'white',
  fontSize: '$b2',
  fontWeight: 200,
  whiteSpace: 'nowrap',
})

export const SignInButton = defineComponent({
  name: 'SignInButton',
  props: {
    email: {type: String},
  },
  render() {
    const {
      showInput,
      showInputIcon,
      onToggleShowInput,
      emailRef,
      onChangeActiveMethod,
      activeMethod,
      description,
      onUpdateEmail,
    } = this

    return (
      h('div', {class: containerStyle()}, [
        h(HGlow, () => [
          h(QCard, {class: cardStyle()}, () => [
            h(Transition, {name: 'input'}, () => [
              showInput && h(SignInInput, {
                active: activeMethod,
                email: emailRef,
                'onUpdate:active': onChangeActiveMethod,
                'onUpdate:email': onUpdateEmail,
              }),
            ]),
            h(QBtn, {
              class: showInputButtonStyle(),
              dense: true,
              flat: true,
              icon: showInputIcon,
              onClick: onToggleShowInput,
            }),
            h(QBtn, {class: signInButtonStyle(), flat: true, noCaps: true}, () => [
              'Sign in/up',
              h(QTooltip, () => `sign in with "${emailRef}"`),
            ]),
          ]),
        ]),
        h('div', {class: descriptionStyle()}, description),
      ])
    )
  },
  setup(props) {
    const {email: emailProp} = toRefs(props)
    const showInput = ref(!emailProp.value)
    const emailRef = ref<string | undefined>(emailProp.value)
    const activeMethod = ref<SignInKind>('email')

    const showInputIcon = computed(() => {
      return showInput.value ? ionChevronForwardSharp : ionChevronBackSharp
    })

    const hasEmail = computed(() => Boolean(emailRef.value))

    const description = computed(() => {
      const command = hasEmail.value ?
        `Sign in/up with your "${emailRef.value}" by the ${activeMethod.value} authentication` :
        'Type your email'

      return `${command}`
    })

    const onToggleShowInput = () => {
      showInput.value = !showInput.value
    }

    const onChangeActiveMethod = (kind) => {
      activeMethod.value = kind
    }

    const onUpdateEmail = (email: string) => {
      emailRef.value = email
    }

    return {
      activeMethod,
      description,
      emailRef,
      onChangeActiveMethod,
      onToggleShowInput,
      onUpdateEmail,
      showInput,
      showInputIcon,
    }
  },
})
