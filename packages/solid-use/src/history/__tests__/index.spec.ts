import {createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {useHistory} from '../index'

describe('useHistory', () => {
  it('should expose the latest value and retain the complete history', () => {
    createRoot((dispose) => {
      const [currentValue, addValue, history] = useHistory([1])

      expect(currentValue()).toBe(1)

      addValue(2)

      expect(currentValue()).toBe(2)
      expect(history()).toEqual([1, 2])
      dispose()
    })
  })

  it('should start without a current value by default', () => {
    createRoot((dispose) => {
      const [currentValue] = useHistory<string>()

      expect(currentValue()).toBeUndefined()
      dispose()
    })
  })
})
