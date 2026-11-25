import type {NativePlayerSurface} from '@winter-love/puppet/native'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const WORD_BYTES = 4
const REPLY_FIELDS = 5
const PART_LENGTH_FIELD = 3
const LAYER_LENGTH_FIELD = 4
const NUMERIC_ALIGNMENT = 8

export const encodePacket = (
  header: object,
  attachments: readonly ArrayBufferView[],
): ArrayBuffer => {
  const metadata = encoder.encode(JSON.stringify(header))
  const size = attachments.reduce(
    (total, item) => total + item.byteLength,
    metadata.length + WORD_BYTES,
  )
  const bytes = new Uint8Array(size)
  new DataView(bytes.buffer).setUint32(0, metadata.length, true)
  bytes.set(metadata, WORD_BYTES)
  let position = metadata.length + WORD_BYTES
  for (const item of attachments) {
    bytes.set(new Uint8Array(item.buffer, item.byteOffset, item.byteLength), position)
    position += item.byteLength
  }
  return bytes.buffer
}

type PlaybackMessage = Parameters<NativePlayerSurface['playback']>[0]
type PlaybackResponse = Awaited<ReturnType<NativePlayerSurface['playback']>>

interface DecodePlaybackOptions {
  readonly applyCoordinates?: (delta: Uint32Array, destination: ArrayBuffer) => void
  readonly bytes: ArrayBuffer
  readonly id: string
  readonly message: PlaybackMessage
  readonly decode: (text: string) => PlaybackResponse
}

export const decodePlayback = ({
  applyCoordinates,
  bytes,
  decode,
  id,
  message,
}: DecodePlaybackOptions): PlaybackResponse => {
  const header = new DataView(bytes)
  const length = header.getUint32(0, true)
  const frameId = header.getUint32(WORD_BYTES, true)
  const vertexLength = header.getUint32(2 * WORD_BYTES, true)
  const partLength = header.getUint32(PART_LENGTH_FIELD * WORD_BYTES, true)
  const layerLength = header.getUint32(LAYER_LENGTH_FIELD * WORD_BYTES, true)
  const textOffset = REPLY_FIELDS * WORD_BYTES
  const numeric = Math.ceil((textOffset + length) / NUMERIC_ALIGNMENT) * NUMERIC_ALIGNMENT
  const reply = decode(decoder.decode(new Uint8Array(bytes, textOffset, length)))
  if (reply.kind === 'error') {
    throw new Error(reply.message)
  }
  if (reply.kind !== 'produced' || message.kind !== 'produce') {
    return reply
  }
  if (reply.frame.kind === 'stale') {
    return {...reply, frame: {...reply.frame, buffer: message.request.buffer}}
  }
  const vertexEnd = numeric + vertexLength * WORD_BYTES
  const partEnd = vertexEnd + partLength * NUMERIC_ALIGNMENT
  const vertices = new Float32Array(message.request.buffer)
  if (applyCoordinates === undefined) {
    vertices.set(new Float32Array(bytes, numeric, vertexLength))
  } else {
    applyCoordinates(new Uint32Array(bytes, numeric, vertexLength), message.request.buffer)
  }
  const {computed} = reply.frame
  return {
    ...reply,
    frame: {
      ...reply.frame,
      computed: {
        ...computed,
        frame: {
          ...computed.frame,
          layers: new Float64Array(bytes, partEnd, layerLength),
          parts: new Float64Array(bytes, vertexEnd, partLength),
        },
        ...(frameId === 0 ? {} : {geometry: {connection: 0, frame: frameId, owner: id}}),
        vertices,
      },
    },
  }
}
