/* eslint-disable max-nested-callbacks */
import {computed, defineComponent, h, ref, Transition} from 'vue'
import {QBtn, QCard, QInput, QTooltip} from 'quasar'
import {HGlow, useClassName} from '@winter-love/hyper-components'
import {ionChevronBackOutline, ionChevronForwardOutline} from '@quasar/extras/ionicons-v6'

export const SignInButton = defineComponent({
  render() {
    const {showInput, showInputIcon, onToggleShowInput, email} = this
    const className = useClassName()

    const card = className({
      '& .input-enter-from,.input-leave-to': {
        width: '0 !important',
      },
      '& .input-leave-active,.input-enter-active': {
        transition: 'width 0.5s ease',
      },

      borderRadius: 0,

      display: 'flex',

      height: 40,
      mt: 20,
    })

    const signInButton = className({
      borderRadius: 0,
      color: 'black',
      flexShrink: 0,
      width: 75,
    })

    const showInputButton = className({
      borderRadius: 0,
      color: 'black',
      flexShrink: 0,
    })

    const signInInput = [
      className({
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

    return (
      h(HGlow, () => [
        h(QCard, {class: card}, () => [
          h(Transition, {name: 'input'}, () => [
            showInput && h(QInput, {
              borderless: true,
              class: signInInput,
              dense: true,
              modelValue: email,
              placeholder: 'Your Email',
            }),
          ]),
          h(QBtn, {class: showInputButton, dense: true, flat: true, icon: showInputIcon, onClick: onToggleShowInput}),
          h(QBtn, {class: signInButton, flat: true, noCaps: true}, () => [
            'Sign In',
            h(QTooltip, () => `sign in with "${email}"`),
          ]),
        ]),
      ])
    )
  },
  setup() {
    const showInput = ref(false)
    const email = ref('')

    const showInputIcon = computed(() => {
      return showInput.value ? ionChevronForwardOutline : ionChevronBackOutline
    })

    const onToggleShowInput = () => {
      showInput.value = !showInput.value
    }

    return {
      email,
      onToggleShowInput,
      showInput,
      showInputIcon,
    }
  },
})
