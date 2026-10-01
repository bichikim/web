// oxlint-disable no-magic-numbers, no-bitwise -- Transfer limits and CRC32 use fixed byte and bit constants.
// oxlint-disable no-await-in-loop -- ICE candidates and file chunks must be applied in order with bounded buffering.
import {createStore} from 'solid-js/store'
import * as m from '@paraglide/message'
import {updateChecksum} from './checksum'
import type {
  FileTransfer,
  IncomingFile,
  ReceivedFileSink,
  TransferRole,
  TransferState,
} from './types'

const MAXIMUM_FILE_BYTES = 100 * 1024 * 1024
const CHUNK_BYTES = 32 * 1024
const BUFFERED_BYTES = 512 * 1024
const SOCKET_OPEN = 1

export interface CreateTransferSessionOptions {
  readonly createConnection: () => RTCPeerConnection
  readonly createSocket: (url: string) => WebSocket
  readonly createId: () => string
  readonly getOrigin: () => string | undefined
  readonly receivedFiles: ReceivedFileSink
}

class TransferSession implements FileTransfer {
  constructor(private readonly options: CreateTransferSessionOptions) {}
  private readonly store = createStore<TransferState>({
    autoAccept: false,
    error: null,
    incoming: null,
    joinUrl: null,
    outgoing: null,
    phase: 'idle',
    progress: 0,
    receivedName: null,
    sessionId: null,
  })

  readonly state = this.store[0]
  private readonly setState = this.store[1]

  private socket: WebSocket | null = null
  private connection: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private role: TransferRole | null = null
  private pendingFile: File | null = null
  private pendingFileId: string | null = null
  private incomingChunks: Array<Uint8Array<ArrayBuffer>> = []
  private incomingBytes = 0
  private incomingChecksum = 0xffffffff
  private outgoingVersion = 0
  private pendingCandidates: Array<RTCIceCandidateInit> = []

  private readonly signalUrl = () =>
    new URL('/api/transfer/socket', this.options.getOrigin()).href.replace(/^http/u, 'ws')
  private readonly sendSignal = (type: string, data?: string) => {
    if (this.socket?.readyState === SOCKET_OPEN) {
      this.socket.send(JSON.stringify({data, type}))
    }
  }
  private readonly sendControl = (value: unknown) => this.channel?.send(JSON.stringify(value))

  private readonly fail = (message: string): void => {
    this.setState({autoAccept: false, error: message, outgoing: null, phase: 'error'})
    this.closeConnections()
  }

  private readonly closeConnections = (): void => {
    this.outgoingVersion += 1
    const previousChannel = this.channel
    const previousConnection = this.connection
    const previousSocket = this.socket
    this.channel = null
    this.connection = null
    this.socket = null
    previousChannel?.close()
    previousConnection?.close()
    previousSocket?.close()
    this.pendingFile = null
    this.pendingFileId = null
    this.incomingChunks = []
    this.incomingBytes = 0
    this.incomingChecksum = 0xffffffff
    this.pendingCandidates = []
  }

