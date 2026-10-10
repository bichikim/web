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
  refresh(signal: AbortSignal): Promise<number>
  generation(): number
  scope(paths: readonly string[], name: string): ReadonlySet<string>
  changed(paths: ReadonlySet<string>, revision: number): ReadonlySet<string>
  uncertain(revision: number): boolean
  dispose(): void
}

/** Restricts reference roots to reviewed files; omission preserves the complete project context. */
export interface NavigationReview {
  readonly files?: readonly string[]
  readonly retained?: readonly string[]
}
