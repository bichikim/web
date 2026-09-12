/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {HKey} from '../HKey'
import {HPianoRoot} from '../HPianoRoot'

describe('HKey', () => {
  it('should translate global key state into piano down and up callbacks', () => {
    const onDown = vi.fn()
    const onUp = vi.fn()
    render(() => (
      <HPianoRoot onDown={onDown} onUp={onUp} velocity={0.7}>
        <HKey key="C4" name="C" showKeyName>
          key child
        </HKey>
      </HPianoRoot>
    ))

    window.dispatchEvent(
      new CustomEvent('global-touch__C4', {detail: {down: true, renderOnly: false}}),
    )
    window.dispatchEvent(
      new CustomEvent('global-touch__C4', {detail: {down: false, renderOnly: false}}),
    )

    expect(onDown).toHaveBeenCalledWith(expect.objectContaining({note: 'C4', velocity: 0.7}))
    expect(onUp).toHaveBeenCalledWith('C4')
    expect(screen.getByText('key child')).toBeInTheDocument()
  })
})
