/** @vitest-environment jsdom */

import {fireEvent, renderHook} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {useDrag} from '../index'

describe('useDrag', () => {
  it('should track pointer displacement while the element is dragged', async () => {
    const element = document.createElement('div')
    const {result} = renderHook(() => useDrag(() => element))

    fireEvent.mouseDown(element, {clientX: 10, clientY: 20})
    fireEvent.mouseMove(document, {clientX: 25, clientY: 50})

    expect(result.isDragging()).toBe(true)
    expect(result.position()).toEqual({x: 15, y: 30})

    fireEvent.mouseUp(document)
    expect(result.isDragging()).toBe(false)
  })
})
