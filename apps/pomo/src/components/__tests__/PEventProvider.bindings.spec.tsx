/** @vitest-environment jsdom */

import './p-event-provider.test-support'

import {render, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {type PEventContextValue, usePEvents} from '../../features/focus-room-dialogue/event-context'
import type {DialogueEventBinding, PDialogue} from '../../features/focus-room-dialogue/schema'
import {createPDialogueRepository} from '../../features/focus-room-dialogue/repository'
import {
  createDialogue,
  createRepository,
  stubAnimationFrame,
  stubAudioElements,
} from '../../features/focus-room-dialogue/__tests__/support/fixtures'
import {PEventProvider} from '../PEventProvider'
import {renderContext} from './support/render-context'

const repositoryMocks = {create: vi.mocked(createPDialogueRepository)}

it('should roll back only the latest failed event binding update', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues)
  repository.setEventBinding.mockResolvedValueOnce(undefined)
  repository.setEventBinding.mockRejectedValueOnce(new Error('database unavailable'))
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext()

  await events.setEventDialogues('room-enter', ['first'])
  await expect(events.setEventDialogues('room-enter', ['second'])).rejects.toThrow(
    'database unavailable',
  )

  expect(events.entryDialogueIds()).toEqual(['first'])
  result.unmount()
})

it('should roll back a failed event without discarding a later event update', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues)
  repository.setEventBinding.mockRejectedValueOnce(new Error('database unavailable'))
  repository.setEventBinding.mockResolvedValueOnce(undefined)
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext()

  const failedUpdate = events.setEventDialogues('focus-start', ['first'])
  const successfulUpdate = events.setEventDialogues('focus-end', ['second'])

  await expect(failedUpdate).rejects.toThrow('database unavailable')
  await successfulUpdate

  expect(events.eventDialogueIds()).toEqual({'focus-end': ['second']})
  expect(events.eventPlaybackModes()).toEqual({'focus-end': 'sequential-all'})
  result.unmount()
})

it('should persist a playback mode while preserving the connected dialogues', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues, [
    {
      dialogueIds: ['first', 'second'],
      event: 'focus-start',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext()

  await events.setEventPlaybackMode('focus-start', 'random-one')

  expect(events.eventDialogueIds()['focus-start']).toEqual(['first', 'second'])
  expect(events.eventPlaybackModes()['focus-start']).toBe('random-one')
  expect(repository.setEventBinding).toHaveBeenCalledWith(
    'focus-start',
    ['first', 'second'],
    'random-one',
  )
  result.unmount()
})

it('should refresh event bindings changed by another repository owner', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  let storedDialogues: ReadonlyArray<PDialogue> = dialogues
  let storedBindings: ReadonlyArray<DialogueEventBinding> = [
    {
      dialogueIds: ['first', 'second'],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ]
  const repository = {
    ...createRepository(dialogues),
    listDialogues: vi.fn(async () => storedDialogues),
    listEventBindings: vi.fn(async () => storedBindings),
  }
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
    new DOMException('Autoplay blocked', 'NotAllowedError'),
  )
  const {events, result} = await renderContext()
  await waitFor(() => expect(events.isDialoguePlaybackBlocked()).toBe(true))

  expect(events.isDialoguePlaying()).toBe(false)

  expect(events.entryDialogueIds()).toEqual(['first', 'second'])
  storedDialogues = [dialogues[1]].filter((dialogue) => dialogue !== undefined)
  storedBindings = [
    {
      dialogueIds: ['second'],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ]
  await events.refreshDialogues()

  expect(events.dialogues().map((dialogue) => dialogue.id)).toEqual(['second'])
  expect(events.entryDialogueIds()).toEqual(['second'])
  result.unmount()
})

it('should play entry dialogue after the binding is configured after entering', async () => {
  const dialogue = createDialogue('entry')
  const repository = createRepository([dialogue])
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
    new DOMException('Autoplay blocked', 'NotAllowedError'),
  )

  const {events, result} = await renderContext({enter: false})
  events.enterFocusRoom()
  expect(repository.getDialogue).not.toHaveBeenCalled()

  await events.setEventDialogues('room-enter', [dialogue.id])
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith(dialogue.id))
  result.unmount()
})

it('should preserve queued playback without replaying a changed event binding', async () => {
  const entryDialogue = createDialogue('entry-dialogue', ['입장 대사'])
  const queuedDialogue = createDialogue('queued-dialogue', ['대기 중인 대사'])
  const nextEntryDialogue = createDialogue('next-entry-dialogue', ['새 입장 대사'])
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  const repository = createRepository(
    [entryDialogue, queuedDialogue, nextEntryDialogue],
    [
      {
        dialogueIds: [entryDialogue.id],
        event: 'room-enter',
        playbackMode: 'sequential-all',
        version: 3,
      },
    ],
  )
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  stubAnimationFrame()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause')
  const eventReference: {current?: PEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = usePEvents()
    return null
  }
  const result = render(() => (
    <PEventProvider>
      <Consumer />
    </PEventProvider>
  ))

  await waitFor(() => expect(eventReference.current?.isLoading()).toBe(false))
  eventReference.current?.enterFocusRoom()
  await waitFor(() => expect(eventReference.current?.activeText()).toBe('입장 대사'))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  const queuedPlayback = events.playDialogue(queuedDialogue.id)
  await waitFor(() => expect(events.scheduledDialogueCount()).toBe(2))
  pause.mockClear()
  await events.setEventDialogue('room-enter', nextEntryDialogue.id)
  expect(events.eventDialogueIds()['room-enter']).toEqual([nextEntryDialogue.id])
  expect(events.activeText()).toBe('입장 대사')
  expect(events.scheduledDialogueCount()).toBe(2)
  expect(repository.setEventBinding).toHaveBeenCalledWith(
    'room-enter',
    [nextEntryDialogue.id],
    'sequential-all',
  )
  expect(repository.getDialogue).not.toHaveBeenCalledWith(nextEntryDialogue.id)
  expect(pause).not.toHaveBeenCalled()

  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith(queuedDialogue.id))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await queuedPlayback

  result.unmount()
})
