/** @vitest-environment jsdom */
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useModelAssetManager} from '../../../features/model-download'
import {createSupertonicClient} from '../../../features/supertonic/client'
import {
  createDialogueAudioPreview,
  generateDialogueAudio,
} from '../../../features/focus-room-dialogue/dialogue-audio-runtime'
import {useTarotSpeech} from '../../../features/tarot/use-tarot-speech'
import {SpeechControls} from '../SpeechControls'

vi.mock('../../../features/model-download', () => ({useModelAssetManager: vi.fn()}))
vi.mock('../../../features/supertonic/client', () => ({createSupertonicClient: vi.fn()}))
vi.mock('../../../features/focus-room-dialogue/dialogue-audio-runtime', () => ({
  createDialogueAudioPreview: vi.fn(),
  generateDialogueAudio: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should reuse prepared audio without repeating automatic playback after the view closes and reopens', async () => {
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:retained-reading')
      static override revokeObjectURL = vi.fn()
    },
  )
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.mocked(useModelAssetManager).mockReturnValue({
    runAfterModel: vi.fn(),
    runAfterVoiceModel: async (options) => ({status: 'complete', value: await options.task()}),
  })
  vi.mocked(createSupertonicClient).mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize: vi.fn().mockResolvedValue({ok: true, value: undefined}),
  })
  vi.mocked(generateDialogueAudio).mockResolvedValue({
    ok: true,
    value: {
      audioChunks: [],
      durationMs: 1000,
      sampleRate: 24000,
      segments: [],
      speed: 1.05,
    },
  })
  vi.mocked(createDialogueAudioPreview).mockResolvedValue(new Blob(['voice']))
  const [open, setOpen] = createSignal(true)
  const [text, setText] = createSignal('')
  const view = render(() => {
    const speech = useTarotSpeech({locale: () => 'ko', text})
    speech.setAutoRead(true)
    return (
      <Show when={open()}>
        <SpeechControls speech={speech} />
      </Show>
    )
  })
  setText('완성된 카드 해석')
  await waitFor(() => expect(play).toHaveBeenCalledOnce())
  const source = view.container.querySelector('audio')!.src
  setOpen(false)
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  setOpen(true)
  expect(view.container.querySelector('audio')!.src).toBe(source)
  expect(generateDialogueAudio).toHaveBeenCalledOnce()
  expect(play).toHaveBeenCalledOnce()
  cleanup()
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:retained-reading')
})
