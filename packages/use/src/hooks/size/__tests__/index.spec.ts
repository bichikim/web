/**
 * @vitest-environment jsdom
 */
import {useSize} from '../index'
import {effectScope, ref} from 'vue'
import {describe, expect, it, vi} from 'vitest'

vi.mock('src/hooks/element-resize')

describe('useSizeRef', () => {
  it.skip('should return reactive ref ', () => {
    const scope = effectScope()
    scope.run(() => {
      const elementSize = {
        height: 100,
        width: 100,
        x: 0,
        y: 0,
      }
      const fakeElement = ref({
        getBoundingClientRect: () => elementSize,
      })
      let scrollCallback

      const fakeContainer = ref({
        addEventListener: (key, callback) => {
          scrollCallback = callback
        },
        getBoundingClientRect: () => ({
          height: 500,
          width: 500,
          x: 0,
          y: 0,
        }),
      })
      const sizeRef = useSize(fakeElement as any, fakeContainer as any)
      expect(scrollCallback).toEqual(expect.any(Function))
      expect(sizeRef.value).toEqual(elementSize)
      elementSize.x = 50
      elementSize.y = 50
      scrollCallback()
      expect(sizeRef.value).toEqual(elementSize)
    })
  })
})
