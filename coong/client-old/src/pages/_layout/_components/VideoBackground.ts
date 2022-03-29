import {resolveUrl} from '@winter-love/utils'
import {staticUrl} from 'src/environment'
import {defineComponent, h} from 'vue'
import {csx} from 'src/plugins/hyper-components'
import introJPG from '../_assets/intro.jpg'

export const VideoBackground = defineComponent({
  name: 'VideoBackground',
  setup() {
    return () => (
      // container
      h('div', csx({
        css: {
          pointerEvents: 'none', ps: 'absolute', size: '100%', tl: 0,
        },
      }), [
        h('video', csx({
          autoplay: true,
          css: {
            bg: 'black', fit: 'cover', maxW: '100%', minH: '100%',
            ps: 'absolute', size: '100%', tl: '50%',
            transform: 'translate(-50%, -50%)', w: '100%',
          },
          loop: true,
          playsinline: true,
          poster: introJPG,
        }), [
          h('source', {
            src: resolveUrl(staticUrl(), '/videos/intro.mp4'),
            type: 'video/mp4',
          }),
        ]),
        // cover
        h('div', csx({
          css: {
            ps: 'absolute', size: '100%', tl: 0,
          },
        })),
      ])
    )
  },
})
