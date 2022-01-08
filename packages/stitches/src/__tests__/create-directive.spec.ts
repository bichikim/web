/**
 * @jest-environment node
 */

import {createCreateDirective} from '../create-directive'
import {createSSRApp, h, ref, withDirectives} from 'vue-demi'
import {renderToString} from '@vue/server-renderer'

describe('createDirective', () => {
  it('should create directive', async () => {

    const {createDirective, getCssText} = createCreateDirective({
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

    /**
     * value = [css, variants] or css
     * arg = string undefined
     */
    const {directive} = createDirective({
      left: 0,
    })

    const colorRef = ref('red')

    const app = createSSRApp({
      setup() {
        return () => (
          withDirectives(h('div'), [[directive, {color: colorRef.value}, 'foo']])
        )
      },
    })

    await renderToString(app)

    expect(getCssText()).toMatchSnapshot()

    colorRef.value = 'green'

    await renderToString(app)

    expect(getCssText()).toMatchSnapshot()
  })
})
