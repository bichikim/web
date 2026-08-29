import {expect, it, vi} from 'vitest'

const audioMocks = vi.hoisted(() => ({
  createPreview: vi.fn(),
  createSamples: vi.fn(),
  generate: vi.fn(),
  generateCompressed: vi.fn(),
  regenerate: vi.fn(),
}))

vi.mock('../generate-dialogue-audio', () => ({
  createDialogueAudioPreview: audioMocks.createPreview,
  createDialogueAudioSamples: audioMocks.createSamples,
  generateCompressedDialogueAudio: audioMocks.generateCompressed,
  generateDialogueAudio: audioMocks.generate,
  regenerateDialogueSegmentAudio: audioMocks.regenerate,
}))

import {
  createDialogueAudioPreview,
  createDialogueAudioSamples,
  generateCompressedDialogueAudio,
  generateDialogueAudio,
  regenerateDialogueSegmentAudio,
} from '../dialogue-audio-runtime'

it('should load the dialogue audio implementation and forward every operation', async () => {
  const audio = {audioChunks: [], sampleRate: 48_000}
  const options = {text: '안녕'}
  audioMocks.createPreview.mockReturnValue('preview')
  audioMocks.createSamples.mockReturnValue('samples')
  audioMocks.generateCompressed.mockResolvedValue('compressed')
  audioMocks.generate.mockResolvedValue('generated')
  audioMocks.regenerate.mockResolvedValue('regenerated')

  await expect(createDialogueAudioPreview(audio as never, 'full')).resolves.toBe('preview')
  await expect(createDialogueAudioSamples(audio as never, 'full')).resolves.toBe('samples')
  await expect(generateCompressedDialogueAudio(options as never)).resolves.toBe('compressed')
  await expect(generateDialogueAudio(options as never)).resolves.toBe('generated')
  await expect(regenerateDialogueSegmentAudio(options as never)).resolves.toBe('regenerated')

  expect(audioMocks.createPreview).toHaveBeenCalledWith(audio, 'full')
  expect(audioMocks.createSamples).toHaveBeenCalledWith(audio, 'full')
  expect(audioMocks.generateCompressed).toHaveBeenCalledWith(options)
  expect(audioMocks.generate).toHaveBeenCalledWith(options)
  expect(audioMocks.regenerate).toHaveBeenCalledWith(options)
})
