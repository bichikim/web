/** @vitest-environment jsdom */
import {createRoot, createSignal, onCleanup} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {useModelAssetManager} from '../features/model-download'
import {createSupertonicClient} from '../features/supertonic/client'
import {
  createDialogueAudioPreview,
  generateDialogueAudio,
} from '../features/focus-room-dialogue/dialogue-audio-runtime'
import {type TarotSpeechController, useTarotSpeech} from '../features/tarot/use-tarot-speech'

vi.mock('../features/model-download', () => ({useModelAssetManager: vi.fn()}))
vi.mock('../features/supertonic/client', () => ({createSupertonicClient: vi.fn()}))
vi.mock('../features/focus-room-dialogue/dialogue-audio-runtime', () => ({
  createDialogueAudioPreview: vi.fn(),
  generateDialogueAudio: vi.fn(),
}))

const generated = {audioChunks: [], durationMs: 1000, sampleRate: 24000, segments: [], speed: 1.05}

describe('tarot speech locale without document reload', () => {
  const originalGetLocale = getLocale
  let dispose: () => void
  let speech: TarotSpeechController
  let setText: (text: string) => void

  beforeEach(() => {
    vi.clearAllMocks()
    overwriteGetLocale(() => 'ko')
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:tarot-voice')
        static override revokeObjectURL = vi.fn()
      },
    )
    vi.mocked(useModelAssetManager).mockReturnValue({
      runAfterModel: vi.fn(),
      runAfterVoiceModel: async (options) => ({
        status: 'complete',
        value: await options.task(),
      }),
    })
    vi.mocked(createSupertonicClient).mockReturnValue({
      cancelGeneration: vi.fn(),
      dispose: vi.fn(),
      generate: vi.fn(),
      generateStream: vi.fn(),
      initialize: vi.fn().mockResolvedValue({ok: true, value: undefined}),
    })
    vi.mocked(generateDialogueAudio).mockResolvedValue({ok: true, value: generated})
    vi.mocked(createDialogueAudioPreview).mockResolvedValue(new Blob(['voice']))
    createRoot((cleanup) => {
      dispose = cleanup
      const [text, updateText] = createSignal('')
      setText = updateText
      speech = useTarotSpeech({locale: getLocale, text})
      onCleanup(() => overwriteGetLocale(originalGetLocale))
    })
  })

  afterEach(() => {
    dispose()
    overwriteGetLocale(originalGetLocale)
    vi.unstubAllGlobals()
  })

  it('should regenerate prepared audio when the runtime locale changes without reload', async () => {
    setText('완성된 카드 해석')
    await vi.waitFor(() => expect(speech.audioUrl()).toBe('blob:tarot-voice'))
    expect(generateDialogueAudio).toHaveBeenCalledWith(
      expect.objectContaining({language: 'ko', text: '완성된 카드 해석'}),
    )

    overwriteGetLocale(() => 'en')
    expect(getLocale()).toBe('en')
    await Promise.resolve()
    await Promise.resolve()

    expect(generateDialogueAudio).toHaveBeenCalledTimes(2)
    expect(generateDialogueAudio).toHaveBeenLastCalledWith(
      expect.objectContaining({language: 'en', text: '완성된 카드 해석'}),
    )
  })
})
