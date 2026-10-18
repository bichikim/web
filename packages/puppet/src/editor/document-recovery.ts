import type {PuppetDocument} from '../player'

export interface DocumentRecoveryEntry {
  readonly id: string
  readonly savedAt: number | null
  readonly partCount: number
  readonly motionCount: number
}

export interface DocumentRecovery {
  readonly listRecoveries: () => Promise<ReadonlyArray<DocumentRecoveryEntry>>
  readonly loadRecovery: (id: string) => Promise<PuppetDocument | null>
}
