import {type Mock, vi} from 'vitest'

import type {MemoryMemo} from '../../schema'

interface RemindersMocks {
  readonly createClient: Mock
  readonly createDialogue: Mock
  readonly createRepository: Mock
  readonly deleteDialogue: Mock
  readonly initializeClient: Mock
  readonly loadSettings: Mock
  memos: ReadonlyArray<MemoryMemo>
  readonly retryDeletions: Mock
  readonly updateMemos: Mock
}

export const configureReminderMocks = (mocks: RemindersMocks): void => {
  mocks.retryDeletions.mockResolvedValue(undefined)
  mocks.createClient.mockReturnValue({
    dispose: vi.fn(),
    initialize: mocks.initializeClient,
  })
  mocks.initializeClient.mockResolvedValue({ok: true, value: undefined})
  mocks.loadSettings.mockResolvedValue({modelId: 'int8', version: 1, voiceId: 'Yuna'})
  mocks.createRepository.mockReturnValue({
    deleteDialogue: mocks.deleteDialogue,
    dispose: vi.fn(),
  })
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.createDialogue.mockResolvedValue('memory-memo-memo-1')
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
}
