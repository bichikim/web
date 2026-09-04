/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it} from 'vitest'

import {useChildPresence} from '../use-child-presence'

it('should observe whether an element contains rendered children', async () => {
  const element = document.createElement('div')
  const [target, setTarget] = createSignal<HTMLElement>()
  const {cleanup, result} = renderHook(() => useChildPresence(target))

  expect(result()).toBe(false)

  setTarget(element)
  await Promise.resolve()
  expect(result()).toBe(false)

  const child = document.createElement('div')
  element.append(child)
  await new Promise<void>((resolve) => {
    queueMicrotask(() => resolve())
  })
  expect(result()).toBe(true)

  child.remove()
  await new Promise<void>((resolve) => {
    queueMicrotask(() => resolve())
  })
  expect(result()).toBe(false)

  cleanup()
})
