/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {For, type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {MemoryMemo} from '../../../features/memory-assist'
import {MemoryMemoList} from '../Memos'

const mocks = vi.hoisted(() => ({
  deleteDialogue: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  updateMemos: vi.fn(),
}))

vi.mock('../../../features/focus-room-dialogue', () => ({
  deleteDialogueAudio: vi.fn().mockResolvedValue(undefined),
  usePEvents: () => ({deleteDialogue: mocks.deleteDialogue}),
}))
vi.mock('../../../features/memory-assist', async () => {
  const actual = await vi.importActual('../../../features/memory-assist')
  return {
    ...actual,
    updateMemoryMemos: mocks.updateMemos,
    useMemoryMemos: () => () => mocks.memos,
  }
})
vi.mock('../../../features/memory-assist/repository', async () => ({
  ...(await vi.importActual('../../../features/memory-assist/repository')),
  updateMemoryMemos: mocks.updateMemos,
}))
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
  mocks.memos = []
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const createStoredMemo = (): MemoryMemo => ({
  createdAt: '2026-09-04T03:00:00.000Z',
  dialogueId: 'memory-memo-memo-1',
  exactReminderAdvanceMinutes: 0,
  exactReminderAt: null,
  exactReminderRepeatIntervalMinutes: null,
  exactReminderRepeatUntilMinutes: 0,
  id: 'memo-1',
  nextExactReminderAt: null,
  nextRecallAt: '2026-09-04T03:10:00.000Z',
  recallMode: 'reinforcement',
  reinforcementIndex: 1,
  reminderHistory: ['2026-09-04T03:10:00.000Z'],
  text: '여권 갱신하기',
  updatedAt: '2026-09-04T03:10:00.000Z',
  version: 1,
})

it('should save a memo with random recall enabled', async () => {
  render(() => <MemoryMemoList />)

  expect(screen.queryByLabelText('기억할 메모')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
  fireEvent.change(screen.getByLabelText('기억 반복'), {target: {value: 'random'}})
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]).toMatchObject({
    dialogueId: null,
    id: '00000000-0000-4000-8000-000000000001',
    recallMode: 'random',
    text: '여권 갱신하기',
  })
  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBeNull()
})

it('should submit a memo only once while persistence is pending', async () => {
  const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  mocks.updateMemos.mockReturnValue(persistence.promise)
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
  const saveButton = screen.getByRole('button', {name: '메모 저장'})
  fireEvent.click(saveButton)
  fireEvent.click(saveButton)

  expect(mocks.updateMemos).toHaveBeenCalledOnce()
  expect(saveButton).toBeDisabled()

  persistence.resolve([])
  await persistence.promise
})

it('should disable ongoing recall when scheduled reminders are enabled', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-04T03:00:00.000Z'))
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
  fireEvent.change(screen.getByLabelText('기억 반복'), {target: {value: 'random'}})
  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
  expect(screen.queryByLabelText('기억 반복')).not.toBeInTheDocument()
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '14:00'}})
  fireEvent.input(screen.getByLabelText('몇 분 전부터'), {target: {value: '30'}})
  fireEvent.click(screen.getByLabelText('예약 알림 반복'))
  fireEvent.input(screen.getByLabelText('반복 간격(분)'), {target: {value: '10'}})
  fireEvent.input(screen.getByLabelText('몇 분 후까지'), {target: {value: '60'}})
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))

  await vi.runAllTimersAsync()
  expect(mocks.memos[0]).toMatchObject({
    exactReminderAdvanceMinutes: 30,
    exactReminderRepeatIntervalMinutes: 10,
    exactReminderRepeatUntilMinutes: 60,
    recallMode: 'none',
  })
})

it('should restore an unsaved memo and its reminder settings after closing and remounting', () => {
  const view = render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
  fireEvent.input(screen.getByLabelText('몇 분 전부터'), {target: {value: '30'}})
  fireEvent.click(screen.getByLabelText('예약 알림 반복'))
  fireEvent.input(screen.getByLabelText('반복 간격(분)'), {target: {value: '10'}})
  fireEvent.input(screen.getByLabelText('몇 분 후까지'), {target: {value: '60'}})
  fireEvent.change(screen.getByLabelText('알림 날짜'), {target: {value: 'custom'}})
  fireEvent.input(screen.getByLabelText('날짜'), {target: {value: '2026-09-06'}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '14:30'}})
  expect(screen.queryByLabelText('기억 반복')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  view.unmount()
  render(() => <MemoryMemoList />)
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))

  expect(screen.getByLabelText('기억할 메모')).toHaveValue('여권 갱신하기')
  expect(screen.getByLabelText('날짜와 시간에 알려주기')).toBeChecked()
  expect(screen.getByLabelText('몇 분 전부터')).toHaveValue(30)
  expect(screen.getByLabelText('예약 알림 반복')).toBeChecked()
  expect(screen.getByLabelText('반복 간격(분)')).toHaveValue(10)
  expect(screen.getByLabelText('몇 분 후까지')).toHaveValue(60)
  expect(screen.getByLabelText('알림 날짜')).toHaveValue('custom')
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-06')
  expect(screen.getByLabelText('시간')).toHaveValue('14:30')
  expect(screen.queryByLabelText('기억 반복')).not.toBeInTheDocument()
})

