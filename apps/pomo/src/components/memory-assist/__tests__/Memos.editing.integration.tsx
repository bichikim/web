/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'
import {usePEvents} from '../../../features/focus-room-dialogue'
import {createMemoryMemo} from '../../../features/memory-assist/schedule'
import {MEMORY_MEMOS_STORAGE_KEY} from '../../../features/memory-assist/repository'
import {loadTossStorage} from '../../../utils/runtime-storage/load-toss-storage'
import {MemoryMemoList} from '../Memos'

vi.mock('../../../features/focus-room-dialogue', () => ({usePEvents: vi.fn()}))
vi.mock('../../../utils/runtime-storage/load-toss-storage', () => ({loadTossStorage: vi.fn()}))

const getItem = vi.fn()
const setItem = vi.fn()
const deleteDialogue = vi.fn()
const initialText = '여권 갱신하기'
const savedText = '이전에 저장한 메모'
const nextText = '새로 작성 중인 초안'
let nativeValue: string
let completeWrite: (() => void) | null = null

beforeEach(() => {
  vi.clearAllMocks()
  setItem.mockReset()
  const getStyles = globalThis.getComputedStyle
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((...args) => {
    const styles = getStyles(...args)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  localStorage.clear()
  sessionStorage.clear()
  vi.stubGlobal('ReactNativeWebView', {})
  nativeValue = JSON.stringify([
    createMemoryMemo({
      exactReminderAt: null,
      id: 'memo-editing',
      now: new Date(),
      random: () => 0,
      recallMode: 'none',
      text: initialText,
    }),
  ])
  getItem.mockImplementation(async () => nativeValue)
  setItem.mockImplementation(async (_key: string, value: string) => {
    nativeValue = value
  })
  vi.mocked(loadTossStorage).mockResolvedValue({getItem, setItem})
  vi.mocked(usePEvents).mockImplementation(vi.fn().mockReturnValue({deleteDialogue}))
})

afterEach(async () => {
  cleanup()
  completeWrite?.()
  await flushPromises()
  completeWrite = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
  localStorage.clear()
  sessionStorage.clear()
})

const startPendingEdit = async (beforeSave?: () => void) => {
  const pending = Promise.withResolvers<void>()
  completeWrite = pending.resolve
  setItem.mockImplementationOnce(async (_key: string, value: string) => {
    await pending.promise
    nativeValue = value
  })
  render(() => <MemoryMemoList />)
  fireEvent.click(await screen.findByRole('button', {name: `${initialText} 메모 편집`}))
  fireEvent.input(screen.getByRole('textbox', {name: '기억할 메모'}), {
    target: {value: savedText},
  })
  beforeSave?.()
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(setItem).toHaveBeenCalledOnce())
  expect(setItem.mock.calls[0]?.[0]).toBe(MEMORY_MEMOS_STORAGE_KEY)
  expect(screen.getByRole('button', {name: '변경 저장'})).toBeDisabled()
  return pending
}

it('should retain a reopened edit and save its new draft after the previous native write succeeds', async () => {
  const pending = await startPendingEdit()
  const row = screen.getByRole('listitem', {hidden: true})
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  fireEvent.click(screen.getByRole('button', {name: `${initialText} 메모 편집`}))
  const editor = screen.getByRole('textbox', {name: '기억할 메모'})
  fireEvent.input(editor, {target: {value: nextText}})
  editor.focus()
  pending.resolve()

  await waitFor(() => expect(screen.getByRole('button', {name: '변경 저장'})).toBeEnabled())
  expect(screen.getByRole('dialog')).toHaveAttribute('data-expanded')
  expect(screen.getByRole('listitem', {hidden: true})).toBe(row)
  expect(screen.getByRole('textbox', {name: '기억할 메모'})).toBe(editor)
  expect(editor).toHaveValue(nextText)
  expect(editor).toHaveFocus()
  expect(JSON.parse(nativeValue)).toMatchObject([{text: savedText}])
  expect(screen.queryByRole('status')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)).toMatchObject([{text: nextText}])
  expect(JSON.parse(localStorage.getItem(MEMORY_MEMOS_STORAGE_KEY) ?? 'null')).toMatchObject([
    {text: nextText},
  ])
  fireEvent.click(screen.getByRole('button', {name: `${nextText} 메모 편집`}))
  expect(screen.getByRole('textbox', {name: '기억할 메모'})).toHaveValue(nextText)
})

it('should ignore an old native write failure in a reopened edit and allow retrying its draft', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const pending = await startPendingEdit()
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  fireEvent.click(screen.getByRole('button', {name: `${initialText} 메모 편집`}))
  const editor = screen.getByRole('textbox', {name: '기억할 메모'})
  fireEvent.input(editor, {target: {value: nextText}})
  pending.reject(new Error('native write failed'))

  await waitFor(() => expect(screen.getByRole('button', {name: '변경 저장'})).toBeEnabled())
  expect(screen.getByRole('dialog')).toHaveAttribute('data-expanded')
  expect(editor).toHaveValue(nextText)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(JSON.parse(nativeValue)).toMatchObject([{text: initialText}])
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)).toMatchObject([{text: nextText}])
})

