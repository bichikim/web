/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {DragButtonAside} from '../DragButtonAside'
import {DragButtonContent} from '../DragButtonContent'
import {DragButtonContext} from '../context'
import {HDragButton} from '../HDragButton'

describe('drag button parts', () => {
  it('should render content and the aside matching the drag direction', () => {
    const [position, setPosition] = createSignal({dragX: 20, dragY: 0})
    const view = render(() => (
      <DragButtonContext.Provider
        value={[position, {handleMouseDown: vi.fn(), handleTouchStart: vi.fn()}]}
      >
        <DragButtonAside component="span" position="left">
          Left action
        </DragButtonAside>
        <DragButtonAside component="span" position="right">
          Right action
        </DragButtonAside>
        <DragButtonContent component="div">Content</DragButtonContent>
      </DragButtonContext.Provider>
    ))

    expect(view.getByText('Left action').getAttribute('style')).toContain('20px')
    expect(view.queryByText('Right action')).toBeNull()
    expect(view.getByText('Content').getAttribute('style')).toContain('20px')

    setPosition({dragX: -15, dragY: 0})

    expect(view.queryByText('Left action')).toBeNull()
    expect(view.getByText('Right action').getAttribute('style')).toContain('15px')
  })

  it('should compose a draggable button and forward clicks', async () => {
    const onClick = vi.fn()
    const view = render(() => <HDragButton onClick={onClick}>Drag me</HDragButton>)

    const button = view.getByRole('button', {name: 'Drag me'})
    await fireEvent.mouseDown(button, {clientX: 0, clientY: 0})
    window.dispatchEvent(new MouseEvent('pointerup', {clientX: 1, clientY: 1}))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
