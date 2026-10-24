// oxlint-disable no-magic-numbers -- PCM WAV assertions use fixed specification offsets and ranges.
import {describe, expect, it} from 'vitest'

import {createWaveBlob} from '../wav'

const readText = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from({length}, (_, index) => view.getUint8(offset + index)))

const readBlob = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(reader.error))
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Blob을 ArrayBuffer로 읽지 못했습니다.'))
      }
    })
    reader.readAsArrayBuffer(blob)
  })

describe('createWaveBlob', () => {
  it('should encode mono Float32 samples as a valid 16-bit PCM WAV blob', async () => {
    const blob = createWaveBlob(Float32Array.of(-2, -1, 0, 1, 2), 24_000)
    const view = new DataView(await readBlob(blob))

    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(54)
    expect(readText(view, 0, 4)).toBe('RIFF')
    expect(readText(view, 8, 4)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(24_000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(readText(view, 36, 4)).toBe('data')
    expect(view.getInt16(44, true)).toBe(-32_768)
    expect(view.getInt16(46, true)).toBe(-32_768)
    expect(view.getInt16(48, true)).toBe(0)
    expect(view.getInt16(50, true)).toBe(32_767)
    expect(view.getInt16(52, true)).toBe(32_767)
  })
})
