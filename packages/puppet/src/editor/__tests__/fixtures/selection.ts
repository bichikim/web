import {screen, waitFor} from '@solidjs/testing-library'
import {expect} from 'vitest'

/** Waits for a requested layer, parameter, or workspace to become editable. */
export const waitForSelectionReady = () =>
  waitFor(() => {
    expect(screen.getByRole('complementary', {name: '선택 작업'})).not.toHaveAttribute(
      'aria-busy',
      'true',
    )
  })