it('should retain text entered during a pending native save in the same edit', async () => {
  const pending = await startPendingEdit()
  const editor = screen.getByRole('textbox', {name: '기억할 메모'})
  fireEvent.input(editor, {target: {value: nextText}})
  pending.resolve()
  await waitFor(() => expect(screen.getByRole('button', {name: '변경 저장'})).toBeEnabled())
  expect(screen.getByRole('dialog')).toHaveAttribute('data-expanded')
  expect(editor).toHaveValue(nextText)
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)).toMatchObject([{text: nextText}])
})

it('should retain reminder changes made during a pending native save', async () => {
  const pending = await startPendingEdit()
  fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
  pending.resolve()
  await waitFor(() => expect(screen.getByRole('button', {name: '변경 저장'})).toBeEnabled())
  expect(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'})).toBeChecked()
  expect(screen.getByRole('textbox', {name: '기억할 메모'})).toHaveValue(savedText)
  expect(JSON.parse(nativeValue)).toMatchObject([{exactReminderAt: null, text: savedText}])
})

it('should allow saving a reminder reverted to its original settings during the previous save', async () => {
  const pending = await startPendingEdit(() => {
    fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
  })
  fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
  pending.resolve()

  await waitFor(() => expect(screen.getByRole('button', {name: '변경 저장'})).toBeEnabled())
  expect(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'})).not.toBeChecked()
  expect(JSON.parse(nativeValue)[0].exactReminderAt).not.toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)).toMatchObject([{exactReminderAt: null, text: savedText}])
})

it('should keep a reminder-only edit savable when its native write fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const pending = await startPendingEdit(() => {
    fireEvent.input(screen.getByRole('textbox', {name: '기억할 메모'}), {
      target: {value: initialText},
    })
    fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
  })
  pending.reject(new Error('native write failed'))

  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('메모를 수정하지 못했어요.'),
  )
  expect(screen.getByRole('button', {name: '변경 저장'})).toBeEnabled()
  expect(JSON.parse(nativeValue)).toMatchObject([{exactReminderAt: null, text: initialText}])
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)[0].exactReminderAt).not.toBeNull()
})

it('should keep a today reminder savable when the previous native save completes after midnight', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 0, 31, 23, 48))
  const pending = await startPendingEdit(() => {
    fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
    fireEvent.input(screen.getByLabelText('시간'), {target: {value: '23:59'}})
  })
  vi.setSystemTime(new Date(2026, 1, 1, 0, 1))
  fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
  fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
  pending.resolve()

  await waitFor(() => expect(screen.getByRole('button', {name: '변경 저장'})).toBeEnabled())
  expect(JSON.parse(nativeValue)).toMatchObject([
    {exactReminderAt: new Date(2026, 0, 31, 23, 59).toISOString()},
  ])
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)).toMatchObject([
    {exactReminderAt: new Date(2026, 1, 1, 23, 59).toISOString()},
  ])
})

it('should not mark a saved tomorrow reminder dirty because of its hidden custom date', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date(2026, 0, 31, 12))
  const pending = await startPendingEdit(() => {
    fireEvent.click(screen.getByRole('switch', {name: '날짜와 시간에 알려주기'}))
    fireEvent.keyDown(screen.getByRole('button', {name: /알림 날짜/}), {key: 'ArrowDown'})
    fireEvent.keyDown(screen.getByRole('option', {name: '오늘'}), {key: 'ArrowDown'})
    fireEvent.keyDown(screen.getByRole('option', {name: '내일'}), {key: 'Enter'})
  })
  const editor = screen.getByRole('textbox', {name: '기억할 메모'})
  fireEvent.input(editor, {target: {value: nextText}})
  fireEvent.input(editor, {target: {value: savedText}})
  pending.resolve()
  await flushPromises()

  expect(JSON.parse(nativeValue)).toMatchObject([
    {exactReminderAt: new Date(2026, 1, 1, 12, 10).toISOString()},
  ])
  expect(screen.getByRole('dialog')).toHaveAttribute('data-expanded')
  expect(screen.getByRole('button', {name: '변경 저장'})).toBeDisabled()
})

it('should close an unchanged editing session only after its native write completes', async () => {
  const pending = await startPendingEdit()
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(JSON.parse(nativeValue)).toMatchObject([{text: initialText}])
  pending.resolve()
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)).toMatchObject([{text: savedText}])
  expect(screen.getByRole('button', {name: `${savedText} 메모 편집`})).toBeVisible()
})

it('should display the current native write failure and retain the draft for retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const pending = await startPendingEdit()
  pending.reject(new Error('native write failed'))
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('메모를 수정하지 못했어요.'),
  )
  expect(screen.getByRole('textbox', {name: '기억할 메모'})).toHaveValue(savedText)
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(nativeValue)).toMatchObject([{text: savedText}])
})
