import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'

import {useOpinionCycle} from '../use-opinion-cycle'

describe('useOpinionCycle', () => {
  it('should expose the default opinion when the message list is empty', () => {
    createRoot((dispose) => {
      const cycle = useOpinionCycle(() => [])

      expect(cycle.messagesList()).toEqual([])
      expect(cycle.currentMessage()).toContain('React: Where every component is a function')
      cycle.goToNext()
      expect(cycle.currentMessage()).toContain('React: Where every component is a function')
      dispose()
    })
  })

  it('should cycle through messages and wrap to the first message', () => {
    createRoot((dispose) => {
      const [messages] = createSignal(['first', 'second'])
      const cycle = useOpinionCycle(messages)

      expect(cycle.currentMessage()).toBe('first')
      cycle.goToNext()
      expect(cycle.currentMessage()).toBe('second')
      cycle.goToNext()
      expect(cycle.currentMessage()).toBe('first')
      dispose()
    })
  })
})
