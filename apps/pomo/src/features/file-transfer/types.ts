export type TransferRole = 'creator' | 'joiner'
export type TransferPhase =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'approval-needed'
  | 'connecting'
  | 'connected'
  | 'offer-pending'
  | 'sending'
  | 'receiving'
  | 'received'
  | 'error'

export interface IncomingFile {
  readonly id: string
  readonly name: string
  readonly size: number
  readonly mimeType: string
}

export interface TransferState {
  readonly autoAccept: boolean
  readonly phase: TransferPhase
  readonly sessionId: string | null
  readonly joinUrl: string | null
  readonly incoming: IncomingFile | null
  readonly outgoing: IncomingFile | null
  readonly receivedName: string | null
  readonly progress: number
  readonly error: string | null
}

export interface ReceivedFileSink {
  add(blob: Blob, name: string): void
  save(id: string): void
  readonly state: {
    readonly files: ReadonlyArray<{readonly id: string; readonly url: string | null}>
  }
}

export interface FileTransfer {
  readonly state: TransferState
  readonly isActive: boolean
  readonly isConfigured: boolean
  create(): Promise<void>
  approve(): void
  setAutoAccept(enabled: boolean): void
  accept(): void
  join(sessionId: string, secret: string): void
  reject(): void
  send(file: File): void
  cancel(): void
  save(): void
}
