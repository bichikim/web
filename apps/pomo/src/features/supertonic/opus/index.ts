// oxlint-disable no-magic-numbers -- Opus 설정과 출력 위치 단위는 인코딩 규약에 고정된 값이다.
import type {SampleRate} from 'libopus-wasm'
import {createOpusContainer, type OpusPacket} from './create-opus-container'

const OPUS_OUTPUT_SAMPLE_RATE = 48_000
const OPUS_BITRATE = 32_000
const OPUS_SAMPLE_RATES = [8000, 12_000, 16_000, 24_000, 48_000] as const

const isOpusSampleRate = (sampleRate: number): sampleRate is SampleRate =>
  OPUS_SAMPLE_RATES.some((supportedRate) => supportedRate === sampleRate)

/** 모노 PCM 음성을 브라우저에서 재생할 수 있는 Ogg Opus 파일로 인코딩한다. */
export const encodeOpusBlob = async (samples: Float32Array, sampleRate: number): Promise<Blob> => {
  if (samples.length === 0) {
    throw new RangeError('Cannot encode empty audio.')
  }

  if (!isOpusSampleRate(sampleRate)) {
    throw new RangeError(`Unsupported Opus sample rate: ${sampleRate}`)
  }

  const {Application, createEncoder, Signal} = await import('libopus-wasm')
  const encoder = await createEncoder({
    application: Application.Voip,
    bitrate: OPUS_BITRATE,
    channels: 1,
    complexity: 10,
    sampleRate,
    signal: Signal.Voice,
    vbr: true,
  })

  try {
    const granuleScale = OPUS_OUTPUT_SAMPLE_RATE / sampleRate
    const preSkip = Math.round(encoder.getLookahead() * granuleScale)
    const packetCount = Math.ceil((samples.length + encoder.getLookahead()) / encoder.frameSize)
    const packetDuration = encoder.frameSize * granuleScale
    const finalGranulePosition = preSkip + Math.round(samples.length * granuleScale)
    const packets: Array<OpusPacket> = []

    for (let packetIndex = 0; packetIndex < packetCount; packetIndex += 1) {
      const frameStart = packetIndex * encoder.frameSize
      const frame = new Float32Array(encoder.frameSize)

      if (frameStart < samples.length) {
        frame.set(samples.subarray(frameStart, frameStart + encoder.frameSize))
      }

      packets.push({
        data: encoder.encodeFloat(frame),
        granulePosition:
          packetIndex === packetCount - 1
            ? finalGranulePosition
            : (packetIndex + 1) * packetDuration,
      })
    }

    const streamSerial = Math.floor(Math.random() * 0x1_0000_0000)
    return createOpusContainer({packets, preSkip, sampleRate, streamSerial})
  } finally {
    encoder.free()
  }
}

export {createOpusContainer} from './create-opus-container'
export type {CreateOpusContainerOptions, OpusPacket} from './create-opus-container'
