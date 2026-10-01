// oxlint-disable no-magic-numbers -- Handshake limits and WebSocket close codes are protocol constants.
import {defineWebSocketHandler} from 'nitro'

interface Peer {
  readonly id: string
  send(data: string): unknown
  close(code: number, reason: string): void
}

interface Session {
  readonly id: string
  readonly creator: Peer
  readonly secret: string
  readonly expiresAt: number
  joiner?: Peer
  approved: boolean
  readonly connected: Set<string>
}

const sessions = new Map<string, Session>()
const memberships = new Map<string, Session>()
const messageCounts = new Map<string, number>()
const MAXIMUM_SESSIONS = 100
const HANDSHAKE_DURATION_MS = 5 * 60 * 1000
const encoder = new TextEncoder()

const send = (peer: Peer, value: unknown): void => {
  peer.send(JSON.stringify(value))
}

const endSession = (session: Session, reason: string, disconnectedPeerId?: string): void => {
  sessions.delete(session.id)
  const peers = [session.creator, ...(session.joiner === undefined ? [] : [session.joiner])]
  for (const peer of peers) {
    memberships.delete(peer.id)
    messageCounts.delete(peer.id)
  }
  for (const peer of peers.filter((item) => item.id !== disconnectedPeerId)) {
    send(peer, {type: reason})
    peer.close(1000, reason)
  }
}

const sweepExpired = (): void => {
  for (const session of sessions.values()) {
    if (Date.now() >= session.expiresAt) {
      endSession(session, 'session-expired')
    }
  }
}

const createSession = (peer: Peer): void => {
  sweepExpired()
  if (sessions.size >= MAXIMUM_SESSIONS) {
    peer.close(1013, 'Server busy')
    return
  }
  const session: Session = {
    approved: false,
    connected: new Set(),
    creator: peer,
    expiresAt: Date.now() + HANDSHAKE_DURATION_MS,
    id: crypto.randomUUID(),
    secret: [...crypto.getRandomValues(new Uint8Array(32))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(''),
  }
  sessions.set(session.id, session)
  memberships.set(peer.id, session)
  send(peer, {id: session.id, joinerSecret: session.secret, type: 'created'})
}

const joinSession = (peer: Peer, payload: Record<string, unknown>): void => {
  const session = typeof payload.id === 'string' ? sessions.get(payload.id) : undefined
  if (session === undefined || session.secret !== payload.secret || session.joiner !== undefined) {
    peer.close(1008, 'Session unavailable')
    return
  }
  session.joiner = peer
  memberships.set(peer.id, session)
  send(peer, {type: 'authenticated'})
  send(session.creator, {type: 'join-request'})
}

const isSignal = (type: unknown, data: unknown, creator: boolean): boolean => {
  if (typeof data !== 'string' || (type !== 'offer' && type !== 'answer' && type !== 'candidate')) {
    return false
  }
  const value: unknown = JSON.parse(data)
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (type === 'candidate') {
    return (
      'candidate' in value &&
      typeof value.candidate === 'string' &&
      Object.keys(value).every((key) =>
        ['candidate', 'sdpMid', 'sdpMLineIndex', 'usernameFragment'].includes(key),
      )
    )
  }
  return (
    ((type === 'offer' && creator) || (type === 'answer' && !creator)) &&
    'type' in value &&
    value.type === type &&
    'sdp' in value &&
    typeof value.sdp === 'string' &&
    value.sdp.startsWith('v=0\r\n') &&
    Object.keys(value).every((key) => ['type', 'sdp'].includes(key))
  )
}

// oxlint-disable-next-line complexity -- Creation, approval, completion, and ICE relay have independent protocol states.
const handleMessage = (peer: Peer, raw: string): void => {
  sweepExpired()
  const count = (messageCounts.get(peer.id) ?? 0) + 1
  messageCounts.set(peer.id, count)
  if (encoder.encode(raw).byteLength > 20_000 || count > 256) {
    peer.close(1009, 'Handshake limit exceeded')
    return
  }
  const payload: unknown = JSON.parse(raw)
  if (typeof payload !== 'object' || payload === null || !('type' in payload)) {
    peer.close(1007, 'Invalid message')
    return
  }
  const session = memberships.get(peer.id)
  if (session === undefined) {
    if (payload.type === 'create') {
      createSession(peer)
    } else if (payload.type === 'join') {
      joinSession(peer, payload as Record<string, unknown>)
    } else {
      peer.close(1008, 'Join required')
    }
    return
  }
  const creator = session.creator.id === peer.id
  if (payload.type === 'approve' && creator && session.joiner !== undefined && !session.approved) {
    session.approved = true
    send(session.joiner, {type: 'approved'})
    send(session.creator, {type: 'approved'})
    return
  }
  if (payload.type === 'connected' && session.approved) {
    session.connected.add(peer.id)
    if (session.connected.size === 2) {
      endSession(session, 'handshake-complete')
    }
    return
  }
  if (session.approved && 'data' in payload && isSignal(payload.type, payload.data, creator)) {
    const other = creator ? session.joiner : session.creator
    if (other !== undefined) {
      send(other, {data: payload.data, type: payload.type})
    }
    return
  }
  peer.close(1008, 'Invalid signal')
}

export default defineWebSocketHandler({
  close(peer) {
    messageCounts.delete(peer.id)
    const session = memberships.get(peer.id)
    if (session !== undefined) {
      endSession(session, 'peer-left', peer.id)
    }
  },
  error(peer) {
    peer.close(1011, 'Connection error')
  },
  message(peer, message) {
    try {
      handleMessage(peer, message.text())
    } catch {
      peer.close(1007, 'Invalid handshake')
    }
  },

  upgrade(request) {
    const origin = request.headers.get('origin')
    const applicationOrigin = new URL(request.url).origin.replace(/^ws/u, 'http')
    if (
      origin !== applicationOrigin &&
      !['tauri://localhost', 'http://tauri.localhost', 'https://tauri.localhost'].includes(
        origin ?? '',
      )
    ) {
      throw new Response('Forbidden origin', {status: 403})
    }
  },
})
