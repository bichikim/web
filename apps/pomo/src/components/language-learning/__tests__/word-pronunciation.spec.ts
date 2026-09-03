/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {generateCompressedDialogueAudio} from '../../../features/focus-room-dialogue'
import {createSupertonicClient, getSupertonicErrorMessage} from '../../../features/supertonic'
import {generateLanguageLearningWordPronunciation} from '../word-pronunciation'

vi.mock('../../../features/focus-room-dialogue', () => ({
  generateCompressedDialogueAudio: vi.fn(),
}))
vi.mock('../../../features/supertonic', () => ({
  createSupertonicClient: vi.fn(),
  getSupertonicErrorMessage: vi.fn(),
}))

const dispose = vi.fn()
const initialize = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createSupertonicClient).mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose,
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize,
  })
  initialize.mockResolvedValue({ok: true, value: undefined})
  vi.mocked(generateCompressedDialogueAudio).mockResolvedValue({
    ok: true,
    value: {audio: new Blob(['audio']), durationMs: 500, segments: []},
  })
  vi.mocked(getSupertonicErrorMessage).mockReturnValue('initialization failed')
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should initialize the selected model and create one word pronunciation', async () => {
  await expect(
    generateLanguageLearningWordPronunciation({
      language: 'en',
      modelId: 'full',
      text: 'Home',
      voiceId: 'Yuna',
    }),
  ).resolves.toMatchObject({audio: expect.any(Blob), status: 'complete'})
  expect(initialize).toHaveBeenCalledWith({
    modelId: 'full',
    onProgress: expect.any(Function),
    onStatus: expect.any(Function),
  })
  expect(generateCompressedDialogueAudio).toHaveBeenCalledWith(
    expect.objectContaining({language: 'en', modelId: 'full', text: 'Home', voiceId: 'Yuna'}),
  )
  expect(dispose).toHaveBeenCalledOnce()
})

it('should report initialization, generation, and unexpected failures', async () => {
  initialize.mockResolvedValueOnce({
    error: {code: 'cancelled', phase: 'initialize', retryable: false},
    ok: false,
  })
  await expect(
    generateLanguageLearningWordPronunciation({
      language: 'en',
      modelId: 'full',
      text: 'Home',
      voiceId: 'Yuna',
    }),
  ).resolves.toEqual({message: 'initialization failed', status: 'error'})

  vi.mocked(generateCompressedDialogueAudio).mockResolvedValueOnce({
    message: 'generation failed',
    ok: false,
  })
  await expect(
    generateLanguageLearningWordPronunciation({
      language: 'en',
      modelId: 'full',
      text: 'Home',
      voiceId: 'Yuna',
    }),
  ).resolves.toEqual({message: 'generation failed', status: 'error'})

  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(generateCompressedDialogueAudio).mockRejectedValueOnce(new Error('audio crashed'))
  await expect(
    generateLanguageLearningWordPronunciation({
      language: 'en',
      modelId: 'full',
      text: 'Home',
      voiceId: 'Yuna',
    }),
  ).resolves.toEqual({message: '단어 발음을 만들지 못했어요.', status: 'error'})
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to generate language learning word pronunciation.',
    expect.any(Error),
  )
})
