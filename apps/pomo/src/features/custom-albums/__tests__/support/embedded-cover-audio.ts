interface EmbeddedPicture {
  readonly data: Uint8Array
  readonly format: string
  readonly type: number
}
const ID3_HEADER_BYTES = 10
const ID3_SIZE_OFFSET = 6
const ID3_MAJOR_VERSION = 3
const FRAME_SIZE_OFFSET = 4
const SYNCHSAFE_BASE = 128
const ID3_SIGNATURE = new TextEncoder().encode('ID3')

const concatenate = (parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.byteLength, 0))
  parts.reduce((offset, part) => {
    result.set(part, offset)
    return offset + part.byteLength
  }, 0)
  return result
}
// Write actual ID3v2.3 APIC frames, preserving the fixture's encoded MPEG audio.
export const createAudioWithPictures = (
  audio: Uint8Array,
  pictures: readonly EmbeddedPicture[],
): File => {
  const frames = pictures.map((picture) => {
    const payload = concatenate([
      new Uint8Array([0]),
      new TextEncoder().encode(picture.format),
      new Uint8Array([0, picture.type, 0]),
      picture.data,
    ])
    const header = new Uint8Array(ID3_HEADER_BYTES)
    header.set(new TextEncoder().encode('APIC'))
    new DataView(header.buffer).setUint32(FRAME_SIZE_OFFSET, payload.byteLength)
    return concatenate([header, payload])
  })
  const body = concatenate(frames)
  const header = new Uint8Array(ID3_HEADER_BYTES)
  header.set([...ID3_SIGNATURE, ID3_MAJOR_VERSION])
  let size = body.byteLength
  for (let index = ID3_HEADER_BYTES - 1; index >= ID3_SIZE_OFFSET; index -= 1) {
    header[index] = size % SYNCHSAFE_BASE
    size = Math.floor(size / SYNCHSAFE_BASE)
  }
  const hasTag = ID3_SIGNATURE.every((byte, index) => audio[index] === byte)
  const previousTagSize = hasTag
    ? [...audio.subarray(ID3_SIZE_OFFSET, ID3_HEADER_BYTES)].reduce(
        (value, byte) => value * SYNCHSAFE_BASE + byte,
        0,
      )
    : 0
  const audioOffset = hasTag ? ID3_HEADER_BYTES + previousTagSize : 0
  return new File([concatenate([header, body, audio.subarray(audioOffset)])], 'covers.mp3', {
    type: 'audio/mpeg',
  })
}
