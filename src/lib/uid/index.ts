let buffer
let bufferIndex: number = 0

const Max = 256

const hexBytes = new Array(Max)

for (let i = 0; i < 256; i++) {
  hexBytes[i] = (i + 0x100).toString(16).substr(1)
}

const getCrypto = () => {
  // Node & Browser support
  if (typeof crypto !== 'undefined') {
    return crypto
  }

  if (typeof window === 'undefined') {
    return
  }

  return (window as any).msCrypto
}

const getRandomBytes = () => {
  const crypto = getCrypto()

  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomBytes !== 'undefined') {
      return crypto.randomBytes
    }

    if (typeof crypto.getRandomValues !== 'undefined') {
      return (num: number) => {
        const bytes = new Uint8Array(num)
        crypto.getRandomValues(bytes)
        return bytes
      }
    }
  }

  return (num: number) => {
    const random: number[] = []
    for (let i = num; i > 0; i--) {
      random.push(Math.floor(Math.random() * 256))
    }
    return random
  }
}

const randomBytes = getRandomBytes()

// Buffer random numbers for speed
// Reduce memory usage by decreasing this number (min 16)
// or improve speed by increasing this number (try 16384)
const BUFFER_SIZE = 4096

const uid = (): string => {
  // Buffer some random bytes for speed
  if (typeof buffer === 'undefined' || (bufferIndex + 16 > BUFFER_SIZE)) {
    bufferIndex = 0
    buffer = randomBytes(BUFFER_SIZE)
  }

  const b = Array.prototype.slice.call(buffer, bufferIndex, (bufferIndex += 16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80

  return hexBytes[b[0]] + hexBytes[b[1]] +
    hexBytes[b[2]] + hexBytes[b[3]] + '-' +
    hexBytes[b[4]] + hexBytes[b[5]] + '-' +
    hexBytes[b[6]] + hexBytes[b[7]] + '-' +
    hexBytes[b[8]] + hexBytes[b[9]] + '-' +
    hexBytes[b[10]] + hexBytes[b[11]] +
    hexBytes[b[12]] + hexBytes[b[13]] +
    hexBytes[b[14]] + hexBytes[b[15]]
}

export default uid
