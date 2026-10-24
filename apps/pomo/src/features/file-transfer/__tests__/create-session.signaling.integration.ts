/** @vitest-environment jsdom */
import {mockEvent, type WebSocketHooks, type WebSocketMessage, type WebSocketPeer} from 'h3'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import handler from 'src/server/file-transfer/signaling'
import {consumeTransferLink} from '../consume-link'
import {createTransferSession} from '../create-session'
import type {FileTransfer} from '../types'

let hooks: Partial<WebSocketHooks>
let transfer: FileTransfer
const sockets: SignalingSocket[] = []
const creators: WebSocketPeer[] = []
const serverCloses = vi.fn()
const createConnection = vi.fn()
const createSocket = vi.fn((url: string) => {
  expect(new URL(url).pathname).toBe('/api/transfer/socket')
  const socket = new SignalingSocket()
  sockets.push(socket)
  return socket as unknown as WebSocket
})

const deliver = (peer: WebSocketPeer, data: string) =>
  hooks.message?.(peer, {text: () => data} as WebSocketMessage)

class SignalingSocket extends EventTarget {
  readyState = 0
  readonly peer = {
    close: (code: number, reason: string) => this.shutdown(code, reason),
    id: crypto.randomUUID(),
    send: (data: string) => this.dispatchEvent(new MessageEvent('message', {data})),
  } as unknown as WebSocketPeer
  constructor() {
    super()
    queueMicrotask(() => {
      if (this.readyState === 0) {
        this.readyState = 1
        this.dispatchEvent(new Event('open'))
      }
    })
  }
  readonly send = (data: string) => deliver(this.peer, data)
  readonly close = () => this.shutdown(1000, 'test cleanup')
  private readonly shutdown = (code: number, reason: string) => {
    if (this.readyState === 3) {
      return
    }
    this.readyState = 3
    serverCloses(code, reason)
    this.dispatchEvent(new CloseEvent('close', {code, reason}))
    void hooks.close?.(this.peer, {code, reason})
  }
}

beforeEach(async () => {
  hooks = (await handler(mockEvent('/api/transfer/socket'))).crossws!
  transfer = createTransferSession({
    createConnection,
    createId: () => crypto.randomUUID(),
    createSocket,
    getOrigin: () => 'http://localhost:3300',
    receivedFiles: {add: vi.fn(), save: vi.fn(), state: {files: []}},
  })
})
afterEach(async () => {
  transfer.cancel()
  await Promise.all(
    [...sockets.map((socket) => socket.peer), ...creators].map((peer) =>
      hooks.close?.(peer, {code: 1000, reason: ''}),
    ),
  )
  sockets.length = 0
  creators.length = 0
  vi.clearAllMocks()
})

it.each(['?tool=transfer&session', '?tool=transfer&session='])(
  'should reject the empty invitation %s before opening signaling',
  async (search) => {
    const link = consumeTransferLink({
      hash: '#invitation-secret',
      isConfigured: true,
      pathname: '/',
      search,
    })!
    expect(link.sessionId).toBe('')
    transfer.join(link.sessionId!, link.secret)
    await Promise.resolve()
    expect(transfer.state.phase).toBe('error')
    expect(transfer.state.error).toBe(m.transfer_error_invalid_link())
    expect(createSocket).not.toHaveBeenCalled()
    expect(createConnection).not.toHaveBeenCalled()
    expect(serverCloses).not.toHaveBeenCalled()
  },
)

it('should still submit a valid invitation to the actual signaling handler', async () => {
  const creator = {close: vi.fn(), id: crypto.randomUUID(), send: vi.fn()}
  creators.push(creator as unknown as WebSocketPeer)
  await deliver(creator as unknown as WebSocketPeer, JSON.stringify({type: 'create'}))
  const invitation = JSON.parse(creator.send.mock.calls[0][0]) as {id: string; joinerSecret: string}
  transfer.join(invitation.id, invitation.joinerSecret)
  await Promise.resolve()
  expect(transfer.state.phase).toBe('connecting')
  expect(transfer.state.error).toBeNull()
  expect(createSocket).toHaveBeenCalledOnce()
  expect(creator.send).toHaveBeenLastCalledWith(JSON.stringify({type: 'join-request'}))
  expect(serverCloses).not.toHaveBeenCalled()
})
