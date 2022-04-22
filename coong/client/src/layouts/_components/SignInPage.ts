/* eslint-disable max-nested-callbacks */
import {HBox, useCsx} from '@winter-love/hyper-components'
import {defineComponent, h, PropType, ref, toRefs} from 'vue'
import {AudioButton} from './AudioButton'
import {BackdropFilterText} from 'components/BackdropFilterText'
import {SignInButton} from './SignInButton'
import {SignInProgress} from './SignInProgress'
import {VideoBackground} from './VideoBackground'
import {SignInMethod} from 'src/graphql'

export const SignInPage = defineComponent({
  emits: ['sign-in', 'update:email', 'update:method'],
  name: 'SignInPage',
  props: {
    email: {type: String},
    inProgress: {default: false, type: Boolean},
    isWaiting: {type: Boolean},
    method: {type: String as PropType<SignInMethod>},
  },
  // eslint-disable-next-line max-lines-per-function
  setup(props, {slots, emit}) {
    const {
      inProgress,
      email,
      isWaiting,
      method,
    } = toRefs(props)
    const csx = useCsx()
    const inProgressRef = ref(inProgress.value)
    const onSignIn = () => {
      emit('sign-in')
    }
    const onUpdateEmail = (email: string) => {
      emit('update:email', email)
    }
    const onUpdateMethod = (kind: SignInMethod) => {
      emit('update:method', kind)
    }

    return () => ((
      h(HBox, {
        css: {ps: 'relative', px: '10', size: '100%'},
      }, () => [
        h(VideoBackground),
        // absolute center
        h(HBox, {
          css: {
            b: '46%', fd: 'column', l: '50%', ps: 'absolute',
            transform: 'translate(-50%, +50%)',
          },
        }, () => [
          h(HBox, {
            css: {
              ai: 'center', color: 'mistyrose',
              fd: 'column', fontSize: '4rem',
              fontWeight: 900, ps: 'relative',
            },
          }, () => [
            h(HBox, {
              css: {
                ps: 'relative',
              },
            }, () => [
              h(BackdropFilterText, csx({
                css: {
                  $$activeColor: 'rgba(200, 200, 200, 0.3)',
                  $$filter: 'blur(5px) hue-rotate(80deg)',
                  '@bp1': {
                    fontSize: '4rem',
                  },
                  '@bp2': {
                    fontSize: '5rem',
                  },
                  '@bp3': {
                    fontSize: '6rem',
                  },
                },
              }), () => [
                'Coong',
              ]),
              h(AudioButton, {
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
              }),
            ]),
            h('div', csx({
              css: {
                b: 0, l: '50%', ps: 'absolute',
                transform: 'translate(-50%, 100%)',
              },
            }), [
              inProgressRef.value ?
                // inProgress
                h(SignInProgress) :
                // no
                h(SignInButton, {
                  email: email.value,
                  isWaiting: isWaiting.value,
                  method: method.value,
                  onSignIn,
                  'onUpdate:email': onUpdateEmail,
                  'onUpdate:method': onUpdateMethod,
                }),
            ]),
          ]),
        ]),
        slots.default?.(),
      ])
    ))
  },
})
