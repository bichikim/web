/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PartialSection} from '../PartialSection'

vi.mock('src/components/p-button/PButton', () => ({
  PButton: (props: {
    readonly children: JSX.Element
    readonly disabled?: boolean
    readonly onPress?: (source: HTMLButtonElement) => void
  }) => (
    <button
      disabled={props.disabled}
      onClick={(event) => props.onPress?.(event.currentTarget)}
      type="button"
    >
      {props.children}
    </button>
  ),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should distinguish loading, unavailable storage, and removable partials', () => {
  const [loading, setLoading] = createSignal(true)
  const [available, setAvailable] = createSignal(true)
  const onClear = vi.fn()
  const {container} = render(() => (
    <PartialSection
      busy={false}
      count={2}
      loading={loading()}
      onClear={onClear}
      storageAvailable={available()}
    />
  ))
  const statusMessage = container.querySelector('p')
  const clearButton = container.querySelector('button')
  expect(statusMessage).not.toBeNull()
  expect(clearButton).not.toBeNull()
  if (statusMessage === null || clearButton === null) {
    throw new Error('Expected the partial status and clear button to render')
  }
  expect(statusMessage).toBeVisible()
  setLoading(false)
  expect(statusMessage).toBeVisible()
  expect(statusMessage).toHaveTextContent('2개 파일이 남아 있어요.')
  expect(clearButton).toBeVisible()
  fireEvent.click(clearButton)
  expect(onClear).toHaveBeenCalledOnce()
  setAvailable(false)
  expect(statusMessage).toBeVisible()
  expect(statusMessage).toHaveTextContent('이 브라우저에서는 OPFS 저장소를 사용할 수 없어요.')
})
