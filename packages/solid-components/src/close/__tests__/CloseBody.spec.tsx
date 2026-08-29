/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {CloseBody} from '../CloseBody'
import {CloseProvider} from '../CloseProvider'

describe('CloseBody', () => {
  it('should preserve the click handler and request closing', async () => {
    const onClick = vi.fn()
    const onShowChange = vi.fn()
    const view = render(() => (
      <CloseProvider show onShowChange={onShowChange}>
        <CloseBody component="button" onClick={onClick}>
          Close
        </CloseBody>
      </CloseProvider>
    ))

    await fireEvent.click(view.getByRole('button', {name: 'Close'}))

    expect(onClick).toHaveBeenCalledOnce()
    expect(onShowChange).toHaveBeenCalledWith(false)
  })
})
