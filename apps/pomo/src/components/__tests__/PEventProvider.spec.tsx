/** @vitest-environment jsdom */

import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {type PEventContextValue, usePEvents} from '../../features/focus-room-dialogue/event-context'
import type {DialogueEventBinding, PDialogue} from '../../features/focus-room-dialogue/schema'
import {
  createDialogue,
  createMood,
  createRepository,
  stubAnimationFrame,
  stubAudioElements,
} from '../../features/focus-room-dialogue/__tests__/support/fixtures'
import {PEventProvider} from '../PEventProvider'
import {renderContext} from './support/render-context'

const repositoryMocks = vi.hoisted(() => ({create: vi.fn()}))

vi.mock('../../features/focus-room-dialogue/repository', () => ({
  createPDialogueRepository: repositoryMocks.create,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:focus-room-dialogue'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const renderImmediateContext = (isPlaybackEnabled?: boolean) => {
  const eventReference: {current?: PEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = usePEvents()
    return null
  }
  const result = render(() => (
    <PEventProvider isPlaybackEnabled={isPlaybackEnabled}>
      <Consumer />
    </PEventProvider>
  ))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured synchronously.')
  }

  return {events, result}
}

it('should wait for explicit focus room entry before playing the greeting once', async () => {
  const dialogue = createDialogue('entry')
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
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
    new DOMException('Autoplay blocked', 'NotAllowedError'),
  )

  const {events, result} = await renderContext({enter: false})

  expect(events.hasEnteredFocusRoom()).toBe(false)
  expect(repository.getDialogue).not.toHaveBeenCalled()
  events.enterFocusRoom()
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith(dialogue.id))
  events.enterFocusRoom()
  expect(repository.getDialogue).toHaveBeenCalledOnce()
  expect(events.hasEnteredFocusRoom()).toBe(true)
  result.unmount()
})

it('should cancel playback on the editor route and not replay entry after returning', async () => {
  const [isPlaybackEnabled, setIsPlaybackEnabled] = createSignal(true)
  const dialogue = createDialogue('entry')
  const audio = document.createElement('audio')
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
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements([audio])
  stubAnimationFrame()
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const pauseAudio = vi.spyOn(HTMLMediaElement.prototype, 'pause')

  const {events, result} = await renderContext({isPlaybackEnabled})
  await waitFor(() => expect(playAudio).toHaveBeenCalledOnce())
  pauseAudio.mockClear()

  setIsPlaybackEnabled(false)
  await waitFor(() => expect(events.scheduledDialogueCount()).toBe(0))
  expect(pauseAudio).toHaveBeenCalledOnce()
  const onBeforePlayback = vi.fn()
  await events.playDialogue(dialogue.id)
  await events.playDialogueEvents(['room-enter'], onBeforePlayback)
  await events.playDialogueSequence({
    dialogueIds: [dialogue.id],
    onDialogueStart: vi.fn(),
    onSequenceStop: vi.fn(),
  })
  expect(repository.getDialogue).toHaveBeenCalledOnce()
  expect(onBeforePlayback).not.toHaveBeenCalled()

  setIsPlaybackEnabled(true)
  await Promise.resolve()
  expect(playAudio).toHaveBeenCalledOnce()
  expect(events.hasEnteredFocusRoom()).toBe(true)
  result.unmount()
})

it('should release entry audio after an unexpected playback failure', async () => {
  const dialogue = createDialogue('entry')
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
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('decoder failed'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const {events, result} = await renderContext()
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:focus-room-dialogue'))

  expect(events.activeText()).toBeNull()
  expect(events.activeSegmentCount()).toBe(0)
  expect(events.activeSegmentPosition()).toBeNull()
  expect(events.isDialoguePlaybackBlocked()).toBe(false)
  expect(events.isDialoguePlaying()).toBe(false)
  result.unmount()
  expect(repository.dispose).toHaveBeenCalledOnce()
})

it('should play every entry event dialogue continuously', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues, [
    {
      dialogueIds: ['first', 'second'],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()

  const {events, result} = await renderContext()
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  expect(events.isDialoguePlaying()).toBe(true)
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  expect(events.isDialoguePlaying()).toBe(true)
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2))
  expect(events.isDialoguePlaying()).toBe(false)

  expect(repository.getDialogue.mock.calls).toEqual([['first'], ['second']])
  result.unmount()
})

