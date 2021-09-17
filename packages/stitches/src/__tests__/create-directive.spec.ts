/**
 * @jest-environment node
 */

import {createCreateDirective} from '../create-directive'
import {createSSRApp, h, withDirectives} from 'vue-demi'
import {renderToString} from '@vue/server-renderer'

describe('createDirective', () => {
  it('should create directive', async () => {

    const {createDirective, getCssText, toString} = createCreateDirective({
      media: {
        bp1: '(min-width: 640px)',
        bp2: '(min-width: 768px)',
        bp3: '(min-width: 1024px)',
      },
      theme: {
        colors: {
          red1: '#FD2525',
        },
      },
    })
    const directive = createDirective({
      left: 0,
    })

    const app = createSSRApp({
      setup() {
        return () => (
          withDirectives(h('div'), [[directive, {color: 'red'}]])
        )
      },
    })

    const appContent = await renderToString(app)

    expect(toString()).toMatchSnapshot()
  })
})
