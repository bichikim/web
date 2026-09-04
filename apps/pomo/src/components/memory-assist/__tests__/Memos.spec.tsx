/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {For, type JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {MemoryMemo} from '../../../features/memory-assist'
import {MemoryMemoList} from '../Memos'

const mocks = vi.hoisted(() => ({
  deleteDialogue: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  updateMemos: vi.fn(),
}))

vi.mock('../../../features/focus-room-dialogue', () => ({
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
vi.mock('../../PButton', () => ({
  PButton: (props: {children: JSX.Element; disabled?: boolean; onPress?: () => void}) => (
    <button disabled={props.disabled} onClick={props.onPress} type="button">
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
  mocks.memos = []
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
})

it('should save a memo with random recall enabled', async () => {
  render(() => <MemoryMemoList />)

  fireEvent.input(screen.getByLabelText('기억할 메모'), {target: {value: '여권 갱신하기'}})
  fireEvent.change(screen.getByLabelText('반복해서 알려주기'), {target: {value: 'random'}})
  fireEvent.click(screen.getByRole('button', {name: '메모 저장'}))

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]).toMatchObject({
    dialogueId: null,
    id: '00000000-0000-4000-8000-000000000001',
    recallMode: 'random',
    text: '여권 갱신하기',
  })
})

it('should delete the memo-owned compressed dialogue with the memo', async () => {
  mocks.memos = [
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: 'memory-memo-memo-1',
      exactReminderAt: null,
      id: 'memo-1',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderHistory: [],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T03:00:00.000Z',
      version: 1,
    },
  ]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 삭제'}))

  await waitFor(() => expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1'))
  expect(mocks.memos).toEqual([])
})
