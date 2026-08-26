/** @vitest-environment jsdom */

import './p-event-provider.test-support'

import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {usePEvents} from '../../features/focus-room-dialogue/event-context'
import {createPDialogueRepository} from '../../features/focus-room-dialogue/repository'
import type {DialogueEventBinding, PDialogue} from '../../features/focus-room-dialogue/schema'
import {
  createDialogue,
  createRepository,
  stubAudioElements,
} from '../../features/focus-room-dialogue/__tests__/support/fixtures'
import {renderImmediateContext} from './p-event-provider.test-support'
import {renderContext} from './support/render-context'

const repositoryMocks = {create: vi.mocked(createPDialogueRepository)}

it('should release initialization waiters when disposed before the repository module is ready', async () => {
  const {events, result} = renderImmediateContext()

  expect(() => events.getAudio('audio-key')).toThrow('Pomo 이벤트 저장소가 아직 준비되지 않았어요.')
  expect(events.entryDialogueId()).toBeNull()
  expect(events.entryDialogueIds()).toEqual([])
  const dialoguePlayback = events.playDialogue('dialogue-id')
  const eventPlayback = events.playDialogueEvents(['focus-start'])
  const sequencePlayback = events.playDialogueSequence({
    dialogueIds: ['dialogue-id'],
    onDialogueStart: vi.fn(),
    onSequenceStop: vi.fn(),
  })
  const refresh = events.refreshDialogues()

  result.unmount()

  await Promise.all([dialoguePlayback, eventPlayback, sequencePlayback, refresh])
  await Promise.resolve()
})

it('should ignore repository initialization that finishes after disposal', async () => {
  const dialogue = createDialogue('delayed')
  let resolveDialogues: (dialogues: ReadonlyArray<PDialogue>) => void = () => undefined
  let resolveBindings: (bindings: ReadonlyArray<DialogueEventBinding>) => void = () => undefined
  const dialogues = new Promise<ReadonlyArray<PDialogue>>((resolve) => {
    resolveDialogues = resolve
  })
  const bindings = new Promise<ReadonlyArray<DialogueEventBinding>>((resolve) => {
    resolveBindings = resolve
  })
  const repository = createRepository([dialogue])
  repository.listDialogues.mockReturnValue(dialogues)
  repository.listEventBindings.mockReturnValue(bindings)
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = renderImmediateContext()

  await waitFor(() => expect(repository.listDialogues).toHaveBeenCalledOnce())
  result.unmount()
  resolveDialogues([dialogue])
  resolveBindings([])
  await Promise.all([dialogues, bindings])
  await Promise.resolve()

  expect(events.dialogues()).toEqual([])
  expect(repository.dispose).toHaveBeenCalledOnce()
})

it('should suppress an initialization rejection after disposal', async () => {
  let rejectDialogues: (error: Error) => void = () => undefined
  const dialogues = new Promise<ReadonlyArray<PDialogue>>((_resolve, reject) => {
    rejectDialogues = reject
  })
  const repository = createRepository([])
  repository.listDialogues.mockReturnValue(dialogues)
  repositoryMocks.create.mockReturnValue(repository)
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const {result} = renderImmediateContext()

  await waitFor(() => expect(repository.listDialogues).toHaveBeenCalledOnce())
  result.unmount()
  rejectDialogues(new Error('database unavailable'))
  await dialogues.catch(() => undefined)
  await Promise.resolve()

  expect(error).not.toHaveBeenCalled()
})

it('should report initialization failures and keep refresh safe without a repository', async () => {
  repositoryMocks.create.mockImplementation(() => {
    throw new Error('database unavailable')
  })
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const {events, result} = renderImmediateContext()

  await waitFor(() => expect(events.isLoading()).toBe(false))
  expect(events.errorMessage()).toBe('이벤트와 저장된 대화를 불러오지 못했어요.')
  expect(error).toHaveBeenCalledWith('Failed to initialize focus room events.', expect.any(Error))
  await expect(events.refreshDialogues()).resolves.toBeUndefined()
  result.unmount()

  cleanup()
  repositoryMocks.create.mockImplementation(() => {
    throw new Error('database unavailable')
  })
  error.mockReset().mockImplementationOnce(() => {
    throw new Error('logger unavailable')
  })
  error.mockImplementation(() => undefined)
  const nextContext = renderImmediateContext()

  await waitFor(() => expect(nextContext.events.isLoading()).toBe(false))
  expect(error).toHaveBeenLastCalledWith(
    'Unexpected focus room event initialization failure.',
    expect.any(Error),
  )
  nextContext.result.unmount()
})

