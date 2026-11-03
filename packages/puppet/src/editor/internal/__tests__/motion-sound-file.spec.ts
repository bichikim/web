/** @vitest-environment node */
import {expect, test} from 'vitest'
import {encodeWav} from '../../../player/audio/__tests__/support/encode-wav'
import {getEmbeddedSoundDuration, readMotionSoundFile} from '../motion-sound-file'

test('should embed a WAV across Base64 chunks without changing its bytes or duration', async () => {
  const bytes = encodeWav({channels: [new Float32Array(16_000)], sampleRate: 8000})
  const result = await readMotionSoundFile(new Blob([bytes.slice().buffer]))
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.message)
  }
  expect(Buffer.from(result.src.split(',')[1]!, 'base64')).toEqual(Buffer.from(bytes))
  expect(result.duration).toBe(2)
  expect(getEmbeddedSoundDuration(result.src)).toBe(2)
})

test('should retain WAV format rejection for unsupported input', async () => {
  expect(await readMotionSoundFile(new Blob(['invalid']))).toEqual({
    message: 'WAV 파일이 아닙니다.',
    ok: false,
  })
  expect(getEmbeddedSoundDuration('sound.wav')).toBeUndefined()
})
