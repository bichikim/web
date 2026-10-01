/** @vitest-environment jsdom */
import {setupMemos} from './fixtures/memos'
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {getDueMemoryReminder} from '../../../features/memory-assist'
import {MemoryMemoList} from '../Memos'

const {createStoredMemo, mocks} = setupMemos()

it.each(['creator', 'editor'] as const)(
  'should use the shared memo textarea style in the %s modal',
  (mode) => {
    mocks.memos = [createStoredMemo()]
    render(() => <MemoryMemoList />)

    const dialogName = mode === 'creator' ? '새 메모 만들기' : '여권 갱신하기 메모 편집'
    fireEvent.click(
      screen.getByRole('button', {
        name: mode === 'creator' ? '새 메모' : '여권 갱신하기 메모 편집',
      }),
    )
    const dialog = screen.getByRole('dialog', {name: dialogName})
    const editor = within(dialog).getByLabelText('기억할 메모')

    expect(editor).toHaveClass('rounded-5', 'bg-surface-strong', 'p-4', 'leading-7')
    expect(editor).not.toHaveClass('rounded-control', 'bg-black/20')
    if (mode === 'editor') {
      expect(within(dialog).getByLabelText('기억 반복')).toHaveValue('reinforcement')
      expect(within(dialog).getByRole('button', {name: '변경 저장'})).toBeDisabled()
    }
  },
)

it('should not mark an unchanged exact reminder edit dirty after a temporary recall selection', () => {
  const exactReminderAt = new Date('2026-09-21T14:30').toISOString()
  mocks.memos = [
    {
      ...createStoredMemo(),
      exactReminderAt,
      nextExactReminderAt: exactReminderAt,
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
    },
  ]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  const saveButton = screen.getByRole('button', {name: '변경 저장'})
  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
  fireEvent.change(screen.getByLabelText('기억 반복'), {target: {value: 'random'}})
  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))

  expect(saveButton).toBeDisabled()
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
      nextRecallAt: '2026-09-04T03:40:00.000Z',
      reinforcementIndex: 0,
      text: '여권과 사진 갱신하기',
      updatedAt: '2026-09-04T03:30:00.000Z',
    },
  ])
  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
})

it('should resolve a today reminder from save time when editing across midnight', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 0, 31, 23))
  const tomorrowReminderAt = new Date(2026, 1, 1, 9).toISOString()
  mocks.memos = [
    {
      ...createStoredMemo(),
      exactReminderAt: tomorrowReminderAt,
      nextExactReminderAt: tomorrowReminderAt,
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
    },
  ]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.change(screen.getByLabelText('알림 날짜'), {target: {value: 'today'}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '09:45'}})
  vi.setSystemTime(new Date(2026, 1, 1, 0, 30))
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]?.exactReminderAt).toBe(new Date(2026, 1, 1, 9, 45).toISOString())
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

it('should reject advancing a pending exact reminder into the past', async () => {
  vi.useFakeTimers()
  const now = new Date(2026, 0, 31, 11)
  const exactReminderAt = new Date(2026, 0, 31, 12).toISOString()
  vi.setSystemTime(now)
  mocks.memos = [
    {
      ...createStoredMemo(),
      exactReminderAt,
      nextExactReminderAt: exactReminderAt,
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
    },
  ]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.input(screen.getByRole('spinbutton'), {target: {value: '120'}})
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await vi.runAllTimersAsync()
  const editedMemo = mocks.memos[0]
  expect(editedMemo).toBeDefined()
  if (editedMemo === undefined) {
    throw new Error('Expected the pending memo to remain stored.')
  }
  expect(getDueMemoryReminder(editedMemo, now)).toBeNull()
  expect(mocks.updateMemos).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toBeVisible()
})

it('should preserve a pending exact reminder when its schedule is unchanged', async () => {
  vi.useFakeTimers()
  const now = new Date(2026, 0, 31, 11)
  const exactReminderAt = new Date(2026, 0, 31, 12).toISOString()
  const nextExactReminderAt = new Date(2026, 0, 31, 11, 30).toISOString()
  vi.setSystemTime(now)
  mocks.memos = [
    {
      ...createStoredMemo(),
      exactReminderAdvanceMinutes: 120,
      exactReminderAt,
      exactReminderRepeatIntervalMinutes: 30,
      exactReminderRepeatUntilMinutes: 60,
      nextExactReminderAt,
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
    },
  ]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권과 사진 갱신하기'}})
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await vi.runAllTimersAsync()
  expect(mocks.updateMemos).toHaveBeenCalledTimes(1)
  expect(mocks.memos[0]?.text).toBe('여권과 사진 갱신하기')
  expect(mocks.memos[0]?.nextExactReminderAt).toBe(nextExactReminderAt)
})

it('should resolve a today reminder from save time after midnight while editing', async () => {
  vi.useFakeTimers()
  const exactReminderAt = new Date(2026, 0, 31, 23, 45).toISOString()
  const savedReminderAt = new Date(2026, 1, 1, 23, 45).toISOString()
  vi.setSystemTime(new Date(2026, 0, 31, 23))
  mocks.memos = [
    {
      ...createStoredMemo(),
      exactReminderAt,
      nextExactReminderAt: exactReminderAt,
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
    },
  ]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {
    target: {value: '여권과 사진 갱신하기'},
  })
  vi.setSystemTime(new Date(2026, 1, 1, 0, 30))
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await vi.runAllTimersAsync()
  expect(mocks.updateMemos).toHaveBeenCalledOnce()
  expect(mocks.memos[0]?.exactReminderAt).toBe(savedReminderAt)
})

it('should resolve tomorrow from the save time after midnight while editing', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2025, 11, 31, 10))
  mocks.memos = [createStoredMemo()]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
  fireEvent.change(screen.getByLabelText('알림 날짜'), {target: {value: 'tomorrow'}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '23:00'}})
  vi.setSystemTime(new Date(2026, 0, 1, 20))
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await vi.runAllTimersAsync()

  const tomorrowReminderAt = new Date(2026, 0, 2, 23).toISOString()
  expect(mocks.isFirstReminderInFuture).toHaveBeenCalledOnce()
  expect(mocks.isFirstReminderInFuture).toHaveBeenCalledWith(
    tomorrowReminderAt,
    0,
    expect.any(Date),
  )
  expect(mocks.memos[0]?.exactReminderAt).toBe(tomorrowReminderAt)
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

it('should allow editing a repeated reminder while its next occurrence is pending', async () => {
  vi.useFakeTimers()
  const exactReminderAt = new Date(2026, 8, 4, 4).toISOString()
  const nextExactReminderAt = new Date(2026, 8, 4, 4, 10).toISOString()
  vi.setSystemTime(new Date(2026, 8, 4, 4, 5))
  mocks.memos = [
    {
      ...createStoredMemo(),
      exactReminderAt,
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      nextExactReminderAt,
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
    },
  ]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 편집'}))
  fireEvent.click(screen.getByLabelText('예약 알림 반복'))
  fireEvent.click(screen.getByRole('button', {name: '변경 저장'}))

  await vi.runAllTimersAsync()
  expect(mocks.memos[0]).toMatchObject({
    exactReminderAt,
    exactReminderRepeatIntervalMinutes: null,
    nextExactReminderAt,
  })
})
