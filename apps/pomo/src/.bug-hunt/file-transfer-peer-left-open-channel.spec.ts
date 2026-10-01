/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createTransferSession} from '../features/file-transfer/create-session'
import type {FileTransfer} from '../features/file-transfer/types'

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
}

class Peer extends EventTarget {
  static instances: Peer[] = []
  channel = new Channel()
  remoteDescription = null
  createOffer = vi.fn(async () => ({sdp: 'v=0', type: 'offer'}))
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
  vi.clearAllMocks()
})

describe('file transfer peer-left handling', () => {
  it.each(['peer-left', 'session-expired'] as const)(
    'should end the session when signaling reports %s while the data channel is still open',
    async (type) => {
      await connect()
      expect(fileTransfer.state.phase).toBe('connected')

      Socket.instances.at(-1)!.message({type})

      expect(fileTransfer.state.phase).toBe('error')
      expect(fileTransfer.state.error).not.toBeNull()
    },
  )
})