it('should suspend audio processing between queued dialogues before resuming', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues)
  const audioElements = dialogues.map(() => document.createElement('audio'))
  let resolveSuspension: () => void = () => undefined
  const firstSuspension = new Promise<void>((resolve) => {
    resolveSuspension = resolve
  })
  const suspend = vi
    .fn<() => Promise<void>>()
    .mockReturnValueOnce(firstSuspension)
    .mockResolvedValue(undefined)
  const resume = vi.fn(async () => undefined)

  class AudioContextMock {
    readonly destination = {}
    state: AudioContextState = 'running'

    close = vi.fn(async () => {
      this.state = 'closed'
    })

    createMediaElementSource = vi.fn(
      () =>
        ({
          connect: vi.fn(),
          disconnect: vi.fn(),
        }) as unknown as MediaElementAudioSourceNode,
    )

    resume = resume
    suspend = suspend
  }

  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  vi.stubGlobal('AudioContext', AudioContextMock)
  vi.stubGlobal('AudioWorkletNode', undefined)
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()
  const playback = events.playDialogueSequence({
    dialogueIds: dialogues.map((dialogue) => dialogue.id),
    onDialogueStart: vi.fn(),
    onSequenceStop: vi.fn(),
  })

  await waitFor(() => expect(playAudio).toHaveBeenCalledOnce())
  expect(resume).toHaveBeenCalledOnce()
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(suspend).toHaveBeenCalledOnce())
  expect(playAudio).toHaveBeenCalledOnce()

  resolveSuspension()
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  expect(resume).toHaveBeenCalledTimes(2)

  audioElements[1]?.dispatchEvent(new Event('ended'))
  await playback
  expect(suspend).toHaveBeenCalledTimes(2)
  result.unmount()
})

