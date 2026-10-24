/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {DialogOverlay} from '../DialogOverlay'
import {DialogProvider} from '../DialogProvider'

describe('DialogProvider', () => {
  it('should portal visible content and forward overlay close requests', async () => {
    const [show, setShow] = createSignal(false)
    const onClick = vi.fn()
    const onShowChange = vi.fn(setShow)
    const view = render(() => (
      <DialogProvider show={show()} onShowChange={onShowChange}>
        <DialogOverlay component="button" onClick={onClick}>
          Dismiss dialog
        </DialogOverlay>
      </DialogProvider>
    ))

    expect(view.queryByRole('button', {name: 'Dismiss dialog'})).toBeNull()

    setShow(true)
    const overlay = screen.getByRole('button', {name: 'Dismiss dialog'})

    expect(view.container.contains(overlay)).toBe(false)
    expect(document.body.contains(overlay)).toBe(true)

    await fireEvent.click(overlay)

    expect(onClick).toHaveBeenCalledOnce()
    expect(onShowChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('button', {name: 'Dismiss dialog'})).toBeNull()
  })
})
