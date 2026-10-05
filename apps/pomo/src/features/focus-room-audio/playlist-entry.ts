/** Creates stable fallback IDs for legacy playlist occurrences until they are explicitly saved. */
export const createLegacyPlaylistEntryIds = (trackIds: readonly string[]): readonly string[] => {
  const occurrences = new Map<string, number>()

  return trackIds.map((trackId) => {
    const occurrence = occurrences.get(trackId) ?? 0
    occurrences.set(trackId, occurrence + 1)
    return `legacy:${JSON.stringify([trackId, occurrence])}`
  })
}

/** Creates a new identity for a user-added playlist occurrence. */
export const createPlaylistEntryId = (): string => `entry:${globalThis.crypto.randomUUID()}`

/** Checks that entry IDs are a unique, one-to-one list aligned with track IDs. */
export const hasValidPlaylistEntryIds = (
  trackIds: readonly string[],
  entryIds: readonly string[] | undefined,
): entryIds is readonly string[] =>
  entryIds !== undefined &&
  entryIds.length === trackIds.length &&
  entryIds.every((entryId) => entryId.length > 0) &&
  new Set(entryIds).size === entryIds.length