it('should hold a speaking mouth between dialogues and rest 300ms after the final audio', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues, [
    {
      dialogueIds: ['first', 'second'],
      event: 'room-enter',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  const audioElements = dialogues.map(() => document.createElement('audio'))
  const audioBlob = {
    arrayBuffer: vi.fn(async () => new ArrayBuffer(0)),
  } as unknown as Blob
  let resolveSecondAudio: ((audio: Blob) => void) | undefined
  const secondAudio = new Promise<Blob>((resolve) => {
    resolveSecondAudio = resolve
  })
  repository.getAudio.mockResolvedValueOnce(audioBlob).mockImplementationOnce(() => secondAudio)
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  stubAnimationFrame()
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()

  const {events, result} = await renderContext()
  await waitFor(() => expect(events.activeViseme()).not.toBe('rest'))
  vi.useFakeTimers()

  audioElements[0]?.dispatchEvent(new Event('ended'))
  await vi.advanceTimersByTimeAsync(300)
  expect(events.activeViseme()).not.toBe('rest')
  expect(playAudio).toHaveBeenCalledTimes(1)

  resolveSecondAudio?.(audioBlob)
  await vi.advanceTimersByTimeAsync(0)
  expect(playAudio).toHaveBeenCalledTimes(2)

  audioElements[1]?.dispatchEvent(new Event('ended'))
  await vi.advanceTimersByTimeAsync(299)
  expect(events.activeViseme()).not.toBe('rest')
  await vi.advanceTimersByTimeAsync(1)
  expect(events.activeViseme()).toBe('rest')
  result.unmount()
})

it('should expose the active segment position while audio advances', async () => {
  const baseDialogue = createDialogue('entry', ['첫 대사', '두 번째 대사'])
  const dialogue = {
    ...baseDialogue,
    segments: baseDialogue.segments.map((segment, index) => ({
      ...segment,
      mood: createMood(index === 0 ? 'cheerful' : 'sad'),
    })),
  } satisfies PDialogue
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
  const audio = document.createElement('audio')
  let frameCallback: FrameRequestCallback | undefined
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements([audio])
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()

  const {events, result} = await renderContext()
  await waitFor(() => expect(events.activeText()).toBe('첫 대사'))
  expect(events.activeSegmentCount()).toBe(2)
  expect(events.activeSegmentMood()?.primary.id).toBe('cheerful')
  expect(events.activeSegmentPosition()).toBe(0)

  audio.currentTime = 1
  frameCallback?.(0)
  expect(events.activeText()).toBe('두 번째 대사')
  expect(events.activeSegmentMood()?.primary.id).toBe('sad')
  expect(events.activeSegmentPosition()).toBe(1)
  result.unmount()
})

it('should append feed playback behind active event dialogues', async () => {
  const dialogues = [
    createDialogue('event-first'),
    createDialogue('event-second'),
    createDialogue('feed'),
  ]
  const repository = createRepository(dialogues, [
    {
      dialogueIds: ['event-first', 'event-second'],
      event: 'focus-end',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  const audioElements = dialogues.map(() => document.createElement('audio'))
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()

  const eventPlayback = events.playDialogueEvents(['focus-end'])
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event-first'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  const feedPlayback = events.playDialogue('feed')
  expect(repository.getDialogue).not.toHaveBeenCalledWith('feed')
  await waitFor(() => expect(events.isDialogueScheduled('feed')).toBe(true))

  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event-second'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('feed'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(3))
  audioElements[2]?.dispatchEvent(new Event('ended'))
  await Promise.all([eventPlayback, feedPlayback])

  expect(repository.getDialogue.mock.calls).toEqual([['event-first'], ['event-second'], ['feed']])
  result.unmount()
})

it('should skip a deleted queued dialogue without clearing the remaining queue', async () => {
  const dialogues = [
    createDialogue('active'),
    createDialogue('deleted'),
    createDialogue('remaining'),
  ]
  const storedDialogues = new Map(dialogues.map((dialogue) => [dialogue.id, dialogue]))
  const repository = {
    ...createRepository(dialogues),
    deleteDialogue: vi.fn(async (dialogueId: string) => {
      storedDialogues.delete(dialogueId)
    }),
    getDialogue: vi.fn(async (dialogueId: string) => storedDialogues.get(dialogueId) ?? null),
  }
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()

  const activePlayback = events.playDialogue('active')
  await waitFor(() => expect(playAudio).toHaveBeenCalledOnce())
  const deletedPlayback = events.playDialogue('deleted')
  const remainingPlayback = events.playDialogue('remaining')
  await waitFor(() => expect(events.scheduledDialogueCount()).toBe(3))

  await events.deleteDialogue('deleted')
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('remaining'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await Promise.all([activePlayback, deletedPlayback, remainingPlayback])

  expect(repository.getDialogue.mock.calls).toEqual([['active'], ['deleted'], ['remaining']])
  expect(events.scheduledDialogueCount()).toBe(0)
  result.unmount()
})

it('should reduce the connected count and skip only the active dialogue', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second'), createDialogue('third')]
  const repository = createRepository(dialogues)
  const audioElements = dialogues.map(() => document.createElement('audio'))
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()
  const playback = events.playDialogueSequence({
    dialogueIds: dialogues.map((dialogue) => dialogue.id),
    onDialogueStart: vi.fn(),
    onSequenceStop: vi.fn(),
  })

  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  expect(events.scheduledDialogueCount()).toBe(3)
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  expect(events.scheduledDialogueCount()).toBe(2)

  events.skipDialoguePlayback()
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(3))
  expect(events.scheduledDialogueCount()).toBe(1)
  audioElements[2]?.dispatchEvent(new Event('ended'))
  await playback

  expect(events.scheduledDialogueCount()).toBe(0)
  result.unmount()
})

it('should release a dialogue queue after a media playback error', async () => {
  const dialogue = createDialogue('broken')
  const repository = createRepository([dialogue])
  const audio = document.createElement('audio')
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements([audio])
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()
  const playback = events.playDialogue('broken')

  await waitFor(() => expect(events.activeDialogueId()).toBe('broken'))
  audio.dispatchEvent(new Event('error'))
  await playback

  expect(events.activeDialogueId()).toBeNull()
  expect(events.scheduledDialogueCount()).toBe(0)
  result.unmount()
})

it('should queue every dialogue from simultaneous pomodoro events', async () => {
  const dialogues = [createDialogue('focus-end'), createDialogue('break-start')]
  const repository = createRepository(dialogues, [
    {
      dialogueIds: ['focus-end'],
      event: 'focus-end',
      playbackMode: 'sequential-all',
      version: 3,
    },
    {
      dialogueIds: ['break-start'],
      event: 'break-start',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  const audioElements = dialogues.map(() => document.createElement('audio'))
  repositoryMocks.create.mockReturnValue(repository)
  stubAudioElements(audioElements)
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()
  const onBeforePlayback = vi.fn()

  const playback = events.playDialogueEvents(['focus-end', 'break-start'], onBeforePlayback)
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('focus-end'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  expect(onBeforePlayback).toHaveBeenCalledOnce()
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('break-start'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await playback

  expect(repository.getDialogue.mock.calls).toEqual([['focus-end'], ['break-start']])
  result.unmount()
})

it('should notify the entire queued feed batch when the user stops playback', async () => {
  const dialogues = [
    createDialogue('event'),
    createDialogue('feed-first'),
    createDialogue('feed-second'),
  ]
  const repository = createRepository(dialogues)
  const audio = document.createElement('audio')
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      return audio
    }),
  )
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()

  const eventPlayback = events.playDialogue('event')
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event'))
  const onSequenceStop = vi.fn(async () => undefined)
  const feedIds = ['feed-first', 'feed-second']
  const feedPlayback = events.playDialogueSequence({
    dialogueIds: feedIds,
    onDialogueStart: vi.fn(),
    onSequenceStop,
  })
  events.onStopDialoguePlayback()
  await Promise.all([eventPlayback, feedPlayback])

  expect(repository.getDialogue).not.toHaveBeenCalledWith('feed-first')
  expect(onSequenceStop).toHaveBeenCalledWith(feedIds)
  result.unmount()
})

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
