import {Buffer} from 'node:buffer'
import {createStereoWave} from '../audio'

const SAMPLE_RATE = 44100
const BYTES_PER_FRAME = 4
const RIFF_SIZE_OFFSET = 4
const RIFF_PAYLOAD_HEADER_BYTES = 36
const DATA_SIZE_OFFSET = 40

export async function createWave(seconds: number, sample = 0): Promise<Blob> {
  const header = await createStereoWave(new Int32Array(0), 0).arrayBuffer()
  const bytes = seconds * SAMPLE_RATE * BYTES_PER_FRAME
  const view = new DataView(header)
  view.setUint32(RIFF_SIZE_OFFSET, bytes + RIFF_PAYLOAD_HEADER_BYTES, true)
  view.setUint32(DATA_SIZE_OFFSET, bytes, true)
  const pattern = Buffer.alloc(2)
  pattern.writeInt16LE(sample)
  const pcm = Buffer.alloc(bytes, pattern)
  return new Blob([header, pcm], {type: 'audio/wav'})
}
