interface ParsedTrackMetadata {
  readonly common: {
    readonly artist?: string
    readonly artists?: ReadonlyArray<string>
    readonly title?: string
  }
}

type ParseTrackMetadata = (file: Blob) => Promise<ParsedTrackMetadata>

interface ReadTrackMetadataOptions {
  readonly parseMetadata?: ParseTrackMetadata
}

export interface TrackMetadata {
  readonly artist: string | null
  readonly title: string | null
}

const normalizeTag = (value: string | undefined): string | null => {
  const normalizedValue = value?.trim()
  return normalizedValue === undefined || normalizedValue.length === 0 ? null : normalizedValue
}

export const readTrackMetadata = async (
  file: File,
  options: ReadTrackMetadataOptions = {},
): Promise<TrackMetadata> => {
  const parseMetadata =
    options.parseMetadata ??
    (async (audioFile) => {
      const {parseBlob} = await import('music-metadata')
      return parseBlob(audioFile, {duration: false, skipCovers: true})
    })
  const metadata = await parseMetadata(file)
  const fallbackArtist = metadata.common.artists
    ?.map(normalizeTag)
    .filter((artist): artist is string => artist !== null)
    .join(', ')

  return {
    artist: normalizeTag(metadata.common.artist) ?? normalizeTag(fallbackArtist),
    title: normalizeTag(metadata.common.title),
  }
}
