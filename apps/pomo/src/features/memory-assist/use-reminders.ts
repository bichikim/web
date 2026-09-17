import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {getLocale} from '@paraglide/runtime'
import {
  type AutomaticDialogueSettings,
  createPDialogueRepository,
  type PDialogueRepository,
  type PEventContextValue,
} from '../focus-room-dialogue'
import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  type SupertonicClient,
  type SupertonicModelId,
} from '../supertonic'
import {useDeletionRecovery} from './use-deletion-recovery'
import {memoryMemoDeletion} from './deletion-runtime'
import {createMemoryMemoDialogue} from './dialogue'
import {isMemoryMemoDeletionPending} from './is-memory-memo-deletion-pending'
import {updateMemoryMemos} from './repository'
import {advanceMemoryMemo, getDueMemoryReminder, type MemoryReminderKind} from './schedule'
import type {MemoryMemo} from './schema'
import {useMemoryMemos} from './use-memos'

const MAXIMUM_TIMEOUT = 2_147_483_647
const RETRY_DELAY = 300_000

export interface UseMemoryRemindersProps {
  readonly events: PEventContextValue
  readonly loadSettings?: () => Promise<AutomaticDialogueSettings>
  readonly onBeforePlayback?: () => void
  readonly random?: () => number
}

const loadAutomaticDialogueSettings = async () => {
  const {createAutomaticDialogueSettingsRepository} =
    await import('../focus-room-dialogue/automatic-dialogue-settings')
  return createAutomaticDialogueSettingsRepository(window.localStorage).load()
}

const getReminderTime = (memo: MemoryMemo) => {
  const timestamps = [memo.nextExactReminderAt, memo.nextRecallAt].flatMap((value) =>
    value === null ? [] : [Date.parse(value)],
  )
  return timestamps.length === 0 ? null : Math.min(...timestamps)
}

const getScheduledReminderTime = (memo: MemoryMemo, kind: MemoryReminderKind) => {
  const scheduledAt = kind === 'exact' ? memo.nextExactReminderAt : memo.nextRecallAt
  return scheduledAt === null ? null : Date.parse(scheduledAt)
}

const getReminderScheduleIdentity = (memo: MemoryMemo, kind: MemoryReminderKind) =>
  kind === 'exact'
    ? JSON.stringify([
        memo.exactReminderAdvanceMinutes,
        memo.exactReminderAt,
        memo.exactReminderRepeatIntervalMinutes,
        memo.exactReminderRepeatUntilMinutes,
      ])
    : JSON.stringify([memo.recallMode, memo.reinforcementIndex])

const applyReminderSchedule = (memo: MemoryMemo, scheduledMemo: MemoryMemo): MemoryMemo => ({
  ...memo,
  exactReminderAt: scheduledMemo.exactReminderAt,
  nextExactReminderAt: scheduledMemo.nextExactReminderAt,
  nextRecallAt: scheduledMemo.nextRecallAt,
  reinforcementIndex: scheduledMemo.reinforcementIndex,
})

interface GetMemoAfterSkippingReminderOptions {
  readonly kind: MemoryReminderKind
  readonly memo: MemoryMemo
  readonly now: Date
  readonly random: () => number
}

const getMemoAfterSkippingReminder = (options: GetMemoAfterSkippingReminderOptions): MemoryMemo => {
  const advancedMemo = advanceMemoryMemo(options)

  return applyReminderSchedule(options.memo, advancedMemo)
}

const getMemoryMemoDeliverySnapshot = (memo: MemoryMemo) =>
  JSON.stringify({
    createdAt: memo.createdAt,
    deletionPending: memo.deletionPending,
    dialogueId: memo.dialogueId,
    exactReminderAdvanceMinutes: memo.exactReminderAdvanceMinutes,
    exactReminderAt: memo.exactReminderAt,
    exactReminderRepeatIntervalMinutes: memo.exactReminderRepeatIntervalMinutes,
    exactReminderRepeatUntilMinutes: memo.exactReminderRepeatUntilMinutes,
    id: memo.id,
    recallMode: memo.recallMode,
    retiredDialogueIds: memo.retiredDialogueIds,
    text: memo.text,
    updatedAt: memo.updatedAt,
    version: memo.version,
  })

const isMemoryMemoDeliverySnapshotCurrent = (
  memos: ReadonlyArray<MemoryMemo>,
  deliveredMemo: MemoryMemo,
) => {
  const deliveredSnapshot = getMemoryMemoDeliverySnapshot(deliveredMemo)
  return memos.some(
    (memo) =>
      !isMemoryMemoDeletionPending(memo) &&
      getMemoryMemoDeliverySnapshot(memo) === deliveredSnapshot,
  )
}

