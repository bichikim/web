/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiaryStatus} from '../Status'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should announce messages and remove the status when cleared', () => {
  const [message, setMessage] = createSignal<string | null>('저장 중')
  render(() => <PictureDiaryStatus message={message()} />)
  expect(screen.getByRole('status')).toHaveTextContent('저장 중')
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  setMessage(null)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
