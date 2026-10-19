import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {encodeMonoPcm16Wav} from 'src/utils/encode-mono-pcm16-wav'
import {CrossfadeAudio} from '../CrossfadeAudio'

const urls: string[] = []
const SAMPLE_RATE = 8000
const DURATION = 30
const INITIAL_POSITION = 13

afterEach(() => {
  cleanup()
  urls.splice(0).forEach((url) => URL.revokeObjectURL(url))
})

it('should retain the handed-off slider position after native metadata supplies its range', async () => {
  const wave = encodeMonoPcm16Wav(new Float32Array(SAMPLE_RATE * DURATION), SAMPLE_RATE)
  const url = URL.createObjectURL(new Blob([wave], {type: 'audio/wav'}))
  urls.push(url)
  render(() =>
    createComponent(CrossfadeAudio, {
      connectionSeconds: 4,
      initialPosition: INITIAL_POSITION,
      url,
    }),
  )

  const slider = screen.getByRole<HTMLInputElement>('slider', {
    name: '크로스페이드 오디오 위치',
  })
  await expect.poll(() => slider.max).toBe(String(DURATION))
  expect(slider.value).toBe(String(INITIAL_POSITION))
  expect(screen.getByText(/13\.0 \/ 30\.0초/u)).toBeVisible()
})
