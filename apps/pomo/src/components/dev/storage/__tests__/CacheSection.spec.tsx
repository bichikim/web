/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {CacheSection} from '../CacheSection'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should forward the cache key and source button for deletion', () => {
  const onDelete = vi.fn()
  const onClear = vi.fn()
  const [busy, setBusy] = createSignal(false)
  render(() => (
    <CacheSection
      busy={busy()}
      entries={['https://example.com/model.bin']}
      loading={false}
      onClear={onClear}
      onDelete={onDelete}
    />
  ))
  const button = screen.getByRole('button', {name: 'model.bin 삭제'})
  fireEvent.click(button)
  expect(onDelete).toHaveBeenCalledWith('https://example.com/model.bin', button)
  fireEvent.click(screen.getByRole('button', {name: '전체 삭제'}))
  expect(onClear).toHaveBeenCalledOnce()
  setBusy(true)
  expect(button).toBeDisabled()
})
