import {useClassName} from '@winter-love/hyper-components'
import {QPage} from 'quasar'
import {defineComponent, h} from 'vue'
import {AudioButton, BackdropFilterText, SignInButton} from './_components'

const IndexPage = defineComponent({
  name: 'IndexPage',
  render() {
    const className = useClassName()

    const container = className({
      bottom: '46%',
      display: 'flex',
      flexDirection: 'column',
      left: '50%',
      position: 'absolute',
      transform: 'translate(-50%, +50%)',
    })

    const media = [
      className({
        alignItems: 'flex-end',
        color: 'mistyrose',
        display: 'flex',
        flexDirection: 'row',
        fontSize: '3rem',
        fontWeight: '900',
        position: 'reactive',
      }),
      className({
        '@bp1': {
          fontSize: '3rem',
        },
        '@bp2': {
          fontSize: '5rem',
        },
        '@bp3': {
          fontSize: '7rem',
        },
      }),
    ]

    const signInContainer = className({
      bottom: '0',
      left: '50%',
      position: 'absolute',
      transform: 'translate(-50%, 100%)',
    })

    return (
      h(QPage, () => [
        h('div', {
          class: className({alignItems: 'center', display: 'flex', justifyContent: 'center', width: '100%'}),
        }, [
          //
          h('div', {
            class: container,
          }, [
            h('div', {
              class: media,
            }, [
              [
                h(BackdropFilterText, {
                  class: className({
                    $$activeColor: 'rgba(200, 200, 200, 0.1)',
                    $$filter: 'blur(5px) hue-rotate(80deg)',
                  }),
                }, () => [
                  'Coong',
                ]),
                ///
                h(AudioButton),
                h('div', {class: signInContainer}, [
                  h(SignInButton),
                ]),
              ],
            ]),
          ]),
        ]),
      ])
    )
  },
  setup() {
    return {
      // empty
    }
  },
})

export default IndexPage
