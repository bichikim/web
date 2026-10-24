/** @vitest-environment jsdom */
import {setupMemos} from './fixtures/memos'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it} from 'vitest'
import {MemoryMemoList} from '../Memos'

const {createStoredMemo, mocks} = setupMemos()

it('should delete the memo-owned compressed dialogue with the memo', async () => {
  mocks.memos = [createStoredMemo()]
  render(() => <MemoryMemoList />)

  fireEvent.click(screen.getByRole('button', {name: '여권 갱신하기 메모 삭제'}))

  await waitFor(() => expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1'))
  expect(mocks.memos).toEqual([])
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
