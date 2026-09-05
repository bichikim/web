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
import {createMemoryMemoDialogue} from './dialogue'
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

const isMemoryMemoCurrent = (memos: ReadonlyArray<MemoryMemo>, deliveredMemo: MemoryMemo) =>
  memos.some((memo) => memo.id === deliveredMemo.id && memo.updatedAt === deliveredMemo.updatedAt)

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

const replaceDeliveredMemo = (options: ReplaceDeliveredMemoOptions): ReplaceDeliveredMemoResult => {
  const currentMemo = options.memos.find(
    (memo) =>
      memo.id === options.deliveredMemo.id && memo.updatedAt === options.deliveredMemo.updatedAt,
  )

  if (currentMemo === undefined) {
    return {memos: options.memos, wasReplaced: false}
  }

  return {
    memos: options.memos.map((memo) =>
      memo === currentMemo
        ? advanceMemoryMemo({
            kind: options.kind,
            memo: {...memo, dialogueId: options.dialogueId},
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
  readonly onDiscard: () => Promise<void>
  readonly random: () => number
}

const commitDeliveredMemo = async (options: CommitDeliveredMemoOptions) => {
  let wasReplaced = false

  try {
    await updateMemoryMemos((currentMemos) => {
      const replacement = replaceDeliveredMemo({...options, memos: currentMemos})
      const {memos, wasReplaced: currentWasReplaced} = replacement
      wasReplaced = currentWasReplaced
      return memos
    })
  } catch (error: unknown) {
    await options.onDiscard().catch((cleanupError: unknown) => {
      console.error('Failed to discard an uncommitted memory memo dialogue.', cleanupError)
    })
    throw error
  }

  return wasReplaced
}

/** Runs persisted memo reminders while the Pomo room is mounted. */
export const useMemoryReminders = (props: UseMemoryRemindersProps) => {
  const memos = useMemoryMemos()
  const [clockRevision, setClockRevision] = createSignal(0)
  const [isPending, setIsPending] = createSignal(false)
  const retryAfter = new Map<string, number>()
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
      const result = await nextClient.initialize({
        modelId,
        onProgress: () => undefined,
        onStatus: () => undefined,
      })

      if (!result.ok) {
        nextClient.dispose()
        throw new Error(getSupertonicErrorMessage(result.error))
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

  const deliver = async (memo: MemoryMemo) => {
    const now = new Date()
    const kind = getDueMemoryReminder(memo, now)

    if (kind === null) {
      return
    }

    repository ??= createPDialogueRepository()
    let {dialogueId} = memo
    let generatedDialogueId: string | null = null

    if (dialogueId === null) {
      const settings = await (props.loadSettings ?? loadAutomaticDialogueSettings)()
      generatedDialogueId = await createMemoryMemoDialogue({
        client: await getClient(settings.modelId),
        language: getLocale(),
        memo,
        modelId: settings.modelId,
        repository,
        voiceId: settings.voiceId,
      })
      dialogueId = generatedDialogueId
    }

    const memoIsCurrent = () => isMemoryMemoCurrent(memos(), memo)
    const discardGeneratedDialogue = async () => {
      if (generatedDialogueId !== null) {
        await repository?.deleteDialogue(generatedDialogueId)
      }
    }

    if (!memoIsCurrent()) {
      await discardGeneratedDialogue()
      return
    }

    await props.events.refreshDialogues()

    if (!memoIsCurrent()) {
      await discardGeneratedDialogue()
      return
    }

    props.onBeforePlayback?.()
    await props.events.playDialogue(dialogueId)

    if (!memoIsCurrent()) {
      await discardGeneratedDialogue()
      return
    }

    const wasReplaced = await commitDeliveredMemo({
      deliveredMemo: memo,
      dialogueId,
      kind,
      now: new Date(),
      onDiscard: discardGeneratedDialogue,
      random: props.random ?? Math.random,
    })

    if (!wasReplaced) {
      await discardGeneratedDialogue()
      return
    }

    retryAfter.delete(memo.id)
  }

  const runDelivery = async (memo: MemoryMemo) => {
    setIsPending(true)

    try {
      await deliver(memo)
    } catch (error: unknown) {
      console.error('Failed to deliver a memory memo reminder.', error)
      retryAfter.set(memo.id, Date.now() + RETRY_DELAY)
    } finally {
      if (!isDisposed) {
        setIsPending(false)
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
      repository?.dispose()
    })
  })

  createEffect(() => {
    clockRevision()
    const currentMemos = memos()

    if (isPending()) {
      return
    }

    const scheduledMemos = currentMemos
      .map((memo) => {
        const reminderTime = getReminderTime(memo)
        const availableAt = Math.max(
          reminderTime ?? Number.POSITIVE_INFINITY,
          retryAfter.get(memo.id) ?? 0,
        )
        return {availableAt, memo}
      })
      .filter((item) => Number.isFinite(item.availableAt))
      .sort((left, right) => left.availableAt - right.availableAt)
    const [scheduled] = scheduledMemos

    if (scheduled === undefined) {
      return
    }

    const delay = Math.min(MAXIMUM_TIMEOUT, Math.max(0, scheduled.availableAt - Date.now()))
    const timerId = window.setTimeout(() => {
      runDelivery(scheduled.memo).catch(() => undefined)
    }, delay)

    onCleanup(() => window.clearTimeout(timerId))
  })
}
