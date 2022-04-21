/* eslint-disable max-nested-callbacks */
import {ionChevronBackSharp, ionChevronForwardSharp} from '@quasar/extras/ionicons-v6'
import {HGlow} from '@winter-love/hyper-components'
import {debounce} from 'lodash'
import {QBtn, QCard, QInnerLoading, QTooltip} from 'quasar'
import {className} from 'src/plugins/hyper-components'
import {debug} from 'src/use/debug'
import isEmail from 'validator/lib/isEmail'
import {computed, defineComponent, h, ref, toRefs, Transition, watch} from 'vue'
import {SignInInput, SignInKind} from './SignInInput'

const validateEmail = (value?: string) => {
  if (!value) {
    return true
  }
  return isEmail(value)
}

export const SignInButton = defineComponent({
  emits: ['signIn'],
  name: 'SignInButton',
  props: {
    email: {type: String},
    isWaiting: {default: false, type: Boolean},
    validatorWait: {default: 500, type: Number},
  },
  setup(props, {emit}) {
    const {email: emailProp, validatorWait} = toRefs(props)
    const showInput = ref(!emailProp.value)
    const emailRef = ref<string>(emailProp.value ?? '')
    const activeMethod = ref<SignInKind>('email')
    const isEmailRef = ref(validateEmail(emailRef.value))

    const showInputIcon = computed(() => {
      return showInput.value ? ionChevronForwardSharp : ionChevronBackSharp
    })

    const hasEmail = computed(() => Boolean(emailRef.value))

    const description = computed(() => {
      const isEmail = isEmailRef.value
      if (!isEmail) {
        return `"${emailRef.value}" is not an email address`
      }
      return hasEmail.value ?
        `Sign in/up as "${emailRef.value}" with ${activeMethod.value} authentication` :
        'Please enter your email'
    })

    watch(emailRef, debounce((value) => {
      isEmailRef.value = validateEmail(value)
    }, validatorWait.value))

    const onToggleShowInput = () => {
      showInput.value = !showInput.value
    }

    const onChangeActiveMethod = (kind) => {
      activeMethod.value = kind
    }

    const onUpdateEmail = (email: string) => {
      emailRef.value = email
    }

    const onSignIn = () => emit('signIn', emailRef.value)

    debug({
      activeMethod,
      description,
      emailRef,
      onChangeActiveMethod,
      onSignIn,
      onToggleShowInput,
      onUpdateEmail,
      showInput,
      showInputIcon,
    })

    return () => (
      h('div', {class: containerStyle()}, [
        h(HGlow, () => [
          h(QCard, {class: cardStyle()}, () => [
            h(Transition, {name: 'input'}, () => [
              showInput.value && h(SignInInput, {
                active: activeMethod.value,
                email: emailRef.value,
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
            h(QBtn, {
              class: signInButtonStyle(),
              flat: true,
              noCaps: true,
              onClick: onSignIn,
            }, () => [
              'Sign in/up',
              emailRef.value && h(QTooltip, () => `sign in with "${emailRef.value}"`),
            ]),
            h(QInnerLoading, {showing: props.isWaiting}),
          ]),
        ]),
        h('div', {class: descriptionStyle()}, description.value),
      ])
    )
  },
})

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
  mb: 10,
  mt: 20,
  position: 'relative',
}, {
  linearGradient: 'hyper',
})

const signInButtonStyle = () => className({
  borderRadius: 0,
  color: 'white',
  flexShrink: 0,
  fontSize: '$b1',
  whiteSpace: 'nowrap',
})

const showInputButtonStyle = () => className({
  bg: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 0,
  color: 'white',
  flexShrink: 0,
})

const descriptionStyle = () => className({
  color: 'white',
  fontSize: '$b2',
  fontWeight: 200,
  textAlign: 'center',
  whiteSpace: 'wrap',
  width: '100vw',
})
