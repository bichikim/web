export interface DecodedDataUrl {
  /** 호출자가 소유하는 새 바이트 배열. */
  readonly bytes: Uint8Array<ArrayBuffer>
  /** 쉼표까지 포함한 원본 data URL 헤더. */
  readonly prefix: string
}

const fromBase64 = (source: string): Uint8Array<ArrayBuffer> => {
  const native: unknown = Reflect.get(Uint8Array, 'fromBase64')
  if (typeof native === 'function') {
    const result: unknown = Reflect.apply(native, Uint8Array, [source])
    if (!(result instanceof Uint8Array) || !(result.buffer instanceof ArrayBuffer)) {
      throw new TypeError('Invalid native Base64 output')
    }
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
  }
  const binary = atob(source)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/** Base64 data URL을 읽는다. 생략된 패딩도 허용하며, 지원하지 않거나 잘못된 입력은 undefined다. */
export const decodeDataUrl = (source: string): DecodedDataUrl | undefined => {
  const comma = source.indexOf(',')
  const prefix = source.slice(0, comma + 1)
  if (!/^data:[^,]*;base64,$/iu.test(prefix)) {
    return undefined
  }
  try {
    return {bytes: fromBase64(source.slice(comma + 1)), prefix}
  } catch {
    return undefined
  }
}
