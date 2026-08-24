const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu

export interface CreateTrackAssetKeyOptions {
  readonly assetId: string
  readonly trackId: string
}

const assertUuid = (value: string, name: string) => {
  if (!UUID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a UUID`)
  }
}

/** Creates the immutable private R2 key for one paid track asset. */
export const createTrackAssetKey = (options: CreateTrackAssetKeyOptions): string => {
  assertUuid(options.trackId, 'trackId')
  assertUuid(options.assetId, 'assetId')

  return `tracks/${options.trackId.toLowerCase()}/${options.assetId.toLowerCase()}/source.mp3`
}
