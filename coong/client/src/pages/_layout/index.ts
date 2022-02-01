import {QLayout, QPageContainer} from 'quasar'
import {defineComponent, Fragment, h, Transition} from 'vue'
import {RouterView} from 'vue-router'
import introJPG from './_assets/intro.jpg'
import {provideLayout} from './use-layout'
import {className} from 'src/plugins/hyper-components'
import {SignIn} from './_components/SignIn'
import {AudioButton} from './_components/AudioButton'
import {BackdropFilterText} from './_components/BackdropFilterText'
import {staticUrl} from 'src/environment'
import {resolveUrl} from '@winter-love/utils'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {
    const layout = provideLayout()
    return () => (
      h(Fragment, [
        h(QLayout, {view: 'lHh Lpr lFf'}, () => [
          h(QPageContainer, () => [
            h(RouterView),
          ]),
        ]),
        h(Transition, {name: 'video'}, () => [
          layout.showVideoBackground && h('video', {
            autoplay: true,
            class: videoStyle(),
            loop: true,
            muted: true,
            playsinline: true,
            poster: introJPG,
          }, [
            h('source', {
              src: resolveUrl(staticUrl(), '/videos/intro.mp4'),
              type: 'video/mp4',
            }),
          ]),
        ]),
        h('div', {
          class: containerStyle(),
        }, [
          //
          h('div', {
            class: subContainerStyle(),
          }, [
            h('div', {
              class: mediaStyle(),
            }, [
              [
                h(BackdropFilterText, {
                  class: className({
                    $$activeColor: 'rgba(200, 200, 200, 0.3)',
                    $$filter: 'blur(5px) hue-rotate(80deg)',
                  }),
                }, () => [
                  'Coong',
                ]),
                ///
                h(AudioButton),
                h('div', {class: signInContainerStyle()}, [
                  layout.isMagicAuthLink ?
                    h('div') :
                    h(SignIn),
                ]),
              ],
            ]),
          ]),
        ]),
      ])
    )
  },
})

export default PagesLayout

const videoStyle = () => className({
  backgroundColor: 'black',
  height: '100%',
  left: '50%',
  maxWidth: '100%',
  minHeight: '100%',
  objectFit: 'cover',
  position: 'fixed',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
})

const containerStyle = () => className({
  alignItems: 'center', display: 'flex', justifyContent: 'center', width: '100%',
})

const subContainerStyle = () => className({
  bottom: '46%',
  display: 'flex',
  flexDirection: 'column',
  left: '50%',
  position: 'absolute',
  transform: 'translate(-50%, +50%)',
})

const mediaStyle = () => [
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

const signInContainerStyle = () => className({
  bottom: '0',
  left: '50%',
  position: 'absolute',
  transform: 'translate(-50%, 100%)',
})