interface ReplaceDeliveredMemoOptions {
  readonly deliveredMemo: MemoryMemo
  readonly dialogueId: string
  readonly kind: MemoryReminderKind
  readonly memos: ReadonlyArray<MemoryMemo>
  readonly now: Date
  readonly random: () => number
}

interface ReplaceDeliveredMemoResult {
  readonly memos: ReadonlyArray<MemoryMemo>
  readonly wasReplaced: boolean
}

interface InvalidatedReminder {
  readonly kind: MemoryReminderKind
  readonly memo: MemoryMemo
  readonly scheduledAt: number
  readonly scheduleIdentity: string
}

interface IdleDeliveryState {
  readonly status: 'idle'
}

interface PendingDeliveryState {
  readonly memoId: string
  readonly status: 'pending'
}

interface RemovedDeliveryState {
  readonly memoId: string
  readonly status: 'removed'
}

type DeliveryState = IdleDeliveryState | PendingDeliveryState | RemovedDeliveryState

interface StartDeliveryEvent {
  readonly memoId: string
  readonly type: 'start'
}

interface MemoRemovedEvent {
  readonly type: 'memo-removed'
}

interface FinishDeliveryEvent {
  readonly type: 'finish'
}

type DeliveryEvent = StartDeliveryEvent | MemoRemovedEvent | FinishDeliveryEvent

const transitionDeliveryState = (
  currentState: DeliveryState,
  event: DeliveryEvent,
): DeliveryState => {
  switch (event.type) {
    case 'start':
      return {memoId: event.memoId, status: 'pending'}
    case 'memo-removed':
      return currentState.status === 'pending'
        ? {memoId: currentState.memoId, status: 'removed'}
        : currentState
    case 'finish':
      return {status: 'idle'}
  }

  const unreachableEvent: never = event
  throw new Error(`Unsupported memory memo delivery event: ${String(unreachableEvent)}`)
}

interface VerifyMemoAfterPlaybackOptions {
  readonly currentMemos: ReadonlyArray<MemoryMemo>
  readonly deliveredMemo: MemoryMemo
  readonly invalidatedReminders: Map<string, InvalidatedReminder>
  readonly kind: MemoryReminderKind
  readonly played: boolean
  readonly random: () => number
}

const verifyMemoAfterPlayback = (options: VerifyMemoAfterPlaybackOptions) => {
  if (isMemoryMemoDeliverySnapshotCurrent(options.currentMemos, options.deliveredMemo)) {
    return true
  }

  if (!options.played) {
    return false
  }

  const currentMemo = options.currentMemos.find(
    (memo) => memo.id === options.deliveredMemo.id && !isMemoryMemoDeletionPending(memo),
  )
  const scheduledAt = getScheduledReminderTime(options.deliveredMemo, options.kind)
  const invalidatedReminder = options.invalidatedReminders.get(options.deliveredMemo.id)
  const currentScheduledAt =
    currentMemo === undefined ? null : getScheduledReminderTime(currentMemo, options.kind)
  const isVirtualOccurrence =
    currentMemo !== undefined &&
    invalidatedReminder?.kind === options.kind &&
    getScheduledReminderTime(invalidatedReminder.memo, options.kind) === scheduledAt &&
    getReminderScheduleIdentity(currentMemo, options.kind) === invalidatedReminder.scheduleIdentity

  if (
    currentMemo === undefined ||
    scheduledAt === null ||
    (!isVirtualOccurrence && currentScheduledAt !== scheduledAt)
  ) {
    return false
  }

  options.invalidatedReminders.set(options.deliveredMemo.id, {
    kind: options.kind,
    memo: getMemoAfterSkippingReminder({
      kind: options.kind,
      memo: currentMemo,
      now: new Date(),
      random: options.random,
    }),
    scheduledAt: isVirtualOccurrence ? invalidatedReminder.scheduledAt : scheduledAt,
    scheduleIdentity: getReminderScheduleIdentity(currentMemo, options.kind),
  })
  return false
}

const replaceDeliveredMemo = (options: ReplaceDeliveredMemoOptions): ReplaceDeliveredMemoResult => {
  const currentMemo = options.memos.find(
    (memo) =>
      !isMemoryMemoDeletionPending(memo) &&
      isMemoryMemoDeliverySnapshotCurrent([memo], options.deliveredMemo),
  )

  if (currentMemo === undefined) {
    return {memos: options.memos, wasReplaced: false}
  }

  return {
    memos: options.memos.map((memo) =>
      memo === currentMemo
        ? advanceMemoryMemo({
            kind: options.kind,
            memo: {
              ...applyReminderSchedule(currentMemo, options.deliveredMemo),
              dialogueId: options.dialogueId,
            },
            now: options.now,
            random: options.random,
          })
        : memo,
    ),
    wasReplaced: true,
  }
}

