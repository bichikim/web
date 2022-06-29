/**
 * @jest-environment node
 */

import {createEmotion} from '../index'
import {createSSRApp, h} from 'vue-demi'
import {renderToString} from '@vue/server-renderer'
import createEmotionServer from '@emotion/server/create-instance'

describe('server-side rendering', () => {
  it('should ', async () => {
    const emotion = createEmotion()
    const emotionServer = createEmotionServer(emotion.cache)

    const Text = emotion.styled('div')({
      color: 'red',
    })

    const app = createSSRApp({
      setup() {
        return () => h('div', [h(Text, () => 'foo')])
      },
    })

    const appContent = await renderToString(app)

    const {html, styles} = emotionServer.extractCriticalToChunks(appContent)
    const stylesInHead = emotionServer.constructStyleTagsFromChunks({html, styles})

    expect(stylesInHead).toMatchSnapshot()
    expect(html).toMatchSnapshot()
  })
})
