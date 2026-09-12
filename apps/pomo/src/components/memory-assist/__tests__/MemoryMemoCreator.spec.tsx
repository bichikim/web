/** @vitest-environment jsdom */

import {Storage as TossStorage} from '@apps-in-toss/web-framework'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {MemoryMemoCreator} from '../MemoryMemoCreator'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should preserve a new draft when the native storage write finishes late', async () => {
  const persistence = Promise.withResolvers<void>()
  vi.stubGlobal('ReactNativeWebView', {})
  vi.mocked(TossStorage.getItem).mockResolvedValue('[]')
  vi.mocked(TossStorage.setItem).mockReturnValue(persistence.promise)
  render(() => <MemoryMemoCreator />)
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '먼저 저장할 메모'}})
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))
  await waitFor(() => expect(TossStorage.setItem).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '새 초안'}})
  const draft = sessionStorage.getItem('pomo:memory-memo:draft:v1')
  persistence.resolve()
  await waitFor(() => expect(screen.getByRole('button', {name: '메모 저장'})).toBeEnabled())
  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBe(draft)
  expect(screen.getByLabelText('기억할 메모')).toHaveValue('새 초안')
  expect(JSON.parse(localStorage.getItem('pomo:memory-memos:v1') ?? 'null')).toEqual([
    expect.objectContaining({text: '먼저 저장할 메모'}),
  ])
  expect(TossStorage.setItem).toHaveBeenCalledWith(
    'pomo:memory-memos:v1',
    localStorage.getItem('pomo:memory-memos:v1'),
  )
})
