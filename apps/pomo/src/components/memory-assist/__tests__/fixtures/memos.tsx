import {cleanup} from '@solidjs/testing-library'
import {For, untrack} from 'solid-js'
import {afterEach, beforeEach, vi} from 'vitest'
import {localDateRuntime} from '../../../../features/civil-date'
import {deleteDialogueAudio, usePEvents} from '../../../../features/focus-room-dialogue'
import {
  type MemoryMemo,
  updateMemoryMemos,
  useMemoryMemos,
} from '../../../../features/memory-assist'
import {updateMemoryMemos as updateRepositoryMemos} from '../../../../features/memory-assist/repository'
import {PButton} from '../../../p-button/PButton'
import {PSelect} from '../../../p-select/PSelect'
import {PSwitch} from '../../../p-switch/PSwitch'
import {isFirstReminderInFuture} from '../../reminder-draft'

vi.mock('../../../../features/focus-room-dialogue', () => ({
  deleteDialogueAudio: vi.fn(),
  usePEvents: vi.fn(),
}))
vi.mock('../../../../features/memory-assist', async () => ({
  ...(await vi.importActual('../../../../features/memory-assist')),
  updateMemoryMemos: vi.fn(),
  useMemoryMemos: vi.fn(),
}))
vi.mock('../../../../features/memory-assist/repository', async () => ({
  ...(await vi.importActual('../../../../features/memory-assist/repository')),
  updateMemoryMemos: vi.fn(),
}))
vi.mock('../../reminder-draft', async () => ({
  ...(await vi.importActual('../../reminder-draft')),
  isFirstReminderInFuture: vi.fn(),
}))
vi.mock('../../../p-button/PButton', () => ({PButton: vi.fn()}))
vi.mock('../../../p-select/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('../../../p-switch/PSwitch', () => ({PSwitch: vi.fn()}))

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
  reminderEvents: [
    {
      deliveredAt: '2026-09-04T03:10:00.000Z',
      kind: 'recall',
      scheduledAt: '2026-09-04T03:10:00.000Z',
    },
  ],
  reminderHistory: ['2026-09-04T03:10:00.000Z'],
  text: '여권 갱신하기',
  updatedAt: '2026-09-04T03:10:00.000Z',
  version: 1,
})

export const setupMemos = () => {
  const mocks = {
    deleteDialogue: vi.fn(),
    isFirstReminderInFuture: vi.mocked(isFirstReminderInFuture),
    memos: [] as ReadonlyArray<MemoryMemo>,
    updateMemos: vi.mocked(updateMemoryMemos),
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(localDateRuntime, 'schedule').mockImplementation(() => vi.fn())
    sessionStorage.clear()
    mocks.memos = []
    vi.mocked(useMemoryMemos).mockImplementation(() => () => mocks.memos)
    mocks.deleteDialogue.mockResolvedValue(undefined)
    vi.mocked(deleteDialogueAudio).mockResolvedValue(undefined)
    vi.mocked(usePEvents).mockImplementation(
      vi.fn().mockReturnValue({deleteDialogue: mocks.deleteDialogue}),
    )
    mocks.updateMemos.mockImplementation(async (update) => {
      mocks.memos = update(mocks.memos)
      return mocks.memos
    })
    vi.mocked(updateRepositoryMemos).mockImplementation(mocks.updateMemos)
    const reminderDraft =
      await vi.importActual<typeof import('../../reminder-draft')>('../../reminder-draft')
    mocks.isFirstReminderInFuture.mockImplementation(reminderDraft.isFirstReminderInFuture)
    vi.mocked(PButton).mockImplementation((props) => (
      <button
        aria-label={props.accessibleLabel}
        disabled={props.disabled}
        onClick={(event) => props.onPress?.(event.currentTarget)}
        type="button"
      >
        {props.children}
      </button>
    ))
    vi.mocked(PSelect).mockImplementation((props) => {
      const single = untrack(() => (props.multiple === true ? null : props))
      if (single === null) {
        throw new Error('The memo fixture requires a single-select control.')
      }
      return (
        <label>
          {single.label}
          <select
            onChange={(event) => single.onChange(event.currentTarget.value)}
            value={single.value}
          >
            <For each={single.options}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
        </label>
      )
    })
    vi.mocked(PSwitch).mockImplementation((props) => (
      <label>
        {props.label}
        <input
          checked={props.checked}
          onChange={(event) => props.onChange?.(event.currentTarget.checked)}
          type="checkbox"
        />
      </label>
    ))
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  return {createStoredMemo, mocks}
}
