/**
 * @jest-environment node
 */

import {renderToString} from '@vue/server-renderer'
import {useBlur} from '../'
import {createSSRApp, h} from 'vue'

describe('blur', () => {
  it('should work well in ssr environment', async () => {
    const app = createSSRApp({
      setup: () => {
        const blur = useBlur()

        blur()

        return () => {
          return h('div', [h('button', {onClick: blur}, 'blur')])
        }
      },
    })

    const appContent = await renderToString(app)

    expect(appContent).toBe('<div><button>blur</button></div>')
  })
})
