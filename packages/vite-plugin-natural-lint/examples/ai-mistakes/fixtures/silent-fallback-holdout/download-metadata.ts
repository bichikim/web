interface DownloadMetadata {
  readonly downloadedBytes: number
}

declare const readMetadataFile: () => Promise<string>

export const loadDownloadMetadata = async (): Promise<DownloadMetadata | null> => {
  try {
    return JSON.parse(await readMetadataFile()) as DownloadMetadata
  } catch {
    return null
  }
}
