/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {createRoot} from 'solid-js'
import {useTargetElement} from './'

describe('useTargetElement', () => {
  it('returns an element found by the selector when a string is passed', () => {
    createRoot(() => {
      const div = document.createElement('div')

      div.id = 'test'
      document.body.append(div)

      const target = useTargetElement(() => '#test')

      expect(target()).toBe(div)
      div.remove()
    })
  })

  it('returns the HTMLElement as-is when passed directly', () => {
    createRoot(() => {
      const div = document.createElement('div')
      const target = useTargetElement(() => div)

      expect(target()).toBe(div)
    })
  })

  it('returns null when null is passed', () => {
    createRoot(() => {
      const target = useTargetElement(() => null)

      expect(target()).toBeNull()
    })
  })

  it('returns null when a non-existent selector is passed', () => {
    createRoot(() => {
      const target = useTargetElement(() => '#non-existent')

      expect(target()).toBeNull()
    })
  })
})
