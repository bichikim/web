/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createTransferSession} from '../features/file-transfer/create-session'
import type {FileTransfer} from '../features/file-transfer/types'

const hasLoneSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    const isHigh = code >= 0xd800 && code <= 0xdbff
    const isLow = code >= 0xdc00 && code <= 0xdfff
    if (
      isHigh &&
      (index + 1 >= value.length ||
        value.charCodeAt(index + 1) < 0xdc00 ||
        value.charCodeAt(index + 1) > 0xdfff)
    ) {
      return true
    }
    if (
      isLow &&
      (index === 0 || value.charCodeAt(index - 1) < 0xd800 || value.charCodeAt(index - 1) > 0xdbff)
    ) {
      return true
    }
  }
  return false
}

let fileTransfer: FileTransfer
const receivedFiles = {add: vi.fn(), save: vi.fn(), state: {files: []}}
const createConnection = vi.fn(() => new Peer() as unknown as RTCPeerConnection)
const createSocket = vi.fn(() => new Socket() as unknown as WebSocket)
const options = {
  createConnection,
  createId: () => 'outgoing-id',
  createSocket,
  getOrigin: () => 'http://localhost:3300',
  receivedFiles,
}

class Socket extends EventTarget {
  static OPEN = 1
  static instances: Socket[] = []
  readyState = 1
  send = vi.fn()
  close = vi.fn()
  constructor() {
    super()
    Socket.instances.push(this)
  }
  message(value: unknown): void {
    this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(value)}))
  }
}

class Channel extends EventTarget {
  readyState = 'open'
  bufferedAmount = 0
  send = vi.fn()
  close = vi.fn()
  message(value: unknown): void {
    this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(value)}))
  }
}

class Peer extends EventTarget {
  static instances: Peer[] = []
  channel = new Channel()
  connectionState = 'new'
  remoteDescription = null
  createOffer = vi.fn(async () => ({sdp: 'v=0\r\n', type: 'offer'}))
  setLocalDescription = vi.fn(async () => {})
  close = vi.fn()
  constructor() {
    super()
    Peer.instances.push(this)
  }
  createDataChannel(): Channel {
    return this.channel
  }
}

const connect = async () => {
  await fileTransfer.create()
  Socket.instances.at(-1)!.message({type: 'approved'})
  const peer = Peer.instances.at(-1)!
  await vi.waitFor(() => expect(peer.setLocalDescription).toHaveBeenCalled())
  peer.channel.dispatchEvent(new Event('open'))
  return peer
}

beforeEach(() => {
  Socket.instances = []
  Peer.instances = []
  fileTransfer = createTransferSession(options)
})
afterEach(() => {
  fileTransfer.cancel()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('incoming transfer file names', () => {
  it('should not truncate incoming names mid-surrogate at the 200-code-unit limit', async () => {
    const peer = await connect()
    const incomingName = `${'a'.repeat(199)}😀.txt`
    peer.channel.message({id: 'first', name: incomingName, size: 1, type: 'file'})
    expect(fileTransfer.state.incoming?.name).toBeDefined()
    expect(hasLoneSurrogate(fileTransfer.state.incoming!.name)).toBe(false)
    expect(fileTransfer.state.incoming!.name.endsWith('.txt')).toBe(true)
  })
})
