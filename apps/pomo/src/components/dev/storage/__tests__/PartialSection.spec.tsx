/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PartialSection} from '../PartialSection'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should distinguish loading, unavailable storage, and removable partials', () => {
  const [loading, setLoading] = createSignal(true)
  const [available, setAvailable] = createSignal(true)
  const onClear = vi.fn()
  render(() => (
    <PartialSection
      busy={false}
      count={2}
      loading={loading()}
      onClear={onClear}
      storageAvailable={available()}
    />
  ))
  expect(screen.getByText('조회 중…')).toBeVisible()
  setLoading(false)
  expect(screen.getByText('2개 파일이 남아 있어요.')).toBeVisible()
  fireEvent.click(screen.getByRole('button'))
  expect(onClear).toHaveBeenCalledOnce()
  setAvailable(false)
  expect(screen.getByText(/OPFS 저장소를 사용할 수 없어요/)).toBeVisible()
})
