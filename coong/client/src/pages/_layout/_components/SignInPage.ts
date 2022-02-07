import {AudioButton} from 'pages/_layout/_components/AudioButton'
import {BackdropFilterText} from 'pages/_layout/_components/BackdropFilterText'
import {user} from 'src/store/user'
import {computed, defineComponent, h, ref, toRefs} from 'vue'
import {SignInButton} from './SignInButton'
import {csx} from 'src/plugins/hyper-components'
import {VideoBackground} from './VideoBackground'
import {SignInProgress} from './SignInProgress'

export const SignInPage = defineComponent({
  name: 'SignInPage',
  props: {
    inProgress: {default: false, type: Boolean},
  },
  setup(props) {
    const {inProgress} = toRefs(props)
    const inProgressRef = ref(inProgress.value)
    const email = computed(() => user.email)
    const isWaiting = ref(false)
    const onSignIn = (email: string) => {
      isWaiting.value = true
      return user.$.signInWithEmailOnly(email)
    }

    return () => ((
      h('div', csx({
        css: {ps: 'relative', size: '100%'},
      }), [
        h(VideoBackground),
        // absolute center
        h('div', csx({
          css: {
            b: '46%', fd: 'column', l: '50%', ps: 'absolute',
            transform: 'translate(-50%, +50%)',
          },
        }), [
          h('div', csx({
            css: {
              ai: 'center', color: 'mistyrose',
              fd: 'column', fontSize: '3rem',
              fontWeight: 900, ps: 'relative',
            },
          }), [
            h('div', csx({
              css: {
                ps: 'relative',
              },
            }), [
              h(BackdropFilterText, csx({
                css: {
                  $$activeColor: 'rgba(200, 200, 200, 0.3)',
                  $$filter: 'blur(5px) hue-rotate(80deg)',
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
              }), () => [
                'Coong',
              ]),
              h(AudioButton, csx({
                css: {
                  bottom: 0,
                  position: 'absolute',
                  right: 0,
                  transform: 'translateX(100%)',
                  // eslint-disable-next-line sort-keys-fix/sort-keys-fix
                  '@bp1': {
                    fontSize: '0.7rem',
                  },
                  '@bp2': {
                    fontSize: '0.9rem',
                  },
                  '@bp3': {
                    fontSize: '1rem',
                  },
                },
              })),
            ]),
            h('div', csx({
              b: 0, l: '50%', ps: 'absolute',
              transform: 'translate(-50%, 100%)',
            }), [
              inProgressRef.value ?
                // inProgress
                h(SignInProgress) :
                // no
                h(SignInButton, {
                  email: email.value,
                  isWaiting: isWaiting.value,
                  onSignIn,
                }),
            ]),
          ]),
        ]),
      ])
    ))
  },
})
