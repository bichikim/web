/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {createRoot, createSignal} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {useTargetElement} from '../index'

describe('useTargetElement', () => {
  it('should return an element found by the selector when a string is passed', () => {
    createRoot(() => {
      const div = document.createElement('div')

      div.id = 'test'
      document.body.append(div)

      const target = useTargetElement(() => '#test')

      expect(target()).toBe(div)
      div.remove()
    })
  })

  it('should return the HTMLElement as-is when passed directly', () => {
    createRoot(() => {
      const div = document.createElement('div')
      const target = useTargetElement(() => div)

      expect(target()).toBe(div)
    })
  })

  it('should return null when null is passed', () => {
    createRoot(() => {
      const target = useTargetElement(() => null)

      expect(target()).toBeNull()
    })
  })

  it('should return null when a non-existent selector is passed', () => {
    createRoot(() => {
      const target = useTargetElement(() => '#non-existent')

      expect(target()).toBeNull()
    })
  })

  it('should resolve selectors and direct element targets reactively', () => {
    const element = document.createElement('div')
    const destination = document.createElement('div')
    element.id = 'target'
    document.body.append(element)
    const [target, setTarget] = createSignal<HTMLElement | string | null>('#target')
    const {result, cleanup} = renderHook(() => useTargetElement(target))

    try {
      expect(result()).toBe(element)
      setTarget(destination)
      expect(result()).toBe(destination)
      setTarget('#missing')
      expect(result()).toBeNull()
      setTarget('#target')
      expect(result()).toBe(element)
      setTarget(null)
      expect(result()).toBeNull()
    } finally {
      cleanup()
      element.remove()
    }
  })
})
