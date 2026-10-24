/** @vitest-environment jsdom */
import {setupMemos} from './fixtures/memos'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {MemoryMemo} from '../../../features/memory-assist'
import {MemoryMemoList} from '../Memos'

const {mocks} = setupMemos()

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

it.each(['random', 'reinforcement'] as const)(
  'should preserve %s recall mode after toggling an exact reminder off before saving',
  async (recallMode) => {
    render(() => <MemoryMemoList />)

    fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
    fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
    fireEvent.change(screen.getByLabelText('기억 반복'), {target: {value: recallMode}})
    fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
    fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
    fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))

    await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
    expect(mocks.memos[0]).toMatchObject({recallMode})
  },
)

it('should preserve a recall mode when an exact reminder draft is remounted before being disabled', async () => {
  const view = render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
  fireEvent.change(screen.getByLabelText('기억 반복'), {target: {value: 'random'}})
  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  view.unmount()

  render(() => <MemoryMemoList />)
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.click(screen.getByLabelText('날짜와 시간에 알려주기'))
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]).toMatchObject({recallMode: 'random'})
})

it('should preserve a newer creation draft when an earlier save completes late', async () => {
  const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  mocks.updateMemos.mockReturnValue(persistence.promise)
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '먼저 저장할 메모'}})
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))
  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())

  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {
    target: {value: '아직 저장하지 않은 새 초안'},
  })
  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toContain(
    '아직 저장하지 않은 새 초안',
  )

  persistence.resolve(mocks.memos)
  await persistence.promise

  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toContain(
    '아직 저장하지 않은 새 초안',
  )
  expect(screen.getByLabelText('기억할 메모')).toHaveValue('아직 저장하지 않은 새 초안')
})

it('should preserve reminder changes when an earlier save completes with unchanged text', async () => {
  const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  mocks.updateMemos.mockReturnValue(persistence.promise)
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '새 메모'}))
  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))
  expect(mocks.updateMemos).toHaveBeenCalledOnce()
  fireEvent.change(screen.getByLabelText('기억 반복'), {target: {value: 'random'}})

  persistence.resolve([])
  await persistence.promise

  expect(JSON.parse(sessionStorage.getItem('pomo:memory-memo:draft:v1') ?? 'null')).toMatchObject({
    recallMode: 'random',
    text: '여권 갱신하기',
  })
  expect(screen.getByLabelText('기억 반복')).toHaveValue('random')
  expect(screen.getByLabelText('기억할 메모')).toHaveValue('여권 갱신하기')
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
