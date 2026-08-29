import {type Accessor, createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {useHistory} from '../index'

describe('useHistory', () => {
  it('should expose the latest value and retain the complete history', () => {
    createRoot((dispose) => {
      const historyApi = useHistory([1])
      const currentValue = historyApi[0] as Accessor<number | undefined>
      const addValue = historyApi[1] as (value: number) => void
      const history = historyApi[2] as Accessor<number[]>

      expect(currentValue()).toBe(1)

      addValue(2)

      expect(currentValue()).toBe(2)
      expect(history()).toEqual([1, 2])
      dispose()
    })
  })

  it('should start without a current value by default', () => {
    createRoot((dispose) => {
      const currentValue = useHistory<string>()[0] as Accessor<string | undefined>

      expect(currentValue()).toBeUndefined()
      dispose()
    })
  })
})
