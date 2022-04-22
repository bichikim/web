/* eslint-disable max-nested-callbacks,max-lines-per-function */
import {ionChevronBackSharp, ionChevronForwardSharp} from '@quasar/extras/ionicons-v6'
import {HBox, HBtn, HCard, HGlow} from '@winter-love/hyper-components'
import {debug} from 'hooks/debug'
import {debounce} from 'lodash'
import {QInnerLoading, QTooltip} from 'quasar'
import isEmail from 'validator/lib/isEmail'
import {computed, defineComponent, h, PropType, readonly, ref, toRefs, Transition, unref, watch} from 'vue'
import {SignInInput} from './SignInInput'
import {SignInMethod} from 'src/graphql'
import {MayRef} from '@winter-love/use'

const validateEmail = (value?: string) => {
  if (!value) {
    return true
  }
  return isEmail(value)
}
const DEFAULT_WAIT = 250
const debounceRef = <T>(value: MayRef<T>, wait: number = DEFAULT_WAIT) => {
  const valueRef = ref(unref(value))
  const update = debounce((value: T) => {
    valueRef.value = value
  }, wait)
  watch(value as any, (value) => {
    update(value)
  })

  return readonly(valueRef)
}

export const SignInButton = defineComponent({
  emits: ['sign-in', 'update:email', 'update:method'],
  name: 'SignInButton',
  props: {
    email: {type: String},
    isWaiting: {default: false, type: Boolean},
    method: {type: String as PropType<SignInMethod>},
    validatorWait: {default: 1000, type: Number},
  },
  setup(props, {emit}) {
    const {email, validatorWait, method} = toRefs(props)
    const showInput = ref(!email.value)
    const activeMethod = ref<SignInMethod>('email')
    const debounceEmail = debounceRef(email, validatorWait.value)
    const isEmailRef = computed(() => {
      return validateEmail(debounceEmail.value)
    })
    const showInputIcon = computed(() => {
      return showInput.value ? ionChevronForwardSharp : ionChevronBackSharp
    })

    const hasEmail = computed(() => Boolean(email.value))

    const description = computed(() => {
      const isEmail = isEmailRef.value
      if (!isEmail) {
        return `"${debounceEmail.value}" is not an email address`
      }
      return hasEmail.value ?
        `Sign in/up as "${debounceEmail.value}" with ${activeMethod.value} authentication` :
        'Please enter your email'
    })

    const onToggleShowInput = () => {
      showInput.value = !showInput.value
    }

    const onUpdateMethod = (kind: SignInMethod) => {
      emit('update:method', kind)
    }

    const onUpdateEmail = (email: string) => {
      emit('update:email', email)
    }

    const onSignIn = () => emit('sign-in')
    debug({})
    return () => (
      h(HBox, {
        css: {
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
        },
      }, () => [
        h(HGlow, () => [
          h(HCard, {
            css: {
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
            },
            linearGradient: 'hyper',
          }, () => [
            h(Transition, {name: 'input'}, () => [
              showInput.value && h(SignInInput, {
                email: email.value,
                method: method.value,
                'onUpdate:email': onUpdateEmail,
                'onUpdate:method': onUpdateMethod,
              }),
            ]),
            h(HBtn, {
              css: {
                borderRadius: 0,
                color: 'white',
                flexShrink: 0,
                fontSize: '$b1',
                pr: 0,
                whiteSpace: 'nowrap',
              },
              dense: true,
              flat: true,
              icon: showInputIcon.value,
              onClick: onToggleShowInput,
              title: 'zip-button',
            }),
            h(HBtn, {
              css: {
                borderRadius: 0,
                color: 'white',
                flexShrink: 0,
                fontSize: '$b1',
                pl: 5,
                pr: 15,
                whiteSpace: 'nowrap',
              },
              flat: true,
              noCaps: true,
              onClick: onSignIn,
              title: 'sign-in-button',
            }, () => [
              'Sign in/up',
              email.value && h(QTooltip, () => `sign in with "${email.value}"`),
            ]),
            h(QInnerLoading, {showing: props.isWaiting}),
          ]),
        ]),
        h(
          HBox,
          {
            css: {
              color: 'white',
              fontSize: '$b1',
              fontWeight: 200,
              textAlign: 'center',
              whiteSpace: 'wrap',
              width: '100vw',
            },
          },
          description.value,
        ),
      ])
    )
  },
})
