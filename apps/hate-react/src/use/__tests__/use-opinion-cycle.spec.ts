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

  it.each([
    {advances: 2, expected: 'first', length: 3, next: 'second', remaining: ['first', 'second']},
    {advances: 3, expected: 'second', length: 4, next: 'first', remaining: ['first', 'second']},
    {advances: 2, expected: 'only', length: 3, next: 'only', remaining: ['only']},
  ])('should keep cycling through a shortened list: $length to $remaining.length', (scenario) => {
    createRoot((dispose) => {
      try {
        const [messages, setMessages] = createSignal(
          ['first', 'second', 'third', 'fourth'].slice(0, scenario.length),
        )
        const cycle = useOpinionCycle(messages)
        for (let index = 0; index < scenario.advances; index += 1) {
          cycle.goToNext()
        }

        setMessages(scenario.remaining)

        expect(cycle.messagesList()).toEqual(scenario.remaining)
        expect(cycle.currentMessage()).toBe(scenario.expected)
        cycle.goToNext()
        expect(cycle.currentMessage()).toBe(scenario.next)
      } finally {
        dispose()
      }
    })
  })

  it('should retain a valid position when the list shrinks, grows, or replaces its messages', () => {
    createRoot((dispose) => {
      try {
        const [messages, setMessages] = createSignal(['first', 'second', 'third'])
        const cycle = useOpinionCycle(messages)
        cycle.goToNext()

        setMessages(['first', 'second'])
        expect(cycle.currentMessage()).toBe('second')
        setMessages(['first', 'second', 'third', 'fourth'])
        expect(cycle.currentMessage()).toBe('second')
        setMessages(['replacement first', 'replacement second'])
        expect(cycle.currentMessage()).toBe('replacement second')
      } finally {
        dispose()
      }
    })
  })

  it('should use the empty fallback and resume cycling after messages return', () => {
    createRoot((dispose) => {
      try {
        const [messages, setMessages] = createSignal(['first', 'second', 'third'])
        const cycle = useOpinionCycle(messages)
        cycle.goToNext()
        cycle.goToNext()

        setMessages([])
        expect(cycle.currentMessage()).toContain('React: Where every component is a function')
        cycle.goToNext()
        setMessages(['replacement first', 'replacement second'])

        expect(cycle.currentMessage()).toBe('replacement first')
        cycle.goToNext()
        expect(cycle.currentMessage()).toBe('replacement second')
      } finally {
        dispose()
      }
    })
  })
})
