import {useToggle} from './'
import {describe, expect, it} from 'vitest'

describe('useToggle', () => {
  it('should toggle', () => {
    const [toggle, toggleFunction] = useToggle()

    expect(toggle()).toBe(false)
    toggleFunction()
    expect(toggle()).toBe(true)
    toggleFunction()
    expect(toggle()).toBe(false)
  })
})