it('should report an unexpected entry sequence rejection', async () => {
  const dialogue = createDialogue('broken-entry')
  const repository = createRepository(
    [dialogue],
    [
      {
        dialogueIds: [dialogue.id],
        event: 'room-enter',
        playbackMode: 'sequential-all',
        version: 3,
      },
    ],
  )
  repository.getDialogue.mockRejectedValue(new Error('database unavailable'))
  repositoryMocks.create.mockReturnValue(repository)
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const {result} = await renderContext()

  await waitFor(() =>
    expect(error).toHaveBeenCalledWith(
      'Unexpected entry dialogue sequence failure.',
      expect.any(Error),
    ),
  )
  result.unmount()
})

it('should expose binding helpers and remove deleted dialogues from every binding', async () => {
  const first = createDialogue('first')
  const second = createDialogue('second')
  const repository = createRepository(
    [first, second],
    [
      {
        dialogueIds: [first.id],
        event: 'room-enter',
        playbackMode: 'random-one',
        version: 3,
      },
      {
        dialogueIds: [first.id, second.id],
        event: 'focus-start',
        playbackMode: 'sequential-all',
        version: 3,
      },
    ],
  )
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext({enter: false})

  expect(events.entryDialogueId()).toBe(first.id)
  expect(events.entryDialogueIds()).toEqual([first.id])
  await expect(events.getAudio(first.audioKey)).resolves.toBeInstanceOf(Blob)
  await events.deleteDialogue(first.id)

  expect(events.dialogues().map((dialogue) => dialogue.id)).toEqual([second.id])
  expect(events.eventDialogueIds()).toEqual({'focus-start': [second.id]})
  expect(events.eventPlaybackModes()).toEqual({'focus-start': 'sequential-all'})
  expect(events.entryDialogueId()).toBeNull()

  await events.setEntryDialogue(second.id)
  await events.setEntryDialogue(null)
  await events.setEntryDialogues([second.id, second.id])
  await events.setEventPlaybackMode('room-enter', 'random-one')
  await events.setEntryDialogue(second.id)
  expect(events.entryDialogueIds()).toEqual([second.id])
  await events.setEntryDialogue(null)
  await events.setEventDialogue('focus-end', second.id)
  await events.setEventDialogue('focus-end', null)
  await expect(events.setEventPlaybackMode('break-start', 'random-one')).resolves.toBeUndefined()
  events.retryDialoguePlayback()
  events.retryEntryPlayback()

  expect(repository.setEventBinding).toHaveBeenCalledWith('room-enter', [], 'random-one')
  expect(repository.setEventBinding).toHaveBeenCalledWith(
    'focus-end',
    [second.id],
    'sequential-all',
  )
  result.unmount()
})

it('should skip retries when playback is disabled', async () => {
  const repository = createRepository([])
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext({isPlaybackEnabled: () => false})

  events.retryDialoguePlayback()
  events.retryEntryPlayback()
  await events.playDialogueEvents(['focus-start'])

  result.unmount()
})

it('should preserve the later same-event binding when the previous update fails', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  let rejectFirst: (error: Error) => void = () => undefined
  const firstUpdate = new Promise<void>((_resolve, reject) => {
    rejectFirst = reject
  })
  const repository = createRepository(dialogues)
  repository.setEventBinding.mockReturnValueOnce(firstUpdate).mockResolvedValueOnce(undefined)
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext({enter: false})

  const failedUpdate = events.setEventDialogues('focus-start', ['first'])
  const successfulUpdate = events.setEventDialogues('focus-start', ['second'])
  rejectFirst(new Error('database unavailable'))

  await expect(failedUpdate).rejects.toThrow('database unavailable')
  await successfulUpdate
  expect(events.eventDialogueIds()).toEqual({'focus-start': ['second']})
  result.unmount()
})

it('should ignore binding completion and rejection after disposal', async () => {
  let resolveUpdate: () => void = () => undefined
  const update = new Promise<void>((resolve) => {
    resolveUpdate = resolve
  })
  const repository = createRepository([createDialogue('first')])
  repository.setEventBinding.mockReturnValue(update)
  repositoryMocks.create.mockReturnValue(repository)
  const firstContext = await renderContext({enter: false})
  const persisted = firstContext.events.setEventDialogues('room-enter', ['first'])
  firstContext.result.unmount()
  resolveUpdate()
  await persisted

  let rejectUpdate: (error: Error) => void = () => undefined
  const rejectedUpdate = new Promise<void>((_resolve, reject) => {
    rejectUpdate = reject
  })
  const nextRepository = createRepository([createDialogue('second')])
  nextRepository.setEventBinding.mockReturnValue(rejectedUpdate)
  repositoryMocks.create.mockReturnValue(nextRepository)
  const nextContext = await renderContext({enter: false})
  const rejected = nextContext.events.setEventDialogues('room-enter', ['second'])
  nextContext.result.unmount()
  rejectUpdate(new Error('database unavailable'))

  await expect(rejected).rejects.toThrow('database unavailable')
})

