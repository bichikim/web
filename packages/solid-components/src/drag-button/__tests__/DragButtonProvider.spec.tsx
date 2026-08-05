/**
 * @vitest-environment jsdom
 */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {DragButtonBody} from '../DragButtonBody'
import {DragButtonProvider} from '../DragButtonProvider'
import {DragButtonContext} from '../context'

const DragPosition = () => {
  const [position] = useContext(DragButtonContext)

  return <output data-drag-x={position().dragX} data-drag-y={position().dragY} />
}

describe('DragButtonProvider', () => {
  afterEach(() => {
    cleanup()
  })

  it('should allow an upward drag when allowBottom is enabled', async () => {
    const {getByRole, container} = render(() => (
      <DragButtonProvider allowBottom>
        <DragButtonBody>Drag</DragButtonBody>
        <DragPosition />
      </DragButtonProvider>
    ))
    const button = getByRole('button', {name: 'Drag'})

    await fireEvent.mouseDown(button, {clientX: 0, clientY: 0})
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 0, clientY: -25}))

    expect(container.querySelector('output')?.getAttribute('data-drag-y')).toBe('-25')
  })

  it('should classify a release using its final coordinates without requiring a move event', async () => {
    const onClick = vi.fn()
    const onLeftExecute = vi.fn()
    const {getByRole} = render(() => (
      <DragButtonProvider dragExecuteSize={50} onClick={onClick} onLeftExecute={onLeftExecute}>
        <DragButtonBody>Drag</DragButtonBody>
      </DragButtonProvider>
    ))
    const button = getByRole('button', {name: 'Drag'})

    await fireEvent.mouseDown(button, {clientX: 0, clientY: 0})
    window.dispatchEvent(new MouseEvent('pointerup', {clientX: 100, clientY: 0}))

    expect(onLeftExecute).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('should cancel a drag without executing an action', async () => {
    const onClick = vi.fn()
    const onLeftExecute = vi.fn()
    const {getByRole, container} = render(() => (
      <DragButtonProvider onClick={onClick} onLeftExecute={onLeftExecute}>
        <DragButtonBody>Drag</DragButtonBody>
        <DragPosition />
      </DragButtonProvider>
    ))
    const button = getByRole('button', {name: 'Drag'})

    await fireEvent.mouseDown(button, {clientX: 0, clientY: 0})
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 25, clientY: 0}))
    window.dispatchEvent(new Event('pointercancel'))
    window.dispatchEvent(new MouseEvent('pointerup', {clientX: 100, clientY: 0}))

    expect(container.querySelector('output')?.getAttribute('data-drag-x')).toBe('0')
    expect(onClick).not.toHaveBeenCalled()
    expect(onLeftExecute).not.toHaveBeenCalled()
  })
})
