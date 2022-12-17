/**
 * @jest-environment node
 */

import {renderToString} from '@vue/server-renderer'
import {useBlur} from '../'
import {createSSRApp, h} from 'vue'

describe('blur', () => {
  it('should work well in ssr environment', async () => {
    expect(() => useBlur()).not.toThrowError()
  })
})
