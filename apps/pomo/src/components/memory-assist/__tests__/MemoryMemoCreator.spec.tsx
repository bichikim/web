/** @vitest-environment jsdom */

import {Storage as TossStorage} from '@apps-in-toss/web-framework'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {For, type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {MemoryMemo} from '../../../features/memory-assist'
import {MemoryMemoCreator} from '../MemoryMemoCreator'

const mocks = vi.hoisted(() => ({
  memos: [] as ReadonlyArray<MemoryMemo>,
  updateMemos: vi.fn(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

vi.mock('../../../features/memory-assist', async () => {
  const actual = await vi.importActual('../../../features/memory-assist')
  return {
    ...actual,
    updateMemoryMemos: mocks.updateMemos,
  }
})
vi.mock('../../PButton', () => ({
  PButton: (props: {
    accessibleLabel?: string
    children: JSX.Element
    disabled?: boolean
    onPress?: (source: HTMLButtonElement) => void
  }) => (
    <button
      aria-label={props.accessibleLabel}
      disabled={props.disabled}
      onClick={(event) => props.onPress?.(event.currentTarget)}
      type="button"
    >
      {props.children}
    </button>
  ),
}))
vi.mock('../../PSelect', () => ({
  PSelect: (props: {
    label: string
    onChange: (value: string) => void
    options: ReadonlyArray<{label: string; value: string}>
    value: string
  }) => (
    <label>
      {props.label}
      <select onChange={(event) => props.onChange(event.currentTarget.value)} value={props.value}>
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    </label>
  ),
}))
vi.mock('../../PSwitch', () => ({
  PSwitch: (props: {checked: boolean; label: string; onChange: (value: boolean) => void}) => (
    <label>
      {props.label}
      <input
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
        type="checkbox"
      />
    </label>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  mocks.memos = []
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it.each(['new text', 'reminder', 'restored text', 'reopened', 'inline text'])(
  'should preserve the current draft after late success with %s',
  async (change) => {
    const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
    mocks.updateMemos.mockReturnValueOnce(persistence.promise)
    render(() => <MemoryMemoCreator />)
    fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
    fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '먼저 저장할 메모'}})
    fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))
    expect(mocks.updateMemos).toHaveBeenCalledOnce()

    if (change === 'inline text') {
      fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '새 초안'}})
    } else if (change === 'reminder') {
      fireEvent.change(screen.getByLabelText('기억 반복'), {target: {value: 'random'}})
    } else {
      fireEvent.click(screen.getByRole('button', {name: '닫기'}))
      fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
      if (change !== 'reopened') {
        fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '새 초안'}})
      }
      if (change === 'restored text') {
        fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '먼저 저장할 메모'}})
      }
    }
    const draft = sessionStorage.getItem('pomo:memory-memo:draft:v1')
    const expectedText =
      change === 'new text' || change === 'inline text' ? '새 초안' : '먼저 저장할 메모'
    persistence.resolve([])
    await waitFor(() => expect(screen.getByRole('button', {name: '메모 저장'})).toBeEnabled())
    expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBe(draft)
    expect(screen.getByLabelText('기억할 메모')).toHaveValue(expectedText)
    expect(screen.getByLabelText('기억 반복')).toHaveValue(
      change === 'reminder' ? 'random' : 'none',
    )
    fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))
    await waitFor(() => expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBeNull())
    expect(mocks.memos[0]).toMatchObject({text: expectedText})
  },
)

it.each(['unchanged', 'reopen', 'edit'])(
  'should show a late failure only in its original editing session (%s)',
  async (change) => {
    const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
    mocks.updateMemos.mockReturnValueOnce(persistence.promise)
    render(() => <MemoryMemoCreator />)
    fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
    fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '저장할 메모'}})
    fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))
    if (change === 'reopen') {
      fireEvent.click(screen.getByRole('button', {name: '닫기'}))
      fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
    }
    if (change === 'edit') {
      fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '새 초안'}})
    }
    const expectedText = change === 'edit' ? '새 초안' : '저장할 메모'
    persistence.reject(new Error('write failed'))
    await waitFor(() => expect(screen.getByRole('button', {name: '메모 저장'})).toBeEnabled())
    expect(screen.getByLabelText('기억할 메모')).toHaveValue(expectedText)
    expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toContain(expectedText)
    if (change === 'unchanged') {
      expect(screen.getByRole('status')).toHaveTextContent('메모를 저장하지 못했어요.')
    } else {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    }
  },
)

it('should preserve a new draft when the native storage write finishes late', async () => {
  const persistence = Promise.withResolvers<void>()
  vi.stubGlobal('ReactNativeWebView', {})
  vi.mocked(TossStorage.getItem).mockResolvedValue('[]')
  vi.mocked(TossStorage.setItem).mockReturnValue(persistence.promise)
  const repository = await vi.importActual<
    typeof import('../../../features/memory-assist/repository')
  >('../../../features/memory-assist/repository')
  mocks.updateMemos.mockImplementation(repository.updateMemoryMemos)
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

it('should preserve a remounted creator draft after the disposed creator saves', async () => {
  const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  mocks.updateMemos.mockReturnValueOnce(persistence.promise)
  const first = render(() => <MemoryMemoCreator />)
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '이전 메모'}})
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))
  first.unmount()
  render(() => <MemoryMemoCreator />)
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '새 편집 세션'}})
  const draft = sessionStorage.getItem('pomo:memory-memo:draft:v1')
  persistence.resolve([])
  await persistence.promise
  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBe(draft)
  expect(screen.getByLabelText('기억할 메모')).toHaveValue('새 편집 세션')
})
