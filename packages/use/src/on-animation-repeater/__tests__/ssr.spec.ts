/**
 * @jest-environment node
 */

import {renderToString} from '@vue/server-renderer'
import {createSSRApp, h, ref} from 'vue'
import {onAnimationRepeater} from '../'

describe('animationRepeater ssr', () => {
  it('should render it as string', async () => {
    const app = createSSRApp({
      setup() {
        const countRef = ref(0)

        function increaseCount() {
          countRef.value += 1
        }

        const toggleRef = onAnimationRepeater(increaseCount)

        function toggleCount() {
          toggleRef.value = !toggleRef.value
        }

        return () =>
          h('div', [h('div', countRef.value), h('button', {onClick: toggleCount}, 'toggle count')])
      },
    })

    const appContent = await renderToString(app)

    expect(appContent).toBe('<div><div>0</div><button>toggle count</button></div>')
  })
})
