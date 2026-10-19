import type {WorkspaceTree} from '../../shared/contracts'

export interface FileSummary {
  readonly fingerprint: string
  readonly names: readonly string[]
  readonly dependencies: readonly string[]
  readonly surface: string
  readonly uncertain: boolean
}
export interface SourceSummary {
  readonly fingerprint: string
  readonly names: readonly string[]
  readonly imports: readonly string[]
  readonly surface: string
  readonly uncertain: boolean
}
export interface IndexedSource {
  readonly revision: string
  readonly summary: SourceSummary
}

export interface NavigationIndex {
  candidates?(paths: readonly string[], name: string): readonly string[]
  checkpoint(signal: AbortSignal): Promise<NavigationCheckpoint>
  refresh(signal: AbortSignal): Promise<number>
  restore?(): Promise<void>
  generation(): number
  scope(paths: readonly string[], name: string): ReadonlySet<string>
  changed(paths: ReadonlySet<string>, revision: number): ReadonlySet<string>
  uncertain(revision: number): boolean
  dispose(): void
}

export interface NavigationCheckpoint {
  readonly discovery?: WorkspaceTree
  include?(inputs: ReadonlyMap<string, string>): NavigationCheckpoint
  readonly configuration?: string
  readonly bytes: number
  unchanged(signal: AbortSignal): Promise<boolean>
}

/** Supplies candidate priorities and optional reviewed roots; omitted roots preserve complete coverage. */
export interface NavigationReview {
  readonly discovery?: WorkspaceTree
  readonly cancelled?: () => boolean
  readonly candidates?: readonly string[]
  readonly files?: readonly string[]
  readonly retained?: readonly string[]
}