interface CommitDeliveredMemoOptions {
  readonly deliveredMemo: MemoryMemo
  readonly dialogueId: string
  readonly kind: MemoryReminderKind
  readonly now: Date
  readonly random: () => number
}

const commitDeliveredMemo = async (options: CommitDeliveredMemoOptions) => {
  let wasReplaced = false

  await updateMemoryMemos((currentMemos) => {
    const replacement = replaceDeliveredMemo({...options, memos: currentMemos})
    const {memos, wasReplaced: currentWasReplaced} = replacement
    wasReplaced = currentWasReplaced
    return memos
  })

  return wasReplaced
}

export interface MemoryReminders {
  readonly skippedReminders: () => ReadonlyArray<MemoryMemo>
}

/** Runs persisted memo reminders while the Pomo room is mounted. */
// oxlint-disable-next-line eslint/max-lines-per-function -- One owner coordinates reminder scheduling, delivery, and asynchronous resource cleanup.
export const useMemoryReminders = (props: UseMemoryRemindersProps): MemoryReminders => {
  const memos = useMemoryMemos()
  useDeletionRecovery(() => memoryMemoDeletion.retry(props.events.deleteDialogue))
  const [clockRevision, setClockRevision] = createSignal(0)
  const [deliveryState, setDeliveryState] = createSignal<DeliveryState>({status: 'idle'})
  const [skippedMemos, setSkippedMemos] = createSignal<ReadonlyArray<MemoryMemo>>([])
  const retryAfter = new Map<string, number>()
  const invalidatedReminders = new Map<string, InvalidatedReminder>()
  let client: SupertonicClient | null = null
  let clientModelId: SupertonicModelId | null = null
  let clientPreparation: Promise<SupertonicClient> | null = null
  let repository: PDialogueRepository | null = null
  let isDisposed = false

  const getClient = (modelId: SupertonicModelId) => {
    if (clientModelId !== null && clientModelId !== modelId) {
      client?.dispose()
      client = null
      clientModelId = null
      clientPreparation = null
    }

    clientPreparation ??= (async () => {
      const nextClient = createSupertonicClient()
      client = nextClient
      const result = await nextClient.initialize({
        modelId,
        onProgress: () => undefined,
        onStatus: () => undefined,
      })

      if (!result.ok) {
        client?.dispose()
        client = null
        throw new Error(getSupertonicErrorMessage(result.error))
      }

      if (isDisposed) {
        return nextClient
      }

      client = nextClient
      clientModelId = modelId
      return nextClient
    })().catch((error: unknown) => {
      clientPreparation = null
      throw error
    })
    return clientPreparation
  }

  const markSkippedMemo = (memo: MemoryMemo) => {
    if (deliveryState().status === 'removed') {
      return
    }

    setSkippedMemos((current) => [...current.filter((item) => item.id !== memo.id), memo])
    retryAfter.set(memo.id, Date.now() + RETRY_DELAY)
  }

  const deliver = async (memo: MemoryMemo) => {
    const now = new Date()
    const kind = getDueMemoryReminder(memo, now)

    if (kind === null) {
      return
    }

    repository ??= createPDialogueRepository()
    let {dialogueId} = memo
    let generatedDialogueId: string | null = null

    const discardGeneratedDialogue = async () => {
      if (generatedDialogueId !== null) {
        await repository?.deleteDialogue(generatedDialogueId)
      }
    }

    if (dialogueId === null) {
      const settings = await (props.loadSettings ?? loadAutomaticDialogueSettings)()

      if (isDisposed) {
        return
      }

      const currentClient = await getClient(settings.modelId)

      if (isDisposed) {
        return
      }

      generatedDialogueId = await createMemoryMemoDialogue({
        client: currentClient,
        language: getLocale(),
        memo,
        modelId: settings.modelId,
        repository,
        voiceId: settings.voiceId,
      })
      dialogueId = generatedDialogueId
    }

    try {
      if (isDisposed || !isMemoryMemoDeliverySnapshotCurrent(memos(), memo)) {
        return
      }

      await props.events.refreshDialogues()

      if (isDisposed || !isMemoryMemoDeliverySnapshotCurrent(memos(), memo)) {
        return
      }

      props.onBeforePlayback?.()
      const played = await props.events.playDialogue(dialogueId)

      if (isDisposed) {
        return
      }

      const isCurrentAfterPlayback = verifyMemoAfterPlayback({
        currentMemos: memos(),
        deliveredMemo: memo,
        invalidatedReminders,
        kind,
        played,
        random: props.random ?? Math.random,
      })

      if (!isCurrentAfterPlayback || !played) {
        if (!played) {
          markSkippedMemo(memo)
        }
        return
      }

      setSkippedMemos((current) => current.filter((item) => item.id !== memo.id))

      const wasReplaced = await commitDeliveredMemo({
        deliveredMemo: memo,
        dialogueId,
        kind,
        now: new Date(),
        random: props.random ?? Math.random,
      })

      if (!wasReplaced) {
        verifyMemoAfterPlayback({
          currentMemos: memos(),
          deliveredMemo: memo,
          invalidatedReminders,
          kind,
          played: true,
          random: props.random ?? Math.random,
        })
        return
      }

      generatedDialogueId = null
      retryAfter.delete(memo.id)
    } finally {
      await discardGeneratedDialogue().catch((error: unknown) => {
        console.error('Failed to discard an uncommitted memory memo dialogue.', error)
      })
    }
  }

  const runDelivery = async (memo: MemoryMemo) => {
    setDeliveryState((currentState) =>
      transitionDeliveryState(currentState, {memoId: memo.id, type: 'start'}),
    )

    try {
      await deliver(memo)
    } catch (error: unknown) {
      console.error('Failed to deliver a memory memo reminder.', error)
      if (deliveryState().status === 'removed') {
        return
      }
      if (isDisposed) {
        retryAfter.set(memo.id, Date.now() + RETRY_DELAY)
      } else {
        markSkippedMemo(memo)
      }
    } finally {
      setDeliveryState((currentState) => transitionDeliveryState(currentState, {type: 'finish'}))
      if (isDisposed) {
        repository?.dispose()
      } else {
        setClockRevision((revision) => revision + 1)
      }
    }
  }

  onMount(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setClockRevision((revision) => revision + 1)
      }
    }
    useEvent(document, 'visibilitychange', handleVisibility)

    onCleanup(() => {
      isDisposed = true
      client?.dispose()
      client = null
      if (deliveryState().status === 'idle') {
        repository?.dispose()
      }
    })
  })

  createEffect(() => {
    clockRevision()
    const currentMemos = memos()
    const currentMemoIds = new Set(currentMemos.map((memo) => memo.id))

    for (const memoId of retryAfter.keys()) {
      if (!currentMemoIds.has(memoId)) {
        retryAfter.delete(memoId)
      }
    }
    for (const memoId of invalidatedReminders.keys()) {
      if (!currentMemoIds.has(memoId)) {
        invalidatedReminders.delete(memoId)
      }
    }

    let currentDeliveryState = deliveryState()
    if (
      currentDeliveryState.status === 'pending' &&
      !currentMemoIds.has(currentDeliveryState.memoId)
    ) {
      currentDeliveryState = transitionDeliveryState(currentDeliveryState, {
        type: 'memo-removed',
      })
      setDeliveryState(currentDeliveryState)
    }

    if (currentDeliveryState.status !== 'idle') {
      return
    }

    const scheduledMemos = currentMemos
      .flatMap((memo) => {
        if (isMemoryMemoDeletionPending(memo)) {
          return []
        }

        const invalidatedMemo = invalidatedReminders.get(memo.id)
        let scheduledMemo = memo

        if (invalidatedMemo !== undefined) {
          if (
            getScheduledReminderTime(memo, invalidatedMemo.kind) === invalidatedMemo.scheduledAt &&
            getReminderScheduleIdentity(memo, invalidatedMemo.kind) ===
              invalidatedMemo.scheduleIdentity
          ) {
            scheduledMemo = applyReminderSchedule(memo, invalidatedMemo.memo)
          } else {
            invalidatedReminders.delete(memo.id)
          }
        }

        const reminderTime = getReminderTime(scheduledMemo)

        if (reminderTime === null) {
          return []
        }

        const availableAt = Math.max(reminderTime, retryAfter.get(memo.id) ?? 0)
        return Number.isFinite(availableAt) ? [{availableAt, memo: scheduledMemo}] : []
      })
      .sort((left, right) => left.availableAt - right.availableAt)
    const [scheduled] = scheduledMemos

    if (scheduled === undefined) {
      return
    }

    const delay = Math.min(MAXIMUM_TIMEOUT, Math.max(0, scheduled.availableAt - Date.now()))
    const timerId = globalThis.setTimeout(() => {
      runDelivery(scheduled.memo).catch(() => undefined)
    }, delay)

    onCleanup(() => globalThis.clearTimeout(timerId))
  })
  return {
    skippedReminders: () => {
      const currentMemos = memos()
      return skippedMemos().filter(
        (memo) =>
          isMemoryMemoDeliverySnapshotCurrent(currentMemos, memo) &&
          currentMemos.some(
            (current) => current.id === memo.id && !isMemoryMemoDeletionPending(current),
          ),
      )
    },
  }
}
