/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PreviewButton} from '../PreviewButton'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each([false, true])(
  'should expose the preview action and forward clicks for limited=%s',
  (isLimited) => {
    const onPress = vi.fn()
    const [playing, setPlaying] = createSignal(false)
    render(() => (
      <PreviewButton
        title="곡"
        isLimited={isLimited}
        isPending={false}
        isPlaying={playing()}
        onPress={onPress}
      />
    ))
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)
    expect(onPress).toHaveBeenCalledOnce()
    const startLabel = button.getAttribute('aria-label')
    setPlaying(true)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.getAttribute('aria-label')).not.toBe(startLabel)
  },
)
it('should show pending feedback instead of a play icon', () => {
  const view = render(() => (
    <PreviewButton title="곡" isLimited={false} isPending isPlaying={false} onPress={vi.fn()} />
  ))
  expect(view.container.querySelector('.i-tabler-loader-2')).toBeInTheDocument()
})