it('should keep newer bindings when a concurrent refresh completes and ignore refresh after disposal', async () => {
  const first = createDialogue('first')
  const second = createDialogue('second')
  const repository = createRepository([first, second])
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext({enter: false})
  let resolveDialogues: (dialogues: ReadonlyArray<PDialogue>) => void = () => undefined
  let resolveBindings: (bindings: ReadonlyArray<DialogueEventBinding>) => void = () => undefined
  repository.listDialogues.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDialogues = resolve
    }),
  )
  repository.listEventBindings.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveBindings = resolve
    }),
  )
  const refresh = events.refreshDialogues()
  await waitFor(() => expect(repository.listDialogues).toHaveBeenCalledTimes(2))
  await events.setEventDialogues('focus-start', [second.id])
  resolveDialogues([first])
  resolveBindings([
    {
      dialogueIds: [first.id],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  await refresh

  expect(events.dialogues()).toEqual([first])
  expect(events.eventDialogueIds()).toEqual({'focus-start': [second.id]})

  let resolveDisposedDialogues: (dialogues: ReadonlyArray<PDialogue>) => void = () => undefined
  let resolveDisposedBindings: (bindings: ReadonlyArray<DialogueEventBinding>) => void = () =>
    undefined
  repository.listDialogues.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDisposedDialogues = resolve
    }),
  )
  repository.listEventBindings.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDisposedBindings = resolve
    }),
  )
  const disposedRefresh = events.refreshDialogues()
  await waitFor(() => expect(repository.listDialogues).toHaveBeenCalledTimes(3))
  result.unmount()
  resolveDisposedDialogues([second])
  resolveDisposedBindings([])
  await disposedRefresh
})

it('should reject context access outside the provider', () => {
  const Consumer = () => {
    usePEvents()
    return null
  }

  expect(() => render(() => <Consumer />)).toThrow('usePEvents must be used inside PEventProvider.')
})

it('should stop internal entry and event sequences and ignore an unbound event', async () => {
  const entry = createDialogue('entry')
  const event = createDialogue('event')
  const repository = createRepository(
    [entry, event],
    [
      {
        dialogueIds: [entry.id],
        event: 'room-enter',
        playbackMode: 'sequential-all',
        version: 3,
      },
      {
        dialogueIds: [event.id],
        event: 'focus-start',
        playbackMode: 'sequential-all',
        version: 3,
      },
    ],
  )
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()

  await waitFor(() => expect(events.activeDialogueId()).toBe(entry.id))
  events.onStopEntryPlayback()
  await waitFor(() => expect(events.scheduledDialogueCount()).toBe(0))

  const eventPlayback = events.playDialogueEvents(['focus-start'])
  await waitFor(() => expect(events.activeDialogueId()).toBe(event.id))
  events.onStopDialoguePlayback()
  await waitFor(() => expect(events.scheduledDialogueCount()).toBe(0))
  await eventPlayback

  await expect(events.playDialogueEvents(['break-end'])).resolves.toBeUndefined()
  result.unmount()
})

it('should absorb a failed binding before delete and refresh operations', async () => {
  const dialogue = createDialogue('dialogue')
  const repository = createRepository([dialogue])
  repository.setEventBinding.mockRejectedValueOnce(new Error('database unavailable'))
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext({enter: false})

  await expect(events.setEventDialogues('focus-start', [dialogue.id])).rejects.toThrow(
    'database unavailable',
  )
  await events.refreshDialogues()
  await events.deleteDialogue(dialogue.id)

  expect(repository.listDialogues).toHaveBeenCalledTimes(2)
  expect(repository.deleteDialogue).toHaveBeenCalledWith(dialogue.id)
  result.unmount()
})

it('should ignore dialogue deletion that completes after disposal', async () => {
  const dialogue = createDialogue('dialogue')
  let resolveDeletion: () => void = () => undefined
  const deletion = new Promise<undefined>((resolve) => {
    resolveDeletion = () => resolve(undefined)
  })
  const repository = createRepository([dialogue])
  repository.deleteDialogue.mockReturnValue(deletion)
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext({enter: false})

  const pendingDeletion = events.deleteDialogue(dialogue.id)
  await waitFor(() => expect(repository.deleteDialogue).toHaveBeenCalledWith(dialogue.id))
  result.unmount()
  resolveDeletion()
  await pendingDeletion

  expect(events.dialogues()).toEqual([dialogue])
})
