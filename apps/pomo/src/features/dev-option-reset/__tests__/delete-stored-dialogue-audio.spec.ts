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
  expect(dispose).toHaveBeenCalledOnce()
})

it('should close the repository when listing fails', async () => {
  const failure = new Error('database')
  listDialogues.mockRejectedValue(failure)
  await expect(deleteStoredDialogueAudio(createStorage)).rejects.toBe(failure)
  expect(dispose).toHaveBeenCalledOnce()
  expect(deleteAudio).not.toHaveBeenCalled()
})

it('should count every distinct failed audio key when none can be deleted', async () => {
  listDialogues.mockResolvedValue([{audioKey: 'one'}, {audioKey: 'two'}, {audioKey: 'one'}])
  deleteAudio.mockRejectedValue(new Error('storage'))

  await expect(deleteStoredDialogueAudio(createStorage)).resolves.toEqual({
    deletedCount: 0,
    failedCount: 2,
  })
  expect(deleteAudio.mock.calls).toEqual([['one'], ['two']])
  expect(dispose).toHaveBeenCalledOnce()
})

it('should wait for every deletion before counting out-of-order failures and disposing storage', async () => {
  const first = Promise.withResolvers<void>()
  const second = Promise.withResolvers<void>()
  const third = Promise.withResolvers<void>()
  listDialogues.mockResolvedValue([{audioKey: 'one'}, {audioKey: 'two'}, {audioKey: 'three'}])
  deleteAudio
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
    .mockReturnValueOnce(third.promise)

  const deletion = deleteStoredDialogueAudio(createStorage)
  third.reject(new Error('third'))
  first.resolve()
  await Promise.resolve()
  expect(deleteAudio.mock.calls).toEqual([['one'], ['two'], ['three']])
  expect(dispose).not.toHaveBeenCalled()

  second.reject(new Error('second'))
  await expect(deletion).resolves.toEqual({deletedCount: 1, failedCount: 2})
  expect(dispose).toHaveBeenCalledOnce()
})

it('should preserve a synchronous deletion failure and dispose without attempting later keys', async () => {
  const failure = new Error('synchronous storage failure')
  listDialogues.mockResolvedValue([{audioKey: 'one'}, {audioKey: 'two'}])
  deleteAudio.mockImplementationOnce(() => {
    throw failure
  })

  await expect(deleteStoredDialogueAudio(createStorage)).rejects.toBe(failure)
  expect(deleteAudio.mock.calls).toEqual([['one']])
  expect(dispose).toHaveBeenCalledOnce()
})

it('should preserve a disposal failure after every deletion has settled', async () => {
  const failure = new Error('disposal')
  listDialogues.mockResolvedValue([{audioKey: 'one'}])
  deleteAudio.mockRejectedValue(new Error('storage'))
  dispose.mockImplementationOnce(() => {
    throw failure
  })

  await expect(deleteStoredDialogueAudio(createStorage)).rejects.toBe(failure)
  expect(deleteAudio.mock.calls).toEqual([['one']])
  expect(dispose).toHaveBeenCalledOnce()
})
