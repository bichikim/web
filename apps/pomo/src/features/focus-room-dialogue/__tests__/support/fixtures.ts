import {vi} from 'vitest'

import type {DialogueEventBinding, DialogueSegmentMood, PDialogue} from '../../schema'

const MILLISECONDS_PER_SECOND = 1000

export const createDialogue = (id: string, segments = [`대사 ${id}`]): PDialogue => ({
  audioKey: `audio-${id}`,
  createdAt: '2026-08-13T00:00:00.000Z',
  durationMs: segments.length * MILLISECONDS_PER_SECOND,
  id,
  language: 'ko',
  modelId: 'full',
  segments: segments.map((text, index) => ({
    durationMs: 700,
    index,
    startMs: index * MILLISECONDS_PER_SECOND,
    text,
  })),
  text: segments.join('\n'),
  updatedAt: '2026-08-13T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

export const createMood = (id: DialogueSegmentMood['primary']['id']): DialogueSegmentMood => ({
  margin: 0.8,
  modifiers: [],
  primary: {id, probability: 0.9},
  scores: [{id, probability: 0.9}],
  secondary: null,
  uncertain: false,
})

export const createRepository = (
  dialogues: ReadonlyArray<PDialogue>,
  bindings: ReadonlyArray<DialogueEventBinding> = [],
) => ({
  deleteDialogue: vi.fn(async () => undefined),
  dispose: vi.fn(),
  getAudio: vi.fn(async () => new Blob(['audio'])),
  getDialogue: vi.fn(
    async (dialogueId: string) => dialogues.find((dialogue) => dialogue.id === dialogueId) ?? null,
  ),
  listDialogues: vi.fn(async () => dialogues),
  listEventBindings: vi.fn(async () => bindings),
  saveDialogue: vi.fn(),
  setEntryBinding: vi.fn(),
  setEventBinding: vi.fn(),
})

export const stubAudioElements = (audioElements: ReadonlyArray<HTMLAudioElement>) => {
  let audioIndex = 0

  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audio = audioElements[audioIndex]
      audioIndex += 1
      return audio
    }),
  )
}

export const stubAnimationFrame = () => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}
