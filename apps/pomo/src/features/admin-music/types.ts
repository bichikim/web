export interface TrackImportSummary {
  readonly created: number
  readonly failed: number
  readonly preserved: number
}

export type TrackImportTask = () => Promise<TrackImportSummary | undefined>
