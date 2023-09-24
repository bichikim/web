/**
 * @jest-environment node
 */
import {nodeParse} from '@winter-love/vue-test'
import {renderToString} from '@vue/server-renderer'
import {createSSRApp} from 'vue'
import {createVueStitches} from '../'

describe('createVueStitches in production', () => {
  describe('styled', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })
    afterEach(() => {
      process.env.NODE_ENV = 'test'
    })
    it('should return component', async () => {
      const stitches = createVueStitches({})

      const component = stitches.styled('div', {
        color: 'red',
      })
      const app = createSSRApp(component, {})

      const result = await renderToString(app)
      const stringStyle = stitches.toString()
      const root = nodeParse(result)
      expect(root.querySelector('div')).not.toBeNull()
      expect(stringStyle).toContain('color:red')
    })
  })
})