  private readonly setChannel = (nextChannel: RTCDataChannel): void => {
    this.channel = nextChannel
    nextChannel.binaryType = 'arraybuffer'
    nextChannel.bufferedAmountLowThreshold = BUFFERED_BYTES
    nextChannel.addEventListener('open', () => {
      if (this.channel === nextChannel) {
        this.setState({phase: 'connected'})
        this.sendSignal('connected')
      }
    })
    nextChannel.addEventListener('close', () => {
      if (
        this.channel === nextChannel &&
        this.state.phase !== 'idle' &&
        this.state.phase !== 'error'
      ) {
        this.fail(m.transfer_error_peer_left())
      }
    })
    nextChannel.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (this.channel === nextChannel) {
        this.receiveMessage(event.data).catch(() => {
          if (this.channel === nextChannel) {
            this.fail(m.transfer_error_processing())
          }
        })
      }
    })
  }

  private readonly applyPendingCandidates = async (peer: RTCPeerConnection): Promise<void> => {
    if (this.connection !== peer || peer.remoteDescription === null) {
      return
    }
    const candidates = this.pendingCandidates
    this.pendingCandidates = []
    for (const candidate of candidates) {
      if (this.connection !== peer) {
        return
      }
      await peer.addIceCandidate(candidate)
    }
  }

  private readonly startRtc = (): RTCPeerConnection => {
    const peer = this.options.createConnection()
    this.connection = peer
    peer.addEventListener('icecandidate', (event) => {
      if (this.connection === peer && event.candidate !== null) {
        this.sendSignal('candidate', JSON.stringify(event.candidate.toJSON()))
      }
    })
    peer.addEventListener('connectionstatechange', () => {
      if (this.connection === peer && peer.connectionState === 'failed') {
        this.fail(m.transfer_error_direct_connection())
      }
    })
    peer.addEventListener('datachannel', (event) => {
      if (this.connection === peer) {
        this.setChannel(event.channel)
      }
    })
    return peer
  }

  private readonly isCurrentSignal = (peer: RTCPeerConnection, source: WebSocket): boolean =>
    this.socket === source && this.connection === peer

  private readonly answerOffer = async (data: string, source: WebSocket): Promise<void> => {
    const peer = this.connection
    if (this.role !== 'joiner' || peer === null) {
      return
    }
    await peer.setRemoteDescription(JSON.parse(data) as RTCSessionDescriptionInit)
    if (!this.isCurrentSignal(peer, source)) {
      return
    }
    await this.applyPendingCandidates(peer)
    if (!this.isCurrentSignal(peer, source)) {
      return
    }
    const answer = await peer.createAnswer()
    if (!this.isCurrentSignal(peer, source)) {
      return
    }
    await peer.setLocalDescription(answer)
    if (this.isCurrentSignal(peer, source)) {
      this.sendSignal('answer', JSON.stringify(answer))
    }
  }

  // oxlint-disable-next-line complexity -- Signaling events map to distinct WebRTC this.connection states.
  private readonly handleSignal = async (raw: string, source: WebSocket): Promise<void> => {
    const message = JSON.parse(raw) as {
      type: string
      data?: string
      id?: string
      joinerSecret?: string
    }
    switch (message.type) {
      case 'created': {
        if (
          this.role !== 'creator' ||
          message.id === undefined ||
          message.joinerSecret === undefined
        ) {
          return
        }
        const joinUrl = new URL('/', this.options.getOrigin())
        joinUrl.searchParams.set('tool', 'transfer')
        joinUrl.searchParams.set('session', message.id)
        joinUrl.hash = message.joinerSecret
        this.setState({joinUrl: joinUrl.href, phase: 'waiting', sessionId: message.id})
        return
      }
      case 'authenticated':
        if (this.role === 'creator') {
          this.setState({phase: 'waiting'})
        }
        return
      case 'join-request':
        this.setState({phase: 'approval-needed'})
        return
      case 'approved': {
        this.setState({phase: 'connecting'})
        const peer = this.startRtc()
        if (this.role === 'creator') {
          this.setChannel(peer.createDataChannel('file-transfer', {ordered: true}))
          const offer = await peer.createOffer()
          if (!this.isCurrentSignal(peer, source)) {
            return
          }
          await peer.setLocalDescription(offer)
          if (this.isCurrentSignal(peer, source)) {
            this.sendSignal('offer', JSON.stringify(offer))
          }
        }
        return
      }
      case 'offer': {
        if (message.data !== undefined) {
          await this.answerOffer(message.data, source)
        }
        return
      }
      case 'answer':
        if (this.role === 'creator' && this.connection !== null && message.data !== undefined) {
          const peer = this.connection
          await peer.setRemoteDescription(JSON.parse(message.data) as RTCSessionDescriptionInit)
          if (this.isCurrentSignal(peer, source)) {
            await this.applyPendingCandidates(peer)
          }
        }
        return
      case 'candidate':
        if (message.data !== undefined) {
          this.pendingCandidates.push(JSON.parse(message.data) as RTCIceCandidateInit)
          if (this.connection !== null) {
            await this.applyPendingCandidates(this.connection)
          }
        }
        return
      case 'peer-left':
      case 'session-expired':
        if (this.channel?.readyState !== 'open') {
          this.fail(m.transfer_error_session_ended())
        }
      default:
        break
    }
  }

  private readonly connectSocket = (
    nextRole: TransferRole,
    sessionId?: string,
    secret?: string,
  ): void => {
    const nextSocket = this.options.createSocket(this.signalUrl())
    this.socket = nextSocket
    this.role = nextRole
    nextSocket.addEventListener('open', () => {
      if (this.socket === nextSocket) {
        nextSocket.send(
          JSON.stringify(
            nextRole === 'creator' ? {type: 'create'} : {id: sessionId, secret, type: 'join'},
          ),
        )
      }
    })
    nextSocket.addEventListener('message', (event: MessageEvent<string>) => {
      if (this.socket === nextSocket) {
        this.handleSignal(event.data, nextSocket).catch(() => {
          if (this.socket === nextSocket) {
            this.fail(m.transfer_error_signal_processing())
          }
        })
      }
    })
    nextSocket.addEventListener('close', () => {
      if (this.socket === nextSocket) {
        this.socket = null
        if (
          this.channel?.readyState !== 'open' &&
          this.state.phase !== 'idle' &&
          this.state.phase !== 'error'
        ) {
          this.fail(m.transfer_error_signal_disconnected())
        }
      }
    })
    nextSocket.addEventListener('error', () => {
      if (this.socket === nextSocket) {
        if (this.channel?.readyState !== 'open') {
          this.fail(m.transfer_error_signal_unavailable())
        }
      }
    })
  }

  private readonly waitForBuffer = async (dataChannel: RTCDataChannel): Promise<void> => {
    if (dataChannel.bufferedAmount <= BUFFERED_BYTES) {
      return
    }
    await new Promise<void>((resolve, reject) => {
      const handleLow = () => {
        dataChannel.removeEventListener('close', handleClose)
        resolve()
      }
      const handleClose = () => {
        dataChannel.removeEventListener('bufferedamountlow', handleLow)
        reject(new Error('Data channel closed'))
      }
      dataChannel.addEventListener('bufferedamountlow', handleLow, {once: true})
      dataChannel.addEventListener('close', handleClose, {once: true})
    })
  }

  private readonly sendChunks = async (file: File, id: string): Promise<void> => {
    const dataChannel = this.channel
    if (dataChannel === null) {
      return
    }
    this.outgoingVersion += 1
    const version = this.outgoingVersion
    let checksum = 0xffffffff
    this.setState({phase: 'sending', progress: 0})
    for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
      if (version !== this.outgoingVersion || dataChannel.readyState !== 'open') {
        return
      }
      await this.waitForBuffer(dataChannel)
      const chunk = await file.slice(offset, offset + CHUNK_BYTES).arrayBuffer()
      if (version !== this.outgoingVersion || dataChannel.readyState !== 'open') {
        return
      }
      checksum = updateChecksum(checksum, new Uint8Array(chunk))
      dataChannel.send(chunk)
      this.setState({progress: Math.min(1, (offset + chunk.byteLength) / file.size)})
    }
    this.sendControl({checksum: (checksum ^ 0xffffffff) >>> 0, id, type: 'end'})
  }

  // oxlint-disable-next-line complexity -- Each message type has an explicit independent protocol branch.
  private readonly receiveMessage = async (data: unknown): Promise<void> => {
    if (data instanceof ArrayBuffer) {
      if (this.state.incoming === null || this.state.phase !== 'receiving') {
        return
      }
      this.incomingBytes += data.byteLength
      if (
        this.incomingBytes > this.state.incoming.size ||
        this.incomingBytes > MAXIMUM_FILE_BYTES
      ) {
        this.fail(m.transfer_error_size_mismatch())
        return
      }
      const bytes = new Uint8Array(data)
      this.incomingChecksum = updateChecksum(this.incomingChecksum, bytes)
      this.incomingChunks.push(bytes)
      this.setState({progress: this.incomingBytes / this.state.incoming.size})
      return
    }
    if (typeof data !== 'string') {
      return
    }
    const message = JSON.parse(data) as Record<string, unknown>
    switch (message.type) {
      case 'file': {
        if (
          this.state.phase !== 'connected' ||
          this.state.incoming !== null ||
          typeof message.id !== 'string' ||
          typeof message.name !== 'string' ||
          typeof message.size !== 'number' ||
          !Number.isInteger(message.size) ||
          message.size <= 0 ||
          message.size > MAXIMUM_FILE_BYTES
        ) {
          this.sendControl({id: message.id, type: 'reject'})
          return
        }
        this.setState({
          incoming: {
            id: message.id,
            mimeType: typeof message.mimeType === 'string' ? message.mimeType : '',
            name: message.name.replaceAll(/[/\\]/gu, '_').slice(0, 200),
            size: message.size,
          },
          progress: 0,
        })
        if (this.state.autoAccept) {
          this.accept()
        }
        return
      }
      case 'accept':
        if (
          this.state.phase === 'offer-pending' &&
          this.pendingFile !== null &&
          typeof message.id === 'string' &&
          message.id === this.pendingFileId
        ) {
          await this.sendChunks(this.pendingFile, message.id)
        }
        return
      case 'reject':
        if (message.id === this.pendingFileId && this.state.phase === 'offer-pending') {
          this.pendingFile = null
          this.pendingFileId = null
          this.setState({outgoing: null, phase: 'connected', progress: 0})
        }
        return
      case 'end':
        if (
          this.state.incoming !== null &&
          this.state.phase === 'receiving' &&
          message.id === this.state.incoming.id &&
          this.incomingBytes === this.state.incoming.size &&
          message.checksum === (this.incomingChecksum ^ 0xffffffff) >>> 0
        ) {
          const {incoming} = this.state
          this.options.receivedFiles.add(
            new Blob(this.incomingChunks, {type: incoming.mimeType}),
            incoming.name,
          )
          this.incomingChunks = []
          this.setState({
            incoming: null,
            phase: 'connected',
            receivedName: this.state.incoming.name,
          })
          this.sendControl({id: incoming.id, type: 'received'})
        } else {
          this.fail(
            this.state.incoming !== null && this.incomingBytes !== this.state.incoming.size
              ? m.transfer_error_incomplete()
              : m.transfer_error_size_mismatch(),
          )
        }
        return
      case 'received':
        if (message.id === this.pendingFileId && this.state.phase === 'sending') {
          this.pendingFile = null
          this.pendingFileId = null
          this.setState({outgoing: null, phase: 'connected', progress: 1})
        }
        return
      case 'cancel':
        this.outgoingVersion += 1
        this.pendingFile = null
        this.pendingFileId = null
        this.incomingChunks = []
        this.incomingBytes = 0
        this.incomingChecksum = 0xffffffff
        this.setState({incoming: null, phase: 'connected', progress: 0})
      default:
        break
    }
  }

  get isActive() {
    return this.state.phase !== 'idle' && this.state.phase !== 'error'
  }
  readonly create = async (): Promise<void> => {
    if (this.options.getOrigin() === undefined) {
      this.fail(m.transfer_unavailable())
      return
    }
    this.closeConnections()
    this.setState({
      autoAccept: false,
      error: null,
      incoming: null,
      joinUrl: null,
      outgoing: null,
      phase: 'creating',
      progress: 0,
      receivedName: null,
      sessionId: null,
    })
    this.connectSocket('creator')
  }
  readonly approve = (): void => {
    if (this.role === 'creator' && this.state.phase === 'approval-needed') {
      this.socket?.send(JSON.stringify({type: 'approve'}))
    }
  }
  get isConfigured() {
    return this.options.getOrigin() !== undefined
  }
  readonly setAutoAccept = (enabled: boolean): void => {
    this.setState({autoAccept: enabled})
    if (enabled && this.state.phase === 'connected' && this.state.incoming !== null) {
      this.accept()
    }
  }
  readonly accept = (): void => {
    if (this.state.phase !== 'connected' || this.state.incoming === null) {
      return
    }
    this.incomingChunks = []
    this.incomingBytes = 0
    this.incomingChecksum = 0xffffffff
    this.setState({phase: 'receiving', progress: 0, receivedName: null})
    this.sendControl({id: this.state.incoming.id, type: 'accept'})
  }
  readonly join = (sessionId: string, secret: string): void => {
    if (this.options.getOrigin() === undefined || secret.length === 0) {
      this.fail(m.transfer_error_invalid_link())
      return
    }
    this.closeConnections()
    this.setState({
      autoAccept: false,
      error: null,
      incoming: null,
      joinUrl: null,
      outgoing: null,
      phase: 'connecting',
      progress: 0,
      receivedName: null,
      sessionId,
    })
    this.connectSocket('joiner', sessionId, secret)
  }
  readonly reject = (): void => {
    if (this.state.incoming !== null) {
      this.sendControl({id: this.state.incoming.id, type: 'reject'})
    }
    this.setState({incoming: null})
  }
  readonly send = (file: File): void => {
    if (
      this.channel?.readyState !== 'open' ||
      this.state.phase !== 'connected' ||
      this.state.incoming !== null
    ) {
      return
    }
    if (file.size <= 0 || file.size > MAXIMUM_FILE_BYTES) {
      this.setState({error: m.transfer_error_file_limit()})
      return
    }
    this.pendingFile = file
    this.pendingFileId = this.options.createId()
    this.setState({
      error: null,
      outgoing: {id: this.pendingFileId, mimeType: file.type, name: file.name, size: file.size},
      phase: 'offer-pending',
      progress: 0,
    })
    this.sendControl({
      id: this.pendingFileId,
      mimeType: file.type,
      name: file.name,
      size: file.size,
      type: 'file',
    })
  }
  readonly cancel = (): void => {
    this.sendControl({type: 'cancel'})
    this.setState({
      autoAccept: false,
      error: null,
      incoming: null,
      joinUrl: null,
      outgoing: null,
      phase: 'idle',
      progress: 0,
      receivedName: null,
      sessionId: null,
    })
    this.closeConnections()
  }
  readonly save = (): void => {
    const latest = this.options.receivedFiles.state.files.findLast((file) => file.url !== null)
    if (latest !== undefined) {
      this.options.receivedFiles.save(latest.id)
    }
  }
}

/** Creates an independently owned connection and transfer lifecycle. */
export const createTransferSession = (options: CreateTransferSessionOptions): FileTransfer =>
  new TransferSession(options)
