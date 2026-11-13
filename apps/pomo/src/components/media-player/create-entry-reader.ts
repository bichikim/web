export interface CreateEntryReaderOptions<Track> {
  /** Entry IDs aligned with tracks; missing entries are skipped and extra IDs are ignored. */
  readonly entryIds: readonly string[]
  /** Returns the stable track identity used to group each occurrence during creation. */
  readonly getTrackId: (track: Track) => string
  /** Track occurrences in their original order; sparse positions are skipped. */
  readonly tracks: readonly Track[]
}

/** Returns the next entry for a track, or undefined when no unconsumed entry remains. */
export type EntryReader = (trackId: string) => string | undefined

/** Creates a reader that consumes each track's entry IDs in order without mutating the inputs. */
export const createEntryReader = <Track>(options: CreateEntryReaderOptions<Track>): EntryReader => {
  const entriesByTrack = new Map<string, string[]>()
  options.tracks.forEach((track, index) => {
    const entryId = options.entryIds[index]
    if (entryId === undefined) {
      return
    }

    const entries = entriesByTrack.get(options.getTrackId(track)) ?? []
    entries.push(entryId)
    entriesByTrack.set(options.getTrackId(track), entries)
  })

  return (trackId) => entriesByTrack.get(trackId)?.shift()
}
