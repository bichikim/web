import {beforeEach, expect, it, vi} from 'vitest'
import {
  deleteStoredDialogueAudio,
  type DialogueAudioReference,
  type DialogueAudioStorage,
} from '../delete-stored-dialogue-audio'

const dispose = vi.fn<() => void>()
const deleteAudio = vi.fn<(audioKey: string) => Promise<void>>()
const listDialogues = vi.fn<() => Promise<ReadonlyArray<DialogueAudioReference>>>()
const createStorage = (): DialogueAudioStorage => ({deleteAudio, dispose, listDialogues})
beforeEach(() => {
  vi.resetAllMocks()
  deleteAudio.mockResolvedValue(undefined)
})

it('should delete each audio key once while preserving dialogue records', async () => {
  listDialogues.mockResolvedValue([{audioKey: 'one'}, {audioKey: 'one'}, {audioKey: 'two'}])
  await expect(deleteStoredDialogueAudio(createStorage)).resolves.toEqual({
    deletedCount: 2,
    failedCount: 0,
  })
  expect(deleteAudio).toHaveBeenCalledTimes(2)
  expect(deleteAudio).toHaveBeenCalledWith('one')
  expect(deleteAudio).toHaveBeenCalledWith('two')
  expect(dispose).toHaveBeenCalledOnce()
})

it('should report partial deletion and still attempt the remaining audio', async () => {
  listDialogues.mockResolvedValue([{audioKey: 'one'}, {audioKey: 'two'}])
  deleteAudio.mockRejectedValueOnce(new Error('storage'))
  await expect(deleteStoredDialogueAudio(createStorage)).resolves.toEqual({
    deletedCount: 1,
    failedCount: 1,
  })
  expect(dispose).toHaveBeenCalledOnce()
})

it('should handle an empty library', async () => {
  listDialogues.mockResolvedValue([])
  await expect(deleteStoredDialogueAudio(createStorage)).resolves.toEqual({
    deletedCount: 0,
    failedCount: 0,
  })
  expect(deleteAudio).not.toHaveBeenCalled()
})

it('should close the repository when listing fails', async () => {
  listDialogues.mockRejectedValue(new Error('database'))
  await expect(deleteStoredDialogueAudio(createStorage)).rejects.toThrow('database')
  expect(dispose).toHaveBeenCalledOnce()
  expect(deleteAudio).not.toHaveBeenCalled()
})
