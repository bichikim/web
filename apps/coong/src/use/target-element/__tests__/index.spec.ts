/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'

import {useTargetElement} from '../index'

describe('useTargetElement', () => {
  it('should resolve selectors and direct element targets reactively', () => {
    const element = document.createElement('div')
    element.id = 'target'
    document.body.append(element)
    const [target, setTarget] = createSignal<HTMLElement | string | null>('#target')
    const {result} = renderHook(() => useTargetElement(target))

    expect(result()).toBe(element)
    setTarget(element)
    expect(result()).toBe(element)
    setTarget('#missing')
    expect(result()).toBeNull()
  })
})
