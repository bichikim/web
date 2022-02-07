import {AudioButton} from 'pages/_layout/_components/AudioButton'
import {BackdropFilterText} from 'pages/_layout/_components/BackdropFilterText'
import {user} from 'src/store/user'
import {computed, defineComponent, h, ref} from 'vue'
import {SignInButton} from './SignInButton'
import {csx} from 'src/plugins/hyper-components'
import {VideoBackground} from './VideoBackground'

export const SignInPage = defineComponent({
  name: 'IndexPage',
  render() {
    const {
      isWaiting,
      onSignIn,
      email,
    } = this

    return (
      h('div', csx({
        css: {ps: 'relative', size: '100%'},
      }), [
        h(VideoBackground),
        h('div', csx({
          css: {
            b: '46%', fd: 'column', l: '50%', ps: 'absolute',
            transform: 'translate(-50%, +50%)',
          },
        }), [
          h('div', csx({
            css: {
              ai: 'flex-end', color: 'mistyrose',
              fb: 'row', fontSize: '3rem',
              fontWeight: 900, ps: 'relative',
              // eslint-disable-next-line sort-keys-fix/sort-keys-fix
              '@bp1': {
                fontSize: '3rem',
              },
              '@bp2': {
                fontSize: '5rem',
              },
              '@bp3': {
                fontSize: '7rem',
              },
            },
          }), [
            h(BackdropFilterText, csx({
              css: {
                $$activeColor: 'rgba(200, 200, 200, 0.3)',
                $$filter: 'blur(5px) hue-rotate(80deg)',
              },
            }), () => [
              'Coong',
            ]),
            h(AudioButton),
            h('div', csx({
              b: 0, l: '50%', ps: 'absolute',
              transform: 'translate(-50%, 100%)',
            }), [
              h(SignInButton, {email, isWaiting, onSignIn}),
            ]),
          ]),
        ]),
      ])
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
