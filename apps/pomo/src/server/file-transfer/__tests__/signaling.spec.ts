/** @vitest-environment node */
import {mockEvent, type WebSocketHooks, type WebSocketMessage, type WebSocketPeer} from 'h3'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import handler from '../signaling'

let hooks: Partial<WebSocketHooks>
let peers: WebSocketPeer[]
const peer = () => {
  const result = {close: vi.fn(), id: crypto.randomUUID(), send: vi.fn()}
  peers.push(result as unknown as WebSocketPeer)
  return result
}
const message = (target: ReturnType<typeof peer>, payload: unknown) =>
  hooks.message?.(
    target as unknown as WebSocketPeer,
    {text: () => JSON.stringify(payload)} as WebSocketMessage,
  )
const invitation = (target: ReturnType<typeof peer>) => {
  message(target, {type: 'create'})
  return JSON.parse(target.send.mock.calls[0][0]) as {id: string; joinerSecret: string}
}

beforeEach(async () => {
  peers = []
  const response = await handler(mockEvent('/api/transfer/socket'))
  hooks = response.crossws!
})
afterEach(async () => {
  await Promise.all(peers.map((target) => hooks.close?.(target, {code: 1000, reason: ''})))
  vi.restoreAllMocks()
})

describe('signaling handshake', () => {
  it('should require the invitation secret and creator approval before relaying signals', () => {
    const creator = peer()
    const {id, joinerSecret} = invitation(creator)
    const invalid = peer()
    message(invalid, {id, secret: 'wrong', type: 'join'})
    expect(invalid.close).toHaveBeenCalledWith(1008, 'Session unavailable')
    const joiner = peer()
    message(joiner, {id, secret: joinerSecret, type: 'join'})
    expect(creator.send).toHaveBeenLastCalledWith(JSON.stringify({type: 'join-request'}))
    message(creator, {type: 'approve'})
    expect(joiner.send).toHaveBeenLastCalledWith(JSON.stringify({type: 'approved'}))
    const offer = JSON.stringify({sdp: 'v=0\r\n', type: 'offer'})
    message(creator, {data: offer, type: 'offer'})
    expect(joiner.send).toHaveBeenLastCalledWith(JSON.stringify({data: offer, type: 'offer'}))
  })

  it('should reject file contents and unapproved signals instead of relaying them', () => {
    const creator = peer()
    const {id, joinerSecret} = invitation(creator)
    const joiner = peer()
    message(joiner, {id, secret: joinerSecret, type: 'join'})
    const count = joiner.send.mock.calls.length
    message(creator, {data: 'private contents', type: 'file'})
    expect(creator.close).toHaveBeenCalledWith(1008, 'Invalid signal')
    expect(joiner.send).toHaveBeenCalledTimes(count)
  })

  it('should destroy the invitation and close both sockets only after both peers connect', () => {
    const creator = peer()
    const {id, joinerSecret} = invitation(creator)
    const joiner = peer()
    message(joiner, {id, secret: joinerSecret, type: 'join'})
    message(creator, {type: 'approve'})
    message(creator, {type: 'connected'})
    expect(creator.close).not.toHaveBeenCalled()
    message(joiner, {type: 'connected'})
    expect(creator.close).toHaveBeenCalledWith(1000, 'handshake-complete')
    expect(joiner.close).toHaveBeenCalledWith(1000, 'handshake-complete')
    const reuse = peer()
    message(reuse, {id, secret: joinerSecret, type: 'join'})
    expect(reuse.close).toHaveBeenCalledWith(1008, 'Session unavailable')
  })

  it('should reject expired invitations on the next handshake event', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0)
    const creator = peer()
    const {id, joinerSecret} = invitation(creator)
    now.mockReturnValue(300_001)
    const joiner = peer()
    message(joiner, {id, secret: joinerSecret, type: 'join'})
    expect(creator.close).toHaveBeenCalledWith(1000, 'session-expired')
    expect(joiner.close).toHaveBeenCalledWith(1008, 'Session unavailable')
  })

  it('should reject cross-origin upgrades and permit the application and desktop origins', () => {
    const request = (origin: string) =>
      new Request('http://localhost:3300/api/transfer/socket', {headers: {origin}})
    expect(() => hooks.upgrade?.(request('https://other.example'))).toThrow()
    expect(() => hooks.upgrade?.(request('http://localhost:3300'))).not.toThrow()
    expect(() => hooks.upgrade?.(request('tauri://localhost'))).not.toThrow()
  })
})
