/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {type DialogueAudioDeletionResult} from 'src/features/dev-option-reset'
import {DialogueAudioCard} from '../DialogueAudioCard'

const deleteAudio = vi.fn<() => Promise<DialogueAudioDeletionResult>>()
beforeEach(() => {
  vi.clearAllMocks()
  deleteAudio.mockResolvedValue({deletedCount: 2, failedCount: 0})
})

it('should require confirmation and report audio-only deletion', async () => {
  render(() => <DialogueAudioCard deleteAudio={deleteAudio} />)
  fireEvent.click(screen.getByRole('button', {name: '대화 음성만 삭제'}))
  expect(deleteAudio).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: '음성 삭제 확인'}))
  expect(await screen.findByRole('status')).toHaveTextContent(
    '음성 2개의 삭제 처리를 완료했어요. 대화 내용은 유지됩니다.',
  )
})

it('should cancel without deleting audio', () => {
  render(() => <DialogueAudioCard deleteAudio={deleteAudio} />)
  fireEvent.click(screen.getByRole('button', {name: '대화 음성만 삭제'}))
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  expect(deleteAudio).not.toHaveBeenCalled()
  expect(screen.getByRole('button', {name: '대화 음성만 삭제'})).toBeInTheDocument()
})

it('should report failed deletions', async () => {
  deleteAudio.mockResolvedValue({deletedCount: 1, failedCount: 1})
  render(() => <DialogueAudioCard deleteAudio={deleteAudio} />)
  fireEvent.click(screen.getByRole('button', {name: '대화 음성만 삭제'}))
  fireEvent.click(screen.getByRole('button', {name: '음성 삭제 확인'}))
  expect(await screen.findByRole('status')).toHaveTextContent('1개는 삭제하지 못했어요')
})
