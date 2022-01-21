import {useClassName} from '@winter-love/hyper-components'
import {QLayout, QPageContainer} from 'quasar'
import {defineComponent, Fragment, h, Transition} from 'vue'
import {RouterView} from 'vue-router'
import introJPG from './_assets/intro.jpg'
import {provideLayout} from './use-layout'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {
    const className = useClassName()
    const {
      showVideoBackground,
    } = provideLayout()
    return () => (
      h(Fragment, [
        h(Transition, {name: 'video'}, () => [
          showVideoBackground.value && h('video', {
            autoplay: true,
            class: className({
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
              zIndex: '-1000',
            }),
            loop: true,
            muted: true,
            playsinline: true,
            poster: introJPG,
          }, [
            h('source', {
              src: 'https://static.coong.io/coong-front/videos/intro.mp4',
              type: 'video/mp4',
            }),
          ]),
        ]),
        h(QLayout, {view: 'lHh Lpr lFf'}, () => [
          h(QPageContainer, () => [
            h(RouterView),
          ]),
        ]),
      ])
    )
  },
})

export default PagesLayout
