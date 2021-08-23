/**
 * @jest-environment node
 */

import {renderToString} from '@vue/server-renderer'
import {useBlur} from '../'
import {createSSRApp, h} from 'vue-demi'

describe('blur', () => {
  it('should blur in ssr component', async () => {
    const app = createSSRApp({
      setup: () => {
        const blur = useBlur()

        return () => {
          return h('div', [
            h('button', {onClick: blur}, 'blur'),
          ])
        }
      },
    })

    const appContent = await renderToString(app)

    expect(appContent).toBe('<div><button>blur</button></div>')
  })
})
