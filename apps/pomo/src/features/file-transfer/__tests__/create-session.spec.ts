/** @vitest-environment jsdom */
import {File} from 'node:buffer'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createTransferSession} from '../create-session'
import type {FileTransfer} from '../types'

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

describe('createTransferSession', () => {
  it('should enter connecting immediately after approval and ignore repeated approval', async () => {
    await fileTransfer.create()
    const socket = Socket.instances[0]
    socket.message({type: 'join-request'})
    fileTransfer.approve()
    expect(fileTransfer.state.phase).toBe('connecting')
    fileTransfer.approve()
    expect(socket.send).toHaveBeenCalledExactlyOnceWith(JSON.stringify({type: 'approve'}))
  })

  it('should identify a direct connection failure and clear its guidance on retry', async () => {
    const peer = await connect()
    peer.connectionState = 'failed'
    peer.dispatchEvent(new Event('connectionstatechange'))
    expect(fileTransfer.state.errorCode).toBe('direct-connection')
    await fileTransfer.create()
    expect(fileTransfer.state.errorCode).toBeNull()
  })
  it('should ignore failures from an offer belonging to a replaced connection', async () => {
    const offer = Promise.withResolvers<{type: string; sdp: string}>()
    const oldPeer = new Peer()
    oldPeer.createOffer.mockReturnValue(offer.promise)
    createConnection.mockReturnValueOnce(oldPeer as unknown as RTCPeerConnection)
    await fileTransfer.create()
    Socket.instances[0].message({type: 'approved'})
    await fileTransfer.create()
    offer.reject(new Error('Old peer closed'))
    await offer.promise.catch(() => {})
    await Promise.resolve()
    expect(fileTransfer.state.phase).toBe('creating')
    expect(fileTransfer.state.error).toBeNull()
  })

  it('should ignore events from a closed peer after a new session starts', async () => {
    const oldPeer = await connect()
    await fileTransfer.create()
    oldPeer.connectionState = 'failed'
    oldPeer.dispatchEvent(new Event('connectionstatechange'))
    expect(fileTransfer.state.phase).toBe('creating')
  })

  it('should retain the original pending request and reject another offer', async () => {
    const peer = await connect()
    peer.channel.message({id: 'first', name: 'first.txt', size: 1, type: 'file'})
    peer.channel.message({id: 'second', name: 'second.txt', size: 1, type: 'file'})
    expect(fileTransfer.state.incoming?.id).toBe('first')
    expect(peer.channel.send).toHaveBeenCalledWith(JSON.stringify({id: 'second', type: 'reject'}))
  })

  it('should stream an outgoing file only once when acceptance is repeated', async () => {
    const peer = await connect()
    const file = new File(['content'], 'notes.txt')
    const slice = vi.spyOn(file, 'slice')
    fileTransfer.send(file as unknown as globalThis.File)
    const id = fileTransfer.state.outgoing?.id
    peer.channel.message({id, type: 'accept'})
    peer.channel.message({id, type: 'accept'})
    await vi.waitFor(() =>
      expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('"type":"end"')),
    )
    expect(slice).toHaveBeenCalledTimes(1)
  })

  it('should accept the existing request when automatic reception is enabled', async () => {
    const peer = await connect()
    peer.channel.message({id: 'first', name: 'first.txt', size: 1, type: 'file'})
    fileTransfer.setAutoAccept(true)
    expect(fileTransfer.state.phase).toBe('receiving')
    expect(peer.channel.send).toHaveBeenCalledWith(JSON.stringify({id: 'first', type: 'accept'}))
    fileTransfer.cancel()
    expect(fileTransfer.state.autoAccept).toBe(false)
  })

  it.each([0xe8b7be43, 0])(
    'should retain received contents only when checksum %s matches',
    async (checksum) => {
      const peer = await connect()
      peer.channel.message({id: 'first', name: 'first.txt', size: 1, type: 'file'})
      fileTransfer.accept()
      peer.channel.dispatchEvent(new MessageEvent('message', {data: new Uint8Array([97]).buffer}))
      peer.channel.message({checksum, id: 'first', type: 'end'})
      if (checksum === 0) {
        expect(fileTransfer.state.phase).toBe('error')
        expect(receivedFiles.add).not.toHaveBeenCalled()
      } else {
        expect(fileTransfer.state.phase).toBe('connected')
        expect(receivedFiles.add).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({size: 1}),
          'first.txt',
        )
      }
    },
  )
  it('should keep independently created sessions and their cancellation separate', async () => {
    const first = fileTransfer
    await first.create()
    const firstSocket = Socket.instances[0]
    const second = createTransferSession(options)
    await second.create()
    const secondSocket = Socket.instances[1]
    firstSocket.message({id: 'first', joinerSecret: 'secret', type: 'created'})
    expect(first.state.phase).toBe('waiting')
    expect(second.state.phase).toBe('creating')
    first.cancel()
    expect(firstSocket.close).toHaveBeenCalledOnce()
    expect(secondSocket.close).not.toHaveBeenCalled()
    expect(second.state.phase).toBe('creating')
    second.cancel()
  })
})