it('should delete the memo-owned compressed dialogue with the memo', async () => {
  mocks.memos = [createStoredMemo()]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 삭제'}))

  await waitFor(() => expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1'))
  expect(mocks.memos).toEqual([])
})

it('should use the same memo modal for creating and editing memos', () => {
  mocks.memos = [createStoredMemo()]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  const creatorDialog = screen.getByRole('dialog', {name: '새 메모 만들기'})
  const creator = within(creatorDialog).getByLabelText('기억할 메모')
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  const editorDialog = screen.getByRole('dialog', {name: '여권 갱신하기 메모 편집'})
  const editor = within(editorDialog).getByLabelText('기억할 메모')

  expect(creator.className).toBe(editor.className)
  expect(creator).toHaveClass('rounded-5', 'bg-surface-strong', 'p-4', 'leading-7')
  expect(creator).not.toHaveClass('rounded-control', 'bg-black/20')
  expect(within(editorDialog).getByLabelText('기억 반복')).toHaveValue('reinforcement')
  expect(within(editorDialog).getByRole('button', {name: '변경 저장'})).toBeDisabled()
})

it('should cancel or save a memo edit and discard audio generated from old text', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-04T03:30:00.000Z'))
  mocks.memos = [createStoredMemo()]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {
    target: {value: '취소할 내용'},
  })
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))

  expect(screen.getByText('여권 갱신하기')).toBeVisible()
  expect(mocks.updateMemos).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {
    target: {value: '여권과 사진 갱신하기'},
  })
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await vi.runAllTimersAsync()
  expect(mocks.memos).toEqual([
    {
      ...createStoredMemo(),
      dialogueId: null,
      text: '여권과 사진 갱신하기',
      updatedAt: '2026-09-04T03:30:00.000Z',
    },
  ])
  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
})

it('should keep editing and preserve existing audio when saving fails', async () => {
  mocks.memos = [createStoredMemo()]
  mocks.updateMemos.mockRejectedValueOnce(new Error('write failed'))
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  const editor = screen.getByLabelText('기억할 메모')
  fireEvent.input(editor, {target: {value: '여권과 사진 갱신하기'}})
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('메모를 수정하지 못했어요.'),
  )
  expect(editor).toHaveProperty('value', '여권과 사진 갱신하기')
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
})

it('should stop ongoing recall when an exact reminder is enabled while editing', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-04T03:30:00.000Z'))
  mocks.memos = [createStoredMemo()]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))

  expect(screen.getByLabelText('날짜와 시간에 알려주기')).not.toBeChecked()
  expect(screen.getByLabelText('기억 반복')).toHaveValue('reinforcement')

  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
  expect(screen.queryByLabelText('기억 반복')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('알림 날짜'), {target: {value: 'custom'}})
  fireEvent.input(screen.getByLabelText('날짜'), {target: {value: '2026-09-06'}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '14:30'}})
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await vi.runAllTimersAsync()
  expect(mocks.memos[0]).toEqual({
    ...createStoredMemo(),
    exactReminderAt: new Date('2026-09-06T14:30').toISOString(),
    nextExactReminderAt: new Date('2026-09-06T14:30').toISOString(),
    nextRecallAt: null,
    recallMode: 'none',
    reinforcementIndex: 0,
    updatedAt: '2026-09-04T03:30:00.000Z',
  })
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
})

it('should preserve memo audio when deleting the memo cannot be persisted', async () => {
  mocks.memos = [createStoredMemo()]
  mocks.updateMemos.mockRejectedValueOnce(new Error('write failed'))
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 삭제'}))

  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('메모를 삭제하지 못했어요.'),
  )
  expect(mocks.memos).toEqual([createStoredMemo()])
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
})

it('should not report a committed deletion as failed when dialogue cleanup is pending', async () => {
  mocks.memos = [createStoredMemo()]
  mocks.deleteDialogue.mockRejectedValueOnce(new Error('database failed'))
  render(() => <MemoryMemoList />)
  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 삭제'}))
  await waitFor(() => expect(mocks.deleteDialogue).toHaveBeenCalledOnce())
  expect(mocks.memos).toEqual([{...createStoredMemo(), deletionPending: true}])
  expect(screen.queryByText('메모를 삭제하지 못했어요.')).not.toBeInTheDocument()
})
